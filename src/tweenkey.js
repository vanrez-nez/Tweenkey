
var Tweenkey = Tweenkey || (function() {
	"use strict";
	
	var rAF, cAF;
	var tweens = [];
	var m = Math;
	var wnd = window;

	var TYPE_FNC = Object.prototype.toString;

	// String constants
	var S_OBJ = 'Object';
	var S_FNC = 'Function';
	var S_ARR = 'Array';
	var S_NUM = 'Number';

	// Constants to ID the constructor types in factory
	// PARAMS is the minimum signature for allowed parameters
	var TWEEN_SET 		= { PARAMS: [ S_OBJ ] };
	var TWEEN_TO 		= { PARAMS: [ S_NUM, S_OBJ ] };
	var TWEEN_FROM 		= { PARAMS: [ S_NUM, S_OBJ ] };
	var TWEEN_FROM_TO 	= { PARAMS: [ S_NUM, S_OBJ, S_OBJ ] };

	function getTypeCheck( typeStr ) {
		return function( object ) {
			return TYPE_FNC( object ) == '[object ' + typeStr + ']';
		}
	}

	// global object to be shared between modules
	var _globals = {
		isFunction: getTypeCheck( S_FNC ),
		isObject: 	getTypeCheck( S_OBJ ),
		isArray: 	getTypeCheck( S_ARR ),
		isNumber: 	getTypeCheck( S_NUM ),
		lerp: function( t, b, c, d ) {
			return c * t / d + b;
		},
		extend: function( target, source, overwrite ) {
			for ( var key in source )
				overwrite || !( key in target ) && ( target[ key ] = source[ key ] );
			return target;
		},
		signatureEquals: function( argumentsArray, signature ) {
			var sig = argumentsArray.reduce( function( last, current ) {
				return last + ':' + TYPE_FNC.call( current ).slice( 8, -1 );
			}, '').slice( 1 );
			return sig == signature;
		}
	};
	
	function Tween(type) {
		console.log(arguments, type);

		_globals.extend( this, {
			_running: false,
			_type: type,
			_duration: 0,
			_startTime: 0,
			_delay: 0,
			_props: []
		} );

		//return this;
	}

	function updateTween(tween, dt) {
		if ( ! tween._running ) return true;
		
		var target = tween._target;

		// fire onStart notification
		if (tween._startTime === 0) {
			tween._startTime = dt;
			_globals.isFunction( tween._onStart ) && tween._onStart( target );
		}

		var elapsedTime = (dt - tween._startTime) / 1000;
		
		// update tween props
		var idx = tween._props.length;
		while ( idx-- ) {
			var prop = tween._props[ idx ];

			// default progress for tween.set
			var progress = 1;
			if ( tween._duration > 0 ) {
				progress = m.min( 1, 1 - ( tween._duration - elapsedTime ) / tween._duration );
			}
			 
			target[ prop.name ] = tween._ease( progress, prop.f, prop.t - prop.f, 1 );
		}

		// fire onUpdate notification
		_globals.isFunction( tween._onUpdate ) && tween._onUpdate( target )		

		// kill tween?
		if ( elapsedTime >= tween._duration ) {
			tween._running = false;
			_globals.isFunction( tween._onComplete ) && tween._onComplete( target );
			return false;
		}

		return true;
	}

	/*
	 * Pushes all the properties to tween into the tween.props array 
	 */
	function addProps( tween, propertiesFromTo, overrideFromProperties ) {
		
		// If is a FromTo tween override fromParams
		var fromParams = overrideFromProperties || tween._target;
		for ( var p in toParams ) {

			// Tweeneable param names can only be numbers and not reserved properties
			if ( !tween[ p ] && _globals.isNumber( fromParams[ p ] ) ) {
				var prop = {
					name: p,
					'f': fromParams[ p ],
					't': toParams[ p ]
				};

				// swap from and to values if is tween from
				tween._type == TWEEN_FROM && ( prop.t = [ prop.f, prop.f = prop.t ][ 0 ] );
				tween._props.push( prop );
			}
		}
	}

	function initParams( params ) {

	}

	function initTween( tween, target, params ) {
		tween.target = target;
		console.log( 'orray' );

		/*
		// parse arguments after target
		var duration = params.shift();
		var params1 = params.shift();
		var params2 = params.shift();

		// if duration is an object? then is a set, swap to params1 and set duration to 0
		_globals.isObject(duration) && (params1 = duration) && (duration = 0);
		
		tween.running = params.autoStart !== undefined ? !!params.autoStart : true;
		tween.ease = _globals.isFunction( params1.ease ) ? params.ease : _globals.lerp;
		tween.duration = _globals.isNumber( duration ) ? m.max( 0, duration ) : 0;
		tween.delay = _globals.isNumber(duration) ? m.max( 0, duration ) : 0;

		tween.onStart = params.onStart;
		tween.onUpdate = params.onUpdate;
		tween.onComplete = params.onComplete;
		
		// add remaining values inside params as properties
		addProps( tween, params );
		*/
	}

	Tween.prototype = {
		define: function( params ) {
			var target = params.shift();

			// Compare params signature
			var validParams = _globals.signatureEquals( params, this._type.PARAMS.join( ':' ) );

			if ( _globals.isObject( target ) && validParams ) {
				initTween( this, target, params );
				//tweens.push( this );
			
			} else {
				console.warn( 'Invalid tween parameters:', params );
			}
			return this;
		},
		delay: function( seconds ) {
			this.delay = seconds
		},
		kill: function() {
			this._killed = true;
		},
		pause: function() {
			this._running = false;
		},
		resume: function() {
			this._running = true;
		}
	};

	function executeOnAllTweens(funcName, args) {
		return function() {
			for ( var i = 0, len = tweens.length; i < len; i++ )
				tweens[ i ][ funcName ]( args );
		}
	}

	function enterFrame( dt ) {

		// clear killed tweens
		for ( var idx = tweens.length -1 ; idx > 0; idx-- )
			tweens[ idx ]._killed && tweens.splice(idx, 1);
		
		// update tweens
		for ( var idx = 0, length = tweens.length; idx < length; idx++ )
			tweens[ idx ]._killed = updateTween( tweens[ idx ], dt );

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

		// do we really need this fallback?
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
    	set: newTweenFactory( TWEEN_SET ),
    	to: newTweenFactory( TWEEN_TO ),
    	from: newTweenFactory( TWEEN_FROM ),
    	fromTo: newTweenFactory( TWEEN_FROM_TO ),
    	killAll: executeOnAllTweens( 'kill' ),
    	pauseAll: executeOnAllTweens( 'pause' ),
    	resumeAll: executeOnAllTweens( 'resume' )
    };
})();