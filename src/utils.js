import * as globals from './globals';


export const colorRE = new RegExp(/(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i);

const TYPE_FNC = ({}).toString;
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

export const isFunction = getTypeCheck( 'function', true );
export const isNumber = getTypeCheck( 'number', true );
export const isBoolean = getTypeCheck( 'boolean', true );
export const isString = getTypeCheck( 'string', true );
export const isArray = Array.isArray || getTypeCheck( '[object Array]', false );
export const isColor = ( str ) => {
    return colorRE.test( str );
};

export const isObject = ( obj ) => {
    return !!obj && obj.constructor === Object;
};

export const flatten = ( arr ) => { 
    return [].concat.apply( [], arr );
};

export const hexStrToRGB = function( str ) {
    var hex = parseInt( str.slice( 1 ), 16 );
    return [
        (( hex >> 16 ) & 0xFF) / 255,
        (( hex >> 8 ) & 0xFF) / 255,
        ( hex & 0xFF ) / 255
    ];
};

export const clamp = function( value, min, max ) {
    return Math.min( Math.max( value, min ), max );
};

export const now = function() {
    return globals.PERFORMANCE.now();
};

export const extend = function( target, source, overwrite ) {
    for ( var key in source ) {
        ( overwrite || !( key in target ) ) && ( target[ key ] = source[ key ] );
    }
    return target;
};

export const noop = function() {
    return false;
};

export const roundDecimals = function( n ) {
    return Math.round( n * 1000 ) / 1000;
};

export const min = function( arr, key ) {
    return minMax( Math.min, arr, key );
};

export const max = function( arr, key ) {
    return minMax( Math.max, arr, key );
}

