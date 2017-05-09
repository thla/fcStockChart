﻿import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import 'rxjs/add/operator/map';

import * as io from 'socket.io-client';

@Injectable()
export class ChartService {
    recentStock: string[];

    constructor(private http: Http) { }

    stockData(symbol: string, period: string) {
        let url = `/api/StockData/YahooData?stock=${symbol}&period=${period}`;
        let serie = {
            name: symbol,
            data: []
        };

        this.http.get(url).subscribe(result => {
            serie.data = result.json().map(info => {
                console.log('info ' + info)
                return [
                    (new Date(info[0])).getTime(),
                    info[1]
                ];
            });
        });

        return serie;
    }

    removeFromRecentList(sym: string) {
        let socket = io.connect('/');
        socket.emit('rm_from_r_s', sym);
    }

    addToRecentStockSym(sym: string) {
        let socket = io.connect('/');
        console.log(sym);
        socket.emit('add_to_r_s', sym);
    }

    removeSliently(sym: string) {
        let socket = io.connect('/');
        socket.emit('rm_sliently', sym);
    }

    randomColor() {
        let color = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'A', 'B', 'C', 'D', 'E', 'F'];
        let toReturn = '#';
        for (let i = 0; i < 6; i++) {
            toReturn += color[Math.round(9 * Math.random())]
        }
        return toReturn;
    }

}