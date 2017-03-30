import * as frameAnimation from './frame-animation';
import * as ticker from './ticker';
import * as tween from './tween';
import * as utils from './utils';

let tweens = [];
let tickers = [];
let isSleeping = true;
let cleanupDirty = false;
let mainTicker = new ticker.Ticker( {
    onTick: updateTweens
}, queueTicker );


function wakeup() {
    if ( isSleeping === true ) {
        isSleeping = false;
        setTimeout( () => {
            onFrame();
        }, 1 );
    }
}

function updateTweens( delta ) {
    delta = Math.max( 0, delta );
    // update tweens (order matters)
    for ( let idx = 0, length = tweens.length; idx < length; idx++  ) {
        tweens[ idx ]._running && tween.tweenTick( tweens[ idx ], delta );
    }
}

function onFrame() {
    if ( cleanupDirty ) {
        cleanupRunnable( tickers );
        cleanupRunnable( tweens );
        cleanupDirty = false;
    }

    // Update tickers
    for ( let idx = 0; idx < tickers.length; idx++ ) {
        tickers[ idx ].tick( utils.now() );
    }
    
    if ( tickers.length === 1 && tweens.length === 0 ) {
        isSleeping = true;
    } else {
        frameAnimation.request( onFrame );
    }

}

function cleanupRunnable( arr ) {
    for ( let idx = arr.length; idx--; ) {
        let obj = arr[ idx ];
        if ( ! obj._running ) {
            obj._queued = false;
            arr.splice( idx, 1 );
        }
    }
}

function queueTween( tw ) {
    if ( ! tw._queued ) {
        tweens.push( tw );
        tw._queued = true;
    }
}

function queueTicker( tk ) {
    if ( ! tk._queued ) {
        tickers.push( tk );
        tk._queued = true;
    }
}

export function onRunnableStateChange( obj ) {
    if ( obj._running ) {
        obj instanceof tween.Tween && queueTween( obj );
        obj instanceof ticker.Ticker && queueTicker( obj );
        wakeup();
    } else {
        cleanupDirty = true;
    }
}

export function executeOnAllTweens ( funcName ) {
    return () => {
        for ( let idx = tweens.length; idx--; ) {
            let tween = tweens[ idx ];
            tween[ funcName ].apply( tween, arguments );
        }
    };
}

export function setAutoUpdate( enabled ) {
    if ( enabled ) {
        mainTicker.resume();
    } else {
        mainTicker.pause();
    }
}

export function manualStep( step ) {
    step = typeof step == 'number' ? step : mainTicker._fpsStep;
    updateTweens( step );
}

export function setFPS( val ) {
    mainTicker.setFPS( val );
}