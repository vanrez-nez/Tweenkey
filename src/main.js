import * as utils from './utils';
import * as tween from './tween';
import * as ticker from './ticker';
import * as timeline from './timeline';
import * as frameAnimation from './frame-animation';

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
        setTimeout( function() {
            onFrame();
        }, 1 );
    }
}

function setAutoUpdate( enabled ) {
    if ( enabled ) {
        mainTicker.resume();
    } else {
        mainTicker.pause();
    }
}

function manualStep( step ) {
    step = typeof step == 'number' ? step : mainTicker._fpsStep;
    updateTweens( step );
}

function updateTweens( delta ) {
    delta = Math.max( 0, delta );
    // update tweens (order matters)
    for ( var idx = 0, length = tweens.length; idx < length; idx++  ) {
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
    for ( var idx = 0; idx < tickers.length; idx++ ) {
        tickers[ idx ].tick( utils.now() );
    }
    
    if ( tickers.length === 1 && tweens.length === 0 ) {
        isSleeping = true;
    } else {
        frameAnimation.request( onFrame );
    }

}

function cleanupRunnable( arr ) {
    for ( var idx = arr.length; idx--; ) {
        var obj = arr[ idx ];
        if ( ! obj._running ) {
            obj._queued = false;
            arr.splice( idx, 1 );
        }
    }
}

function dequeue() {
    cleanupDirty = true;
}

function queueTween( tw ) {
    if ( ! tw._queued ) {
        tween.resetTargetProperties( tw );
        tweens.push( tw );
        tw._queued = true; 
        // refresh all properties
        tw._syncNextTick = true;
        wakeup();
    }
}

function queueTicker( tk ) {
    if ( ! tk._queued ) {
        tk._queued = true;
        tickers.push( tk );
        wakeup();
    }
}

function executeOnAllTweens ( funcName ) {
    return function() {
        for ( var idx = tweens.length; idx--; ) {
            var tween = tweens[ idx ];
            tween[ funcName ].apply( tween, arguments );
        }
    };
}

class Tweenkey {}
Tweenkey.prototype = {
    set         : tween.tweenFactory( queueTween, dequeue ),
    tween       : tween.tweenFactory( queueTween, dequeue ),
    ticker      : ticker.tickerFactory( queueTicker, dequeue ),
    timeline    : timeline.timelineFactory(),
    clearAll    : executeOnAllTweens( 'clear' ),
    clearTweensOf: function() { console.log('todo'); },
    pauseAll    : executeOnAllTweens( 'pause' ),
    resumeAll   : executeOnAllTweens( 'resume' ),
    update      : manualStep,
    autoUpdate  : setAutoUpdate,
    setFPS      : mainTicker.setFPS.bind( mainTicker )
};

export default new Tweenkey();