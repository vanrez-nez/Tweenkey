const gulp = require( 'gulp' );
const gulpif = require( 'gulp-if' );
const uglify = require( 'gulp-uglify' );
const rename = require( 'gulp-rename' );
const rimraf = require( 'rimraf' );
const rollup = require( 'rollup' );
const runSequence = require( 'run-sequence' );
const sourcemaps = require( 'gulp-sourcemaps' );
const rollupBuble = require( 'rollup-plugin-buble' );

gulp.task( 'uglify', () => {
    gulp.src( 'dist/tweenkey.js' )
    .pipe( uglify( { 
        
        mangleProperties: {
            regex: /_/
        },
        compress: true
    } ) )
    .pipe( rename('tweenkey.min.js') )
    .pipe( gulp.dest( './dist' ) );
});

gulp.task( 'rollup', () => {
    return rollup.rollup({
        entry: './src/main.js',
        plugins: [ rollupBuble() ]
    }).then( ( bundle )=> {
        bundle.write( {
            dest: "./dist/tweenkey.js",
            moduleName: 'Tweenkey',
            format: 'umd'
        } );
    });
});

gulp.task( 'clean', ( cb ) => {
    rimraf( './dist', cb );
});

gulp.task( 'build:prod', ( callback )=> {
    runSequence( 'clean', 'rollup', 'uglify', callback );
});

gulp.task( 'build:dev', ( callback ) => {
    runSequence( 'clean', 'rollup', callback );
});

gulp.task( 'watch', ()=> {
    let watcher = gulp.watch( [ 'src/**/*.js', 'demo/*' ], [ 'build:dev' ] );
    watcher.on( 'change', ( event )=> {
        console.log( `\n[${event.type}]: ${event.path}` );
        
    })
});

