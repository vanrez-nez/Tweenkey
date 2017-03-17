
function initObjectCallbacks( obj, params ) {
    var p = params || {};
    obj._onStart      = _isFunction( p.onStart ) ? p.onStart : _noop;
    obj._onUpdate     = _isFunction( p.onUpdate ) ? p.onUpdate : _noop;
    obj._onComplete   = _isFunction( p.onComplete ) ? p.onComplete : _noop;
    obj._onRepeat     = _isFunction( p.onRepeat ) ? p.onRepeat : _noop;
}

function initObjectRunnable( obj, params ) {
    var p = params || {};
    var delay = _isNumber( p.delay ) ? m.max( 0, p.delay ) : 0;
    var repeatCount = _isNumber( p.repeat ) ? p.repeat : 0;

    obj._totalDuration  = 0;
    obj._reversed       = _isBoolean( p.reversed ) ? p.reversed : false;
    obj._direction      = obj._reversed ? -1 : 1;
    obj._progress       = 0;
    obj._totalProgress  = 0;
    obj._elapsedTime    = 0;
    obj._lastElapsedTime= 0;
    obj._alive          = true;
    obj._delay          = delay;
    obj._delayLeft      = delay;
    obj._yoyo           = _isBoolean( p.yoyo ) ? p.yoyo : false;
    // when repeat and yoyo are combined you can specify how many yoyo laps you want,
    // by default if no repeat param is set it repeats forever (-1)
    obj._repeat         = obj._yoyo ? ( repeatCount > 0 ? repeatCount : -1 ) : repeatCount;
    obj._repeatLeft     = obj._repeat;
    obj._repeatDelay    = _isNumber( p.repeatDelay ) ? m.max( 0, p.repeatDelay ) : 0;
    obj._timeScale      = _isNumber( p.timeScale ) && p.timeScale > 0 ? p.timeScale: 1;
    obj._running        = _isBoolean( p.autoStart ) ? p.autoStart : true;
    obj._params         = p;
}

/*
 * Increments a Tween or Timeline step
 * takes into account the current timeScale
 */
function applyStep( obj, dt ) {
    var step = dt * obj._timeScale;
    
    if ( obj._delayLeft > 0 ) {
        obj._delayLeft -= _roundDecimals( step );
        if ( obj._delayLeft < 0 ) {
            // pass the remainder as step for tweening
            step = m.abs( obj._delayLeft );
            obj._delayLeft = 0;
        } else {
            step = 0;
        }
    }

    if ( step > 0 ) {
        var progress = ( obj._elapsedTime + step ) / obj._totalDuration;
        seek( obj, progress, true, false );
    }
}

function notifyStart( obj ) {
    if ( obj._lastElapsedTime === 0 && obj._elapsedTime > 0 ) {
        obj._onStart.call( obj._target || obj );
    }
}

function notifyOnComplete( obj ) {
    if ( obj._totalProgress === 1 &&
        obj._lastElapsedTime !== obj._totalDuration ) {
            obj._onComplete.call( obj, obj._target );
        }
}

function notifyOnRepeat( obj ) {
    if ( obj._elapsedTime > 0 &&
        obj._repeat > 0 || obj._yoyo ) {
        var d = obj._duration + obj._repeatDelay;
        var a = obj._elapsedTime / d;
        var b = obj._lastElapsedTime / d;
        var repeatCount = ~b - ~a;
        var tail = a > b ? b : a;
        if ( repeatCount !== 0 && m.abs( tail ) < obj._repeat ) {
            obj._onRepeat.call( obj, obj._target );
        }
    }
}

/* Updates a tween or timeline state.
*/
function updateState( obj ) {
    //console.log( obj._globalProgress );
    if ( obj._totalProgress === 1 ) {
        obj.kill();
    }
}


// sets tweens and timelines to a certain progress
function seek( obj, progress, accountForRepeats, accountForDelay ) {
    
    var local = obj._duration;
    var total = obj._totalDuration;

    if ( accountForDelay ) {
        // Adjust progress to take into account object's delay
        var delay = obj._delay;
        var delayProgress = 0;
        if ( accountForRepeats ) {
            // global
            delayProgress = delay / ( delay + total );
            progress = ( ( progress - delayProgress ) / delayProgress ) / total;
            
        } else {
            // local
            delayProgress = delay / ( delay + local );
            progress = ( progress - delayProgress ) / delayProgress;
        }
        obj._delayLeft = m.max( 0, obj._delayLeft - obj._elapsedTime );
    } else {
        obj._delayLeft = 0;        
    }
    
    progress = _clamp( progress, 0, 1 );    
    progress = progress;

    if ( accountForRepeats ) {
        obj._totalProgress = progress;
        // transform total to local
        var localRemainder = ( total * progress ) % ( local + 0.0001 );
        obj._progress = localRemainder / local;
        
    } else {
        obj._progress = progress;
        // transform local to total
        obj._totalProgress = ( progress * local ) / total;
    }

    obj._lastElapsedTime = obj._elapsedTime;
    obj._elapsedTime = total * obj._totalProgress;
    obj._progress = obj._progress;//_roundDecimals( obj._progress );
    obj._totalProgress = obj._totalProgress;// );
    console.log( 
        'local:', obj._progress,
        'global:', obj._totalProgress,
        'elapsed time:', obj._elapsedTime
    );
}