import { Component } from '@angular/core';
import { Injectable } from '@angular/core';
import { Http, Response } from '@angular/http';

import 'rxjs/Rx';
import { Observable } from 'rxjs/Rx';

@Component({
    selector: 'home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})

export class HomeComponent {

    constructor(private http: Http) {
        this.series = [];
        var scheme = document.location.protocol == "https:" ? "wss" : "ws";
        var port = document.location.port ? (":" + document.location.port) : "";
        this.connectionUrl = scheme + "://" + document.location.hostname + port + "/ws";
        this.stockList = new Map<string, string>(); 
    }

    
    ngOnInit() {
        this.syncStockList();

        this.socket = new WebSocket(this.connectionUrl);
        this.socket.onerror = function (event) {
            alert("Websocket connection error!");
        };
        this.socket.onmessage = (event => {
            console.log(event.data);
            this.syncStockList();
        });
    }

    private objToStrMap(obj): Map<string, string> {
        let strMap = new Map<string, string>(); 
        for (let k of Object.keys(obj)) {
            strMap.set(k, obj[k]);
        }
        return strMap;
    }

    private syncStockList() 
    {
        this.getStockList().then(stockList  => {
            this.stockList = this.objToStrMap(stockList);
            this.getStockData(Array.from(this.stockList.keys()));
        })
    }

    private getStockList(): Promise<any> {
        return this.http
            .get('/api/StockData/StockList')
            .map((res) => {
                // some manipulation
                return res.json() || [];
            })
            .toPromise();
    }

    private addStock(stock : string): Promise<any> {
        return this.http
            .get(`/api/StockData/AddStock?stock=${stock}`)
            .map((res) => {
                // some manipulation
                return res.json();
            })
            .toPromise();
    }

    private createChart() {

        this.options = {
            colors: ['#50B432', '#ED561B', '#DDDF00', '#24CBE5', '#64E572', '#FF9655', '#FFF263', '#6AF9C4'],

            title: { text: 'Stocks' },

            rangeSelector: {
                selected: 4
            },

            yAxis: {
                labels: {
                    formatter: function () {
                        return (this.value > 0 ? ' + ' : '') + this.value + '%';
                    }
                },
                plotLines: [{
                    value: 0,
                    width: 2,
                    color: 'silver'
                }]
            },

            plotOptions: {
                series: {
                    compare: 'percent',
                    showInNavigator: true
                }
            },

            tooltip: {
                pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b> ({point.change}%)<br/>',
                valueDecimals: 2,
                split: true
            },

            series: this.series
        };
    }

    private getStockData(stockList: string[]) {

        let i: number;
        let responses: Observable<Response>[] = [];
        for (i = 0; i < stockList.length; i++) {
            let url = `/api/StockData/QuandlData?stock=${stockList[i]}`;
            this.series[i] = {
                name: stockList[i],
                data: []
            };

            responses.push(this.http.get(url).map((res: Response) => res.json().reverse().map(info => {
                return [
                   (new Date(info[0])).getTime(),
                   parseFloat(info[1])
                ];
            })));
        };

        Observable.forkJoin(responses).subscribe(res => {
            for (i = 0; i < res.length; i++) {
                this.series[i].data = res[i];
            }
            this.createChart()
        });
    }


    addToChart(stockSym: string) {
        this.chartMessage = 'Loading';
        this.addStock(stockSym).then(res => {
            if (res.msg == "ok")
            {
                this.chartMessage = "";
                stockSym = stockSym.toUpperCase();
                if (!this.stockList.get(stockSym)) this.stockList.set(stockSym, ""); 
                this.socket.send(JSON.stringify([this.stockList.keys]));
            }
            else
            {
                this.chartMessage = "Chart for stock symbol '" + stockSym + "' does not exist.";
            }
        }); 
    }

    deleteFromChart(stockSym: string) {
        console.log("deleteFromChart " + stockSym);
        if (this.stockList.has(stockSym)) {
            this.stockList.delete(stockSym);
           this.socket.send(JSON.stringify([this.stockList.keys]));
        }
    }

    keys(): Array<string> {
        return Array.from(this.stockList.keys());
    }

    options: Object;
    series: {name : string, data : any}[];
    chartMessage: string = '';
    connectionUrl: string;
    socket: WebSocket;
    stockList: Map<string, string>; 
}

