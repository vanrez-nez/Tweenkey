(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Tweenkey = factory());
}(this, (function () { 'use strict';

var wnd = window || {};
var PERFORMANCE = wnd.performance;
var DEC_FIX = 0.000001;

var colorRE = new RegExp(/(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i);

var TYPE_FNC = ({}).toString;
function getTypeCheck( typeStr, fastType ) {
    return function( obj ) {
        return fastType ? typeof obj === typeStr:
            TYPE_FNC.call( obj ) === typeStr;
    };
}

function minMax( obj, arr, key ) {
    return obj.apply( m, arr.map( function( item ) {
        return item[ key ];
    } ) );
}

var isFunction = getTypeCheck( 'function', true );
var isNumber = getTypeCheck( 'number', true );
var isBoolean = getTypeCheck( 'boolean', true );
var isString = getTypeCheck( 'string', true );
var isArray = Array.isArray || getTypeCheck( '[object Array]', false );


var isObject = function ( obj ) {
    return !!obj && obj.constructor === Object;
};

var flatten = function ( arr ) { 
    return [].concat.apply( [], arr );
};

var hexStrToRGB = function( str ) {
    var hex = parseInt( str.slice( 1 ), 16 );
    return [
        (( hex >> 16 ) & 0xFF) / 255,
        (( hex >> 8 ) & 0xFF) / 255,
        ( hex & 0xFF ) / 255
    ];
};

var clamp = function( value, min, max ) {
    return Math.min( Math.max( value, min ), max );
};

var now = function() {
    return PERFORMANCE.now();
};



var noop = function() {
    return false;
};

var roundDecimals = function( n ) {
    return Math.round( n * 1000 ) / 1000;
};

var min = function( arr, key ) {
    return minMax( Math.min, arr, key );
};

function initObjectCallbacks( obj, params ) {
    var p = params || {};
    obj._onStart      = isFunction( p.onStart ) ? p.onStart : noop;
    obj._onUpdate     = isFunction( p.onUpdate ) ? p.onUpdate : noop;
    obj._onComplete   = isFunction( p.onComplete ) ? p.onComplete : noop;
    obj._onRepeat     = isFunction( p.onRepeat ) ? p.onRepeat : noop;
}

function initObjectRunnable( obj, params ) {
    var p = params || {};
    var delay = isNumber( p.delay ) ? Math.max( 0, p.delay ) : 0;
    var repeatCount = isNumber( p.repeat ) ? p.repeat : 0;
    
    obj._queued       = false;
    obj._totalDuration  = 0;
    obj._inverted       = isBoolean( p.inverted ) ? p.inverted : false;
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
    obj._params         = p;
}

/*
 * Increments a Tween or Timeline step
 * takes into account the current timeScale
 */
function applyStep( obj, dt ) {
    dt *= obj._direction;
    var time = obj._elapsedTime + dt * obj._timeScale;
    seek$1( obj, time, true, true );
}

function notifyOnUpdate( obj ) {
    if ( obj._elapsedTime > obj._delay ) {
        obj._onUpdate.call( obj, obj._target );
    }
}

function notifyStart( obj ) {
        if ( obj._elapsedTime > obj._delay ) {
            var lastElapsed = Math.max( 0, obj._lastElapsedTime - obj._delay );
            if ( lastElapsed === 0 ) {
            obj._onStart.call( obj._target || obj );
        }
    }
}

function notifyOnComplete( obj ) {
    if ( obj._elapsedTime > obj._delay &&
        obj._totalDuration === roundDecimals( obj._elapsedTime )  &&
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
            ( obj._infinite || Math.abs( tail ) < obj._repeat ) ) {
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
    seek$1( obj, time + delayJump, global );
}

// sets tweens and timelines to a certain time
function seek$1( obj, time ) {
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
        var time = time - obj._delay;
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

//    console.log( obj._progress );

    return;
    /*console.log(
        'local:', obj._progress,
        'global:', obj._totalProgress,
        'elapsed time:', obj._elapsedTime
    );*/
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
        return Math.pow( t, power )
    }
};

var easeOut = function( power ) { 
    return function( t ) {
        return 1 - Math.abs( Math.pow( t - 1, power ) )
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
    return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
};

var easeElasticOut = function (t) {
    if (t === 0) { return 0; }
    if (t === 1) { return 1; }
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
};

var easeElasticInOut = function (t) {
    if (t === 0) { return 0; }
    if (t === 1) { return 1; }
    t *= 2;
    if (t < 1) {
        return -0.5 * Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
    }
    return 0.5 * Math.pow(2, -10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI) + 1;
};

var easeCircIn = function (t) {
    return 1 - Math.sqrt(1 - t * t);
};

var easeCircOut = function (t) {
    return Math.sqrt(1 - (--t * t));
};

var easeCircInOut = function (t) {
    if ((t *= 2) < 1) {
        return - 0.5 * (Math.sqrt(1 - t * t) - 1);
    }
    return 0.5 * (Math.sqrt(1 - (t -= 2) * t) + 1);
};

var easeSineIn = function (t) {
    return 1 - Math.cos(t * Math.PI / 2);
};

var easeSineOut = function (t) {
	return Math.sin(t * Math.PI / 2);
};

var easeSineInOut = function (t) {
	return 0.5 * (1 - Math.cos(Math.PI * t));
};

var easeExpoIn = function (t) {
	return t === 0 ? 0 : Math.pow(1024, t - 1);
};

var easeExpoOut = function (t) {
	return t === 1 ? 1 : 1 - Math.pow(2, - 10 * t);
};

var easeExpoInOut = function (t) {
    if (t === 0) { return 0; }
    if (t === 1) { return 1; }
    if ((t *= 2) < 1) {
        return 0.5 * Math.pow(1024, t - 1);
    }
    return 0.5 * (- Math.pow(2, - 10 * (t - 1)) + 2);
};

var wrapEasing = function( fn ) {
    return function( progress, start, end ) {
        return start + fn( progress ) * ( end - start );
    }
};

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
        if ( val != undefined ) {
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

var TweenProperty = function TweenProperty( id, name, target, origProps, targetProps ) {
    this.id = id;
    this.name = name;
    this.target = target;
    this.origProps = origProps;
    this.targetProps = targetProps;
    this.enabled = true;
    this.length = 0;
};

TweenProperty.prototype = {
    _expandArrayProperties: function( o, t ) {
        var tp = this.target[ this.name ];
        var len = Math.max( o.length, t.length );
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
            this.colorStart = hexStrToRGB( this.start );
            this.colorEnd = hexStrToRGB( this.end );
        }
    }
};

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

// Flat dictionary to track all objects properties.
// Id's are formed from objectId + propertyName
var propDict = {};
var propDictIdx = 1;

var Tween$1 = function Tween( onQueue, onDequeue ) {
    this._onQueue = onQueue;
    this._onDequeue = onDequeue;
};

Tween$1.prototype = {
    delay: function( seconds ) {
        this._delayLeft = this._delay = seconds;
        return this;
    },
    progress: function( progress, accountForDelay ) {
        this._onQueue( this );
        seekProgress( this, progress, true, accountForDelay );
        tweenTick( this, 0 );
        return this;
    },
    time: function( seconds, accountForDelay ) {
        seek$1( this, seconds, accountForDelay, true );
        return this;
    },
    render: function() {
        overrideDictionaryProperties( this );
        updateTweenProperties( this );
    },
    restart: function( accountForDelay, immediateRender ) {

        // default for accountForDelay is false
        accountForDelay = isBoolean( accountForDelay ) ? accountForDelay : false;
        
        // default for immediateRender is true
        immediateRender = isBoolean( immediateRender ) ? immediateRender : true;
        
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
        if ( isNumber( scale ) && scale > 0 ) {
            this._timeScale = scale;
        }
        return this;
    },
    clear: function() {
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
            this._firstNode = undefined;
        }
        this._onDequeue( this );
        return this;
    },
    pause: function() {
        this._running = false;
        this._onDequeue( this );
        return this;
    },
    resume: function() {
        this._running = true;
        this._onQueue( this );
        return this;
    }
};

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

    var all = ! isArray( keys );
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



function getLocalProgress( obj ) {
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

function initTweenProperties( tween, target, duration, params ) {
    tween._target       = target;
    tween._syncNextTick = true;
    tween._ease         = getEasing( params.ease );
    tween._from         = isObject( params.from ) ? params.from : {};
    tween._to           = isObject( params.to ) ? params.to: {};
    tween._duration     = isNumber( duration ) ? Math.max( 0, duration ) : 0;
}


function setTweenTotalDuration( tween ) {
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

function initTween( tween, target, duration, params ) {
    initTweenProperties( tween, target, duration, params );
    initObjectRunnable( tween, params );
    initObjectCallbacks( tween, params );
    setTweenTotalDuration( tween );
    if ( tween._running ) {
        tween.resume();
    }
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

function tweenFactory( onQueue, onDequeue ) {  
    return function ( target, duration, params ) {
        
        if ( isObject( duration ) ) {
            params = duration;
            duration = 0;    
        }
        
        var valid = isObject( target ) &&
            isObject( params ) &&
            isNumber( duration );
        
        if ( valid ) {
            var instance = new Tween$1( onQueue, onDequeue );
            initTween( instance, target, duration, params );
            return instance;
        } else {
            throw 'Invalid Tween Params';
        }
    };
}

var Ticker = function Ticker( params, onQueue ) {
    params = params || {};
    this._onQueue = onQueue;
    this._onTick = isFunction( params.onTick ) ? params.onTick : noop;
    this.setFPS( params.fps );
    this.resume();
};

Ticker.prototype = {
    pause: function() {
        this._running = false;
        return this;
    },
    resume: function() {
        this._then = now();
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
        this.fps = isNumber( fps ) && fps > 0 ? fps : 60;
        this._fpsStep = 1000 / this.fps;
    }
};

function tickerFactory( onQueue ) {
    return function ( params ) {
        return new Ticker( params, onQueue );
    }
}

var TimelineItem = function TimelineItem( obj, type, start, end ) {
    this._obj = obj;
    this._type = type;
    this._start = start;
    this._end = end;
    this._eventsEnabled = true;
};

var TL_ITEM_TWEEN = 0;
var TL_ITEM_CALLBACK = 1;
var TL_ITEM_LINE_SYNC = 2;
var TL_ITEM_LINE_ASYNC = 3;
var TL_ITEM_DELAY = 4;
var TL_ITEM_LABEL = 5;
var TL_ITEM_INVALID = 6;

var Timeline = function Timeline() {
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
};

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
        if ( isString( label ) && type != TL_ITEM_INVALID ) {
            
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
        this._delay = isNumber( value ) ? value : 0;
        return this;
    },
    plot: function( label ) {
        if ( typeof plotTimeline !== 'undefined' )
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

function initTimeline( tl, params ) {
    // Init Tween Properties
    initObjectCallbacks( tl, params );
    initObjectRunnable( tl, params );
}

function timelineTick( tl, dt ) {
    if ( tl._delayLeft === 0 ) {

        notifyStart( tl );

        for( var i = 0; i < tl._computedItems.length; i++ ) {
            var item = tl._computedItems[ i ];
            if ( tl._direction == 1 && tl._elapsedTime >= item._start ||
                 tl._direction == -1 && tl._elapsedTime <= item._end ) {
                if ( item._type == TL_ITEM_TWEEN ) {
                    seek$1( item._obj, tl._elapsedTime - item._start );
                    tweenTick( item._obj, 0 );
                } else if ( item._type == TL_ITEM_CALLBACK && item._eventsEnabled ) {
                    item._obj.apply( tl );
                    item._eventsEnabled = false;
                }
            }
        }
    }
    
    notifyOnComplete( tl );
    updateState( tl );
    applyStep( tl, dt );
}

function getItemsDuration( items ) {
    return _max( items, '_end' ) - min( items, '_start' );
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
        return new Timeline();
    }
}

var rAF;
var cAF;

// borrowed from https://github.com/soulwire/sketch.js/blob/master/js/sketch.js
var vendors;
var a;
var b;
var c;
var idx;
var now$1;
var dt;
var id;
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
}

rAF = rAF || function( callback ) {
    now$1 = _now();
    dt = m.max( 0, 16 - ( now$1 - then ) );
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
        tweens[ idx ]._running && tweenTick( tweens[ idx ], delta );
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
        tickers[ idx ].tick( now() );
    }
    
    if ( tickers.length === 1 && tweens.length === 0 ) {
        isSleeping = true;
    } else {
        request( onFrame );
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
        resetTargetProperties( tw );
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
        var arguments$1 = arguments;

        for ( var idx = tweens.length; idx--; ) {
            var tween = tweens[ idx ];
            tween[ funcName ].apply( tween, arguments$1 );
        }
    };
}

var Tweenkey = function Tweenkey () {};
Tweenkey.prototype = {
    set         : tweenFactory( queueTween, dequeue ),
    tween       : tweenFactory( queueTween, dequeue ),
    ticker      : tickerFactory( queueTicker, dequeue ),
    timeline    : timelineFactory(),
    clearAll    : executeOnAllTweens( 'clear' ),
    clearTweensOf: function() { console.log('todo'); },
    pauseAll    : executeOnAllTweens( 'pause' ),
    resumeAll   : executeOnAllTweens( 'resume' ),
    update      : manualStep,
    autoUpdate  : setAutoUpdate,
    setFPS      : mainTicker.setFPS.bind( mainTicker )
};

var main = new Tweenkey();

return main;

})));
