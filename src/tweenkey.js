
var Tweenkey = Tweenkey || (function( wnd ) {
	"use strict";
	
	var rAF, cAF;
	var tweens = [];

	// flat dictionary to track all objects properties
	// ids are formed from objectId + propertyName
	var propDict = {};
	var propDictIdx = 1;

	var m = Math;

	var lastTime = 0;
	var autoUpdate = true;

	var TYPE_FNC = Object.prototype.toString;

	// Type constants
	var S_FNC = 'F';
	var S_ARR = 'A';
	var S_NUM = 'N';
	var S_BOOL = 'B';
	var S_OBJ = 'O';

	// Define an array of types for each tween to validate parameters
	var TWEEN_SET 		= [ S_OBJ ];
	var TWEEN_TO 		= [ S_NUM, S_OBJ ];
	var TWEEN_FROM 		= [ S_NUM, S_OBJ ];
	var TWEEN_FROM_TO 	= [ S_NUM, S_OBJ, S_OBJ ];

	function getTypeCheck( typeStr ) {
		return function( object ) {
			return TYPE_FNC.call( object )[ 8 ] == typeStr;
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
				return last + ':' + TYPE_FNC.call( current )[ 8 ];
			}, '').slice( 1 );
			return sig == signature;
		}
	};

	function createCallback( cb, tween ) {
		var valid = _globals.isFunction( cb );
		return function() {
			valid && cb.call( tween, tween._target );
		}
	}

	function disableRunningProperties( tween ) {

		var currentNode = tween._firstNode;
		do {

			for ( var idx = currentNode.properties.length; idx--; ) {
				var property = currentNode.properties[ idx ];
				var propertyId = currentNode.target.tweenkey_id + property.name;

				if ( propDict[ propertyId ] ) {
					propDict[ propertyId ].enabled = false;
				}

				property.enabled = true;
				propDict[ propertyId ] = property;
			}

		} while ( currentNode = currentNode.next );
	}
	
	function Tween( type ) {

		this._type = type;
		
		return this;
	}

	/*
	* Updates the properties of a given tween
	*/
	function updateTween( tween, dt ) {
		
		var target = tween._target;
		
		tween._delayLeft = m.max( tween._delayLeft - dt, 0 );
		
		if ( tween._delayLeft == 0 ) {

			if ( tween._elapsedTime == 0 ) {
				
				initTargetProperties( tween,  tween._params[0], tween._params[1] );
				disableRunningProperties( tween );
				// fire onStart notification
				tween._onStart();
			}
			
			tween._elapsedTime += dt;

			// default progress for tween.set
			tween._progress = 1;
			if ( tween._duration > 0 ) {
				tween._progress = m.min( 1, tween._elapsedTime / tween._duration );
			}

			// update tween props
			var currentNode = tween._firstNode;
			var updated = false;
			do {
				for ( var idx = currentNode.properties.length; idx--; ) {
					var property = currentNode.properties[ idx ];

					// property not enabled means it was overrided by another tween
					if ( property.enabled ) {
						currentNode.target[ property.name ] = tween._ease( 
							tween._progress,
							property.f,
							property.t - property.f,
							1
						);
						updated = true;
					}
				}
			} while ( currentNode = currentNode.next );

			// fire onUpdate notification only if one or more properties were updated
			updated && tween._onUpdate();
		}
		
		// kill tween?
		if ( tween._elapsedTime >= tween._duration ) {
			tween._alive && tween._onComplete();

			// loop count validation should be in here
			tween.kill();
		}

	}

	/*
	 * Builds a linked list of all objects and properties to iterate
	 * It stores the first linked object in the current tween
	 */
	function initTargetProperties( tween, targetProperties, originProperties ) {

		var targets =  _globals.isArray( tween._target ) ? tween._target : [ tween._target ];
		var prevNode, firstNode;
		
		for ( var idx = targets.length; idx--; ) {
			var currentTarget = targets[ idx ];
			
			// if originProperties is defined then override start values of the object
			originProperties = originProperties || currentTarget;
			var properties = [];

			for ( var key in targetProperties ) {
				
				// Tweeneable param names can only be numbers and not tween property names
				// also we check that currentTarget property exists on target object
				if ( ! tween[ key ] && _globals.isNumber( targetProperties[ key ] ) && ( key in currentTarget ) ) {
					
					var property = 	{
						name: key,
						enabled: true,
						'f': originProperties[ key ],
						't': targetProperties[ key ],
					};

					// swap from and to values if is tween from
					if ( tween._type == TWEEN_FROM || tween._type == TWEEN_FROM_TO )
						property.t = [ property.f, property.f = property.t ][ 0 ];
					
					properties.push( property );
				}
			}

			var currentNode = {
				target: currentTarget,
				properties: properties
			};

			// tag object id without overwrite
			currentTarget.tweenkey_id = currentTarget.tweenkey_id || propDictIdx++;
		
			firstNode = firstNode || currentNode;
			prevNode && ( prevNode.next = currentNode );
			prevNode = currentNode;
		}

		tween._firstNode = firstNode;
	}

	function initTween( tween, target, params ) {

		var duration = params.shift();
		var params1 = params.shift();
		var params2 = params.shift();

		// swap duration to params1 if no duration was defined (Tween.set)
		_globals.isObject( duration ) && ( params1 = duration ) && ( duration = 0 );

		// select special params
		var sParams = params2 || params1;

		// initialize tween properties
		var delay = _globals.isNumber( sParams.delay ) ? m.max( 0, sParams.delay ) : 0;

		tween._target = target;
		
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
			_onComplete: 	createCallback( sParams.onComplete, tween ),
			_params: 		[params1, params2]
		}, true );

	}

	Tween.prototype = {
		define: function( params ) {
			var target = params.shift();

			// Validate params
			var validParams = _globals.signatureEquals( params, this._type.join( ':' ) );
			var validTarget = _globals.isObject( target ) || _globals.isArray( target );

			if ( validParams && validTarget ) {
				initTween( this, target, params );
				tweens.push( this );
				return this;
			
			} else {
				console.warn( 'Invalid tween parameters:', params );
				return undefined;
			}
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

	function setAutoUpdate( enabled ) {
		autoUpdate = Boolean( enabled );
		if ( enabled ) {
			enterFrame( 0 );
		}
	}

	function enterFrame( timeStamp, manualStep ) {

		var dt = manualStep || m.min( ( timeStamp - lastTime ) / 1000, 0.016 );
		lastTime = timeStamp;

		// clear killed tweens
		for ( var idx = tweens.length -1 ; idx > 0; idx-- )
			! tweens[ idx ]._alive && tweens.splice( idx, 1 );
		
		// update tweens
		for ( var idx = 0, length = tweens.length; idx < length; idx++ )
			tweens[ idx ]._active && updateTween( tweens[ idx ], dt );

		autoUpdate && rAF( enterFrame );
	}

	function update( step ) {
		step = Number(step || 0.016);
		if (step < 0) step = 0;
		autoUpdate == false && enterFrame( 0, step );
	}

	function newTweenFactory( type ) {
		return function create() {
			var tween = new Tween( type );
			return tween.define.call( tween, [].slice.call( arguments ) );
		};
	}

	// borrowed from https://github.com/soulwire/sketch.js/blob/master/js/sketch.js
	(function shimAnimationFrame() {
		var vendors, a, b, c, i, now, dt, id;
		var then = 0;

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

	enterFrame( 0 );

	return {
		update: update,
		autoUpdate: setAutoUpdate,
		set: newTweenFactory( TWEEN_SET ),
		to: newTweenFactory( TWEEN_TO ),
		from: newTweenFactory( TWEEN_FROM ),
		fromTo: newTweenFactory( TWEEN_FROM_TO ),
		killAll: executeOnAllTweens( 'kill' ),
		pauseAll: executeOnAllTweens( 'pause' ),
		resumeAll: executeOnAllTweens( 'resume' )
    };
})( window );

( function ( root ) {

	if ( typeof define === 'function' && define.amd ) {

		// AMD
		define( [], function () {
			return Tweenkey;
		} );
	} else if ( root !== undefined ) {

		// Global variable
		root.Tweenkey = Tweenkey;

	}

} )( this );