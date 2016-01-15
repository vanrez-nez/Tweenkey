
var Tweenkey = Tweenkey || (function() {
	"use strict";
	
	var rAF, cAF;
	var tweens = [];
	var m = Math;
	var wnd = window;
	var objectPrototypeStr = Object.prototype.toString;

	function isFunction( object ) {
		return objectPrototypeStr.call( object ) == '[object Function]';
	}

	function isObject( object ) {
		return objectPrototypeStr.call( object ) == '[object Object]';
	}

	function isNumber( object ) {
		return objectPrototypeStr.call( object ) == '[object Number]';
	}

	function lerp( t, b, c, d ) {
		return c * t / d + b;
	}

	function Tween( isTweenFrom ) {
		var self = this;
		self.running = false;
		self.isTweenFrom = isTweenFrom;
		self.duration = 0;
		self.startTime = 0;
		self.props = [];
		return self;
	}

	function updateTween(tween, dt) {
		if ( ! tween.running ) return true;
		
		var target = tween.target;

		// fire onStart notification
		if (tween.startTime === 0) {
			tween.startTime = dt;
			isFunction( tween.onStart ) && tween.onStart( target );
		}

		var elapsedTime = (dt - tween.startTime) / 1000;
		
		// update tween
		var idx = tween.props.length;
		while ( idx-- ) {
			var prop = tween.props[ idx ];
			var progress = m.min(1, 1 - (tween.duration - elapsedTime) / tween.duration);
			target[ prop.name ] = tween.ease( progress, prop.f, prop.t - prop.f, 1 );
		}

		// fire onUpdate notification
		isFunction( tween.onUpdate ) && tween.onUpdate( target )		

		if ( elapsedTime >= tween.duration ) {
			tween.running = false;
			isFunction( tween.onComplete ) && tween.onComplete( target );
			return false;
		}

		return true;
	}

	function addProps(tween, params, reverse) {
		for ( var p in params ) {
			if ( !tween[ p ] && isNumber( tween.target[ p ] ) ) {
				var prop = { name: p, 'f': tween.target[ p ], 't': params[ p ]};

				// swap from and to values if reverse flag
				reverse && ( prop.t = [ prop.f, prop.f = prop.t ][ 0 ] );
				tween.props.push( prop );
			}
		}
	}

	function initTween(tween, target, duration, params) {
		params =  params || {};
		tween.target = target;
		tween.running = params.autoStart ? !!params.autoStart : true;
		tween.ease = isFunction( params.ease ) ? params.ease : lerp;
		tween.duration = m.max( 0, Number( duration ) || 0 );
		tween.onStart = params.onStart;
		tween.onUpdate = params.onUpdate;
		tween.onComplete = params.onComplete;
		// add remaining values inside params as properties
		addProps( tween, params, tween.isTweenFrom );
	}

	Tween.prototype = {
		set: function( target, duration, params ) {
			if ( isObject( target ) ) {
				initTween( this, target, duration, params );
				tweens.push( this );
			} else {
				console.warn( 'Invalid target:', target );
			}
		}
	};

	function enterFrame( dt ) {
		var idx = tweens.length;
		while( idx-- ) {
			var tween = tweens[ idx ];
			if ( ! updateTween( tween, dt ) ) {
				tweens.splice(idx, 1);
			}
		}
		rAF( enterFrame );
	}

	// taken from https://github.com/soulwire/sketch.js/blob/master/js/sketch.js
	(function shimAnimationFrame() {
		var vendors, a, b, c, i, now, dt, then;

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

		rAF = rAF || function( callback ) {
			now = +new Date();
			dt = m.max( 0, 16 - ( now - then ) );
			id = setTimeout( function() {
				callback( now + dt );
			}, dt );
			then = now + dt;
			return id;
		};

		cAF = cAF || function( id ) {
			clearTimeout( id );
		};
	})();

	rAF( enterFrame );

    return {
    	to: function() {
    		var tween = new Tween( false );
    		return tween.set.apply( tween, arguments );
    	},
    	from: function() {
    		var tween = new Tween( true );
    		return tween.set.apply( tween, arguments );
    	}
    };
})();