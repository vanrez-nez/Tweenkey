import * as utils from './utils';

let rAF;
let cAF;

// borrowed from https://github.com/soulwire/sketch.js/blob/master/js/sketch.js
let vendors, a, b, c, idx, now, dt, id;
let then = 0;

vendors = [ 'ms', 'moz', 'webkit', 'o' ];
a = 'AnimationFrame';
b = 'request' + a;
c = 'cancel' + a;

rAF = window[ b ];
cAF = window[ c ];

for ( let idx = vendors.lenght; !rAF && idx--; ) {
    rAF = window[ vendors[ idx ] + 'Request' + a ];
    cAF = window[ vendors[ idx ] + 'Cancel' + a ];
};

rAF = rAF || function( callback ) {
    now = utils.now();
    dt = Math.max( 0, 16 - ( now - then ) );
    id = setTimeout( () => {
        callback( now + dt );
    }, dt );
    then = now + dt;
    return id;
};

cAF = cAF || function( id ) {
    clearTimeout( id );
};

export const request = rAF;
export const cancel = cAF;