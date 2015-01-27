var gulp = require('gulp');
var es = require('event-stream');
var to5 = require('gulp-6to5');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var jshint = require('gulp-jshint');
var rename = require('gulp-rename');
var rjs = require('gulp-requirejs');
var connect = require('gulp-connect');
var sourcemaps = require('gulp-sourcemaps');
var del = require('del');
var qunit = require('node-qunit-phantomjs');


var paths = {
    all: ['packages/**/*.js', 'wrap/*.js', 'shims/*.js', 'test/demo/*.html'],
    propertyCompiler:   'packages/property-compiler/lib/**/*.js',
    reboundCompiler:    'packages/rebound-compiler/lib/**/*.js',
    reboundData:        'packages/rebound-data/lib/**/*.js',
    reboundPrecompiler: 'packages/rebound-precompiler/lib/**/*.js',
    reboundRouter:      'packages/rebound-router/lib/**/*.js',
    reboundRuntime:     'packages/rebound-runtime/lib/**/*.js'
  };

gulp.task('clean', function(cb) {
  // You can use multiple globbing patterns as you would with `gulp.src`
  return del(['dist', 'test/demo/templates'], cb);
});

// JS hint task
gulp.task('jshint', function() {
  gulp.src('./packages/**/*.js')
  .pipe(jshint({
    curly: false,
    loopfunc: true,
    eqnull: true,
    browser: true,
    esnext: true,
    '-W058': true, // Allow prens-less constructors (new Object;)
    '-W093': true, // Allow returning assignment (return a = b;)
    '-W030': true, // Allow unused expressions. Good for conditional assignment.
    globals: {
      jQuery: true
    }
  }))
  .pipe(jshint.reporter('default'));
});

gulp.task('cjs', ['clean'], function() {
  return es.merge(
    gulp.src(paths.propertyCompiler).pipe(rename({prefix: "property-compiler/"})).pipe(to5()).pipe(gulp.dest('dist/cjs')),
    gulp.src(paths.reboundCompiler).pipe(rename({prefix: "rebound-compiler/"})).pipe(to5()).pipe(gulp.dest('dist/cjs')),
    gulp.src(paths.reboundData).pipe(rename({prefix: "rebound-data/"})).pipe(to5()).pipe(gulp.dest('dist/cjs')),
    gulp.src(paths.reboundPrecompiler).pipe(rename({prefix: "rebound-precompiler/"})).pipe(to5()).pipe(gulp.dest('dist/cjs')),
    gulp.src(paths.reboundRouter).pipe(rename({prefix: "rebound-router/"})).pipe(to5()).pipe(gulp.dest('dist/cjs')),
    gulp.src(paths.reboundRuntime).pipe(rename({prefix: "rebound-runtime/"})).pipe(to5()).pipe(gulp.dest('dist/cjs'))
  )
  .pipe(connect.reload());
});

gulp.task('amd', ['clean'], function() {
  return es.merge(
    gulp.src(paths.propertyCompiler).pipe(rename({prefix: "property-compiler/"})).pipe(sourcemaps.init()).pipe(to5({modules: "amd", moduleIds: true})).pipe(gulp.dest('dist/amd')),
    gulp.src(paths.reboundCompiler).pipe(rename({prefix: "rebound-compiler/"})).pipe(sourcemaps.init()).pipe(to5({modules: "amd", moduleIds: true})).pipe(gulp.dest('dist/amd')),
    gulp.src(paths.reboundData).pipe(rename({prefix: "rebound-data/"})).pipe(sourcemaps.init()).pipe(to5({modules: "amd", moduleIds: true})).pipe(gulp.dest('dist/amd')),
    gulp.src(paths.reboundPrecompiler).pipe(rename({prefix: "rebound-precompiler/"})).pipe(sourcemaps.init()).pipe(to5({modules: "amd", moduleIds: true})).pipe(gulp.dest('dist/amd')),
    gulp.src(paths.reboundRouter).pipe(rename({prefix: "rebound-router/"})).pipe(sourcemaps.init()).pipe(to5({modules: "amd", moduleIds: true})).pipe(gulp.dest('dist/amd')),
    gulp.src(paths.reboundRuntime).pipe(rename({prefix: "rebound-runtime/"})).pipe(sourcemaps.init()).pipe(to5({modules: "amd", moduleIds: true})).pipe(gulp.dest('dist/amd'))
  )
  .pipe(concat('rebound.runtime.js'))
  .pipe(sourcemaps.write())
  .pipe(gulp.dest('dist'))
  .pipe(uglify())
  .pipe(rename({basename: "rebound.runtime.min"}))
  .pipe(gulp.dest('dist'));
});

gulp.task('runtime', ['amd'], function() {
  return gulp.src([
    'shims/classList.js',
    'shims/matchesSelector.js',
    'shims/mutationObserver.js',
    'bower_components/document-register-element/build/document-register-element.js',
    'bower_components/backbone/backbone.js',
    'bower_components/requirejs/require.js',
    'wrap/start.frag',
    'bower_components/almond/almond.js',
    'node_modules/htmlbars/dist/amd/htmlbars-util.amd.js',
    'node_modules/htmlbars/dist/amd/morph.amd.js',
    'dist/rebound.runtime.js',
    'wrap/end.runtime.frag'
    ])
  .pipe(concat('rebound.runtime.js'))
  .pipe(gulp.dest('dist'));
});

gulp.task('recompile-demo', ['cjs', 'runtime'],  function(){
  // When everything is finished, re-compile the demo
  var fs   = require('fs');
  var precompile = require('./dist/cjs/rebound-precompiler/rebound-precompiler').precompile;
  var finished = false;
  fs.mkdirSync('./test/demo/templates');
  fs.readFile('./test/demo/demo.html', 'utf8', function (err,data) {
    if (err) return console.log(err);
    var template = precompile(data);
    fs.writeFile('./test/demo/templates/demo.js', template, function(err) {
      if(err)console.log(err);
      else{
        console.log("Demo component compiled successfully!");
        (finished) ? connect.reload() : (finished = true);
      }
    });
  });
  fs.readFile('./test/demo/editing.html', 'utf8', function (err,data) {
    if (err) return console.log(err);
    var template = precompile(data);
    fs.writeFile('./test/demo/templates/editing.js', template, function(err) {
      if(err) console.log(err);
      else{
        console.log("Edit component compiled successfully!");
        (finished) ? connect.reload() : (finished = true);
      }
    });
  });

})

// Start the test server
gulp.task('connect', function() {
  return connect.server({
    livereload: true
  });
});

// Rerun the tasks when a file changes
gulp.task('watch', ['recompile-demo', 'connect'], function() {
  gulp.watch(paths.all, ['cjs', 'runtime']);
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', [ 'watch' ]);

gulp.task('build', [ 'recompile-demo' ]);

gulp.task('test', function() {
  qunit('test/index.html', {
    verbose: true,
    timeout: 15
  });
});
