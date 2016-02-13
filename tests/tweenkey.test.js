
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
var tweenkeyMethods 	= [ 'autoUpdate', 'update', 'pauseAll', 'killAll', 'resumeAll', 'setFPS' ];
var tweenMethods 		= [ 'pause', 'resume', 'kill', 'delay', 'timeScale', 'restart', 'reverse', 'seek' ];

Tweenkey.autoUpdate( false );

describe( 'tweenkey', function() {

	describe( 'Tweenkey: definition', function() {

		it( 'Should be defined', function() {
			expect( Tweenkey ).not.to.be.undefined;
			expect( Tweenkey ).not.to.be.null;
		});

		it( 'Should respond to [set, from, to, fromTo] methods', function() {
			tweenConstructors.forEach(function( name ) {
				expect( Tweenkey ).to.respondTo( name );
			});
		});

		it( 'Should respond to [update, killAll, pauseAll, resumeAll] methods', function() {
			tweenkeyMethods.forEach(function( name ) {
				expect( Tweenkey ).to.respondTo( name );
			});
		});

	});

	describe( 'Tween: constructors', function() {

		var errorMessage = 'Invalid parameters';

		it( 'Should validate empty params', function() {
			disableConsole( true );
			tweenConstructors.forEach(function( name ) {
				expect( Tweenkey[ name ] ).to.throw( errorMessage );
			});
			disableConsole( false );
		});

		it( 'Should validate wrong target types', function() {
			disableConsole( true );
			tweenConstructors.forEach(function( name ) {
				[ 1, null, true, function() {}, undefined ].forEach(function( val ) {
					expect( Tweenkey[ name ].bind(this, val ) ).to.throw( errorMessage );
				});
			});
			disableConsole( false );
		});


		it( 'Should validate additional params', function() {

			disableConsole( true );

			tweenConstructors.forEach(function( name ) {
				[ [], null, true, function() {}, undefined ].forEach(function( val ) {
					expect( Tweenkey[ name ].bind( this, val ) ).to.throw( errorMessage );
				});
			});
			Tweenkey.killAll();

			disableConsole( false );
		});

	});

	describe( 'Tweenkey: accessors', function() {
		it( 'killAll: should remove all active tweens', function() {
			var tweens = [];

			for (var i = 10; i--; ) {
				var obj = {x: 0, y: 0, z: 1, w: 0};
				tweens.push(Tweenkey.set(obj, { x:1, delay: 1 }) );
				tweens.push(Tweenkey.set(obj, { x:1 }) );
				tweens.push(Tweenkey.to(obj, 1, { y:2 }) );
				tweens.push(Tweenkey.from(obj, 1, { z:3 }) );
				tweens.push(Tweenkey.from(obj, 1, { z:3, delay: 1 }) );
				tweens.push(Tweenkey.fromTo(obj, 1, { w:1 }, { w:4 }) );
			}
			Tweenkey.killAll();
			for (var i = tweens.length; i--; ) {
				expect(tweens[i]).to.have.property('_alive').and.equal(false);
			}
			// make sure current dead tweens are unloaded from queue, just
			// to be sure it doesn't mess with other tests.
			Tweenkey.update();
		});

		it( 'pauseAll: should pause all active tweens', function() {

		});

		it( 'resumeAll: should resume all paused tweens', function() {

		});

		it( 'setFPS: should adjust speed of updating', function(done) {

			var fps = 10;
			var updateCount = 0;

			Tweenkey.killAll();
			Tweenkey.setFPS(fps);
			Tweenkey.autoUpdate(true);

			// In half second should be 5 updates since fps is 10.
			// This value can be unpredictible with higher granularity
			// since requestAnimationFrame is not warranted to be on time.
			// If user needs exact updates he should be using manual updates,
			// in other words this won't work with physics loops that need 
			// a precise number of iterations in time.
			Tweenkey.to({x:0}, 0.5, { x:1, onUpdate: function() {
					updateCount++;
				},
				onComplete: function() {
					expect(updateCount).to.equal(5);

					//set back to the original FPS
					Tweenkey.setFPS(60);
					Tweenkey.autoUpdate(false);
					done();
				}
			});
		});
	});

	describe( 'Tween: definitions', function() {

		var basicParams = {
			set: 	[ { x: 0 }, { x: 1 } ],
			to: 	[ { x: 0 }, 1, { x: 1 } ],
			from: 	[ { x: 1 }, 1, { x: 1 } ],
			fromTo: [ { x: 0 }, 1, { x: 1 }, { x: 2 } ]
		};

		it( 'Should respond to [pause, resume, kill, delay, seek, restart, reverse] methods', function() {

			tweenConstructors.forEach(function( cName ) {
				var t = Tweenkey[ cName ].apply( null, basicParams[ cName ] );
				tweenMethods.forEach(function( mName ) {
					expect( t ).to.respondTo( mName );
				});
			});

		});
	});

	//chaining

	describe( 'Tween: callbacks', function() {

		var invalidCallbacks = [ true, false, 1, 0, [], {}, undefined ];

		it( 'set: should work with the wrong callback parameters', function() {
			invalidCallbacks.forEach(function( val ) {

				var tween = Tweenkey.set({ x: 0 }, {
					x : 1,
					onComplete: val,
					onUpdate: val,
					onStart: val
				});

				Tweenkey.update();
				expect( tween ).to.respondTo( '_onComplete' );
				expect( tween ).to.respondTo( '_onStart' );
				expect( tween ).to.respondTo( '_onUpdate' );
				expect( tween._target ).to.have.property( 'x' ).and.equal( 1 );
			});
		});

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
			});
			Tweenkey.update();
		});

		it( 'set: execute the onStart callback with all properties untouched', function( done ) {
			var obj = { x: 0 };
			Tweenkey.set( obj, { x: 1,
				onStart: function( target ) {
					expect( obj ).to.have.property( 'x' ).and.equal( 0 );
					done();
				}
			});
			Tweenkey.update();
		});

		it( 'to: should work with the wrong callback parameters', function() {
			invalidCallbacks.forEach(function( val ) {

				var tween = Tweenkey.to({ x: 0 }, 1, {
					x : 1,
					onComplete: val,
					onUpdate: val,
					onStart: val
				});
				Tweenkey.update( 1 );

				expect( tween ).to.respondTo( '_onComplete' );
				expect( tween ).to.respondTo( '_onStart' );
				expect( tween ).to.respondTo( '_onUpdate' );
				expect( tween._target ).to.have.property( 'x' ).and.equal( 1 );
			});
		});

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
			});
			Tweenkey.update( 1 );
		});

		it( 'to: should execute onStart callback with all properties untouched', function( done ) {
			var obj = { x: 0 };
			Tweenkey.to( obj, 1, { x: 1,
				onStart: function( target ) {
					expect( obj ).to.have.property( 'x' ).and.equal( 0 );
					done();
				}
			});
			Tweenkey.update( 1 );
		});

		it( 'from: should work with the wrong callback parameters', function() {
			invalidCallbacks.forEach(function( val ) {

				var tween = Tweenkey.from({ x: 0 }, 1, {
					x : 1,
					onComplete: val,
					onUpdate: val,
					onStart: val
				});
				Tweenkey.update( 1 );

				expect( tween ).to.respondTo( '_onComplete' );
				expect( tween ).to.respondTo( '_onStart' );
				expect( tween ).to.respondTo( '_onUpdate' );
				expect( tween._target.x ).to.equal( 0 );
			});
		});

		it( 'from: execute the [onComplete, onUpdate] callbacks', function( done ) {
			var obj = { x: 0 };
			Tweenkey.from( obj, 1, { x: 1,
				onUpdate: function( target ) {
					expect( obj.x ).to.equal( 0 );
				},
				onComplete: function( target ) {
					expect( obj.x ).to.equal( 0 );
					done();
				}
			});
			Tweenkey.update( 1 );
		});

		it( 'from: should execute onStart callback with all properties untouched', function( done ) {
			var obj = { x: 0 };
			Tweenkey.to( obj, 1, { x: 1,
				onStart: function( target ) {
					expect( obj.x ).to.equal( 0 );
					done();
				}
			});
			Tweenkey.update( 1 );
		});

		it( 'fromTo: should work with the wrong callback parameters', function() {
			invalidCallbacks.forEach(function( val ) {

				var tween = Tweenkey.fromTo({ x: 0 }, 1, {
					x: 1
				}, {
					x : 2,
					onComplete: val,
					onUpdate: val,
					onStart: val
				});
				Tweenkey.update( 1 );

				expect( tween ).to.respondTo( '_onComplete' );
				expect( tween ).to.respondTo( '_onStart' );
				expect( tween ).to.respondTo( '_onUpdate' );
				expect( tween._target ).to.have.property( 'x' ).and.equal( 2 );
			});
		});

		it( 'fromTo: execute the [onComplete, onUpdate] callbacks', function( done ) {
			var obj = { x: 0 };
			Tweenkey.fromTo( obj, 1, {
				x: 2
			}, {
				x: 1,
				onUpdate: function( target ) {
					expect( obj.x ).to.equal( 1 );
				},
				onComplete: function( target ) {
					expect( obj.x ).to.equal( 1 );
					done();
				}
			});
			Tweenkey.update( 1 );
		});

		it( 'fromTo: should execute onStart callback with all properties untouched', function( done ) {
			var obj = { x: 0 };
			Tweenkey.fromTo( obj, 1, { x: 2 }, { x: 1,
				onStart: function( target ) {
					expect( obj.x ).to.equal( 0 );
					done();
				}
			});
			Tweenkey.update( 1 );
		});

	});

	describe( 'Tween: linear interpolation', function() {

		it( 'to: should interpolate linear properties by default', function() {
			var obj = { x: 0 };
			Tweenkey.to( obj, 1, { x: 1 });
			for ( var i = 0; i < 10; i++ ) {
				var expectedVal = i * 0.1;
				// add tolerance to match property decimals between a range
				expect( obj.x ).to.be.within( expectedVal - 0.0001,  expectedVal + 0.0001 );
				Tweenkey.update( 0.1 );
			}
		});

		it( 'from: should interpolate linear properties by default', function() {
			var obj = { x: 1 };
			Tweenkey.from( obj, 1, { x: 0 });

			// will trigger the update to start with the current object property x setted to 0
			// this behaviour is inteded, user can change this with inmediate render param ?
			Tweenkey.update( 0.000001 );

			for ( var i = 0; i < 10; i++ ) {
				var expectedVal = i * 0.1;
				expect( obj.x ).to.be.within( expectedVal - 0.0001,  expectedVal + 0.0001 );
				Tweenkey.update( 0.1 );
			}
		});

		it( 'fromTo: should interpolate linear properties by default', function() {
			var obj = { x: 0 };
			Tweenkey.fromTo( obj, 1, { x: 0 }, { x: 1 });
			for ( var i = 0; i < 10; i++ ) {
				var expectedVal = i * 0.1;
				expect( obj.x ).to.be.within( expectedVal - 0.0001,  expectedVal + 0.0001 );
				Tweenkey.update( 0.1 );
			}
		});
	});

	describe( 'Tween: multiple active tweens on single object', function() {
		
		it( '[set, to, from, fromTo]: should be able to modify different properties on same object', function() {
			var obj = { x: 0, y: 0, z: 3, w: 0 };

			Tweenkey.set( obj, { x: 1 });
			Tweenkey.to( obj, 1, { y: 2 });
			Tweenkey.from( obj, 1, { z: 0 });
			Tweenkey.fromTo(obj, 1, { w: 0 }, { w: 4 });
			Tweenkey.update(1);

			expect( obj.x ).to.equal( 1 );
			expect( obj.y ).to.equal( 2 );
			expect( obj.z ).to.equal( 3 );
			expect( obj.w ).to.equal( 4 );
		});

		it( '[set, to, from, fromTo]: should override same properties on same object', function() {
			var obj = { x: 0, y: 2, z: 0, w: 0 };

			Tweenkey.set( obj, { x: 0.1, y: 0.2, z: 0.3, w: 0.4 });
			Tweenkey.to( obj, 1, { x: 1 });
			Tweenkey.from( obj, 1, { y: 0 });
			Tweenkey.fromTo( obj, 1, { z: 1 }, { z: 3 });
			Tweenkey.update(1);
			
			// w should be untouched
			expect( obj.w ).to.equal( 0.4 );
			
			// x overrided by to
			chai.assert.closeTo(obj.x, 1, 0.0001, 'x should override');
			
			// y overrides set but since <from> takes the current object state
			// (wich was modified by <set>) it will end in 0.2 a not 2
			chai.assert.closeTo(obj.y, 0.2, 0.0001, 'y should override');

			// z is overrides entirely z
			chai.assert.closeTo(obj.z, 3, 0.0001, 'z should override');
		});

		it( '[set, to, from, fromTo]: should not override tweens props with smaller delays', function() {
			var obj = { x: 0, y: 2, z: 0, w: 0 };

			Tweenkey.to( obj, 0.5, { x: 0.1, y: 0.2, z: 0.3, w: 0.4 });
			Tweenkey.to( obj, 1, { x: 1, delay: 1 });
			Tweenkey.from( obj, 1, { y: 0, delay: 1 });
			Tweenkey.fromTo( obj, 1, { z: 1 }, { z: 3, delay: 1});
			Tweenkey.update( 0.5 );

			// x, y and z should not override to (delay is retaining)
			chai.assert.closeTo(obj.x, 0.1, 0.0001, 'x should not override');
			chai.assert.closeTo(obj.y, 0.2, 0.0001, 'y should not override');
			chai.assert.closeTo(obj.z, 0.3, 0.0001, 'z should not override');
			Tweenkey.killAll();
		});

		it( '[set, to, from, fromTo]: should tween if execution times are not conflicting', function() {
			var obj = { x: 0, y: 2, z: 0, w: 0 };

			Tweenkey.to( obj, 0.5, { x: 0.1, y: 0.2, z: 0.3, w: 0.4 });
			Tweenkey.to( obj, 1, { x: 1, delay: 1 });
			Tweenkey.from( obj, 1, { y: 0, delay: 1 });
			Tweenkey.fromTo( obj, 1, { z: 1 }, { z: 3, delay: 1});
			Tweenkey.update( 1 );

			// x, y and z should not be disabled by first tween
			chai.assert.closeTo(obj.x, 1, 0.0001, 'x should the las scheduled tween');
			chai.assert.closeTo(obj.y, 0.2, 0.0001, 'y be the last scheduled tween');
			chai.assert.closeTo(obj.z, 3, 0.0001, 'z should be the last scheduled tween');
			Tweenkey.killAll();
		});
	});

	describe( 'Tween: pause, resume and kill', function() {
		it( 'set: should pause and resume', function() {
			var obj = { x: 0 };

			var tween = Tweenkey.set( obj, { x:1 }).pause();
			Tweenkey.update( 1 );
			expect( obj.x ).to.equal( 0 );
			tween.resume();
			Tweenkey.update();
			expect( obj.x ).to.equal( 1 );
		});

		it( 'set: should kill all its properties', function() {
			var obj = { x: 0 };

			var tween = Tweenkey.set( obj, { x:1 }).kill();
			Tweenkey.update( 1 );
			expect( obj.x ).to.equal( 0 );
		});

		it( 'set: should kill specific properties', function() {
			var obj = { x: 0, y: 0 };

			var tween = Tweenkey.set( obj, { x:1, y: 1 }).kill('y');
			Tweenkey.update( 1 );
			expect( obj.x ).to.equal( 1 );
			expect( obj.y ).to.equal( 0 );
		});
	});

	describe( 'Tween: timeScale', function() {
		it( 'Should scale in time with param property and method call', function() {
			var obj = { x: 0, y: 0 };
			var tween = Tweenkey.to( obj, 1, { x:1, y: 1, timeScale: 2 });
			Tweenkey.update( 0.5 );
			expect( obj.x ).to.equal( 1 );
		});

		it( 'Should validate incorrect parameters', function() {
			var obj = { x: 0, y: 0 };
			var tween = Tweenkey.to( obj, 1, { x:1, y: 1, timeScale: 2 });
			Tweenkey.update( 0.5 );
			expect( obj.x ).to.equal( 1 );
		});
	});
});
