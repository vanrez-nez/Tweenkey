var rAF, cAF;

// borrowed from https://github.com/soulwire/sketch.js/blob/master/js/sketch.js
(function shimAnimationFrame() {
    var vendors, a, b, c, idx, now, dt, id;
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
    };

    rAF = rAF || function( callback ) {
        now = _now();
        dt = m.max( 0, 16 - ( now - then ) );
        id = setTimeout(function() {
            callback( now + dt );
        }, dt );
        then = now + dt;
        return id;
    };

    cAF = cAF || function( id ) {
        clearTimeout( id );
    };
})();