const axios = require('axios');
const {CompositeDisposable, Disposable} = require('via');
const Websocket = require('./websocket');

const BaseURI = 'https://api.binance.com/api/v1';
const SocketURI = 'wss://ws-feed.gdax.com';

const Timeframes = {
    6e4: '1m',
    18e4: '3m',
    3e5: '5m',
    9e5: '15m',
    18e5: '30m',
    36e5: '1h',
    72e5: '2h',
    144e5: '4h',
    216e5: '6h',
    288e5: '8h',
    432e5: '12h',
    864e5: '1d',
    2592e5: '3d',
    6048e5: '1w',
    2628e6: '1M'
};

class BinanceAdapter {
    constructor(){
        this.maxCandlesFromRequest = 500;
        this.resolution = 60000;
    }

    activate(){
        this.disposables = new CompositeDisposable();
        this.websocket = new Websocket();
    }

    deactivate(){
        //Unregister the symbols
        //Close any active connections
        //Close any open panes

        this.websocket.destroy();
        this.disposables.dispose();
        this.disposables = null;
    }

    matches(symbol, callback){
        //TODO Verify ticker integrity by checking against the sequence number
        return this.websocket.subscribe(symbol.identifier.slice(symbol.source.length + 1), 'matches', message => callback({
            date: new Date(message.time),
            price: parseFloat(message.price),
            size: parseFloat(message.size),
            side: message.side,
            id: message.trade_id
        }));
    }

    ticker(symbol, callback){
        return this.websocket.subscribe(symbol.name.split('-').join('').toLowerCase() + '@aggTrade', message => callback({
            date: new Date(message.E),
            price: parseFloat(message.p)
        }));
    }

    orderbook(symbol, callback){
        return this.websocket.subscribe(symbol.identifier.slice(symbol.source.length + 1), 'level2', message => {
            if(message.type === 'snapshot'){
                callback({type: message.type, bids: message.bids, asks: message.asks});
            }else if(message.type === 'l2update'){
                callback({type: 'update', changes: message.changes});
            }
        });
    }

    history(symbol){
        const id = symbol.identifier.slice(symbol.source.length + 1);

        return axios.get(`${BaseURI}/products/${id}/trades`)
        .then(response => response.data.map(datum => {
            // debugger;
            // let [time, trade_id, price, size, side] = datum;
            return {date: new Date(datum.time), id: datum.trade_id, price: parseFloat(datum.price), size: parseFloat(datum.size), side: datum.side};
        }));
    }

    async data({symbol, granularity, start, end}){
        const interval = Timeframes[granularity];
        const id = symbol.name.split('-').join('');

        if(!interval){
            //TODO, eventually implement a method to allow for a wider variety of time frames
            throw new Error('Invalid timeframe requested.');
        }

        const response = await axios.get(`${BaseURI}/klines`, {params: {startTime: start.getTime(), endTime: end.getTime(), interval, symbol: id}});
        return response.data.map(([date, open, high, low, close, volume]) => ({date: new Date(date), low, high, open, close, volume}));
    }
}

module.exports = new BinanceAdapter();
