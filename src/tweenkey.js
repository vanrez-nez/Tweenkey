
var Tweenkey = Tweenkey || (function() {
	"use strict";

	var tweens = [];
	var m = Math;
	var wnd = window;

	function isFunction( object ) {
		return Object.prototype.toString.call( object ) == '[object Array]';
	}

	function lerp( a, b, w ) {
		return (1 - w) * a + w * b;
	}

	function Tween() {
		var self = this;
		//self.target;
		self.running = false;
		self.started = false;
		self.completed = false;
		self.duration = 0;
		self.elapsedTime = 0;
		//self.ease = lerp;
		tweens.push(self);
		return self;
	}


	function updateTween(tween, dt) {

		if ( ! tween.started && this.running ) {
			tween.started = true;
			isFunction(tween.onStart) && tween.onStart( tween );
		}

		if ( tween.target ) {
			tween.elapsedTime += dt;
			lerp()
			isFunction(tween.onUpdate) && tween.onUpdate( tween )
		} else {
			console.warn( 'Cannot tween on given target:', tween.target );
			this.completed = true;
		}

		if ( tween.elapsedTime => duration ) {
			tween.running = false;
			this.completed = true;
			isFunction(tween.onComplete) && tween.onComplete( tween );
		}
	}

	function initTween(tween, target, duration, params) {
		params =  params || {};
		tween.autoStart = !!params.autoStart || true;
		tween.ease = isFunction( params.ease ) ? params.ease || lerp;
		tween.duration = M.max( 0, Number(duration) || 0 );
	}

	Tween.prototype = {
		to: function( target, duration, params ) {
			setTweenParams( this, target, duration, params );
			console.log( tweens );
		},
		from: function( target, duration, params ) {

		}
	};

	function Sequence() {

	}

	Sequence.prototype = {
		to: function() {
			this.add( ( new Tween() ).to( arguments ) );
			return this;
		},
		from: function() {
			this.add( ( new Tween() ).from( arguments ) );
			return this;
		},
		add: function( tween ) {

		},
		start: function() {

		}
	};

	function enterFrame( dt ) {
		console.log('hua!', dt);
		for ( var i = tweens.length - 1; i > 0; i-- ) {
			var tween = tweens[i];
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

	wnd.requestAnimationFrame(enterFrame);

    return {
    	to: function() { 
    		return new Tween().to(arguments);
    	},
    	from: function() {
    		return new Tween().from(arguments);
    	},
    	Sequence: Sequence
    };
})();