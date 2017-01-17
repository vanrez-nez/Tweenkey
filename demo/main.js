var obj = { x:0 };

var t = Tweenkey.to(obj, 1, {
	x: 1,
	onRepeat: function() {
		console.log('repeat!');
	},
	onUpdate: function() {
		console.log(obj.x);
	},
	onStart: function() {
		console.log('onStart');
	},
	onComplete: function() {
		console.log('onComplete');
	}
});
/*
var tk = Tweenkey.ticker({
	onTick: function() {
		console.log('Tick!');
	}
});
*/
/*



tk.setFPS(10);
setTimeout(function() {
	Tweenkey.autoUpdate(false);
	tk.pause();
	//Tweenkey.update(0.0001);
}, 1000);

setTimeout(function() {
	tk.resume();
}, 5000);

setTimeout(function() {
	tk.pause();
}, 6000);
*/

/*
var count = 10;
var id = setInterval(function() {
	if (! count--) {
		clearInterval(id);	
	}
	var samples = [];
	var tweens = [];

	for (var i = 1; i--; ) {
		var tStart = window.performance.now();
		for (var j = 1000; j--; ) {
			//tweens.push( bound(Math.random() * 100).between(20, 80).default(1) );
			tweens.push( Tweenkey.to({x: 0}, 1, { x:1 }) );
		}
		samples.push( window.performance.now() - tStart );
	}
	//profileEnd();

	var avg = 0;
	for (var i = samples.length; i--; ) {
		avg += samples[i];
	}
	
	
	console.log('spawn took:', avg);
}, 100);
*/




//console.log('time:', avg / samples.length );