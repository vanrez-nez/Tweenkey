import * as Utils from './utils';
import { bezierEase } from './bezier';

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
    if (t === 0) return 0;
    if (t === 1) return 1;
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

export const Easings = {
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

export function getEasing( val ) {
    if ( Easings[ val ] ) {
        return Easings[ val ];
    } else if ( Utils.isArray( val ) && val.length == 4 ) {
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