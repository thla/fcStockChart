import { Component } from '@angular/core';
import { Injectable } from '@angular/core';
import { Http, Response } from '@angular/http';
import { ChartService } from '../../chart.service';

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';


@Component({
    selector: 'home',
    styles: [`
      chart {
        display: block; 
      }
    `],
    template: `<chart type="StockChart" [options]="options"></chart>`,
    providers: [ChartService]
})
export class HomeComponent {
    constructor(private http: Http) {
 
    }

    ngOnInit() {
        let url = `/api/StockData/StockList`;
        this.http.get(url)
            .map((x) => this.extractData(x)).subscribe();
    }

    private extractData(res: Response) {
        let body = res.json();
        let stockList = body || [];
        for (let entry of stockList) {
            this.stockData(entry);
        }
    }


    private stockData(symbol: string) {
        let url = `/api/StockData/YahooData?stock=${symbol}`;
        let serie = {
            name: symbol,
            data: []
        };

        this.http.get(url).subscribe(result => {
            serie.data = result.json().reverse().map(info => {
                console.log('info ' + info)
                return [
                    (new Date(info[0])).getTime(),
                    parseFloat(info[1])
                ];
            });

            this.options = {
                title: { text: 'Stocks' },
                series: [{
                    name: serie.name,
                    data: serie.data,
                    tooltip: {
                        valueDecimals: 2
                    }
                }]
            };

        });

    }

    options: Object;

}

