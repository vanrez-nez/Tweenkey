
var Tweenkey = Tweenkey || (function() {
	"use strict";
	
	var rAF, cAF;
	var tweens = [];
	var m = Math;
	var wnd = window;

	var TWEEN_SET = [''];
	var TWEEN_TO = [''];
	var TWEEN_FROM = [''];
	var TWEEN_FROM_TO = [''];

	function getTypeCheck( typeStr ) {
		return function( object ) {
			return Object.prototype.toString.call( object ) == '[object ' + typeStr + ']';
		}
	}

	// global object to be shared between modules
	var _globals = {
		isFunction: getTypeCheck( 'Function' ),
		isObject: getTypeCheck( 'Object' ),
		isArray: getTypeCheck( 'Array' ),
		isNumber: getTypeCheck( 'Number' ),
		lerp: function lerp( t, b, c, d ) {
			return c * t / d + b;
		}
	};
	
	function Tween( type ) {
		var self = this;
		self.running = false;
		self.type = type;
		self.duration = 0;
		self.startTime = 0;
		self.delay = 0;
		self.props = [];
		return self;
	}

	function updateTween(tween, dt) {
		if ( ! tween.running ) return true;
		
		var target = tween.target;

		// fire onStart notification
		if (tween.startTime === 0) {
			tween.startTime = dt;
			_globals.isFunction( tween.onStart ) && tween.onStart( target );
		}

		var elapsedTime = (dt - tween.startTime) / 1000;
		
		// update tween props
		var idx = tween.props.length;
		while ( idx-- ) {
			var prop = tween.props[ idx ];

			// default progress for tween.set
			var progress = 1;
			if ( tween.duration > 0 ) {
				progress = m.min( 1, 1 - ( tween.duration - elapsedTime ) / tween.duration );
			}
			 
			target[ prop.name ] = tween.ease( progress, prop.f, prop.t - prop.f, 1 );
		}

		// fire onUpdate notification
		_globals.isFunction( tween.onUpdate ) && tween.onUpdate( target )		

		// kill tween?
		if ( elapsedTime >= tween.duration ) {
			tween.running = false;
			_globals.isFunction( tween.onComplete ) && tween.onComplete( target );
			return false;
		}

		return true;
	}

	/*
	 * Pushes all the properties to tween into the tween.props array 
	 */
	function addProps( tween, propertiesFromTo, overrideFromProperties ) {
		
		// If is a FromTo tween override fromParams
		var fromParams = overrideFromProperties || tween.target;
		for ( var p in toParams ) {

			// Tweeneable param names can only be numbers and not reserved properties
			if ( !tween[ p ] && _globals.isNumber( fromParams[ p ] ) ) {
				var prop = {
					name: p,
					'f': fromParams[ p ],
					't': toParams[ p ]
				};

				// swap from and to values if is tween from
				tween.type == TWEEN_FROM && ( prop.t = [ prop.f, prop.f = prop.t ][ 0 ] );
				tween.props.push( prop );
			}
		}
	}

	function initParams( params ) {

	}

	function initTween( tween, target, params ) {
		tween.target = target;

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
	}

	Tween.prototype = {
		define: function( params ) {
			var target = params.shift();
			if ( _globals.isObject( target ) ) {

				initTween( this, target, params );
				tweens.push( this );
			
			} else {
				console.warn( 'Invalid target:', target );
			}
			return this;
		},
		kill: function() {
			this.killed = true;
		},
		pause: function() {
			this.running = false;
		},
		resume: function() {
			this.running = true;
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
			tweens[ idx ].killed && tweens.splice(idx, 1);
		
		// update tweens
		for ( var idx = 0, length = tweens.length; idx < length; idx++ )
			tweens[ idx ].killed = updateTween( tweens[ idx ], dt );

		rAF( enterFrame );
	}

	function newTweenFactory( type ) {
		
		var factoryFn = Tween.bind.apply( Tween, [ type ] );
		return function create() {
			var tween = new factoryFn();
			return tween.define.call( tween, [].slice.call(arguments) );
		
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