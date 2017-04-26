var gulp = require('gulp');
var pjson = require('./package.json');

var es = require('event-stream');
var babel = require('gulp-babel');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var eslint = require('gulp-eslint');
var rename = require('gulp-rename');
var connect = require('gulp-connect');
var compression = require('compression');
var del = require('del');
var qunit = require('node-qunit-phantomjs');
var replace = require('gulp-replace');

var browserify = require('browserify');
var rollup = require('gulp-rollup');
var nodeResolve = require('rollup-plugin-node-resolve');
var commonjs = require('rollup-plugin-commonjs');

var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var sourcemaps = require('gulp-sourcemaps');
var gutil = require('gulp-util');
var filter = require('gulp-filter');

var paths = {
    library:   ['packages/*.js', 'packages/**/lib/**/*.js', 'wrap/*.js'],
    tests: ['packages/**/test/**/*.js', 'test.js', 'test/**/*.html'],
    apps:   ['test/dummy-apps/**/*.html'],
    demo:   ["test/demo/**/*.html", "!test/index.html", "!test/demo/index.html", "!test/demo/templates/**/*"],

    reboundUtils:       'packages/rebound-utils/lib/**/*.js',
    reboundTemplate:    'packages/rebound-htmlbars/lib/**/*.js',
    propertyCompiler:   'packages/property-compiler/lib/**/*.js',
    reboundCompiler:    'packages/rebound-compiler/lib/**/*.js',
    reboundComponent:   'packages/rebound-component/lib/**/*.js',
    reboundData:        'packages/rebound-data/lib/**/*.js',
    reboundPrecompiler: 'packages/rebound-compiler/lib/**/*.js',
    reboundRouter:      'packages/rebound-router/lib/**/*.js',
    reboundRuntime:     'packages/runtime.js',
    reboundCompiletime: 'packages/compiler.js',
    acorn:              './node_modules/acorn/src/**/*.js'
  };


// The docco task: called on prepublish
require('./tasks/docco');

// The reease task: called on postpublish
require('./tasks/release');

// JS hint task
gulp.task('eslint', function() {
  return gulp.src('./packages/**/*.js')
    .pipe(eslint())
    .pipe(eslint.format());
});

gulp.task('clean', ['eslint'], function(cb) { return del(['dist/**', 'test/demo/templates/**'], cb);});
gulp.task('clean-cjs', ['eslint'], function(cb) { return del(['dist/cjs/**'], cb);});
gulp.task('clean-amd', ['eslint'], function(cb) { return del(['dist/amd/**'], cb);});

gulp.task('cjs', ['clean-cjs'], function() {
  return es.merge(
    gulp.src(paths.reboundUtils).pipe(rename({dirname: "rebound-utils/"})),
    gulp.src(paths.reboundTemplate).pipe(rename(function (path){path.dirname = "rebound-htmlbars/" + path.dirname;})),
    gulp.src(paths.propertyCompiler).pipe(rename({dirname: "property-compiler/"})),
    gulp.src(paths.reboundCompiler).pipe(rename({dirname: "rebound-compiler/"})),
    gulp.src(paths.reboundComponent).pipe(rename({dirname: "rebound-component/"})),
    gulp.src(paths.reboundData).pipe(rename({dirname: "rebound-data/"})),
    gulp.src(paths.reboundCompiler).pipe(rename({dirname: "rebound-compiler/"})),
    gulp.src(paths.reboundRouter).pipe(rename(function (path){path.dirname = "rebound-router/" + path.dirname;})),
    gulp.src(paths.reboundRuntime),
    gulp.src(paths.reboundCompiletime)
  )
  .pipe(replace('%VER%', pjson.version))
  .pipe(babel({
    presets: ['es2015'],
    plugins: ["transform-class-properties"]
  }))
  .pipe(gulp.dest('dist/cjs'));
});

gulp.task('amd', ['clean-amd'], function() {
  return es.merge(
    gulp.src(paths.reboundUtils).pipe(rename({dirname: "rebound-utils/"})),
    gulp.src(paths.reboundTemplate).pipe(rename(function (path){path.dirname = "rebound-htmlbars/" + path.dirname;})),
    gulp.src(paths.propertyCompiler).pipe(rename({dirname: "property-compiler/"})),
    gulp.src(paths.reboundCompiler).pipe(rename({dirname: "rebound-compiler/"})),
    gulp.src(paths.reboundComponent).pipe(rename({dirname: "rebound-component/"})),
    gulp.src(paths.reboundData).pipe(rename({dirname: "rebound-data/"})),
    gulp.src(paths.reboundCompiler).pipe(rename({dirname: "rebound-compiler/"})),
    gulp.src(paths.reboundRouter).pipe(rename(function (path){path.dirname = "rebound-router/" + path.dirname;})),
    gulp.src(paths.reboundRuntime),
    gulp.src(paths.reboundCompiletime)
  )
  .pipe(replace('%VER%', pjson.version))
  .pipe(babel({
    moduleIds: true,
    presets: ['es2015'],
    plugins: ["transform-es2015-modules-amd", "transform-class-properties"]
  }))
  .pipe(gulp.dest('dist/amd'));
});

