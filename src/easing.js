import * as Utils from './utils';
import { bezierEase } from './bezier';

function easeIn( power ) { 
    return ( t ) => { 
        return Math.pow( t, power )
    }
};

function easeOut( power ) { 
    return ( t ) => {
        return 1 - Math.abs( Math.pow( t - 1, power ) )
    }
};

function easeInOut( power ) {
    return ( t ) => {
        return t < .5 ? easeIn( power )( t * 2 ) / 2 : easeOut( power )( t * 2 - 1 ) / 2 + 0.5
    }
};

// The following easing functions where taken from:
// https://github.com/tweenjs/tween.js/blob/master/src/Tween.js

function easeBackIn( t ) {
    let s = 1.70158;
    return t * t * ( ( s + 1) * t - s );
};

function easeBackOut( t ) {
    let s = 1.70158;
    return --t * t * ((s + 1) * t + s) + 1;
};

function easeBackInOut( t ) {
    let s = 1.70158 * 1.525;
    if ((t *= 2) < 1) {
        return 0.5 * (t * t * ((s + 1) * t - s));
    }
    return 0.5 * ((t -= 2) * t * ((s + 1) * t + s) + 2);
};

function easeBounceIn( t ) {
    return 1 - easeBounceOut( 1 - t);
};

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
};

function easeBounceInOut( t ) {
    return t < 0.5 ? easeBounceIn(t * 2) * 0.5 : easeBounceOut(t * 2 - 1) * 0.5 + 0.5;
};

function easeElasticIn( t ) {
    if (t === 0) { return 0; }
    if (t === 1) { return 1; }
    return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
};

function easeElasticOut( t ) {
    if (t === 0) { return 0; }
    if (t === 1) { return 1; }
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
};

function easeElasticInOut( t ) {
    if (t === 0) { return 0; }
    if (t === 1) { return 1; }
    t *= 2;
    if (t < 1) {
        return -0.5 * Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
    }
    return 0.5 * Math.pow(2, -10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI) + 1;
};

function easeCircIn( t ) {
    return 1 - Math.sqrt(1 - t * t);
};

function easeCircOut( t ) {
    return Math.sqrt(1 - (--t * t));
};

function easeCircInOut( t ) {
    if ((t *= 2) < 1) {
        return - 0.5 * (Math.sqrt(1 - t * t) - 1);
    }
    return 0.5 * (Math.sqrt(1 - (t -= 2) * t) + 1);
};

function easeSineIn( t ) {
    return 1 - Math.cos(t * Math.PI / 2);
};

function easeSineOut( t ) {
	return Math.sin(t * Math.PI / 2);
};

function easeSineInOut( t ) {
	return 0.5 * (1 - Math.cos(Math.PI * t));
};

function easeExpoIn( t ) {
	return t === 0 ? 0 : Math.pow(1024, t - 1);
};

function easeExpoOut( t ) {
	return t === 1 ? 1 : 1 - Math.pow(2, - 10 * t);
};

function easeExpoInOut( t ) {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if ((t *= 2) < 1) {
        return 0.5 * Math.pow(1024, t - 1);
    }
    return 0.5 * (- Math.pow(2, - 10 * (t - 1)) + 2);
};

function wrapEasing( fn ) {
    return ( progress, start, end ) => {
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
            let easingNames = Object.keys( Easings ).join(' | ');
            console.warn( 'Invalid easing name: ' + val );
            console.warn( 'Available easings: ' + easingNames );
        }
        return Easings.linear;
    }
}