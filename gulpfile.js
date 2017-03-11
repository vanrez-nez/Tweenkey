var gulp = require( 'gulp' );
var concat = require('gulp-concat');
var gulpif = require( 'gulp-if' );
var uglify = require( 'gulp-uglify' );
var rename = require( 'gulp-rename' );

var filesSeq = [
    "src/intro.js",
    "src/utils.js",
    "src/bezier.js",
    "src/easing.js",
    "src/raf.js",
    "src/plot.js",
    "src/tweenkey.js",
    "src/outro.js"
];

var devOnly = [
    "src/plot.js",
];

gulp.task( 'uglify', () => {
    gulp.src( 'dist/tweenkey.js' )
    .pipe( uglify( { 
        
        mangleProperties: {
            regex: /_/
        },
        compress: true
    } ) )
    .pipe( rename('tweenkey.min.js') )
    .pipe( gulp.dest('dist' ) );

})

gulp.task( 'concat', () => {
    
    gulp.src( filesSeq )
    .pipe( concat( 'tweenkey.dev.js' ) )
    .pipe( gulp.dest( 'dist' ) );

    let noDevSeq = filesSeq.filter( s => devOnly.indexOf( s ) == -1 );
    gulp.src( noDevSeq )
    .pipe( concat( 'tweenkey.js' ) )
    .pipe( gulp.dest( 'dist' ) );

} );

gulp.task( 'build', [ 'concat', 'uglify' ] );

gulp.task( 'watch', ()=> {
    let watcher = gulp.watch( [ 'src/**/*.js', 'demo/*' ], [ 'build' ] );
    watcher.on( 'change', ( event )=> {
        console.log( `\n[${event.type}]: ${event.path}` );
        
    })
});

