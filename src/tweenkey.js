
var Tweenkey = Tweenkey || (function() {
	"use strict";
	
	var rAF, cAF;
	var tweens = [];
	var m = Math;
	var wnd = window;
	var lastTime = 0;

	var TYPE_FNC = Object.prototype.toString;

	// String constants
	var S_FNC = 'F';
	var S_ARR = 'A';
	var S_NUM = 'N';
	var S_BOOL = 'B';
	var S_OBJ = 'O';

	// Constants to ID the constructor types in factory
	// PARAMS is the minimum signature for allowed parameters
	var TWEEN_SET 		= [ S_OBJ ];
	var TWEEN_TO 		= [ S_NUM, S_OBJ ];
	var TWEEN_FROM 		= [ S_NUM, S_OBJ ];
	var TWEEN_FROM_TO 	= [ S_NUM, S_OBJ, S_OBJ ];

	function getTypeCheck( typeStr ) {
		return function( object ) {
			return TYPE_FNC.call( object )[8] == typeStr;
		}
	}

	// global object to be shared between modules
	var _globals = {
		isFunction: getTypeCheck( S_FNC ),
		isObject: 	getTypeCheck( S_OBJ ),
		isArray: 	getTypeCheck( S_ARR ),
		isNumber: 	getTypeCheck( S_NUM ),
		isBoolean: 	getTypeCheck( S_BOOL ),
		now: function() {
			return +new Date();
		},
		lerp: function( t, b, c, d ) {
			return c * t / d + b;
		},
		extend: function( target, source, overwrite ) {
			for ( var key in source )
				( overwrite || !( key in target ) ) && ( target[ key ] = source[ key ] );
			return target;
		},
		signatureEquals: function( argumentsArray, signature ) {
			var sig = argumentsArray.reduce( function( last, current ) {
				return last + ':' + TYPE_FNC.call( current )[8];
			}, '').slice( 1 );
			return sig == signature;
		}
	};
	
	function Tween(type) {
		_globals.extend( this, {
			_type: type,
			_props: []
		} );

		return this;
	}

	/*
	* Returns whether the tween should be keeped alive or not
	*/
	function updateTween( tween, dt ) {
		
		var target = tween._target;
		
		tween._delayLeft = m.max( tween._delayLeft - dt, 0 );
		
		if ( tween._delayLeft == 0 ) {

			if ( tween._elapsedTime == 0 ) {
				
				// fire onStart notification
				tween._onStart()
			}
			
			tween._elapsedTime += dt;

			// update tween props
			var idx = tween._props.length;
			while ( idx-- ) {
				var prop = tween._props[ idx ];

				// default progress for tween.set
				tween._progress = 1;
				if ( tween._duration > 0 ) {
					tween._progress = m.min( 1, tween._elapsedTime / tween._duration );
				}
				 
				target[ prop.name ] = tween._ease( tween._progress, prop.f, prop.t - prop.f, 1 );
			}

			// fire onUpdate notification
			tween._onUpdate();
		}
		
		// kill tween?
		if ( tween._elapsedTime >= tween._duration ) {
			tween._alive && tween._onComplete();
			// loop count validation should be in here
			tween.kill();
		}

	}

	/*
	 * Pushes all the properties to tween into the tween.props array 
	 */
	function addProps( tween, propertiesTo, overrideFrom ) {
		
		// If is a FromTo tween override fromParams
		var fromParams = overrideFrom || tween._target;

		for ( var p in propertiesTo ) {

			// Tweeneable param names can only be numbers and not reserved properties
			if ( !tween[ p ] && _globals.isNumber( propertiesTo[ p ] ) ) {
				var prop = {
					name: p,
					'f': fromParams[ p ],
					't': propertiesTo[ p ]
				};

				// swap from and to values if is tween from
				if (tween._type == TWEEN_FROM || tween._type == TWEEN_FROM_TO)
					prop.t = [ prop.f, prop.f = prop.t ][ 0 ];
				tween._props.push( prop );
			}
		}
	}

	function createCallback( cb, tween ) {
		var valid = _globals.isFunction( cb );
		return function() {
			valid && cb.call( tween, tween._target );
		}
	}

	function initTween( tween, target, params ) {
		tween._target = target;

		var duration = params.shift();
		var params1 = params.shift();
		var params2 = params.shift();

		// swap duration to params1 if no duration was defined (Tween.set)
		_globals.isObject( duration ) && ( params1 = duration ) && ( duration = 0 );

		// select special params
		var sParams = params2 || params1;

		// initialize tween properties
		var delay = _globals.isNumber( sParams.delay ) ? m.max( 0, sParams.delay ) : 0;
		_globals.extend( tween, {
			_progress: 		0,
			_elapsedTime: 	0,
			_alive: 		true,
			_duration: 		_globals.isNumber( duration ) ? m.max( 0, duration ) : 0,
			_active: 		_globals.isBoolean( sParams.autoStart ) ? sParams.autoStart : true,
			_ease: 			_globals.isFunction( sParams.ease ) ? sParams.ease : _globals.lerp,
			_delay: 		delay,
			_delayLeft: 	delay,
			_onStart: 		createCallback( sParams.onStart, tween ),
			_onUpdate: 		createCallback( sParams.onUpdate, tween ),
			_onComplete: 	createCallback( sParams.onComplete, tween )
		}, true );

		addProps( tween, params1, params2 );
	}

	Tween.prototype = {
		define: function( params ) {
			var target = params.shift();

			// Compare params signature
			var validParams = _globals.signatureEquals( params, this._type.join( ':' ) );

			if ( _globals.isObject( target ) && validParams ) {
				initTween( this, target, params );
				tweens.push( this );
			
			} else {
				console.warn( 'Invalid tween parameters:', params );
			}
			return this;
		},
		delay: function( seconds ) {
			this._delayLeft = this._delay = seconds;
			return this;
		},
		kill: function() {
			this._active = false;
			this._alive = false;
			return this;
		},
		pause: function() {
			this._active = false;
			return this;
		},
		resume: function() {
			this._active = true;
			return this;
		}
	};

	function executeOnAllTweens(funcName, args) {
		return function() {
			for ( var i = 0, len = tweens.length; i < len; i++ )
				tweens[ i ][ funcName ]( args );
		}
	}

	function enterFrame( timeStamp ) {

		var dt = m.min( ( timeStamp - lastTime ) / 1000, 0.016 );
		lastTime = timeStamp;

		// clear killed tweens
		for ( var idx = tweens.length -1 ; idx > 0; idx-- )
			! tweens[ idx ]._alive && tweens.splice( idx, 1 );
		
		// update tweens
		for ( var idx = 0, length = tweens.length; idx < length; idx++ )
			tweens[ idx ]._active && updateTween( tweens[ idx ], dt );

		rAF( enterFrame );	

	}

	function newTweenFactory() {

		var args = [].slice.call( arguments );
		args.unshift( null );
		var factoryFn = Tween.bind.apply( Tween, args);
		
		return function create() {
			var tween = new factoryFn();
			return tween.define.call( tween, [].slice.call( arguments ) );
		};
	}

	function cancel() {
		cAF();
	}

	// borrowed from https://github.com/soulwire/sketch.js/blob/master/js/sketch.js
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

		// do we really need this fallback?
		rAF = rAF || function( callback ) {
			now = _globals.now();
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
    	set: newTweenFactory( TWEEN_SET ),
    	to: newTweenFactory( TWEEN_TO ),
    	from: newTweenFactory( TWEEN_FROM ),
    	fromTo: newTweenFactory( TWEEN_FROM_TO ),
    	killAll: executeOnAllTweens( 'kill' ),
    	pauseAll: executeOnAllTweens( 'pause' ),
    	resumeAll: executeOnAllTweens( 'resume' )
    };
})();

// UMD
(function (root) {

	if (typeof define === 'function' && define.amd) {

		// AMD
		define([], function () {
			return Tweenkey;
		});

	} else if (typeof module !== 'undefined' && typeof exports === 'object') {

		// Node.js
		module.exports = Tweenkey;

	} else if (root !== undefined) {

		// Global variable
		root.Tweenkey = Tweenkey;

	}

})(this);