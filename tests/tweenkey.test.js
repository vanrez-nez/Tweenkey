
var cl = console;
function disableConsole( disabled ) {
	if ( disabled ) {
		var stub = {}, methods = [ 'log', 'warn', 'error', 'info' ];
		for ( var i = 0; i < methods.length; i++ )
			stub[ methods[ i ] ] = function() {};
		console = stub;
	} else {
		console = cl;
	}
}

var tweenConstructors 	= [ 'set', 'from', 'to', 'fromTo' ];
var tweenkeyMethods 	= [ 'autoUpdate', 'update', 'pauseAll', 'killAll', 'resumeAll', ];
var tweenMethods 		= [ 'pause', 'resume', 'kill', 'delay' ];

Tweenkey.autoUpdate( false );

describe( 'tweenkey', function() {

	describe( 'Tweenkey definition', function() {
		
		it( 'Should be defined', function() {
			expect( Tweenkey ).not.to.be.undefined;
			expect( Tweenkey ).not.to.be.null;
		} );

		it( 'Should respond to [set, from, to, fromTo] methods', function() {
			tweenConstructors.forEach( function( name ) {
				expect( Tweenkey ).to.respondTo( name );
			} );
		} );

		it( 'Should respond to [update, killAll, pauseAll, resumeAll] methods', function() {
			tweenkeyMethods.forEach( function( name ) {
				expect( Tweenkey ).to.respondTo( name );
			} );
		} );

	} );
	
	describe( 'Tween constructors', function() {

		it( 'Should validate empty params', function() {
			disableConsole( true );
			tweenConstructors.forEach( function( name ) {
				expect( Tweenkey[ name ]() ).to.be.undefined;
			} );
			disableConsole( false );
		} );

		it( 'Should validate wrong target types', function() {
			disableConsole( true );
			tweenConstructors.forEach( function( name ) {
				[ 1, null, true, function() {}, undefined ].forEach( function( val ) {
					expect( Tweenkey[ name ]( val ) ).to.be.undefined;
				} );
			} );
			disableConsole( false );
		});


		it( 'Should validate additional params', function() {

			disableConsole( true );

			tweenConstructors.forEach(function( name ) {
				[ [], null, true, function() {}, undefined ].forEach( function( val ) {
					expect( Tweenkey[ name ]( val ) ).to.be.undefined;
				} );
			} );
			Tweenkey.killAll();

			disableConsole( false );
		} );

	} );

	describe( 'Tween definitions', function() {

		var basicParams = {
			set: 	[ { x: 0 }, { x: 1 } ],
			to: 	[ { x: 0 }, 1, { x: 1 } ],
			from: 	[ { x: 1 }, 1, { x: 1} ],
			fromTo: [ { x: 0 }, 1, { x: 1 }, { x: 2 } ]
		}

		it( 'Should respond to [pause, resume, kill, delay] methods', function() {
			
			tweenConstructors.forEach( function( cName ) {
				var t = Tweenkey[ cName ].apply( null, basicParams[ cName ] );
				tweenMethods.forEach( function( mName ) {
					expect( t ).to.respondTo( mName );
				} );
			} );

		} );
	} );

	//chaining

	describe( 'Tween callbacks', function() {

		var invalidCallbacks = [true, false, 1, 0, [], {}, undefined];

		it( 'set: should work with the wrong callback parameters', function() {
			invalidCallbacks.forEach( function( val ) {
				
				var tween = Tweenkey.set( { x: 0 }, {
					x : 1,
					onComplete: val,
					onUpdate: val,
					onStart: val
				} );

				Tweenkey.update( 1 );
				expect( tween ).to.respondTo( '_onComplete' );
				expect( tween ).to.respondTo( '_onStart' );
				expect( tween ).to.respondTo( '_onUpdate' );
				expect( tween._target ).to.have.property( 'x' ).and.equal( 1 );
			} );
		} );

		it( 'set: execute the [onComplete, onUpdate] callbacks when all properties are setted', function( done ) {
			var obj = { x: 0 };
			Tweenkey.set( obj, { x: 1, 
				onUpdate: function( target ) {
					expect( obj ).to.have.property( 'x' ).and.equal( 1 );
				},
				onComplete: function( target ) {
					expect( obj ).to.have.property( 'x' ).and.equal( 1 );
					done();
				}
			} );
			Tweenkey.update();
		} );

		it( 'set: execute the onStart callback with all properties untouched', function( done ) {
			var obj = { x: 0 };
			Tweenkey.set( obj, { x: 1, 
				onStart: function( target ) {
					expect( obj ).to.have.property( 'x' ).and.equal( 0 );
					done();
				}
			} );
			Tweenkey.update();
		} );

		it( 'to: should work with the wrong callback parameters', function() {
			invalidCallbacks.forEach( function( val ) {
				
				var tween = Tweenkey.to( { x: 0 }, 1, {
					x : 1,
					onComplete: val,
					onUpdate: val,
					onStart: val
				} );
				Tweenkey.update( 1 );

				expect( tween ).to.respondTo( '_onComplete' );
				expect( tween ).to.respondTo( '_onStart' );
				expect( tween ).to.respondTo( '_onUpdate' );
				expect( tween._target ).to.have.property( 'x' ).and.equal( 1 );
			} );
		} );

		it( 'to: execute the [onComplete, onUpdate] callbacks', function( done ) {
			var obj = { x: 0 };
			Tweenkey.to( obj, 1, { x: 1, 
				onUpdate: function( target ) {
					expect( obj ).to.have.property( 'x' ).and.equal( 1 );
				},
				onComplete: function( target ) {
					expect( obj ).to.have.property( 'x' ).and.equal( 1 );
					done();
				}
			} );
			Tweenkey.update( 1 );
		} );

		it( 'to: should execute onStart callback with all properties untouched', function( done ) {
			var obj = { x: 0 };
			Tweenkey.to( obj, 1, { x: 1, 
				onStart: function( target ) {
					expect( obj ).to.have.property( 'x' ).and.equal( 0 );
					done();
				}
			} );
			Tweenkey.update(1);
		} );

		it( 'from: should work with the wrong callback parameters', function() {
			invalidCallbacks.forEach( function( val ) {
				
				var tween = Tweenkey.from( { x: 0 }, 1, {
					x : 1,
					onComplete: val,
					onUpdate: val,
					onStart: val
				} );
				Tweenkey.update( 1 );

				expect( tween ).to.respondTo( '_onComplete' );
				expect( tween ).to.respondTo( '_onStart' );
				expect( tween ).to.respondTo( '_onUpdate' );
				expect( tween._target ).to.have.property( 'x' ).and.equal( 0 );
			} );
		} );

		it( 'from: execute the [onComplete, onUpdate] callbacks', function( done ) {
			var obj = { x: 0 };
			Tweenkey.from( obj, 1, { x: 1, 
				onUpdate: function( target ) {
					expect( obj ).to.have.property( 'x' ).and.equal( 0 );
				},
				onComplete: function( target ) {
					expect( obj ).to.have.property( 'x' ).and.equal( 0 );
					done();
				}
			} );
			Tweenkey.update( 1 );
		} );

		it( 'from: should execute onStart callback with all properties untouched', function( done ) {
			var obj = { x: 0 };
			Tweenkey.to( obj, 1, { x: 1, 
				onStart: function( target ) {
					expect( obj ).to.have.property( 'x' ).and.equal( 0 );
					done();
				}
			} );
			Tweenkey.update(1);
		} );

		it( 'fromTo: should work with the wrong callback parameters', function() {
			invalidCallbacks.forEach( function( val ) {
				
				var tween = Tweenkey.fromTo( { x: 0 }, 1, {
					x: 1 
				}, {
					x : 2,
					onComplete: val,
					onUpdate: val,
					onStart: val
				} );
				Tweenkey.update( 1 );

				expect( tween ).to.respondTo( '_onComplete' );
				expect( tween ).to.respondTo( '_onStart' );
				expect( tween ).to.respondTo( '_onUpdate' );
				expect( tween._target ).to.have.property( 'x' ).and.equal( 2 );
			} );
		} );

		it( 'fromTo: execute the [onComplete, onUpdate] callbacks', function( done ) {
			var obj = { x: 0 };
			Tweenkey.fromTo( obj, 1, {
				x: 2
			}, { 
				x: 1, 
				onUpdate: function( target ) {
					expect( obj ).to.have.property( 'x' ).and.equal( 1 );
				},
				onComplete: function( target ) {
					expect( obj ).to.have.property( 'x' ).and.equal( 1 );
					done();
				}
			} );
			Tweenkey.update( 1 );
		} );

		it( 'fromTo: should execute onStart callback with all properties untouched', function( done ) {
			var obj = { x: 0 };
			Tweenkey.fromTo( obj, 1, { x: 2 }, { x: 1, 
				onStart: function( target ) {
					expect( obj ).to.have.property( 'x' ).and.equal( 0 );
					done();
				}
			} );
			Tweenkey.update(1);
		} );

	} );

	describe( 'Tween linear interpolation', function() {

		it( 'to: should interpolate linear properties by default', function() {
			var obj = { x: 0 };
			Tweenkey.to( obj, 1, { x: 1 } );
			for ( var i = 0; i < 10; i++ ) {
				var expectedVal = i * 0.1;
				// add tolerance to match property decimals between a range
				expect( obj ).to.have.property( 'x' ).and.to.be.within( expectedVal - 0.0001,  expectedVal + 0.0001);
				Tweenkey.update(0.1);
			}
		} );

		it( 'from: should interpolate linear properties by default', function() {
			var obj = { x: 1 };
			Tweenkey.from( obj, 1, { x: 0 } );

			// will trigger the update to start with the current object property x setted to 0
			// this behaviour is inteded, user can change this with inmediate render param ?
			Tweenkey.update(0.000001);

			for ( var i = 0; i < 10; i++ ) {
				var expectedVal = i * 0.1;
				expect( obj ).to.have.property( 'x' ).and.to.be.within( expectedVal - 0.0001,  expectedVal + 0.0001);
				Tweenkey.update(0.1);
			}
		} );

		it( 'fromTo: should interpolate linear properties by default', function() {
			var obj = { x: 0 };
			Tweenkey.fromTo( obj, 1, { x: 0 }, { x: 1 } );
			for ( var i = 0; i < 10; i++ ) {
				var expectedVal = i * 0.1;
				expect( obj ).to.have.property( 'x' ).and.to.be.within( expectedVal - 0.0001,  expectedVal + 0.0001);
				Tweenkey.update(0.1);
			}
		} );

	} );
} );