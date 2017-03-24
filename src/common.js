
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
    
    obj._queued       = false;
    obj._totalDuration  = 0;
    obj._inverted       = _isBoolean( p.inverted ) ? p.inverted : false;
    obj._direction      = 1;
    obj._progress       = 0;
    obj._totalProgress  = 0;
    obj._elapsedTime    = 0;
    obj._lastElapsedTime= 0;
    obj._delay          = delay;
    obj._yoyo           = _isBoolean( p.yoyo ) ? p.yoyo : false;
    // when repeat and yoyo are combined you can specify how many yoyo laps you want,
    // by default if no repeat param is set it repeats forever (-1)
    if ( _isNumber( p.repeat ) === false && obj._yoyo ) {
        repeatCount = -1;
    }
    obj._repeat         = repeatCount;
    obj._infinite       = ( obj._yoyo === true && obj._repeat === -1 ) || obj._repeat === -1;
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
    dt *= obj._direction;
    var time = obj._elapsedTime + dt * obj._timeScale;
    seek( obj, time, true, true );
}

function notifyOnUpdate( obj ) {
    if ( obj._elapsedTime > obj._delay ) {
        obj._onUpdate.call( obj, obj._target );
    }
}

function notifyStart( obj ) {
        if ( obj._elapsedTime > obj._delay ) {
            var lastElapsed = m.max( 0, obj._lastElapsedTime - obj._delay );
            if ( lastElapsed === 0 ) {
            obj._onStart.call( obj._target || obj );
        }
    }
}

function notifyOnComplete( obj ) {
    if ( obj._elapsedTime > obj._delay &&
        obj._totalDuration === _roundDecimals( obj._elapsedTime )  &&
        ! obj._infinite ) {
            obj._onComplete.call( obj, obj._target );
        }
}

function notifyOnRepeat( obj ) {
    if ( obj._elapsedTime > obj._delay &&
        ( obj._repeat > 0 || obj._yoyo ) ) {
        var delay = obj._delay;
        var d = obj._duration + obj._repeatDelay;
        var a = ( obj._elapsedTime - delay ) / d;
        var b = ( obj._lastElapsedTime - delay ) / d;
        var repeatCount = ~b - ~a;
        var tail = a > b ? b : a;
        if ( repeatCount !== 0 && 
            ( obj._infinite || m.abs( tail ) < obj._repeat ) ) {
            obj._onRepeat.call( obj, obj._target );
        }
    }
}

/*
 * Updates a tween or timeline state.
 */
function updateState( obj ) {
    if ( ! obj._infinite && obj._totalProgress === 1 ) {
        obj.clear();
    }
}

function seekProgress( obj, progress, global, accountForDelay ) {
    progress = _clamp( progress, 0, 1 );
    var delayJump = accountForDelay ? 0 : obj._delay;
    var duration = 0;
    if ( global ) {
        duration = obj._totalDuration;
    } else {
        duration = obj._duration + obj._repeatDelay;
        // Normalize the duration to treat following calcs
        // with the same delay jump.
        duration += obj._delay;
    }
    
    var time = progress * ( duration - delayJump ) ;
    seek( obj, time + delayJump, global );
}

// sets tweens and timelines to a certain time
function seek( obj, time ) {
    time = m.max( 0, time );
    
    

    obj._lastElapsedTime = obj._elapsedTime;
    obj._elapsedTime = time;
    
    if ( obj._elapsedTime > obj._totalDuration ) {
        
        if ( ! obj._infinite ) {
            time = m.min( obj._totalDuration, time );
            obj._elapsedTime = time;
        }

        time = ( time - obj._delay - DEC_FIX ) % obj._totalDuration + obj._delay;
    }
    
    obj._totalProgress = _roundDecimals( time / obj._totalDuration );

    if ( time > obj._delay ) {
        var time = time - obj._delay;
        var local = obj._duration + DEC_FIX;
        var elapsed = time % ( local + obj._repeatDelay );
        if ( elapsed <= local ) {
            obj._progress = _roundDecimals( ( elapsed % local ) / local );
        } else {
            obj._progress = 1;
        }
    } else {
        obj._progress = 0;
    }

    if ( obj._inverted ) {
        obj._progress = 1 - obj._progress;
    }

//    console.log( obj._progress );

    return;
    /*console.log(
        'local:', obj._progress,
        'global:', obj._totalProgress,
        'elapsed time:', obj._elapsedTime
    );*/
}