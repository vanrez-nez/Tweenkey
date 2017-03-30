export const DEC_FIX = 0.000001;
export const colorRE = new RegExp(/(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i);

const TYPE_FNC = ({}).toString;
function getTypeCheck( typeStr, fastType ) {
    return ( obj ) => {
        return fastType ? typeof obj === typeStr:
            TYPE_FNC.call( obj ) === typeStr;
    };
}

function minMax( obj, arr, key ) {
    return obj.apply( Math, arr.map( ( item ) => {
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

export function isObject( obj ) {
    return !!obj && obj.constructor === Object;
};

export function flatten( arr ) { 
    return [].concat.apply( [], arr );
};

export function hexStrToRGB( str ) {
    let hex = parseInt( str.slice( 1 ), 16 );
    return [
        (( hex >> 16 ) & 0xFF) / 255,
        (( hex >> 8 ) & 0xFF) / 255,
        ( hex & 0xFF ) / 255
    ];
};

export function clamp( value, min, max ) {
    return Math.min( Math.max( value, min ), max );
};

export function now() {
    return window.performance.now();
    //return window.performance && window.performance.now ? window.performance.now() : Date.now();
};

export function extend( target, source, overwrite ) {
    for ( let key in source ) {
        ( overwrite || !( key in target ) ) && ( target[ key ] = source[ key ] );
    }
    return target;
};

export function noop() {
    return false;
};

export function roundDecimals( n ) {
    return Math.round( n * 1000 ) / 1000;
};

export function min( arr, key ) {
    return minMax( Math.min, arr, key );
};

export function max( arr, key ) {
    return minMax( Math.max, arr, key );
}

