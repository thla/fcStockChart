import { Component, ViewChild } from '@angular/core';
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

    @ViewChild('stockSym') vc;

    constructor(private http: Http) {
        this.series = [];
        var scheme = document.location.protocol == "https:" ? "wss" : "ws";
        var port = document.location.port ? (":" + document.location.port) : "";
        this.connectionUrl = scheme + "://" + document.location.hostname + port + "/ws";
        this.stockList = new Map<string,string>(); 
    }

    
    ngOnInit() {
        this.syncStockList();

        this.socket = new WebSocket(this.connectionUrl);
        this.socket.onopen = function (event) {
            console.log("socket.onopen")
        };
        this.socket.onclose = function (event) {
            console.log("socket.onopen")
        };        
        this.socket.onerror = function (event) {
            alert("Websocket connection error!");
        };
        this.socket.onmessage = (event => {
            console.log("event.data: " + event.data)
            this.syncStockList();
        });
    }

    ngAfterViewInit() {
        this.vc.nativeElement.focus();
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
        this.getStockList().then(stocks  => {
            console.log("stocks " + stocks);
            this.stockList = this.objToStrMap(stocks);
            this.getStockData(this.keys());
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
        this.series =  [];
        for (i = 0; i < stockList.length; i++) {
            let url = `/api/StockData/QueryStockData?stock=${stockList[i]}`;
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

        if (this.series.length === 0) this.createChart();
    }


    addToChart(stockSym: string) {
        this.chartMessage = 'Loading';
        this.addStock(stockSym).then(res => {
            if (res.msg == "ok")
            {
                this.chartMessage = "";
                stockSym = stockSym.toUpperCase();
                if (!this.stockList.has(stockSym)) this.stockList.set(stockSym, ""); 
                this.socket.send(JSON.stringify(this.keys()));
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
            if (this.stockList.delete(stockSym))
            {
                this.socket.send(JSON.stringify(this.keys()));
            }
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

