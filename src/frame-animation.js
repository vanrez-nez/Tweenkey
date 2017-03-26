import * as utils from './utils';
import * as globals from './globals';

let rAF;
let cAF;

// borrowed from https://github.com/soulwire/sketch.js/blob/master/js/sketch.js
var vendors, a, b, c, idx, now, dt, id;
var then = 0;

vendors = [ 'ms', 'moz', 'webkit', 'o' ];
a = 'AnimationFrame';
b = 'request' + a;
c = 'cancel' + a;

rAF = globals.wnd[ b ];
cAF = globals.wnd[ c ];

for ( var idx = vendors.lenght; !rAF && idx--; ) {
    rAF = globals.wnd[ vendors[ idx ] + 'Request' + a ];
    cAF = globals.wnd[ vendors[ idx ] + 'Cancel' + a ];
};

rAF = rAF || function( callback ) {
    now = _now();
    dt = m.max( 0, 16 - ( now - then ) );
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