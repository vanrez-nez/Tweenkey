const gulp = require( 'gulp' );
const concat = require('gulp-concat');
const gulpif = require( 'gulp-if' );
const uglify = require( 'gulp-uglify' );
const rename = require( 'gulp-rename' );
const rimraf = require( "rimraf" );

const filesSeq = [
    "src/intro.js",
    "src/utils.js",
    "src/bezier.js",
    "src/easing.js",
    "src/raf.js",
    "src/plot.js",
    "src/common.js",
    "src/tweenkey.js",
    "src/outro.js"
];

const devOnly = [
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

gulp.task( 'clean', ( cb ) => {
    rimraf('./dist', cb );
});

gulp.task( 'build', [ 'clean', 'concat', 'uglify' ] );

gulp.task( 'watch', ()=> {
    let watcher = gulp.watch( [ 'src/**/*.js', 'demo/*' ], [ 'clean', 'concat' ] );
    watcher.on( 'change', ( event )=> {
        console.log( `\n[${event.type}]: ${event.path}` );
        
    })
});

