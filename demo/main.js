(function() {
    console.log('Ready!');
    var canvas = document.getElementById('target');
    var ctx = canvas.getContext('2d');

    canvas.width = 800;
    canvas.height = 600;
    var hW = canvas.width / 2;
    var hH = canvas.height / 2;

    

    var easeInQuad = function (t, b, c, d) {
		return c*(t/=d)*t + b;
	};

	function getRandomNumber(min, max) {
    	return Math.random() * (max - min) + min;
	}

	function getRandomColor() {
	    // http://stackoverflow.com/questions/1484506/random-color-generator-in-javascript
	    return "#"+((1<<24)*Math.random()|0).toString(16);
	}


/*
	var circle = { radius: 0 };
	var t = Tweenkey.to( circle, 10, { radius: 20, autoStart: false, onUpdate: function(obj) {
		//console.log(obj);
	}} );

	setTimeout(function() {
		console.log('resuming');
		t.resume();
	}, 500);

	setTimeout(function() {
		console.log('pausing');
		t.pause();
	}, 1000);

	setTimeout(function() {
		console.log('killing');
		t.kill();
	}, 2000);


	setTimeout(function() {
		var obj = { x: 0 }
		Tweenkey.set(obj, { x: 1, onComplete: function(o) {
			console.log('completed:', o);
			} 
		});

		var obj2 = { x2: 0 };
		Tweenkey.set(obj2, { x2: 1, onComplete: function(o) {
			console.log('completed:', o);
			} 
		});

	}, 600);
	*/

	/*

	var c = { x: 0 };
	var t = Tweenkey.fromTo( c, 5, { x: 0 }, { x: 1, 
		onUpdate: function(o) {
			console.log('Update:', o);
		},
		onStart: function(o) {
			console.log('Starting!');
		},
		onComplete: function(o) {
			console.log('Complete!:', o);
		},
		autoStart: false,
		delay: 3,
	}).delay(3);
	t.delay(1);
	t.resume();
	*/


	var updates = 0;
	var completed = 0;
	for (var i = 0; i < 1000; i++) {
		//console.log('creating tween');
		var obj = {x:0};
		Tweenkey.to(obj, Math.random() * 20 + 5, {
			onUpdate: function() {
				updates++;
			},
			onComplete: function() {
				completed++;
			},
			x: Math.random() * 100 + 1,
			ease: easeInQuad,
			autoStart: true
		})
	}

	setInterval(function() {
		console.log('Updates:', updates, 'Completed:', completed);
	}, 2000)
	



	var d = { x: 0 };
	//Tweenkey.to( d, 1, { x: 1 });

	/*

	setTimeout(function() {
		var obj = { x: 0 };

		Tweenkey.fromTo(obj, 0.3,
			{
				x: 1,
				onComplete: function(o) { console.log('completed:', o); }
			},{
				x: 3,
				onComplete: function(o) { console.log('completed:', o); }
			}
		);

	}, 100);
*/


/*
	for (var i = 0; i < 100; i++) {
		var circle = { radius: 0 };
		
		Tweenkey.from( circle, 2, { 
	    	radius: 30,
	    	ease: easeInQuad,
	    	onUpdate: function(obj) {
	    		ctx.beginPath();
	    		ctx.fillStyle = getRandomColor();
	    		ctx.arc(hW + getRandomNumber(-100, 100), hH + getRandomNumber(-100, 100), obj.radius, 0, 2 * Math.PI);
	    		ctx.fill();
	    	}
	    });
	}
	*/

    
})();