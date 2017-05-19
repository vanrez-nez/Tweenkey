(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Tweenkey = factory());
}(this, (function () { 'use strict';

var DEC_FIX = 0.000001;
var colorRE = new RegExp(/(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i);

var reserved = { 
    to: 0, from: 1, ease: 2, yoyo: 3, delay: 4, repeat: 5,
    onStart: 6, inverted: 7, onUpdate: 8, autoStart: 9,
    onComplete: 10, repeatDelay: 11, onRepeat: 12
};
    
window.performance = (window.performance || {
    offset: Date.now(),
    now: function now(){
        return Date.now() - this.offset;
    }
});

var TYPE_FNC = ({}).toString;
function getTypeCheck( typeStr, fastType ) {
    return function ( obj ) {
        return fastType ? typeof obj === typeStr:
            TYPE_FNC.call( obj ) === typeStr;
    };
}

function minMax( obj, arr, key ) {
    return obj.apply( Math, arr.map( function ( item ) {
        return item[ key ];
    } ) );
}

var isFunction = getTypeCheck( 'function', true );
var isNumber = getTypeCheck( 'number', true );
var isBoolean = getTypeCheck( 'boolean', true );
var isString = getTypeCheck( 'string', true );
var isArray = Array.isArray || getTypeCheck( '[object Array]', false );


function isObject( obj ) {
    return !!obj && obj.constructor === Object;
}

function isUndefined( obj ) {
    return obj === undefined;
}

function flatten( arr ) { 
    return [].concat.apply( [], arr );
}

function hexStrToRGB( str ) {
    var hex = parseInt( str.slice( 1 ), 16 );
    return [
        (( hex >> 16 ) & 0xFF) / 255,
        (( hex >> 8 ) & 0xFF) / 255,
        ( hex & 0xFF ) / 255
    ];
}

function clamp( value, min, max ) {
    return Math.min( Math.max( value, min ), max );
}

function now() {
    return window.performance.now();
    //return window.performance && window.performance.now ? window.performance.now() : Date.now();
}



function noop() {
    return false;
}

function roundDecimals( n ) {
    return Math.round( n * 1000 ) / 1000;
}

function min( arr, key ) {
    return minMax( Math.min, arr, key );
}

function max( arr, key ) {
    return minMax( Math.max, arr, key );
}

function initObjectCallbacks( obj, params ) {
    var p = params || {};
    obj._onStart      = isFunction( p.onStart ) ? p.onStart : noop;
    obj._onUpdate     = isFunction( p.onUpdate ) ? p.onUpdate : noop;
    obj._onComplete   = isFunction( p.onComplete ) ? p.onComplete : noop;
    obj._onRepeat     = isFunction( p.onRepeat ) ? p.onRepeat : noop;
}

function initObjectRunnable( obj, params ) {
    var p = params || obj._params || {};
    var delay = isNumber( p.delay ) ? Math.max( 0, p.delay ) : 0;
    var repeatCount = isNumber( p.repeat ) ? p.repeat : 0;
    
    // if obj already have queued state dont changed
    obj._queued         = isBoolean( obj._queued ) ? obj._queued : false;
    obj._inverted       = isBoolean( p.inverted ) ? p.inverted : false;
    obj._totalDuration  = 0;
    obj._direction      = 1;
    obj._progress       = 0;
    obj._totalProgress  = 0;
    obj._elapsedTime    = 0;
    obj._lastElapsedTime= 0;
    obj._delay          = delay;
    obj._yoyo           = isBoolean( p.yoyo ) ? p.yoyo : false;
    // when repeat and yoyo are combined you can specify how many yoyo laps you want,
    // by default if no repeat param is set it repeats forever (-1)
    if ( isNumber( p.repeat ) === false && obj._yoyo ) {
        repeatCount = -1;
    }
    obj._repeat         = repeatCount;
    obj._infinite       = ( obj._yoyo === true && obj._repeat === -1 ) || obj._repeat === -1;
    obj._repeatDelay    = isNumber( p.repeatDelay ) ? Math.max( 0, p.repeatDelay ) : 0;
    obj._timeScale      = isNumber( p.timeScale ) && p.timeScale > 0 ? p.timeScale: 1;
    obj._running        = isBoolean( p.autoStart ) ? p.autoStart : true;
    obj._alive          = true;
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
    if ( obj._elapsedTime >= obj._delay ) {
        obj._onUpdate.call( obj, obj._target );
        return true;
    }
}

function notifyStart( obj ) {
        if ( obj._elapsedTime > obj._delay ) {
            var lastElapsed = Math.max( 0, obj._lastElapsedTime - obj._delay );
            if ( lastElapsed === 0 ) {
            obj._onStart.call( obj._target || obj );
            return true;
        }
    }
}

function notifyOnComplete( obj ) {
    
    if ( obj._elapsedTime >= obj._delay &&
        roundDecimals( obj._elapsedTime ) === roundDecimals( obj._totalDuration ) &&
        ! obj._infinite && obj._lastElapsedTime < obj._elapsedTime ) {
            obj._onComplete.call( obj, obj._target );
            return true;
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
            ( obj._infinite || Math.abs( tail ) < obj._repeat ) ) {
            obj._onRepeat.call( obj, obj._target );
            return true;
        }
    }
}

function setRunnableTotalDuration( obj ) {
    var total = 0;
    var objDuration = obj._duration;
    var repeatDelay = obj._repeatDelay;
    var delay = obj._delay;
    
    if ( obj._infinite ) {
        // if is an infinite loop then just 
        // take two laps as the total duration
        total = obj._duration * 2;
        total += delay + repeatDelay * 2;
    } else if ( obj._repeat > 0 ) {
        var repeatDuration = ( objDuration + repeatDelay ) * obj._repeat;
        total = objDuration + repeatDuration + delay;
    } else {
        total = objDuration + delay;
    }

    obj._totalDuration = total;
}


function seekProgress( obj, progress, global, accountForDelay ) {
    progress = clamp( progress, 0, 1 );
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
    
    var time = progress * ( duration - delayJump );
    seek( obj, time + delayJump, global );
}

// sets tweens and timelines to a certain time
function seek( obj, time ) {
    time = Math.max( 0, time );

    obj._lastElapsedTime = obj._elapsedTime;
    obj._elapsedTime = time;
    
    if ( obj._elapsedTime > obj._totalDuration ) {
        
        if ( ! obj._infinite ) {
            time = Math.min( obj._totalDuration, time );
            obj._elapsedTime = time;
        }

        time = ( time - obj._delay - DEC_FIX ) % obj._totalDuration + obj._delay;
    }
    
    obj._totalProgress = roundDecimals( time / obj._totalDuration );

    if ( time > obj._delay ) {
        time = time - obj._delay;
        var local = obj._duration + DEC_FIX;
        var elapsed = time % ( local + obj._repeatDelay );
        if ( elapsed <= local ) {
            obj._progress = roundDecimals( ( elapsed % local ) / local );
        } else {
            obj._progress = 1;
        }
    } else {
        obj._progress = 0;
    }

    if ( obj._inverted ) {
        obj._progress = 1 - obj._progress;
    }

    return;
    /*console.log(
        'local:', obj._progress,
        'global:', obj._totalProgress,
        'elapsed time:', obj._elapsedTime
    );*/
}

function getProgress( obj ) {
    if ( obj._yoyo && obj._elapsedTime > obj._duration + obj._delay ) {
        // when yoyo is active we need to invert
        // the progress on each odd lap
        var local = obj._duration + obj._repeatDelay + DEC_FIX;
        var elapsed = Math.max( 0, obj._elapsedTime - obj._delay );
        var lapOdd = Math.ceil( elapsed / local ) % 2 === 0;
        return lapOdd ? 1 - obj._progress : obj._progress;
    } else {
        return obj._progress;
    }
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

function easeIn( power ) { 
    return function ( t ) { 
        return Math.pow( t, power )
    }
}

function easeOut( power ) { 
    return function ( t ) {
        return 1 - Math.abs( Math.pow( t - 1, power ) )
    }
}

function easeInOut( power ) {
    return function ( t ) {
        return t < .5 ? easeIn( power )( t * 2 ) / 2 : easeOut( power )( t * 2 - 1 ) / 2 + 0.5
    }
}

// The following easing functions where taken from:
// https://github.com/tweenjs/tween.js/blob/master/src/Tween.js

function easeBackIn( t ) {
    var s = 1.70158;
    return t * t * ( ( s + 1) * t - s );
}

function easeBackOut( t ) {
    var s = 1.70158;
    return --t * t * ((s + 1) * t + s) + 1;
}

function easeBackInOut( t ) {
    var s = 1.70158 * 1.525;
    if ((t *= 2) < 1) {
        return 0.5 * (t * t * ((s + 1) * t - s));
    }
    return 0.5 * ((t -= 2) * t * ((s + 1) * t + s) + 2);
}

function easeBounceIn( t ) {
    return 1 - easeBounceOut( 1 - t);
}

function easeBounceOut( t ) {
    if (t < (1 / 2.75)) {
        return 7.5625 * t * t;
    } else if (t < (2 / 2.75)) {
        return 7.5625 * (t -= (1.5 / 2.75)) * t + 0.75;
    } else if (t < (2.5 / 2.75)) {
        return 7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375;
    } else {
        return 7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375;
    }
}

function easeBounceInOut( t ) {
    return t < 0.5 ? easeBounceIn(t * 2) * 0.5 : easeBounceOut(t * 2 - 1) * 0.5 + 0.5;
}

function easeElasticIn( t ) {
    if (t === 0) { return 0; }
    if (t === 1) { return 1; }
    return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
}

function easeElasticOut( t ) {
    if (t === 0) { return 0; }
    if (t === 1) { return 1; }
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
}

function easeElasticInOut( t ) {
    if (t === 0) { return 0; }
    if (t === 1) { return 1; }
    t *= 2;
    if (t < 1) {
        return -0.5 * Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
    }
    return 0.5 * Math.pow(2, -10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI) + 1;
}

function easeCircIn( t ) {
    return 1 - Math.sqrt(1 - t * t);
}

function easeCircOut( t ) {
    return Math.sqrt(1 - (--t * t));
}

function easeCircInOut( t ) {
    if ((t *= 2) < 1) {
        return - 0.5 * (Math.sqrt(1 - t * t) - 1);
    }
    return 0.5 * (Math.sqrt(1 - (t -= 2) * t) + 1);
}

function easeSineIn( t ) {
    return 1 - Math.cos(t * Math.PI / 2);
}

function easeSineOut( t ) {
	return Math.sin(t * Math.PI / 2);
}

function easeSineInOut( t ) {
	return 0.5 * (1 - Math.cos(Math.PI * t));
}

function easeExpoIn( t ) {
	return t === 0 ? 0 : Math.pow(1024, t - 1);
}

function easeExpoOut( t ) {
	return t === 1 ? 1 : 1 - Math.pow(2, - 10 * t);
}

function easeExpoInOut( t ) {
    if (t === 0) { return 0; }
    if (t === 1) { return 1; }
    if ((t *= 2) < 1) {
        return 0.5 * Math.pow(1024, t - 1);
    }
    return 0.5 * (- Math.pow(2, - 10 * (t - 1)) + 2);
}

function wrapEasing( fn ) {
    return function ( progress, start, end ) {
        return start + fn( progress ) * ( end - start );
    }
}

var Easings = {
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

function getEasing( val ) {
    if ( Easings[ val ] ) {
        return Easings[ val ];
    } else if ( isArray( val ) && val.length == 4 ) {
        return wrapEasing( bezierEase.apply( this, val ) );
    } else {
        if ( ! isUndefined( val ) ) {
            var easingNames = Object.keys( Easings ).join(' | ');
            console.warn( 'Invalid easing name: ' + val );
            console.warn( 'Available easings: ' + easingNames );
        }
        return Easings.linear;
    }
}

var PROP_NUMBER = 0;
var PROP_ARRAY = 1;
var PROP_COLOR = 2;
var PROP_WAYPOINTS = 3;
var PROP_INVALID = 4;

var TweenProperty = function TweenProperty( name, target, origProps, targetProps ) {
    this.name = name;
    this.target = target;
    this.origProps = origProps;
    this.targetProps = targetProps;
    this.enabled = true;
    this.length = 0;
    this.synced = false;
    this.type = PROP_INVALID;
};

TweenProperty.prototype = {
    _expandArrayProperties: function( o, t ) {
        /*
        Normalize <origin> and <target> arrays so they have the same
        size. We expand the smallest array ( or unexistent ) to match
        the number of elements in the the biggest array.
        */
        var tp = this.target[ this.name ];
        var len = Math.max( o.length, t.length );
        for ( var i = 0; i < len; i++ ) {
            o[ i ] = isUndefined( o[ i ] ) ? tp[ i ] : o[ i ];
            t[ i ] = isUndefined( t[ i ] ) ? tp[ i ] : t[ i ];
        }
        this.length = len;
    },
    sync: function() {
        sync( this );
    }
};

function sync( prop ) {
    if ( prop.synced ) {
        return;
    }
    
    prop.synced = true;
    prop.start = prop.origProps[ prop.name ];
    if ( isUndefined( prop.start ) ) {
        prop.start = prop.target[ prop.name ];
    }
    
    prop.end = prop.targetProps[ prop.name ];
    if ( isUndefined( prop.end ) ) {
        prop.end = prop.target[ prop.name ];
    }

    prop.type = getPropertyType(
        prop.start, prop.end, prop.target[ prop.name ] );
    
    if ( prop.type == PROP_ARRAY ) {
        prop._expandArrayProperties( prop.start, prop.end );
    } else if ( prop.type == PROP_WAYPOINTS ) {
        prop.waypoints = [ prop.start ].concat( prop.end );
    } else if ( prop.type == PROP_COLOR ) {
        prop.colorStart = hexStrToRGB( prop.start );
        prop.colorEnd = hexStrToRGB( prop.end );
    }
}

function getPropertyType( s, e, t ) {
    if ( isNumber( s ) &&
         isNumber( e ) &&
         isNumber( t ) ) {
            return PROP_NUMBER;
    } else if (
        colorRE.test( s ) &&
        colorRE.test( t ) &&
        colorRE.test( e ) ) {
            return PROP_COLOR;
    } else if ( 
        isArray( s ) &&
        isArray( e ) &&
        isArray( t ) ) {
            return PROP_ARRAY;
    } else if (
        isNumber( s ) &&
        isArray( e ) &&
        isNumber( t )
    ) {
        return PROP_WAYPOINTS;
    } else {
        return PROP_INVALID;
    }
}

var TWEEN_SET = 0;
var TWEEN_ALL = 1;
var TWEEN_FROM = 2;
var TWEEN_TO = 3;

// Dictionary to track all objects properties.
var propDict = {};
var propDictIdx = 1;

var Tween = function Tween( type, onStateChange ) {
    this._type = type;
    this._onStateChange = onStateChange;
};

Tween.prototype = {
    delay: function( seconds ) {
        this._delayLeft = this._delay = seconds;
        return this;
    },
    progress: function( progress, accountForDelay ) {
        seekProgress( this, progress, true, accountForDelay );
        tweenTick( this, 0 );
        return this;
    },
    time: function( seconds, accountForDelay ) {
        seek( this, seconds, accountForDelay, true );
        return this;
    },
    render: function() {
        //syncTargetProperties( this );
        //overrideDictionaryProperties( this );
        updateTweenProperties( this );
        notifyOnUpdate( this );
    },
    restart: function( accountForDelay, immediateRender ) {
        // default for immediateRender is true
        immediateRender = isBoolean( immediateRender ) ? immediateRender : true;
        
        initObjectRunnable( this );
        setRunnableTotalDuration( this );
        this.resume();

        this._elapsedTime = accountForDelay ? 0 : this._delay;
        
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
        if ( isNumber( scale ) && scale > 0 ) {
            this._timeScale = scale;
        }
        return this;
    },
    kill: function() {
        var arguments$1 = arguments;

        if ( arguments.length > 0 ) {

            // fix: avoid optimization bailout
            var args = [];
            for ( var i = 0; i < arguments.length; ++i ) {
                args[ i ] = arguments$1[ i ];
            }
            disableProperties( this, args );

        } else {
            this._running = false;
            disableProperties( this );
        }
        this._alive = false;
        this._onStateChange( this );
        return this;
    },
    pause: function() {
        this._running = false;
        return this;
    },
    resume: function() {
        this._running = true;
        this._onStateChange( this );
        return this;
    }
};

/*
* Sync values between object properties and target properties
*/
function syncTargetProperties( tween ) {
    var currentNode = tween._firstNode;
    do {
        for ( var i = currentNode.properties.length; i--; ) {
            currentNode.properties[ i ].sync();
        }
    } while ( currentNode = currentNode.next );
}

function clearEmptyObject( objectId ) {
    var obj = propDict[ objectId ];
    if ( obj && Object.keys( obj ).length === 0 ) {
        delete propDict[ objectId ];
    }
}

function clearProperty( property ) {
    if ( property.enabled ) {
        property.enabled = false;
        var targetId = property.target._twkId;
        if ( propDict[ targetId ] ) {
            delete propDict[ targetId ][ property.name ];
        }
    }
}

/*
* Disables only <enabled> properties of a tween and removes them from dictionary.
* Keys param specifies an array containing which properties to disable, by default
* if no keys param is provided all enabled properties will be disabled.
*/
function disableProperties( tween, keys ) {

    var all = ! isArray( keys );
    var currentNode = tween._firstNode;

    if ( isUndefined( currentNode ) ) {
        return;
    }

    do {
        for ( var i = currentNode.properties.length; i--; ) {
            var property = currentNode.properties[ i ];
            if ( property.enabled && ( all || keys.indexOf( property.name ) > -1 ) ) {
                clearProperty( property );
                clearEmptyObject( property.target._twkId );
            }
        }
    } while ( currentNode = currentNode.next );
}


/*
* Reassigns all <enabled> properties from tween targets into the dictionary,
* if a property exists it will be disabled prior deletion
*/
function overrideDictionaryProperties( tween ) {
    var currentNode = tween._firstNode;

    do {
        for ( var i = currentNode.properties.length; i--; ) {
            var property = currentNode.properties[ i ];
            if ( property.enabled ) {
                
                // If there is a running property disable it
                // and remove it from dictionary
                var targetId = property.target._twkId;
                var existingTarget = propDict[ targetId ] || {};
                if ( existingTarget[ property.name ] && existingTarget[ property.name ] !== property) {
                    clearProperty( existingTarget[ property.name ] );
                    clearEmptyObject( targetId );
                }

                // update reverse dictionary
                propDict[ targetId ] = propDict[ targetId ] || {};
                propDict[ targetId ][ property.name ] = property;

                
            }
        }
    } while ( currentNode = currentNode.next );
}


function updateTweenProperties( tween ) {
    var currentNode = tween._firstNode;
    var updatedTargets = 0;
    
    if ( isUndefined( currentNode ) ) {
        return;
    }

    do {
        var progress = getProgress( tween );
        var updated = false;
        for ( var i = currentNode.properties.length; i--; ) {
            var p = currentNode.properties[ i ];
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
                        var b = Math.floor( a );
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
                
                updated = true;
            }
        }

        updatedTargets += updated | 0;

    } while ( currentNode = currentNode.next );

    return updatedTargets;
}


function disableObjectIdProperties( objectId ) {
    if ( isObject( propDict[ objectId ] ) ) {
        var keys = Object.keys( propDict[ objectId ] );
        for ( var i = 0; i < keys.length; i++ ) {
            var name = keys[ i ];
            clearProperty( propDict[ objectId ][ name ] );
        }
        clearEmptyObject( objectId );
    }
}

/*
* Builds a linked list of all objects and properties to iterate
* It stores the first linked object in the current tween
*/
function resetTargetProperties( tween ) {
    var targetProperties = tween._to;
    var originProperties = tween._from;
    var targets = isArray( tween._target ) ? tween._target : [ tween._target ];
    var prevNode, firstNode;

    // merge keys of targetProperties and originProperties without duplicates
    var allKeys = Object.keys( targetProperties );
	var oKeys = Object.keys( originProperties );
	for ( var i = 0; i < oKeys.length; i++ ) {
		if ( ! targetProperties[ oKeys[ i ] ] ) {
			allKeys.push( oKeys[ i ] );
		}
	}

    for ( var i$1 = targets.length; i$1--; ) {
        var currentTarget = targets[ i$1 ];

        // Tag object id without overwrite
        currentTarget._twkId = currentTarget._twkId || propDictIdx++;

        var properties = [];
        for ( var j = 0; j < allKeys.length; j++ ) {
            var key = allKeys[ j ];

            // Check if key is not a tween property
            // also we check that the property exists on target
            if ( !tween.hasOwnProperty( key ) && key in currentTarget ) {
                var property = new TweenProperty(
                    key,
                    currentTarget,
                    originProperties,
                    targetProperties
                );

                //property.refresh();
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

function initTweenProperties( tween, target, duration, params ) {
    tween._target       = target;
    tween._ease         = getEasing( params.ease );
    tween._from         = isObject( params.from ) ? params.from : {};
    tween._to           = isObject( params.to ) ? params.to: {};
    tween._duration     = isNumber( duration ) ? Math.max( 0, duration ) : 0;
    tween._params       = params;
}

// Move declared properties inside root params object
// into <from> or <to> properties dependig of tween type
function setTweenDefaultProperties( tween ) {
    var keys = Object.keys( tween._params );
    var target = tween._to;
    if ( tween._type === TWEEN_FROM ) {
        target = tween._from;
    }
    for( var i = 0; i < keys.length; i++ ) {
        var key = keys[ i ];
        if ( ! ( key in reserved ) && ! ( key in target ) ) {
            target[ key ] = tween._params[ key ];
        }
    }
}

function initTween( tween, target, duration, params ) {
    initTweenProperties( tween, target, duration, params );
    initObjectRunnable( tween, params );
    initObjectCallbacks( tween, params );
    setRunnableTotalDuration( tween );
    setTweenDefaultProperties( tween );
    if ( tween._running ) {
        tween.resume();
    }
}

/*
* Updates the properties of a given tween
*/
function tweenTick( tween, delta ) {

    if ( isUndefined( tween._firstNode ) ) {
        resetTargetProperties( tween );
        syncTargetProperties( tween );
    }
    
    if ( notifyStart( tween ) ) {
        overrideDictionaryProperties( tween );
    }

    if ( tween._elapsedTime >= tween._delay ) {
        
        // Update tween properties with current progress
        var updatedTargets = updateTweenProperties( tween );

        // Fire onUpdate notification only if one or more properties were updated
        if ( updatedTargets > 0 ) {
            notifyOnUpdate( tween );
        } else {
            // No updated targets means all properties where overrided
            // We kill the tween early to avoid further notifications
            tween.kill();
        }
    } else {
        updateTweenProperties( tween );
    }
    
    notifyOnRepeat( tween );
    if ( notifyOnComplete( tween ) ) {
        tween.kill();
    }
    //common.updateState( tween );
    if ( delta > 0 ) {
        applyStep( tween, delta );
    }
}

function tweenFactory( type, onStateChange ) {  
    return function ( target, duration, params ) {
        
        if ( type === TWEEN_SET ) {
            params = duration;
            duration = 0;
        }
        
        var valid =
            isObject( target ) &&
            isObject( params ) &&
            isNumber( duration );
        
        if ( valid ) {
            var instance = new Tween( type, onStateChange );
            initTween( instance, target, duration, params );
            return instance;
        } else {
            throw 'Invalid Tween Params';
        }
    };
}

var Ticker = function Ticker( params, onStateChange ) {
    params = params || {};
    this._onStateChange = onStateChange;
    this._onTick = isFunction( params.onTick ) ? params.onTick : noop;
    this.setFPS( params.fps );
    this.resume();
};

Ticker.prototype = {
    pause: function() {
        this._running = false;
        this._onStateChange( this );
        return this;
    },
    resume: function() {
        this._then = now();
        this._running = true;
        this._onStateChange( this );
        return this;
    },
    tick: function( time ) {
        
        var delta = time - this._then;
        if ( delta > this._fpsStep ) {
            var drop = delta % this._fpsStep;
            this._then = time - drop;
            this._onTick( Math.max( 0,  delta - drop ) / 1000 );
        }

        return this;
    },
    setFPS: function( fps ) {
        this.fps = isNumber( fps ) && fps > 0 ? fps : 60;
        this._fpsStep = 1000 / this.fps;
    }
};

function tickerFactory( onStateChange ) {
    return function ( params ) {
        return new Ticker( params, onStateChange );
    }
}

var rAF;
var cAF;

// borrowed from https://github.com/soulwire/sketch.js/blob/master/js/sketch.js
var vendors;
var a;
var b;
var c;
var now$1;
var dt;
var id;
var then = 0;

vendors = [ 'ms', 'moz', 'webkit', 'o' ];
a = 'AnimationFrame';
b = 'request' + a;
c = 'cancel' + a;

rAF = window[ b ];
cAF = window[ c ];

for ( var idx$1 = vendors.lenght; !rAF && idx$1--; ) {
    rAF = window[ vendors[ idx$1 ] + 'Request' + a ];
    cAF = window[ vendors[ idx$1 ] + 'Cancel' + a ];
}

rAF = rAF || function( callback ) {
    now$1 = now();
    dt = Math.max( 0, 16 - ( now$1 - then ) );
    id = setTimeout( function () {
        callback( now$1 + dt );
    }, dt );
    then = now$1 + dt;
    return id;
};

cAF = cAF || function( id ) {
    clearTimeout( id );
};

var request = rAF;

var tweens = [];
var tickers = [];
var isSleeping = true;
var cleanupDirty = false;
var mainTicker = new Ticker( {
    onTick: updateTweens
}, queueTicker );


function wakeup() {
    if ( isSleeping === true ) {
        isSleeping = false;
        setTimeout( function () {
            onFrame();
        }, 1 );
    }
}

function updateTweens( delta ) {
    delta = Math.max( 0, delta );

    // update tweens (order matters)
    for ( var idx = 0, length = tweens.length; idx < length; idx++  ) {
        var tw = tweens[ idx ];
        if ( tw._running ) {
            tweenTick( tw, delta );
        }
    }
}

function updateTickers( delta ) {
    for ( var idx = 0; idx < tickers.length; idx++ ) {
        var tk = tickers[ idx ];
        if ( tk._running ) {
            tk.tick( delta );
        }
    }
}

function onFrame( delta ) {
    if ( delta === void 0 ) delta = now();


    if ( cleanupDirty ) {
        cleanupRunnable( tweens );
        cleanupRunnable( tickers );
        cleanupDirty = false;
    }

    updateTickers( delta );
    
    if ( tickers.length === 1 && tweens.length === 0 ) {
        isSleeping = true;
    } else {
        request( onFrame );
    }

}

function cleanupRunnable( arr ) {
    for ( var idx = arr.length; idx--; ) {
        var obj = arr[ idx ];
        if ( obj._alive === false ) {
            obj._running = false;
            obj._queued = false;
            arr.splice( idx, 1 );
        }
    }
}

function queueTween( tw ) {
    if ( ! tw._queued ) {
        tweens.unshift( tw );
        tw._queued = true;
    }
}

function queueTicker( tk ) {
    if ( ! tk._queued ) {
        tickers.unshift( tk );
        tk._queued = true;
    }
}

function onRunnableStateChange( obj ) {
    if ( obj._running ) {
        obj instanceof Tween && queueTween( obj );
        obj instanceof Ticker && queueTicker( obj );
        wakeup();
    } else {
        cleanupDirty = true;
    }
}

function executeOnAllTweens ( funcName ) {
    return function() {
        var arguments$1 = arguments;

        for ( var idx = tweens.length; idx--; ) {
            var tween = tweens[ idx ];
            tween[ funcName ].apply( tween, arguments$1 );
        }
    };
}

function killTweensOf() {
    return function( obj ) {
        if ( isObject( obj ) && obj._twkId !== undefined ) {
            var id = obj._twkId;
            disableObjectIdProperties( id );
        }
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
    updateTickers( step );
}

function setFPS( val ) {
    mainTicker.setFPS( val );
}

var TimelineItem = function TimelineItem( obj, type, start, end ) {
    this._obj = obj;
    this._type = type;
    this._start = start;
    this._end = end;
    this._duration = Math.max( 0, end - start );
    this._eventsEnabled = true;
};

function plotTimeline( tl, label ) {
    tl._precompute( label );
    var computedItems = tl._computedItems;
    var def = Object.keys( tl._definitions );
    var getLabel = function ( obj ) {
        for( var i = 0; i < def.length; i++ ) {
            var key = def[ i ];
            if ( tl._definitions[ key ] === obj ) {
                return key;
            }
        }
        return "?";
    };

    var truncText = function ( text, limit ) {
        if ( text.length > limit ) {
            text = text.slice( 0, limit - 1 ) + '\u2026';
        }
        return text;
    };

    var charPad = function ( size, char ) {
        return Array.apply( null, Array( size ) )
        .map( String.prototype.valueOf, char ).join('');
    };

    var textPad = function ( size, padChar, text ) {
        var s = Math.round( ( size - text.length ) / 2 );
        var o = size - s - text.length;
        var left = charPad( s, padChar );
        var right = charPad( o, padChar );
        return left + text + right;
    };

    var logLine = function ( arr ) {
        arr.unshift( charPad( ~~( arr.length / 2 ), "%c%s" ) );
        console.log.bind(console).apply( window, arr );
    };

    var bg = '';
    var pad4 = 'padding: 4px 0;';
    var pad3 = 'padding: 3px 0;';
    var pad2 = 'padding: 0px 0;';

    var totalDuration = tl._totalDuration;
    var steps = Math.round( totalDuration * 10 );
    var tlStr = [];

    // Print main label name and times
    bg = 'background: #E1BEE7; padding-bottom: 6px; border-bottom: 4px solid #ba9dbf;';
    tlStr.push( [ '', '\n\n' ] );
    tlStr.push( [ pad4 + bg, textPad( 14, ' ', tl._startLabel ) ] );
    tlStr.push( [ pad4, ' ' ] );
    for( var i = 0; i < Math.ceil( totalDuration ); i++ ) {
        tlStr.push( [ pad4, i + 's' ] );
        tlStr.push( [ pad4, charPad( 9 - i.toString().length, '\u2009' ) ] );
    }

    tlStr.push( [ '', '\n' ] );


    // Print timeline start/end and marks line
    bg = 'background: #C5CAE9; padding-bottom: 4px;';
    tlStr.push( [ bg, textPad( 7, ' ', 'Start' ) ] );
    tlStr.push( [ bg, textPad( 7, ' ', 'End' ) ] );

    bg = 'background: #D1C4E9; color:#B39DDB; padding-bottom: 1px;';
    tlStr.push( [ bg, '\u2009' ] );
    var mark = 0;
    for( var i$1 = 0; i$1 < Math.ceil( totalDuration * 2 ); i$1++ ) {
        tlStr.push( [ bg,  mark % 1 ? '\u25AB' : '\u25BE' ] );
        tlStr.push( [ bg, charPad( 4, '\u2009' ) ] );
        mark += 0.5;
    }
    logLine( flatten( tlStr ) );

    // Print each timeline item
    var colors = ['E91E63', 'F44336', '9C27B0', '673AB7', '3F51B5', '2196F3' ];
    for( var i$2 = 0; i$2 < computedItems.length; i$2++ ) {
        var item = computedItems[ i$2 ];
        var sp = charPad( Math.round( item._start * 10 ), '\u2219' );
        var tSize = Math.max( 2, Math.round( ( item._end - item._start ) * 10 ) );
        bg = textPad( tSize, '\u2009', truncText( getLabel( item._obj ), tSize ) );
        var c = colors[ i$2 % colors.length ];
        var strings = flatten( [
            [ "padding: 2px 0; background: #C5E1A5; color: black;", textPad( 7, ' ', item._start.toFixed( 2 ) ) ],
            [ "padding: 2px 0; background: #FF5252; color: black;", textPad( 7, ' ', item._end.toFixed( 2 ) ) ],
            [ "background: white; color: #802929;", "\u2009\u2009" ],
            [ 'background: white; color: #' + c, sp ],
            [ 'color: white; background: #' + c, bg ]
        ]);
        logLine( strings );
    }
}

var TL_ITEM_TWEEN = 0;
var TL_ITEM_CALLBACK = 1;
var TL_ITEM_LINE_SYNC = 2;
var TL_ITEM_LINE_ASYNC = 3;
var TL_ITEM_DELAY = 4;
var TL_ITEM_LABEL = 5;
var TL_ITEM_INVALID = 7;

var Timeline = function Timeline() {
    this._definitions = {};
    this._computedItems = [];
    this._lastDirection = this._direction;
    this._lastElapsedTime = 0;
    this._startLabel = '';
    this._ticker = new Ticker( {
        onTick: this.tick.bind( this ),
    }, onRunnableStateChange );
    this._ticker.pause();
};

Timeline.prototype = {
    _precompute: function( label ) {
        if ( this._needsRecompute ) {
            label = label || this._startLabel;
            if ( this._definitions[ label ] ) {
                var items = computeTimeLineItems( this._definitions, label );
                this._computedItems = absShiftTimeLineItems( items );
                setTimelineTotalDuration( this );
                //console.log( this._totalDuration );
                this._needsRecompute = false;
            }
        }
    },
    define: function( label, obj ) {
        var type = getDefinitionType( obj );
        if ( isString( label ) && type != TL_ITEM_INVALID ) {
            
            var isLine = type == TL_ITEM_LINE_SYNC || type == TL_ITEM_LINE_ASYNC;
            if ( isLine && !isValidLine( this._definitions, obj ) ) {
                return this;
            }
            
            if ( type == TL_ITEM_TWEEN ) {
                // reset to original state and
                // remove object from main renderer
                obj.restart( true ).pause();
            }

            this._definitions[ label ] = obj;
            this._needsRecompute = true;
        }
        return this;
    },
    tick: function( delta ) {
        this._precompute();
        timelineTick( this, delta );
        if ( ! this._running ) {
            this._ticker.pause();
        }
        return this;
    },
    delay: function( value ) {
        this._delay = isNumber( value ) ? value : 0;
        return this;
    },
    plot: function( label ) {
        if ( ! isUndefined( plotTimeline ) )
            { plotTimeline( this, label ); }
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
        this._timeScale = isNumber( value ) ? Math.max( 0, value ) : 1;
    },
    time: function( seconds, accountForDelay ) {
        this._precompute();
        seek( this, seconds, accountForDelay, true );
        this.tick( 0 );
        return this;
    },
    progress: function( value, accountForDelay ) {
        this._precompute();
        seekProgress( this, value, true, accountForDelay );
        this.tick( 0 );
        return this;
    },
    pause: function() {
        this._ticker.pause();
        return this;
    },
    resume: function() {
        this._running = true;
        this._ticker.resume();
        return this;
    },
    restart: function( accountForDelay ) {
        initObjectRunnable( this );
        this.resume();
        return this;
    },
    play: function( label ) {
        // TODO: validate label?
        if ( this._definitions[ label ] ) {
            this._startLabel = label;
            this._ticker.resume();
            this._running = true;
        } else {
            throw 'Invalid label';
        }
        return this;
    },
    kill: function() {
        this.pause();
    }
};

function initTimeline( tl, params ) {
    // Init Tween Properties
    initObjectCallbacks( tl, params );
    initObjectRunnable( tl, params );
}

function setTimelineTotalDuration( tl ) {
    tl._duration = getItemsDuration( tl._computedItems );
    setRunnableTotalDuration( tl );
}

function timelineTick( tl, delta ) {
    notifyStart( tl );

    if ( tl._elapsedTime >= tl._delay ) {
        updateTimelineItems( tl );
        for( var i = 0; i < tl._computedItems.length; i++ ) {
            var item = tl._computedItems[ i ];
            if ( item._type === TL_ITEM_TWEEN ) {
                tweenTick( item._obj, 0 );
            }
        }
        notifyOnUpdate( tl );
    }

    if ( notifyOnRepeat( tl ) ) {
        toggleEvents( tl, true );
    }

    notifyOnComplete( tl );
    undefined( tl );
    applyStep( tl, delta );
}

function updateTimelineItems( tl ) {
    if ( tl._elapsedTime >= tl._delay ) {
        var time = tl._duration * getProgress( tl );
        for( var i = 0; i < tl._computedItems.length; i++ ) {
            var item = tl._computedItems[ i ];
            if ( tl._direction === 1 && tl._elapsedTime >= item._start ||
                    tl._direction === -1 && tl._elapsedTime <= item._end ) {
                if ( item._type === TL_ITEM_TWEEN ) {
                    seek( item._obj, time - item._start );
                } else if ( item._type === TL_ITEM_CALLBACK && item._eventsEnabled ) {
                    item._obj.apply( tl );
                    item._eventsEnabled = false;
                }
            }
        }
    }
}

function toggleEvents( tl, enabled ) {
    for( var i = 0; i < tl._computedItems.length; i++ ) {
        var item = tl._computedItems[ i ];
        item._eventsEnabled = enabled;
    }
}

function getItemsDuration( items ) {
    return max( items, '_end' ) - min( items, '_start' );
}

function computeTimeLineItems( items, startLabel, offset ) {
    offset = offset || 0 ;
    var result = [];
    var line = resolveLabel( items, startLabel );
    line = isArray( line ) ? line : [ line ];

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
                var min$$1 = 0;
                for( var j = 0; j < keys.length; j++ ) {
                    var key = keys[ j ];
                    min$$1 = Math.min( min$$1, obj[ key ] );

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
                offset += min$$1 < 0 ? min$$1 : 0;
            } else {
                result.push( new TimelineItem( obj, type, start, end ) );
                offset += end - start;
            }
        }
    }
    return result;
}

// Get the final object of a label
// resolves indirections of n labels to an object
function resolveLabel( items, val ) {
    return isString( val ) ? resolveLabel( items, items[ val ] ) : val;
}

// Resolves all labels in items to their final objects
// returns a flatten array with all the items
function resolveItemLabels( items, arr ) {
    var done = true;
    for( var i = 0; i < arr.length; i++ ) {
        var val = resolveLabel( items, arr[ i ] );

        if ( isString( val ) ) {
            done = false;
            break;
        }

        if ( isArray( val ) ) {
            arr[ i ] = resolveItemLabels( items, val );
        } else {
            arr[ i ] = val;
        }
    }

    if ( ! done ) {
        arr = resolveItemLabels( items, arr );
    }
    
    return flatten( arr );
}

// adjust current items to start from 0
// shifting negative offsets over all items
function absShiftTimeLineItems( items ) {
    var minOffset = min( items, '_start' );
    if ( minOffset < 0 ) {
        var shift = Math.abs( minOffset );
        for ( var i = 0; i < items.length; i++ ) {
            items[ i ]._start += shift;
            items[ i ]._end += shift;
        }
    }
    return items;
}

function getDefinitionType( obj ) {
    if ( obj instanceof Tween ) {
        return TL_ITEM_TWEEN;
    } else if ( isNumber( obj ) ){
        return TL_ITEM_DELAY;
    } else if ( isString( obj ) ) {
        return TL_ITEM_LABEL;
    } else if ( isFunction( obj ) ) {
        return TL_ITEM_CALLBACK;
    } else if ( isArray( obj ) ) {
        return TL_ITEM_LINE_SYNC;
    } else if ( isObject( obj ) ) {
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
            valid = ! isUndefined( labels[ item ] );
        
        // validate nested arrays recursively
        } else if ( type == TL_ITEM_LINE_SYNC ) {
            valid = isValidLine( labels, item );
        
        // validate that objects have only numbers assigned
        // only numbers are valid
        } else if ( type == TL_ITEM_LINE_ASYNC ) {
            var keys = Object.keys( item );
            for( var j = 0; j < keys.length; j++ ) {
                var key = keys[ j ];
                if ( !isNumber( item[ key ] ) ) {
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

function timelineFactory() {
    return function ( params ) {
        var instance = new Timeline();
        initTimeline( instance, params );
        return instance;
    }
}

var Tweenkey = function Tweenkey () {};
Tweenkey.prototype = {
    set         : tweenFactory( TWEEN_SET, onRunnableStateChange ),
    tween       : tweenFactory( TWEEN_ALL, onRunnableStateChange ),
    from        : tweenFactory( TWEEN_FROM, onRunnableStateChange ),
    to          : tweenFactory( TWEEN_TO, onRunnableStateChange ),
    ticker      : tickerFactory( onRunnableStateChange ),
    timeline    : timelineFactory(),
    killAll     : executeOnAllTweens( 'kill' ),
    killTweensOf: killTweensOf(),
    pauseAll    : executeOnAllTweens( 'pause' ),
    resumeAll   : executeOnAllTweens( 'resume' ),
    update      : manualStep,
    autoUpdate  : setAutoUpdate,
    setFPS      : setFPS
};

var main = new Tweenkey();

return main;

})));
