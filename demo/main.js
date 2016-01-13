(function() {
    console.log('Ready!');
    var canvas = document.getElementById('target');
    var ctx = canvas.getContext('2d');
    var obj = { x: 0 };
    Tweenkey.to( obj, 5, { x: 10 } );
})();