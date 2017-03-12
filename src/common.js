
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

    obj._started      = false;
    obj._direction    = 1;
    obj._progress     = 0;
    obj._elapsedTime  = 0;
    obj._alive        = true;
    obj._delay        = delay;
    obj._delayLeft    = delay;
    obj._yoyo         = _isBoolean( p.yoyo ) ? p.yoyo : false;
    // when repeat and yoyo are combined you can specify how many yoyo laps you want
    // by default if no repeat param is set it repeats forever (-1)
    obj._repeat       = obj._yoyo ? repeatCount > 0 ? repeatCount : -1 : repeatCount;
    obj._repeatLeft   = obj._repeat;
    obj._repeatDelay  = _isNumber( p.repeatDelay ) ? m.max( 0, p.repeatDelay ) : 0;
    obj._timeScale    = _isNumber( p.timeScale ) && p.timeScale > 0 ? p.timeScale: 1;
    obj._running      = _isBoolean( p.autoStart ) ? p.autoStart : true;
    obj._params       = p;
}

/*
 * Increments a Tween or Timeline step
 * takes into account the current delay
 */
function applyStep( obj, dt ) {
    var step = dt * obj._timeScale;
    if ( obj._delayLeft > 0 ) {
        // TODO: refactor this crap? should use module op
        var delayStep = _clamp( step, 0, obj._delayLeft );
        obj._delayLeft -= delayStep;
        step -= delayStep;
    }

    if ( obj._delayLeft == 0 ) {
        obj._elapsedTime += step * obj._direction;
        obj._elapsedTime = m.max( obj._elapsedTime, 0 );

        // Default progress for obj.set
        obj._progress = 1;
        if ( obj._duration > 0 ) {
            obj._progress = m.round( ( obj._elapsedTime / obj._duration ) * 10000 ) / 10000;
            obj._progress = _clamp( obj._progress, 0, 1 );
        }
    }
}


/* Updates a tween or timeline state.
 * Handles repeats and yoyo properties.
 * Fires onComplete or onRepeat callbacks.
 */
function updateState( obj ) {
    if ( obj._delayLeft === 0 && obj._direction == 1 &&
        obj._elapsedTime >= obj._duration ||
        obj._direction == -1 && obj._elapsedTime == 0 ) {

        if ( obj._alive ) {
            if ( obj._repeatLeft > 0 ) {
                obj._repeatLeft--;
            }

            if ( obj._repeatLeft == 0 ) {
                obj._onComplete( obj._target || obj );
                obj.kill();
            } else {
                if ( obj._yoyo ) {
                    obj._direction *= -1;
                } else {
                    obj._elapsedTime = 0;
                }
                obj._delayLeft = obj._repeatDelay;
                obj._onRepeat( obj._target || obj );
            }
        }
    
    }
}

// sets tweens and timelines to a certain time or progress
function seek( obj, time, accountForDelay, inSeconds ) {

    // needs to take into account repetitions!!!
    // also if repetitions are infinite then mod current time %

    var totalDuration = accountForDelay ? obj._duration + obj._delay : obj._duration;
    time = _clamp( time, 0, inSeconds ? totalDuration : 1);
    var timeSeconds = inSeconds ? time : time * totalDuration;
    
    obj._elapsedTime = timeSeconds;
    obj._progress = timeSeconds / totalDuration;

    if ( accountForDelay && timeSeconds > obj._delay ) {
        obj._delayLeft = timeSeconds - ( timeSeconds - obj._delay );
        obj._elapsedTime -= obj._delayLeft;
    } else if ( ! accountForDelay )  {
        obj._delayLeft = 0;
    }
    
}