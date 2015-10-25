var gulp = require('gulp');
var rebound = require('gulp-rebound');
var merge = require('gulp-merge');
var es = require('event-stream');
var babel = require('gulp-babel');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var jshint = require('gulp-jshint');
var rename = require('gulp-rename');
var rjs = require('gulp-requirejs');
var connect = require('gulp-connect');
var sourcemaps = require('gulp-sourcemaps');
var del = require('del');
var qunit = require('node-qunit-phantomjs');
var docco = require("gulp-docco");
var git = require('gulp-git');
var pjson = require('./package.json');
var mkdirp = require('mkdirp');
var replace = require('gulp-replace');
var stylish = require('jshint-stylish');

var browserify = require('browserify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var gutil = require('gulp-util');

var paths = {
    all: ['packages/**/*.js', 'wrap/*.js', 'shims/*.js', 'test/**/*.html'],
    propertyCompiler:   'packages/property-compiler/lib/**/*.js',
    reboundCompiler:    'packages/rebound-compiler/lib/**/*.js',
    reboundComponent:   'packages/rebound-component/lib/**/*.js',
    reboundData:        'packages/rebound-data/lib/**/*.js',
    reboundPrecompiler: 'packages/rebound-compiler/lib/**/*.js',
    reboundRouter:      'packages/rebound-router/lib/**/*.js',
    reboundRuntime:     'packages/runtime.js'
  };

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
  .pipe(jshint.reporter(stylish));
});

gulp.task('clean', ['jshint'], function(cb) {
  // You can use multiple globbing patterns as you would with `gulp.src`
  return del(['dist', 'test/demo/templates'], cb);
});

gulp.task('cjs', ['clean'], function() {
  return es.merge(
    gulp.src(paths.propertyCompiler).pipe(rename({dirname: "property-compiler/"})),
    gulp.src(paths.reboundCompiler).pipe(rename({dirname: "rebound-compiler/"})),
    gulp.src(paths.reboundComponent).pipe(rename({dirname: "rebound-component/"})),
    gulp.src(paths.reboundData).pipe(rename({dirname: "rebound-data/"})),
    gulp.src(paths.reboundCompiler).pipe(rename({dirname: "rebound-compiler/"})),
    gulp.src(paths.reboundRouter).pipe(rename(function (path){path.dirname = "rebound-router/" + path.dirname;})),
    gulp.src(paths.reboundRuntime)
  )
  .pipe(babel({blacklist: ['es6.forOf','regenerator','es6.spread','es6.destructuring']}))
  .pipe(gulp.dest('dist/cjs'))
  .pipe(connect.reload());
});

gulp.task('amd', ['clean'], function() {
  return es.merge(
    gulp.src(paths.propertyCompiler).pipe(rename({dirname: "property-compiler/"})),
    gulp.src(paths.reboundCompiler).pipe(rename({dirname: "rebound-compiler/"})),
    gulp.src(paths.reboundComponent).pipe(rename({dirname: "rebound-component/"})),
    gulp.src(paths.reboundData).pipe(rename({dirname: "rebound-data/"})),
    gulp.src(paths.reboundCompiler).pipe(rename({dirname: "rebound-compiler/"})),
    gulp.src(paths.reboundRouter).pipe(rename(function (path){path.dirname = "rebound-router/" + path.dirname;})),
    gulp.src(paths.reboundRuntime)
  )
  .pipe(babel({
    modules: "amd",
    moduleIds: true,
    blacklist: ['es6.forOf','regenerator','es6.spread','es6.destructuring']
  }))
  .pipe(gulp.dest('dist/amd'));
  // .pipe(concat('rebound.runtime.js'))
  // .pipe(gulp.dest('dist'));
});

gulp.task('shims', function() {
  return gulp.src([
    'shims/classList.js',
    'shims/matchesSelector.js',
    'node_modules/document-register-element/build/document-register-element.max.js',
    'bower_components/setimmediate/setImmediate.js',
    'bower_components/promise-polyfill/Promise.js',
    'bower_components/backbone/backbone.js',
    'bower_components/requirejs/require.js'
    ])
  .pipe(concat('rebound.shims.js'))
  .pipe(gulp.dest('dist'))
  .pipe(uglify())
  .pipe(rename({basename: "rebound.shims.min"}))
  .pipe(gulp.dest('dist'));
});

gulp.task('runtime', ['shims', 'amd'], function() {
  return browserify({
    entries: './dist/cjs/runtime.js',
    paths: ['./dist/cjs'],
    debug: true
  })
  .bundle()
  .pipe(source('rebound.runtime.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(gulp.dest('dist'))
  .pipe(rename({basename: "rebound.runtime.min"}))
  .pipe(uglify())
  .on('error', gutil.log)
  .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest('dist'));
});

gulp.task('test-helpers', ['runtime'], function(){
  return gulp.src([
      "bower_components/underscore/underscore.js",
      "bower_components/jquery/dist/jquery.min.js",
      "bower_components/route-recognizer/dist/route-recognizer.js",
      "bower_components/FakeXMLHttpRequest/fake_xml_http_request.js",
      "bower_components/pretender/pretender.js",
      "dist/rebound.runtime.js",
      "packages/rebound-test/lib/test-helpers.js",
    ])
  .pipe(concat('rebound.test.js'))
  .pipe(gulp.dest('dist'));
});

gulp.task('compile-tests', function(){
  return gulp.src([
      "packages/*/test/*.js",
      "packages/tests.js"
    ])
  .pipe(babel({
    modules: "amd",
    moduleIds: true,
    blacklist: ['es6.forOf','regenerator','es6.spread','es6.destructuring']
  }))
  .pipe(concat('rebound.tests.js'))
  .pipe(gulp.dest('test'));
});


gulp.task('compile-demo', ['cjs', 'test-helpers', 'runtime', 'compile-tests'],  function(){

  var demo = gulp.src(["test/demo/**/*.html", "!test/index.html", "!test/demo/index.html"])
  .pipe(rebound())
  .pipe(gulp.dest('test/demo/templates'));

  return demo;
});
gulp.task('compile-apps', ['cjs', 'test-helpers', 'runtime', 'compile-tests'],  function(){

  var apps = gulp.src(["test/dummy-apps/**/*.html"])
  .pipe(rebound())
  .pipe(gulp.dest('test/dummy-apps'));

  return apps;
});

// Start the test server
gulp.task('connect', ['compile-demo', 'compile-apps'], function() {
  return connect.server({
    root: __dirname,
    livereload: true,
    port: 8000
  });
});

// Rerun the tasks when a file changes
gulp.task('watch', ['connect'], function() {
  gulp.watch(paths.all, ['compile-demo', 'compile-apps']);
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', [ 'watch' ]);

gulp.task('build', [ 'compile-demo', 'compile-apps' ]);

gulp.task('test', ['connect'], function() {
  qunit('http://localhost:8000/test/index.html', {
    verbose: true,
    timeout: 15
  }, function(code) {
    process.exit(code);
  });
});

// The docco task: called on prepublish
var docco = require('./tasks/docco');

// The reease task: called on postpublish
var release = require('./tasks/release');


