import { Component } from '@angular/core';
import { Injectable } from '@angular/core';
import { Http, Response } from '@angular/http';

import 'rxjs/Rx';
import { Observable } from 'rxjs/Rx';

@Component({
    selector: 'home',
    styles: [`
      chart {
        display: block; 
      }
    `],
    templateUrl: './home.component.html'
})


export class HomeComponent {
    constructor(private http: Http) {
        this.series = [];
        var scheme = document.location.protocol == "https:" ? "wss" : "ws";
        var port = document.location.port ? (":" + document.location.port) : "";
        this.connectionUrl = scheme + "://" + document.location.hostname + port + "/ws" ;
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

    private syncStockList() 
    {
        this.getStockList().then(stockList => {
            this.stockList = stockList;
            var seriesnames = this.series.map(function (a) { return a.name; }) || [];
            this.getStockData(stockList.filter(function (i) { return seriesnames.indexOf(i) < 0; }));
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
        let offset = this.series.length;
        let responses: Observable<Response>[] = [];
        for (i = 0; i < stockList.length; i++) {
            let url = `/api/StockData/YahooData?stock=${stockList[i]}`;
            this.series[offset + i] = {
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
                this.series[offset + i].data = res[i];
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
                if (this.stockList.indexOf(stockSym) === -1) this.stockList.push(stockSym); 
                this.socket.send(JSON.stringify([this.stockList]));
            }
            else
            {
                this.chartMessage = "Chart for stock symbol '" + stockSym + "' does not exist.";
            }
        }); 
    }

    options: Object;
    series: {name : string, data : any}[];
    chartMessage: string = '';
    connectionUrl: string;
    socket: WebSocket;
    stockList: string[];
}

