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