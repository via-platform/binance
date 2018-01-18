const {CompositeDisposable} = require('via');
const Helpers = require('./helpers');
const Websocket = require('./websocket');
const Symbol = require('./symbol');
const Account = require('./account');

class Binance {
    constructor(){}

    async activate(){
        this.disposables = new CompositeDisposable();
        this.websocket = new Websocket();

        const symbols = await Symbol.all();

        for(const symbol of symbols){
            this.disposables.add(via.symbols.add(new Symbol(symbol, this.websocket)));
        }

        const accounts = await via.accounts.loadAccountsFromStorage('binance');

        for(const account of accounts){
            this.disposables.add(via.accounts.activate(new Account(account, this.websocket)));
        }
    }

    deactivate(){
        this.websocket.destroy();
        this.disposables.dispose();
        this.disposables = null;
    }

    async account(config){
        const account = await via.accounts.add({name: config.accountName, exchange: 'binance', key: Helpers.key(config)});
        this.disposables.add(via.accounts.activate(new Account(account, this.websocket)));
    }

    title(){
        return 'Binance';
    }
}

module.exports = new Binance();
