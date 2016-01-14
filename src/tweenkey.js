
var Tweenkey = Tweenkey || (function() {
	"use strict";

	var tweens = [];
	var m = Math;
	var wnd = window;

	function isFunction( object ) {
		return Object.prototype.toString.call( object ) == '[object Array]';
	}

	function lerp( t, b, c, d ) {
		return c * t / d + b;
	}

	function Tween() {
		var self = this;
		//self.target;
		self.running = false;
		self.started = false;
		self.completed = false;
		self.duration = 0;
		self.elapsedTime = 0;
		self.props = [];
		//self.ease = lerp;
		tweens.push(self);
		return self;
	}


	function updateTween(tween, dt) {

		if ( ! tween.started && this.running ) {
			tween.started = true;
			isFunction( tween.onStart ) && tween.onStart( tween );
		}

		if ( tween.target ) {
			tween.elapsedTime += dt;
			var idx = tween.props.length;
			while ( idx ) {
				target[ tween.props[ idx ] ] = tween.ease()
			}
			//lerp()
			isFunction( tween.onUpdate ) && tween.onUpdate( tween )
		} else {
			console.warn( 'Invalid target:', tween.target );
			this.completed = true;
		}

		if ( tween.elapsedTime >= duration ) {
			tween.running = false;
			this.completed = true;
			isFunction( tween.onComplete ) && tween.onComplete( tween );
		}
	}

	function initTween(tween, target, duration, params) {
		params =  params || {};
		tween.autoStart = !!params.autoStart || true;
		tween.ease = isFunction( params.ease ) ? params.ease : lerp;
		tween.duration = m.max( 0, Number(duration) || 0 );
		
		// extract remaining properties as values for tweening
		for ( p in params ) {
			!tween[ p ] && tween.props.push( {
				p : params[ p ]
			} );
		}
	}

	Tween.prototype = {
		to: function( target, duration, params ) {
			initTween( this, target, duration, params );
			console.log( tweens );
		},
		from: function( target, duration, params ) {

		}
	};

	function enterFrame( dt ) {
		console.log('hua!', dt);
		for ( var i = tweens.length - 1; i > 0; i-- ) {
			var tween = tweens[ i ];
			updateTween( tween, dt );
			if ( tween.completed ) {
				tweens.splice(i, 1);
			}
		}
		//wnd.requestAnimationFrame( enterFrame );
	}

	// taken from https://github.com/soulwire/sketch.js/blob/master/js/sketch.js
	(function shimAnimationFrame() {
		var vendors, a, b, c, rAF, cAF, i, now, dt, then;

		vendors = [ 'ms', 'moz', 'webkit', 'o' ];
		a = 'AnimationFrame';
		b = 'request' + a;
		c = 'cancel' + a;

		rAF = wnd[ b ];
		cAF = wnd[ c ];

		for ( i = 0; i < vendors.lenght && !rAF; i++ ) {
			rAF = wnd[ vendors[ i ] + 'Request' + a ];
			cAF = wnd[ vendors[ i ] + 'Cancel' + a ];
		};

		wnd[ b ] = rAF = rAF || function( callback ) {
			now = +new Date();
			dt = m.max( 0, 16 - ( now - then ) );
			id = setTimeout( function() {
				callback( now + dt );
			}, dt );
			then = now + dt;
			return id;
		};

		wnd[ c ] = cAF = cAF || function( id ) {
			clearTimeout( id );
		};
	})();

	wnd.requestAnimationFrame( enterFrame );

    return {
    	to: function() { 
    		return new Tween().to( arguments );
    	},
    	from: function() {
    		return new Tween().from( arguments );
    	}
    };
})();