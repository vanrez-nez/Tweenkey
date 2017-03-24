/*
 *  Copyright (c) 2016 Iván Juárez Núñez
 *  This code is under MIT license
 *  https://github.com/radixzz/Tweenkey
 */

( function ( root, factory ) {
  if( typeof define === "function" && define.amd ) {
    define( [], factory );
  } else if( typeof module === "object" && module.exports ) {
    module.exports = ( root.Tweenkey = factory() );
  } else {
    root.Tweenkey = factory();
  }
}(this, function() {
   'use strict';

var wnd = window || {};
var PERFORMANCE = wnd.performance;
var TYPE_FNC = ({}).toString;
var DEC_FIX = 0.000001;
var m = Math;

var colorRE = new RegExp(/(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i);

function _getTypeCheck( typeStr, fastType ) {
    return function( obj ) {
        return fastType ? typeof obj === typeStr:
            TYPE_FNC.call( obj ) === typeStr;
    };
}
// Global object to be shared between modules
var _isFunction = _getTypeCheck( 'function', true );
var _isNumber = _getTypeCheck( 'number', true );
var _isBoolean = _getTypeCheck( 'boolean', true );
var _isString = _getTypeCheck( 'string', true );
var _isArray = Array.isArray || _getTypeCheck( '[object Array]', false );
var _isColor = function( str ) {
    return colorRE.test( str );
}
var _isObject = function( obj ) { 
    return !!obj && obj.constructor === Object
};

var _flatten = function( arr ) { 
    return [].concat.apply( [], arr );
};

var _hexStrToRGB  = function( str ) {
    var hex = parseInt( str.slice( 1 ), 16 );
    return [
        (( hex >> 16 ) & 0xFF) / 255,
        (( hex >> 8 ) & 0xFF) / 255,
        ( hex & 0xFF ) / 255
    ];
};

var _clamp = function( value, min, max ) {
    return m.min( m.max( value, min ), max );
};

var _now = function() {
    return PERFORMANCE.now();
};
var _extend = function( target, source, overwrite ) {
    for ( var key in source ) {
        ( overwrite || !( key in target ) ) && ( target[ key ] = source[ key ] );
    }
    return target;
};
var _noop = function() { return false; }

var _roundDecimals = function( n ) {
    return m.round( n * 1000 ) / 1000;
}

var _minMax = function( obj, arr, key ) {
    return obj.apply( m, arr.map( function( item ) {
        return item[ key ];
    } ) );
}

var _min = function( arr, key ) {
    return _minMax( m.min, arr, key );
}

var _max = function( arr, key ) {
    return _minMax( m.max, arr, key );
}
/**
 * https://github.com/gre/bezier-easing
 * BezierEasing - use bezier curve for transition easing function
 * by Gaëtan Renaudeau 2014 - 2015 – MIT License
 */

var bezierEase = (function () {
    var NEWTON_ITERATIONS = 4;
    var NEWTON_MIN_SLOPE = 0.001;
    var SUBDIVISION_PRECISION = 0.0000001;
    var SUBDIVISION_MAX_ITERATIONS = 10;

    var kSplineTableSize = 11;
    var kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

    var float32ArraySupported = typeof Float32Array === 'function';

    function A(aA1, aA2) { return 1.0 - 3.0 * aA2 + 3.0 * aA1; }
    function B(aA1, aA2) { return 3.0 * aA2 - 6.0 * aA1; }
    function C(aA1) { return 3.0 * aA1; }

    // Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
    function calcBezier(aT, aA1, aA2) { return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT; }

    // Returns dx/dt given t, x1, and x2, or dy/dt given t, y1, and y2.
    function getSlope(aT, aA1, aA2) { return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1); }

    function binarySubdivide(aX, aA, aB, mX1, mX2) {
        var currentX, currentT, i = 0;
        do {
            currentT = aA + (aB - aA) / 2.0;
            currentX = calcBezier(currentT, mX1, mX2) - aX;
            if (currentX > 0.0) {
                aB = currentT;
            } else {
                aA = currentT;
            }
        } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
        return currentT;
    }

    function newtonRaphsonIterate(aX, aGuessT, mX1, mX2) {
        for (var i = 0; i < NEWTON_ITERATIONS; ++i) {
            var currentSlope = getSlope(aGuessT, mX1, mX2);
            if (currentSlope === 0.0) {
                return aGuessT;
            }
            var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
            aGuessT -= currentX / currentSlope;
        }
        return aGuessT;
    }

    return function bezier(mX1, mY1, mX2, mY2) {
        if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) {
            throw new Error('bezier x values must be in [0, 1] range');
        }

        // Precompute samples table
        var sampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array(kSplineTableSize);
        if (mX1 !== mY1 || mX2 !== mY2) {
            for (var i = 0; i < kSplineTableSize; ++i) {
                sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
            }
        }

        function getTForX(aX) {
            var intervalStart = 0.0;
            var currentSample = 1;
            var lastSample = kSplineTableSize - 1;

            for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
                intervalStart += kSampleStepSize;
            }
            --currentSample;

            // Interpolate to provide an initial guess for t
            var dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
            var guessForT = intervalStart + dist * kSampleStepSize;

            var initialSlope = getSlope(guessForT, mX1, mX2);
            if (initialSlope >= NEWTON_MIN_SLOPE) {
                return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
            } else if (initialSlope === 0.0) {
                return guessForT;
            } else {
                return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
            }
        }

        return function BezierEasing(x) {
            if (mX1 === mY1 && mX2 === mY2) {
                return x; // linear
            }
            // Because JavaScript number are imprecise, we should guarantee the extremes are right.
            if (x === 0) {
                return 0;
            }
            if (x === 1) {
                return 1;
            }
            return calcBezier(getTForX(x), mY1, mY2);
        };
    };
})();

var easeIn  = function( power ) { 
    return function( t ) { 
        return m.pow( t, power )
    }
};

var easeOut = function( power ) { 
    return function( t ) {
        return 1 - m.abs( m.pow( t - 1, power ) )
    }
};

var easeInOut = function( power ) {
    return function( t ) {
        return t < .5 ? easeIn( power )( t * 2 ) / 2 : easeOut( power )( t * 2 - 1 ) / 2 + 0.5
    }
};

// The following easing functions where taken from:
// https://github.com/tweenjs/tween.js/blob/master/src/Tween.js

var easeBackIn = function ( t ) {
    var s = 1.70158;
    return t * t * ( ( s + 1) * t - s );
};

var easeBackOut = function ( t ) {
    var s = 1.70158;
    return --t * t * ((s + 1) * t + s) + 1;
};

var easeBackInOut = function ( t ) {
    var s = 1.70158 * 1.525;
    if ((t *= 2) < 1) {
        return 0.5 * (t * t * ((s + 1) * t - s));
    }
    return 0.5 * ((t -= 2) * t * ((s + 1) * t + s) + 2);
};

var easeBounceIn = function (t) {
    return 1 - easeBounceOut(1 - t);
};

var easeBounceOut = function (t) {
    if (t < (1 / 2.75)) {
        return 7.5625 * t * t;
    } else if (t < (2 / 2.75)) {
        return 7.5625 * (t -= (1.5 / 2.75)) * t + 0.75;
    } else if (t < (2.5 / 2.75)) {
        return 7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375;
    } else {
        return 7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375;
    }
};

var easeBounceInOut = function (t) {
    return t < 0.5 ? easeBounceIn(t * 2) * 0.5 : easeBounceOut(t * 2 - 1) * 0.5 + 0.5;
};

var easeElasticIn = function (t) {
    if (t === 0) { return 0; }
    if (t === 1) { return 1; }
    return -m.pow(2, 10 * (t - 1)) * m.sin((t - 1.1) * 5 * m.PI);
};

var easeElasticOut = function (t) {
    if (t === 0) { return 0; }
    if (t === 1) { return 1; }
    return m.pow(2, -10 * t) * m.sin((t - 0.1) * 5 * m.PI) + 1;
};

var easeElasticInOut = function (t) {
    if (t === 0) { return 0; }
    if (t === 1) { return 1; }
    t *= 2;
    if (t < 1) {
        return -0.5 * m.pow(2, 10 * (t - 1)) * m.sin((t - 1.1) * 5 * m.PI);
    }
    return 0.5 * m.pow(2, -10 * (t - 1)) * m.sin((t - 1.1) * 5 * m.PI) + 1;
};

var easeCircIn = function (t) {
    return 1 - m.sqrt(1 - t * t);
};

var easeCircOut = function (t) {
    return m.sqrt(1 - (--t * t));
};

var easeCircInOut = function (t) {
    if ((t *= 2) < 1) {
        return - 0.5 * (m.sqrt(1 - t * t) - 1);
    }
    return 0.5 * (m.sqrt(1 - (t -= 2) * t) + 1);
};

var easeSineIn = function (t) {
    return 1 - m.cos(t * m.PI / 2);
};

var easeSineOut = function (t) {
	return m.sin(t * m.PI / 2);
};

var easeSineInOut = function (t) {
	return 0.5 * (1 - m.cos(m.PI * t));
};

var easeExpoIn = function (t) {
	return t === 0 ? 0 : m.pow(1024, t - 1);
};

var easeExpoOut = function (t) {
	return t === 1 ? 1 : 1 - m.pow(2, - 10 * t);
};

var easeExpoInOut = function (t) {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if ((t *= 2) < 1) {
        return 0.5 * m.pow(1024, t - 1);
    }
    return 0.5 * (- m.pow(2, - 10 * (t - 1)) + 2);
};

var lerpColor = function( progress, hexStart, hexEnd ) {
    
}

var wrapEasing = function( fn ) {
    return function( progress, start, end ) {
        return start + fn( progress ) * ( end - start );
    }
};

var easing = {
    'linear'    : wrapEasing( easeInOut(1) ),
    'BackIn'    : wrapEasing( easeBackIn ),
    'BackOut'   : wrapEasing( easeBackOut ),
    'BackInOut' : wrapEasing( easeBackInOut ),
    'BounceIn'  : wrapEasing( easeBounceIn ),
    'BounceOut' : wrapEasing( easeBounceOut ),
    'BounceInOut': wrapEasing( easeBounceInOut ),
    'CircIn'    : wrapEasing( easeCircIn ),
    'CircOut'   : wrapEasing( easeCircOut ),
    'CircInOut' : wrapEasing( easeCircInOut ),
    'CubicIn'   : wrapEasing( easeIn(3) ),
    'CubicOut'  : wrapEasing( easeOut(3) ),
    'CubicInOut': wrapEasing( easeInOut(3) ),
    'ElasticIn' : wrapEasing( easeElasticIn ),
    'ElasticOut': wrapEasing( easeElasticOut ),
    'ElasticInOut': wrapEasing( easeElasticInOut ),
    'ExpoIn'    : wrapEasing( easeExpoIn ),
    'ExpoOut'   : wrapEasing( easeExpoOut ),
    'ExpoInOut' : wrapEasing( easeExpoInOut ),
    'QuadIn'    : wrapEasing( easeIn(2) ),
    'QuadOut'   : wrapEasing( easeOut(2) ),
    'QuadInOut' : wrapEasing( easeInOut(2) ),
    'QuartIn'   : wrapEasing( easeIn(4) ),
    'QuartOut'  : wrapEasing( easeOut(4) ),
    'QuartInOut': wrapEasing( easeInOut(4) ),
    'QuintIn'   : wrapEasing( easeIn(5) ),
    'QuintOut'  : wrapEasing( easeOut(5) ),
    'QuintInOut': wrapEasing( easeInOut(5) ),
    'SineIn'    : wrapEasing( easeSineIn ),
    'SineOut'   : wrapEasing( easeSineOut ),
    'SineInOut' : wrapEasing( easeSineInOut )
};

var rAF, cAF;

// borrowed from https://github.com/soulwire/sketch.js/blob/master/js/sketch.js
(function shimAnimationFrame() {
    var vendors, a, b, c, idx, now, dt, id;
    var then = 0;

    vendors = [ 'ms', 'moz', 'webkit', 'o' ];
    a = 'AnimationFrame';
    b = 'request' + a;
    c = 'cancel' + a;

    rAF = wnd[ b ];
    cAF = wnd[ c ];

    for ( var idx = vendors.lenght; !rAF && idx--; ) {
        rAF = wnd[ vendors[ idx ] + 'Request' + a ];
        cAF = wnd[ vendors[ idx ] + 'Cancel' + a ];
    };

    rAF = rAF || function( callback ) {
        now = _now();
        dt = m.max( 0, 16 - ( now - then ) );
        id = setTimeout(function() {
            callback( now + dt );
        }, dt );
        then = now + dt;
        return id;
    };

    cAF = cAF || function( id ) {
        clearTimeout( id );
    };
})();

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

// TODO: add a sleep tweens layer to avoid main tweens array from getting too big
var tweens = [];
var timelines = [];
var tickers = [];
var mainTicker;
var sleeping = true;
var cleanupDirty = false;

var PROP_NUMBER = 0;
var PROP_ARRAY = 1;
var PROP_COLOR = 2;
var PROP_WAYPOINTS = 3;
var PROP_INVALID = 4;

var TL_ITEM_TWEEN = 0;
var TL_ITEM_CALLBACK = 1;
var TL_ITEM_LINE_SYNC = 2;
var TL_ITEM_LINE_ASYNC = 3
var TL_ITEM_DELAY = 4;
var TL_ITEM_LABEL = 5;
var TL_ITEM_INVALID = 6;

// Flat dictionary to track all objects properties.
// Id's are formed from objectId + propertyName
var propDict = {};
var propDictIdx = 1;

function wakeup() {
    if ( sleeping === true ) {
        sleeping = false;
        setTimeout( function() {
            onFrame();
        }, 1 );
    }
}

var PROP_NUMBER = 0;
var PROP_ARRAY = 1;
var PROP_COLOR = 2;
var PROP_WAYPOINTS = 3;
var PROP_INVALID = 4;

function Tween() {}

Tween.prototype = {
    delay: function( seconds ) {
        this._delayLeft = this._delay = seconds;
        return this;
    },
    progress: function( progress, accountForDelay ) {
        queueTween( this );
        seekProgress( this, progress, true, accountForDelay );
        tweenTick( this, 0 );
        return this;
    },
    time: function( seconds, accountForDelay ) {
        seek( this, seconds, accountForDelay, true );
        return this;
    },
    render: function() {
        overrideDictionaryProperties( this );
        updateTweenProperties( this );
    },
    restart: function( accountForDelay, immediateRender ) {

        // default for accountForDelay is false
        accountForDelay = _isBoolean( accountForDelay ) ? accountForDelay : false;
        
        // default for immediateRender is true
        immediateRender = _isBoolean( immediateRender ) ? immediateRender : true;
        
        this._lastElapsedTime = 0;
        this._elapsedTime = 0;
        this._progress = 0;
        this._totalProgress = 0;
        this._running = true;
        this._direction = 1;
        this.resume();

        if ( immediateRender ) {
            this.render();
        }

        return this;
    },
    reverse: function() {
        this._direction *= -1;
        return this;
    },
    timeScale: function( scale ) {
        if ( _isNumber( scale ) && scale > 0 ) {
            this._timeScale = scale;
        }
        return this;
    },
    clear: function() {
        if ( arguments.length > 0 ) {

            // fix: avoid optimization bailout
            var args = [];
            for ( var i = 0; i < arguments.length; ++i ) {
                args[ i ] = arguments[ i ];
            }
            disableProperties( this, args );

        } else {
            this._running = false;
            disableProperties( this );
            this._firstNode = undefined;
        }
        cleanupDirty = true;
        return this;
    },
    pause: function() {
        this._running = false;
        cleanupDirty = true;
        return this;
    },
    resume: function() {
        this._running = true;
        queueTween( this );
        return this;
    },
    toString: function() {
        return '[object Tween]';
    }
};

function TweenProperty( id, name, target, origProps, targetProps ) {
    this.id = id;
    this.name = name;
    this.target = target;
    this.origProps = origProps;
    this.targetProps = targetProps;
    this.enabled = true;
    this.length = 0;
}

TweenProperty.prototype = {
    _expandArrayProperties: function( o, t ) {
        var tp = this.target[ this.name ];
        var len = m.max( o.length, t.length );
        for ( var i = 0; i < len; i++ ) {
            o[ i ] = o[ i ] != undefined ? o[ i ] : tp[ i ];
            t[ i ] = t[ i ] != undefined ? t[ i ] : tp[ i ];
        }
        this.length = len;
    },
    _getPropertyType: function( s, e, t ) {
        if ( _isNumber( s ) &&
         _isNumber( e ) &&
         _isNumber( t ) ) {
            return PROP_NUMBER;
        } else if (
            colorRE.test( s ) &&
            colorRE.test( e ) &&
            colorRE.test( t ) ) {
                return PROP_COLOR;
        } else if ( 
            _isArray( s ) &&
            _isArray( e ) &&
            _isArray( t ) ) {
                return PROP_ARRAY;
        } else if (
            _isNumber( s ) &&
            _isArray( e ) &&
            _isNumber( t )
        ) {
            return PROP_WAYPOINTS;
        } else {
            return PROP_INVALID;
        }
    },
    refresh: function() {
        this.start = this.origProps[ this.name ];
        if ( this.start === undefined ) {
            this.start = this.target[ this.name ];
        }
        
        this.end = this.targetProps[ this.name ];
        if ( this.end === undefined ) {
            this.end = this.target[ this.name ];
        }

        this.type = getPropertyType(
            this.start, this.end, this.target[ this.name ] );
        
        if ( this.type == PROP_ARRAY ) {
            this._expandArrayProperties( this.start, this.end );
        } else if ( this.type == PROP_WAYPOINTS ) {
            this.waypoints = [ this.start ].concat( this.end );
        } else if ( this.type == PROP_COLOR ) {
            this.colorStart = _hexStrToRGB( this.start );
            this.colorEnd = _hexStrToRGB( this.end );
        }
    }
};

/*
* Reassigns all <enabled> properties from tween targets into the dictionary,
* if a property exists it will disable it prior deletion
*/
function overrideDictionaryProperties( tween ) {
    var currentNode = tween._firstNode;

    do {
        for ( var idx = currentNode.properties.length; idx--; ) {
            var property = currentNode.properties[ idx ];
            if ( property.enabled ) {
                
                // If there is a running property disable it
                // and remove it from dictionary
                if ( propDict[ property.id ] && propDict[ property.id ] !== property) {
                    propDict[ property.id ].enabled = false;
                    delete propDict[ property.id ];
                }

                propDict[ property.id ] = property;
            }
        }
    } while ( currentNode = currentNode.next );
}

/*
* Sync values between object properties and target properties
*/
function syncTargetProperties( tween ) {
    var currentNode = tween._firstNode;
    do {
        for ( var idx = currentNode.properties.length; idx--; ) {
            currentNode.properties[ idx ].refresh();
        }
    } while ( currentNode = currentNode.next );
}

/*
* Disables only <enabled> properties of a tween and removes them from dictionary.
* Keys param specifies an array containing which properties to disable, by default
* if no keys param is provided all enabled properties will be disabled.
*/
function disableProperties( tween, keys ) {

    var all = ! _isArray( keys );
    var currentNode = tween._firstNode;

    do {
        for ( var idx = currentNode.properties.length; idx--; ) {

            var property = currentNode.properties[ idx ];

            if ( property.enabled && ( all || keys.indexOf(property.name) > -1 ) ) {
                property.enabled = false;
                delete propDict[ property.id ];
            }

        }
    } while ( currentNode = currentNode.next );
}


function getLocalProgress( obj ) {
    if ( obj._yoyo && obj._elapsedTime > obj._duration + obj._delay ) {
        // when yoyo is active we need to invert
        // the progress on each odd lap
        var local = obj._duration + obj._repeatDelay + DEC_FIX;
        var elapsed = m.max( 0, obj._elapsedTime - obj._delay );
        var lapOdd = m.ceil( elapsed / local ) % 2 === 0;
        return lapOdd ? 1 - obj._progress : obj._progress;
    } else {
        return obj._progress;
    }
}

function updateTweenProperties( tween ) {
    var currentNode = tween._firstNode;
    var updatedTargets = 0;

    do {
        var progress = getLocalProgress( tween );
        var updated = false;
        for ( var idx = currentNode.properties.length; idx--; ) {
            var p = currentNode.properties[ idx ];
            if ( p.enabled && p.type !== PROP_INVALID ) {
                
                switch( p.type ) {
                    case PROP_ARRAY:
                        var arr = currentNode.target[ p.name ];
                        for ( var j = 0; j < p.length; j++ ) {
                            var start = p.start[ j ];
                            var end = p.end[ j ] - start;
                            
                            arr[ j ] = tween._ease(
                                progress,
                                start,
                                end
                            );
                        }
                        break;
                    case PROP_NUMBER:
                        currentNode.target[ p.name ] = tween._ease(
                            progress,
                            p.start,
                            p.end
                        );
                        break;
                    case PROP_WAYPOINTS:
                        var len = p.waypoints.length - 1;
                        var a = len * progress;
                        var b = m.floor( a );
                        var val = tween._ease(
                            a - b,
                            p.waypoints[ b ],
                            p.waypoints[ b + 1 > len ? len : b + 1 ]
                        );
                        currentNode.target[ p.name ] = val;
                        break;
                    case PROP_COLOR:
                        var r = tween._ease( progress, p.colorStart[ 0 ], p.colorEnd[ 0 ] );
                        var g = tween._ease( progress, p.colorStart[ 1 ], p.colorEnd[ 1 ] );
                        var b = tween._ease( progress, p.colorStart[ 2 ], p.colorEnd[ 2 ] );
                        var hex = ( ( r * 255 ) << 16 ) + ( ( g * 255) << 8 ) + ( b * 255 | 0 );
                        currentNode.target[ p.name ] = '#' + hex.toString( 16 );
                        break;
                }
                
                updated = p.type !== PROP_INVALID;
            } else {
                // We remove the property entirely to avoid performance
                // issues due many disabled properties loopping.
                // Restarting the loop will bring back the removed
                // properties by calling resetTargetProperties()
                currentNode.properties.splice( idx, 1 );
            }
        }

        updatedTargets += updated | 0;

    } while ( currentNode = currentNode.next );

    return updatedTargets;
}



/*
* Builds a linked list of all objects and properties to iterate
* It stores the first linked object in the current tween
*/
function resetTargetProperties( tween, targetProperties, originProperties ) {

    var targets = _isArray( tween._target ) ? tween._target : [ tween._target ];
    var prevNode, firstNode;

    // merge keys of targetProperties and originProperties without duplicates
    var allKeys = Object.keys( targetProperties );
	var oKeys = Object.keys( originProperties );
	for ( var i = 0; i < oKeys.length; i++ ) {
		if ( ! targetProperties[ oKeys[ i ] ] ) {
			allKeys.push( oKeys[ i ] );
		}
	}

    for ( var idx = targets.length; idx--; ) {
        var currentTarget = targets[ idx ];

        // Tag object id without overwrite
        currentTarget._twkId = currentTarget._twkId || propDictIdx++;

        var properties = [];
        for ( var pIdx = 0; pIdx < allKeys.length; pIdx++ ) {
            var key = allKeys[ pIdx ];

            // Check if key is not a tween property
            // also we check that the property exists on target
            if ( !tween.hasOwnProperty( key ) && key in currentTarget ) {
                var property = new TweenProperty(
                    currentTarget._twkId + key,
                    key,
                    currentTarget,
                    originProperties,
                    targetProperties
                );

                property.refresh();
                properties.push( property );
            }
        }

        var currentNode = {
            target      : currentTarget,
            properties  : properties
        };

        firstNode = firstNode || currentNode;

        if ( prevNode ) {
            prevNode.next = currentNode;
        }

        prevNode = currentNode;
    }

    tween._firstNode = firstNode;
}

function Ticker( params ) {
    params = params || {};
    this._onTick = _isFunction( params.onTick ) ? params.onTick : _noop;
    this.setFPS( params.fps );
    this.resume();
}

Ticker.prototype = {
    pause: function() {
        this._running = false;
        return this;
    },
    resume: function() {
        this._then = _now();
        this._running = true;
        queueTicker( this );
        return this;
    },
    tick: function( time ) {
        var delta = time - this._then;

        if ( delta > this._fpsStep ) {
            var drop = delta % this._fpsStep;
            this._then = time - drop;
            this._onTick( m.min( delta - drop, this._fpsStep * 4 ) / 1000 );
        }

        return this;
    },
    setFPS: function( fps ) {
        this.fps = _isNumber( fps ) && fps > 0 ? fps : 60;
        this._fpsStep = 1000 / this.fps;
    },
    toString: function() {
        return '[object Ticker]';
    }
}


/*
* Disables only <enabled> properties of a tween and removes them from dictionary.
* Keys param specifies an array containing which properties to disable, by default
* if no keys param is provided all enabled properties will be disabled.
*/
function disableProperties( tween, keys ) {

    var all = ! _isArray( keys );
    var currentNode = tween._firstNode;

    do {
        for ( var idx = currentNode.properties.length; idx--; ) {

            var property = currentNode.properties[ idx ];

            if ( property.enabled && ( all || keys.indexOf(property.name) > -1 ) ) {
                property.enabled = false;
                delete propDict[ property.id ];
            }

        }
    } while ( currentNode = currentNode.next );
}

/*
* Reassigns all <enabled> properties from tween targets into the dictionary,
* if a property exists it will disable it prior deletion
*/
function overrideDictionaryProperties( tween ) {
    var currentNode = tween._firstNode;

    do {
        for ( var idx = currentNode.properties.length; idx--; ) {
            var property = currentNode.properties[ idx ];
            if ( property.enabled ) {
                
                // If there is a running property disable it
                // and remove it from dictionary
                if ( propDict[ property.id ] && propDict[ property.id ] !== property) {
                    propDict[ property.id ].enabled = false;
                    delete propDict[ property.id ];
                }

                propDict[ property.id ] = property;
            }
        }
    } while ( currentNode = currentNode.next );
}

/*
* Sync values between object properties and target properties
*/
function syncTargetProperties( tween ) {
    var currentNode = tween._firstNode;
    do {
        for ( var idx = currentNode.properties.length; idx--; ) {
            currentNode.properties[ idx ].refresh();
        }
    } while ( currentNode = currentNode.next );
}

function getPropertyType( s, e, t ) {

    if ( _isNumber( s ) &&
         _isNumber( e ) &&
         _isNumber( t ) ) {
            return PROP_NUMBER;
    } else if (
        colorRE.test( s ) &&
        colorRE.test( e ) &&
        colorRE.test( t ) ) {
            return PROP_COLOR;
    } else if ( 
        _isArray( s ) &&
        _isArray( e ) &&
        _isArray( t ) ) {
            return PROP_ARRAY;
    } else if (
        _isNumber( s ) &&
        _isArray( e ) &&
        _isNumber( t )
    ) {
        return PROP_WAYPOINTS;
    } else {
        return PROP_INVALID;
    }
}

function TweenProperty( id, name, target, origProps, targetProps ) {
    this.id = id;
    this.name = name;
    this.target = target;
    this.origProps = origProps;
    this.targetProps = targetProps;
    this.enabled = true;
    this.length = 0;
}

TweenProperty.prototype = {
    _expandArrayProperties: function( o, t ) {
        var tp = this.target[ this.name ];
        var len = m.max( o.length, t.length );
        for ( var i = 0; i < len; i++ ) {
            o[ i ] = o[ i ] != undefined ? o[ i ] : tp[ i ];
            t[ i ] = t[ i ] != undefined ? t[ i ] : tp[ i ];
        }
        this.length = len;
    },
    refresh: function() {
        this.start = this.origProps[ this.name ];
        if ( this.start === undefined ) {
            this.start = this.target[ this.name ];
        }
        
        this.end = this.targetProps[ this.name ];
        if ( this.end === undefined ) {
            this.end = this.target[ this.name ];
        }

        this.type = getPropertyType(
            this.start, this.end, this.target[ this.name ] );
        
        if ( this.type == PROP_ARRAY ) {
            this._expandArrayProperties( this.start, this.end );
        } else if ( this.type == PROP_WAYPOINTS ) {
            this.waypoints = [ this.start ].concat( this.end );
        } else if ( this.type == PROP_COLOR ) {
            this.colorStart = _hexStrToRGB( this.start );
            this.colorEnd = _hexStrToRGB( this.end );
        }
    }
};

function getLocalProgress( obj ) {
    if ( obj._yoyo && obj._elapsedTime > obj._duration + obj._delay ) {
        // when yoyo is active we need to invert
        // the progress on each odd lap
        var local = obj._duration + obj._repeatDelay + DEC_FIX;
        var elapsed = m.max( 0, obj._elapsedTime - obj._delay );
        var lapOdd = m.ceil( elapsed / local ) % 2 === 0;
        return lapOdd ? 1 - obj._progress : obj._progress;
    } else {
        return obj._progress;
    }
}

function updateTweenProperties( tween ) {
    var currentNode = tween._firstNode;
    var updatedTargets = 0;

    do {
        var progress = getLocalProgress( tween );
        var updated = false;
        for ( var idx = currentNode.properties.length; idx--; ) {
            var p = currentNode.properties[ idx ];
            if ( p.enabled && p.type !== PROP_INVALID ) {
                
                switch( p.type ) {
                    case PROP_ARRAY:
                        var arr = currentNode.target[ p.name ];
                        for ( var j = 0; j < p.length; j++ ) {
                            var start = p.start[ j ];
                            var end = p.end[ j ] - start;
                            
                            arr[ j ] = tween._ease(
                                progress,
                                start,
                                end
                            );
                        }
                        break;
                    case PROP_NUMBER:
                        currentNode.target[ p.name ] = tween._ease(
                            progress,
                            p.start,
                            p.end
                        );
                        break;
                    case PROP_WAYPOINTS:
                        var len = p.waypoints.length - 1;
                        var a = len * progress;
                        var b = m.floor( a );
                        var val = tween._ease(
                            a - b,
                            p.waypoints[ b ],
                            p.waypoints[ b + 1 > len ? len : b + 1 ]
                        );
                        currentNode.target[ p.name ] = val;
                        break;
                    case PROP_COLOR:
                        var r = tween._ease( progress, p.colorStart[ 0 ], p.colorEnd[ 0 ] );
                        var g = tween._ease( progress, p.colorStart[ 1 ], p.colorEnd[ 1 ] );
                        var b = tween._ease( progress, p.colorStart[ 2 ], p.colorEnd[ 2 ] );
                        var hex = ( ( r * 255 ) << 16 ) + ( ( g * 255) << 8 ) + ( b * 255 | 0 );
                        currentNode.target[ p.name ] = '#' + hex.toString( 16 );
                        break;
                }
                
                updated = p.type !== PROP_INVALID;
            } else {
                // We remove the property entirely to avoid performance
                // issues due many disabled properties loopping.
                // Restarting the loop will bring back the removed
                // properties by calling resetTargetProperties()
                currentNode.properties.splice( idx, 1 );
            }
        }

        updatedTargets += updated | 0;

    } while ( currentNode = currentNode.next );

    return updatedTargets;
}

/*
* Updates the properties of a given tween
*/
function tweenTick( tween, dt ) {
    notifyStart( tween );
    if ( tween._elapsedTime - tween._delay > 0 ) {
        if ( tween._syncNextTick ) {
            tween._syncNextTick = false;
            // Update current properties from targets
            syncTargetProperties( tween );

            // clear all previous active properties in tween
            overrideDictionaryProperties( tween );
        }

        // Update tween properties with current progress
        var updatedTargets = updateTweenProperties( tween );

        // Fire onUpdate notification only if one or more properties were updated
        if ( updatedTargets > 0 ) {
            notifyOnUpdate( tween );
        } else {

            // No updated targets means all properties where overrided
            // We clear the tween early to avoid further notifications
            tween.clear();
        }
    } else {
        updateTweenProperties( tween );
    }
    
    notifyOnRepeat( tween );
    notifyOnComplete( tween );
    updateState( tween );
    applyStep( tween, dt );
}

/*
* Builds a linked list of all objects and properties to iterate
* It stores the first linked object in the current tween
*/
function resetTargetProperties( tween, targetProperties, originProperties ) {

    var targets = _isArray( tween._target ) ? tween._target : [ tween._target ];
    var prevNode, firstNode;

    // merge keys of targetProperties and originProperties without duplicates
    var allKeys = Object.keys( targetProperties );
	var oKeys = Object.keys( originProperties );
	for ( var i = 0; i < oKeys.length; i++ ) {
		if ( ! targetProperties[ oKeys[ i ] ] ) {
			allKeys.push( oKeys[ i ] );
		}
	}

    for ( var idx = targets.length; idx--; ) {
        var currentTarget = targets[ idx ];

        // Tag object id without overwrite
        currentTarget._twkId = currentTarget._twkId || propDictIdx++;

        var properties = [];
        for ( var pIdx = 0; pIdx < allKeys.length; pIdx++ ) {
            var key = allKeys[ pIdx ];

            // Check if key is not a tween property
            // also we check that the property exists on target
            if ( !tween.hasOwnProperty( key ) && key in currentTarget ) {
                var property = new TweenProperty(
                    currentTarget._twkId + key,
                    key,
                    currentTarget,
                    originProperties,
                    targetProperties
                );

                property.refresh();
                properties.push( property );
            }
        }

        var currentNode = {
            target      : currentTarget,
            properties  : properties
        };

        firstNode = firstNode || currentNode;

        if ( prevNode ) {
            prevNode.next = currentNode;
        }

        prevNode = currentNode;
    }

    tween._firstNode = firstNode;
}

function queueTween( tween ) {
    if ( ! tween._queued ) {
        resetTargetProperties( tween, tween._to, tween._from );
        tweens.push( tween );
        tween._queued = true; 
        // refresh all properties
        tween._syncNextTick = true;
        wakeup();
    }
}


function queueTicker( ticker ) {
    if ( ! ticker._queued ) {
        tickers.push( ticker );
        wakeup();
    }
}

function Timeline ( params ) {
    initTimeline( this, params );
    this._definitions = {};
    this._computedItems = [];
    this._lastDirection = this._direction;
    this._lastElapsedTime = 0;
    this._startLabel = '';
    this._ticker = newTicker({
        onTick: this.tick.bind( this ),
    });
    this._ticker.pause();
}

Timeline.prototype = {
    _precompute: function( label ) {
        if ( this._needsRecompute ) {
            label = label || this._startLabel;
            var items = computeTimeLineItems( this._definitions, label );
            this._computedItems = absShiftTimeLineItems( items );
            this._totalDuration = getItemsDuration( this._computedItems );
            console.log( this._totalDuration );
            this._needsRecompute = false;
        }
    },
    let: function( label, obj ) {
        var type = getDefinitionType( obj );
        if ( _isString( label ) && type != TL_ITEM_INVALID ) {
            
            var isLine = type == TL_ITEM_LINE_SYNC || type == TL_ITEM_LINE_ASYNC;
            if ( isLine && !isValidLine( this._definitions, obj ) ) {
                return this;
            }
            
            if ( type == TL_ITEM_TWEEN ) {
                // remove tween object from main renderer
                obj.stop();
            }

            this._definitions[ label ] = obj;
            this._needsRecompute = true;
        }
        return this;
    },
    tick: function( dt ) {
        this._precompute();
        timelineTick( this, dt );
        if ( ! this._running ) {
            this._ticker.clear();
        }
        return this;
    },
    delay: function( value ) {
        this._delay = _isNumber( value ) ? value : 0;
        return this;
    },
    plot: function( label ) {
        if ( typeof plotTimeline !== 'undefined' )
            plotTimeline( this, label );
        return this;
    },
    reverse: function() {
        this._direction *= -1;
        return this;
    },
    yoyo: function( value ) {
        this._yoyo = _isBoolean( value ) ? value: false;
        return this;
    },
    duration: function() {
        this._precompute();
        return this._totalDuration;
    },
    timeScale: function( value ) {
        this._timeScale = _isNumber( value ) ? m.max( 0, value ) : 1;
    },
    seek: function( seconds, accountForDelay ) {
        this._precompute();
        seek( this, seconds, accountForDelay, true );
        this.tick( 0 );
        return this;
    },
    progress: function( value, accountForDelay ) {
        this._precompute();
        seek( this, value, accountForDelay, false );
        this.tick( 0 );
        return this;
    },
    pause: function() {
        this._ticker.pause();
        return this;
    },
    resume: function() {
        this._ticker.resume();
        return this;
    },
    restart: function( accountForDelay ) {
        this._delayLeft = accountForDelay ? this._delay : 0;
        return this;
    },
    play: function( label ) {
        // TODO: validate label?
        this._startLabel = label;
        this._ticker.resume();
        return this;
    },
    clear: function() {
        this._ticker.clear();
        return this;
    }
};

function newTimeline( params ) {
    return new Timeline( params );
}

function getDefinitionType( obj ) {
    if ( obj instanceof Tween ) {
        return TL_ITEM_TWEEN;
    } else if ( _isNumber( obj ) ){
        return TL_ITEM_DELAY;
    } else if ( _isString( obj ) ) {
        return TL_ITEM_LABEL;
    } else if ( _isFunction( obj ) ) {
        return TL_ITEM_CALLBACK;
    } else if ( _isArray( obj ) ) {
        return TL_ITEM_LINE_SYNC;
    } else if ( _isObject( obj ) ) {
        return TL_ITEM_LINE_ASYNC;
    } else {
        return TL_ITEM_INVALID;
    }
}

function isValidLine( labels, lineArray ) {
    var valid = true;
    for( var i = 0; i < lineArray.length; i++ ) {
        var item = lineArray[ i ];
        var type = getDefinitionType( item );
        if ( type == TL_ITEM_INVALID ) {
            valid = false;
        } else if ( type == TL_ITEM_LABEL ) {
            valid = labels[ item ] !== undefined;
        
        // validate nested arrays recursively
        } else if ( type == TL_ITEM_LINE_SYNC ) {
            valid = isValidLine( labels, item );
        
        // validate that objects have only numbers assigned
        // only numbers are valid
        } else if ( type == TL_ITEM_LINE_ASYNC ) {
            var keys = Object.keys( item );
            for( var j = 0; j < keys.length; j++ ) {
                var key = keys[ j ];
                if ( !_isNumber( item[ key ] ) ) {
                    valid = false;
                    break;
                }
            }
        }

        if ( ! valid ) {
            console.warn( 'Unknown label value:', item );
            break;
        }
    }
    return valid;
}

function TimelineItem( obj, type, start, end ) {
    this._obj = obj;
    this._type = type;
    this._start = start;
    this._end = end;
    this._eventsEnabled = true;
}

// Get the final object of a label
// resolves indirections of n labels to an object
function resolveLabel( items, val ) {
    return _isString( val ) ? resolveLabel( items, items[ val ] ) : val;
}

// Resolves all labels in items to their final objects
// returns a flatten array with all the items
function resolveItemLabels( items, arr ) {
    var done = true;
    for( var i = 0; i < arr.length; i++ ) {
        var val = resolveLabel( items, arr[ i ] );

        if ( _isString( val ) ) {
            done = false;
            break;
        }

        if ( _isArray( val ) ) {
            arr[ i ] = resolveItemLabels( items, val );
        } else {
            arr[ i ] = val;
        }
    }

    if ( ! done ) {
        arr = resolveItemLabels( items, arr );
    }
    
    return _flatten( arr );
}

// adjust current items to start from 0
// shifting negative offsets over all items
function absShiftTimeLineItems( items ) {
    var minOffset = _min( items, '_start' );
    if ( minOffset < 0 ) {
        var shift = m.abs( minOffset );
        for ( var i = 0; i < items.length; i++ ) {
            items[ i ]._start += shift;
            items[ i ]._end += shift;
        }
    }
    return items;
}

function getItemsDuration( items ) {
    return _max( items, '_end' ) - _min( items, '_start' );
}

function computeTimeLineItems( items, startLabel, offset ) {
    offset = offset || 0 ;
    var result = [];
    var line = resolveLabel( items, startLabel );
    line = _isArray( line ) ? line : [ line ];

    // resolve all labels to objects and flatten all
    // excluding async blocks
    var rLine = resolveItemLabels( items, line );
    for ( var i = 0; i < rLine.length; i++ ) {
        var obj = rLine[ i ];
        var type = getDefinitionType( obj );
        if ( type == TL_ITEM_DELAY ) {
            offset += obj;
        } else {
            var start = offset; 
            var end = offset;
            
            if ( type == TL_ITEM_TWEEN ) {
                end = start + obj._totalDuration;
            }

            if ( type == TL_ITEM_LINE_ASYNC ) {
                var keys = Object.keys( obj );
                var subItems = [];
                var min = 0;
                for( var j = 0; j < keys.length; j++ ) {
                    var key = keys[ j ];
                    min = m.min( min, obj[ key ] );

                    // apply global offset
                    var aOffset = obj[ key ] + offset;

                    // compute label recursively
                    subItems = subItems.concat(
                        computeTimeLineItems( items, key, aOffset ) );
                }
                result = result.concat( subItems );
                
                // add current block duration to global offset ( positive only )
                offset += getItemsDuration( subItems );

                // sub negative displacement in block to global offset
                offset += min < 0 ? min : 0;
            } else {
                result.push( new TimelineItem( obj, type, start, end ) );
                offset += end - start;
            }
        }
    }
    return result;
}

function initTimeline( tl, params ) {
    tl._initted = false;
    initObjectCallbacks( tl, params );
    initObjectRunnable( tl, params );
    tl._initted = true;
}


function timelineTick( tl, dt ) {
    if ( tl._delayLeft === 0 ) {

        notifyStart( tl );

        for( var i = 0; i < tl._computedItems.length; i++ ) {
            var item = tl._computedItems[ i ];
            if ( tl._direction == 1 && tl._elapsedTime >= item._start ||
                 tl._direction == -1 && tl._elapsedTime <= item._end ) {
                if ( item._type == TL_ITEM_TWEEN ) {
                    seek( item._obj, tl._elapsedTime - item._start );
                    tweenTick( item._obj, 0 );
                } else if ( item._type == TL_ITEM_CALLBACK && item._eventsEnabled ) {
                    item._obj.apply( tl )
                    item._eventsEnabled = false;
                }
            }
        }
    }
    
    notifyOnComplete( tl );
    updateState( tl );
    applyStep( tl, dt );
}

function getEasing( val ) {
    if ( easing[ val ] ) {
        return easing[ val ];
    } else if ( _isArray( val ) && val.length == 4 ) {
        return wrapEasing( bezierEase.apply( this, val ) );
    } else {
        if ( val != undefined ) {
            var easingNames = Object.keys( easing ).join(' | ');
            console.warn( 'Invalid easing name: ' + val );
            console.warn( 'Available easings: ' + easingNames );
        }
        return easing.linear;
    }
}

function setTweenDuration( tween ) {
    
    var total = 0;
    var tweenDuration = tween._duration;
    var repeatDelay = tween._repeatDelay;
    var delay = tween._delay;
    
    if ( tween._infinite ) {
        
        // if is an infinite loop then just 
        // take two laps as the total duration
        total = tween._duration * 2;
        total += delay + repeatDelay * 2;
    } else if ( tween._repeat > 0 ) {
        var repeatDuration = ( tweenDuration + repeatDelay ) * tween._repeat;
        total = tweenDuration + repeatDuration + delay;
    } else {
        total = tweenDuration + delay;
    }

    tween._totalDuration = total;
}

function initTween( tween, target, params ) {
    tween._initted = false;
    var duration = params.shift();
    var cfg = params.shift();

    // expecting duration in position 1
    // buf if an object was given instead
    // then treat it as Tween.set
    if ( _isObject( duration ) ) {
        cfg = duration;
        duration = 0;
    }

    tween._target       = target;
    
    tween._syncNextTick = true;
    tween._ease         = getEasing( cfg.ease );
    tween._from         = _isObject( cfg.from ) ? cfg.from : {};
    tween._to           = _isObject( cfg.to ) ? cfg.to: {};
    tween._duration     = _isNumber( duration ) ? m.max( 0, duration ) : 0;
    tween._initted      = true;
    initObjectRunnable( tween, cfg );
    initObjectCallbacks( tween, cfg );
    setTweenDuration( tween );
}

function executeOnAllTweens ( funcName ) {
    return function() {
        for ( var idx = tweens.length; idx--; ) {
            var tween = tweens[ idx ];
            tween[ funcName ].apply( tween, arguments );
        }
    };
}

function updateTweens( delta ) {
    delta = m.max( 0, delta );
    // update tweens (order matters)
    for ( var idx = 0, length = tweens.length; idx < length; idx++  ) {
        tweens[ idx ]._running && tweenTick( tweens[ idx ], delta );
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

function onFrame() {
    if ( cleanupDirty ) {
        cleanupRunnable( tickers );
        cleanupRunnable( tweens );
        cleanupDirty = false;
    }

    // Update tickers
    for ( var idx = 0; idx < tickers.length; idx++ ) {
        tickers[ idx ].tick( _now() );
    }

    if ( tickers.length > 0 && tweens.length > 0 ) {
        rAF( onFrame );
    } else {
        sleeping = true;
    }

}

function newTicker( params ) {
    return new Ticker( params );
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

function newTweenFactory() {        
    return function create() {

        // fix: avoid optimization bailout
        // https://github.com/petkaantonov/bluebird/wiki/Optimization-killers
        var i = arguments.length;
        var args = [];
        while (i--) args[i] = arguments[i];
        
        var target = args.shift();
        var tween = undefined;
        if ( typeof target == 'object' && args.length > 0 ) {
            tween = new Tween();
            initTween( tween, target, args );
        } else {
            throw 'Invalid Tween';
        }
        
        if ( tween._initted ) {
            queueTween( tween );
        }
        return tween;
    };
}

mainTicker = new Ticker( { onTick: updateTweens } );

var instance = new function Tweenkey(){};

return _extend( instance, {
    set         : newTweenFactory(),
    tween       : newTweenFactory(),
    clearAll    : executeOnAllTweens( 'clear' ),
    clearTweensOf: function() { console.log('todo'); },
    pauseAll    : executeOnAllTweens( 'pause' ),
    resumeAll   : executeOnAllTweens( 'resume' ),
    timeline    : newTimeline,
    ticker      : newTicker,
    update      : manualStep,
    autoUpdate  : setAutoUpdate,
    setFPS      : mainTicker.setFPS.bind( mainTicker )
} );


}));