gulp.task('babel', ['amd', 'cjs']);

gulp.task('shims', function(){
  return gulp.src('packages/polyfill.js')
  .pipe(rollup({
    plugins: [
      nodeResolve({ jsnext: true, main: true }),
      commonjs()
    ]
  }))
  .pipe(rename({basename: "rebound.shims"}))
  .pipe(gulp.dest('dist'))
  .pipe(uglify())
  .pipe(rename({basename: "rebound.shims.min"}))
  .pipe(gulp.dest('dist'));
});

gulp.task('runtime', ['shims', 'babel'], function() {
  return es.merge(
    gulp.src('./dist/rebound.shims.js'),

    browserify(null, {
      entries: './dist/cjs/runtime.js',
      paths: ['./dist/cjs', './node_modules/htmlbars/dist/cjs'],
      debug: true
    })
    .ignore('jquery')
    .bundle()
    .pipe(source('rebound.runtime.js'))
    .pipe(buffer())
  )
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(concat('rebound.runtime.js'))
  .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest('dist'))
  .pipe(filter(['rebound.runtime.js']))
  .pipe(rename({basename: "rebound.runtime.min"}))
  .pipe(uglify())
  .on('error', gutil.log)
  .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest('dist'));
});


gulp.task('compiletime', ['shims', 'babel'], function() {
  return es.merge(browserify(null, {
    entries: './dist/cjs/compiler.js',
    paths: ['./dist/cjs', './node_modules/htmlbars/dist/cjs'],
    debug: true
  })
  .ignore('jquery')
  .bundle()
  .pipe(source('rebound.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true})), gulp.src('./dist/rebound.shims.js'))
  .pipe(concat('rebound.js'))
  .pipe(gulp.dest('dist'))
  .pipe(rename({basename: "rebound.min"}))
  .pipe(uglify())
  .on('error', gutil.log)
  .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest('dist'));
});

gulp.task('compile-library', ['runtime', 'compiletime'], function(){
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
  .pipe(gulp.dest('dist'))
  .pipe(connect.reload());

});

gulp.task('compile-test-apps', ['cjs'],  function(){
  var rebound = require('./test/compile');
  var apps = gulp.src(["test/dummy-apps/**/*.html"])
  .pipe(rebound({root: 'test/dummy-apps'}))
  .pipe(gulp.dest('test/dummy-apps'))
  .pipe(connect.reload());

  return apps;
});

gulp.task('compile-tests', ['cjs'], function(){
  return gulp.src([
      "packages/*/test/**/*.js",
      "packages/tests.js"
    ])
  .pipe(babel({
    moduleIds: true,
    presets: ['es2015'],
    plugins: ["transform-es2015-modules-amd", "transform-class-properties"]
  }))
  .pipe(concat('rebound.tests.js'))
  .pipe(gulp.dest('test'))
  .pipe(connect.reload());

});


gulp.task('compile-demo', ['cjs'],  function(){
  var rebound = require('./test/compile');
  var demo = gulp.src(paths.demo)
  .pipe(rebound({root: 'test/demo/templates'}))
  .pipe(gulp.dest('test/demo/templates'))
  .pipe(connect.reload());

  return demo;
});

gulp.task('build', ['docco', 'compile-demo', 'compile-test-apps', 'compile-tests', 'compile-library'], function(){
  return gulp.src('').pipe(connect.reload());
});

// Start the test server
gulp.task('connect', [], function() {
  return connect.server({
    root: __dirname,
    livereload: !process.env.TEST_ENV,
    port: 8000,
    // Add gzip compression to test file sizes and an artifical delay to test lazy components on local machines
    middleware: function(){ return [compression(), function(req,res,next){setTimeout(function(){next();},20);}]; }
  });
});

// The default task (called when you run `npm start` from cli)
// Build Rebound and re-run the build when a file changes
gulp.task('default', ['connect', 'build'], function() {
  gulp.watch(paths.library, ['compile-library', 'docco']);
  gulp.watch(paths.tests, ['compile-tests']);
  gulp.watch(paths.apps, ['compile-test-apps']);
  gulp.watch(paths.demo, ['compile-demo']);
});

gulp.task('test', ['connect'], function() {
  qunit('http://localhost:8000/test/index.html', {
    verbose: true,
    timeout: 15
  }, function(code) {
    process.exit(code);
  });
});
