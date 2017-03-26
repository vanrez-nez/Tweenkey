import * as utils from './utils';

export class Ticker {
    constructor( params, onQueue ) {
        params = params || {};
        this._onQueue = onQueue;
        this._onTick = utils.isFunction( params.onTick ) ? params.onTick : utils.noop;
        this.setFPS( params.fps );
        this.resume();
    }
}

Ticker.prototype = {
    pause: function() {
        this._running = false;
        return this;
    },
    resume: function() {
        this._then = utils.now();
        this._running = true;
        this._onQueue( this );
        return this;
    },
    tick: function( time ) {
        var delta = time - this._then;

        if ( delta > this._fpsStep ) {
            var drop = delta % this._fpsStep;
            this._then = time - drop;
            this._onTick( Math.min( delta - drop, this._fpsStep * 4 ) / 1000 );
        }

        return this;
    },
    setFPS: function( fps ) {
        this.fps = utils.isNumber( fps ) && fps > 0 ? fps : 60;
        this._fpsStep = 1000 / this.fps;
    }
};

export function tickerFactory( onQueue ) {
    return ( params ) => {
        return new Ticker( params, onQueue );
    }
}