(function() {

	var pool = [];

	var allocCircles = function( quantity ) {
		while( quantity-- > 0 ) {
			var el = document.createElement( 'div' );
			el.className = 'circle c' + ~~( Math.random() * 9 );
			document.body.appendChild( el );
			pool.push( el );
		}
	}

	var spawnCircle = function( x, y, time ) {
		var circle =  pool.pop();
		if ( circle ) {
			Tweenkey.setFPS( 120 );
			Tweenkey.to( { scale: 0 }, time, {
				scale: Math.random() + 10, 
				ease: 'QuartInOut',
				onUpdate: function( target ) {
					var s = 'opacity: 1;';
					s += 'transform: matrix(' + target.scale + ', 0, 0,' + target.scale + ',' +  x + ',' + y + ');';
					circle.setAttribute( 'style', s );
				},
				onComplete: function() {
					circle.setAttribute( 'style', 'opacity: 0' );
					pool.push( circle );
				}
			} );
		}
	}

	var bindEvents = function() {
		document.onmousemove = function( e ) {
			for( var i = 5; i--; ) {
				spawnCircle( 
					e.clientX + ( Math.random() - 0.5 ) * 60,
					e.clientY + ( Math.random() - 0.5 ) * 60,
					Math.random() + 0.2
				);
			}
		}
	}

	allocCircles( 1000 );
	bindEvents();
})();