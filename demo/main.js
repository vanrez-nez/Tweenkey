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


	var circle = { radius: 0 };
	var t = Tweenkey.to( circle, 10, { radius: 20, autoStart: false, onUpdate: function(obj) {
		console.log(obj);
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