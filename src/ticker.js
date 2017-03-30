import * as utils from './utils';

export class Ticker {
    constructor( params, onStateChange ) {
        params = params || {};
        this._onStateChange = onStateChange;
        this._onTick = utils.isFunction( params.onTick ) ? params.onTick : utils.noop;
        this.setFPS( params.fps );
        this.resume();
    }
}

Ticker.prototype = {
    pause: function() {
        this._running = false;
        this._onStateChange( this );
        return this;
    },
    resume: function() {
        this._then = utils.now();
        this._running = true;
        this._onStateChange( this );
        return this;
    },
    tick: function( time ) {
        
        let delta = time - this._then;
        if ( delta > this._fpsStep ) {
            let drop = delta % this._fpsStep;
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

export function tickerFactory( onStateChange ) {
    return ( params ) => {
        return new Ticker( params, onStateChange );
    }
}