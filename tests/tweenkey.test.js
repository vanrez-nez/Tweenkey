
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
var tweenkeyMethods 	= [ 'update', 'pauseAll', 'killAll', 'resumeAll' ];
var tweenMethods 		= [ 'pause', 'resume', 'kill', 'delay' ];

var validParams = {
	set: 	[ { x: 0 }, { x: 1 } ],
	to: 	[ { x: 0 }, 0.01, { x: 1 } ],
	from: 	[ { x: 1 }, 0.01, { x: 1} ],
	fromTo: [ { x: 0 }, 0.01, { x: 1 }, { x: 2 } ]
}

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

			disableConsole( false );
		} );
	} );

	describe( 'Tween definitions', function() {
		it( 'Should respond to [pause, resume, kill, delay] methods', function() {
			
			tweenConstructors.forEach( function( cName ) {
				var t = Tweenkey[ cName ].apply( null, validParams[ cName ] );
				tweenMethods.forEach( function( mName ) {
					expect( t ).to.respondTo( mName );
				} );
			} );
		} );
	} );
} );