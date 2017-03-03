
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

var wrapEasing = function( fn ) {
    return function( progress, start, end ) {
        return end * fn( progress ) + start;
    }
}

var easing = {
    'linear'    : wrapEasing( easeInOut(1) ),
    'QuadIn'    : wrapEasing( easeIn(2) ),
    'QuadOut'   : wrapEasing( easeOut(2) ),
    'QuadInOut' : wrapEasing( easeInOut(2) ),
    'CubicIn'   : wrapEasing( easeIn(3) ),
    'CubicOut'  : wrapEasing( easeOut(3) ),
    'CubicInOut': wrapEasing( easeInOut(3) ),
    'QuartIn'   : wrapEasing( easeIn(4) ),
    'QuartOut'  : wrapEasing( easeOut(4) ),
    'QuartInOut': wrapEasing( easeInOut(4) ),
    'QuintIn'   : wrapEasing( easeIn(5) ),
    'QuintOut'  : wrapEasing( easeOut(5) ),
    'QuintInOut': wrapEasing( easeInOut(5) )
};
