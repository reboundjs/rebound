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
    gulp.src(paths.propertyCompiler).pipe(rename({prefix: "property-compiler/"})),
    gulp.src(paths.reboundCompiler).pipe(rename({prefix: "rebound-compiler/"})),
    gulp.src(paths.reboundComponent).pipe(rename({prefix: "rebound-component/"})),
    gulp.src(paths.reboundData).pipe(rename({prefix: "rebound-data/"})),
    gulp.src(paths.reboundCompiler).pipe(rename({prefix: "rebound-compiler/"})),
    gulp.src(paths.reboundRouter).pipe(rename({prefix: "rebound-router/"})),
    gulp.src(paths.reboundRuntime)
  )
  .pipe(babel({blacklist: ['es6.forOf','regenerator','es6.spread','es6.destructuring']}))
  .pipe(gulp.dest('dist/cjs'))
  .pipe(connect.reload());
});

gulp.task('docco', ['clean'], function() {
  return gulp.src([
    'packages/runtime.js',
    'packages/rebound-data/lib/rebound-data.js',
    'packages/rebound-data/lib/model.js',
    'packages/rebound-data/lib/collection.js',
    'packages/rebound-data/lib/computed-property.js',
    'packages/rebound-component/lib/component.js',
    'packages/rebound-component/lib/helpers.js',
    'packages/rebound-component/lib/hooks.js',
    'packages/rebound-component/lib/lazy-value.js',
    'packages/rebound-router/lib/rebound-router.js',
    'packages/rebound-component/lib/utils.js',
    'packages/property-compiler/lib/property-compiler.js',
    'packages/rebound-compiler/lib/rebound-compiler.js',
  ])
  .pipe(concat('rebound.js'))
  .pipe(docco())
  .pipe(gulp.dest('dist/docs'));
});

gulp.task('amd', ['clean'], function() {
  return es.merge(
    gulp.src(paths.propertyCompiler).pipe(rename({prefix: "property-compiler/"})),
    gulp.src(paths.reboundCompiler).pipe(rename({prefix: "rebound-compiler/"})),
    gulp.src(paths.reboundComponent).pipe(rename({prefix: "rebound-component/"})),
    gulp.src(paths.reboundData).pipe(rename({prefix: "rebound-data/"})),
    gulp.src(paths.reboundCompiler).pipe(rename({prefix: "rebound-compiler/"})),
    gulp.src(paths.reboundRouter).pipe(rename({prefix: "rebound-router/"})),
    gulp.src(paths.reboundRuntime)
  )
  .pipe(babel({
    modules: "amd",
    moduleIds: true,
    blacklist: ['es6.forOf','regenerator','es6.spread','es6.destructuring']
  }))
  .pipe(gulp.dest('dist/amd'))
  .pipe(concat('rebound.runtime.js'))
  .pipe(gulp.dest('dist'))
});

gulp.task('runtime', ['amd'], function() {
  return gulp.src([
    'shims/classList.js',
    'shims/matchesSelector.js',
    // 'bower_components/webcomponentsjs/webcomponents-lite.min.js',
    'node_modules/document-register-element/build/document-register-element.max.js',
    'bower_components/backbone/backbone.js',
    'bower_components/requirejs/require.js',
    'wrap/start.frag',
    'bower_components/almond/almond.js',
    'node_modules/htmlbars/dist/amd/htmlbars-util.amd.js',
    'node_modules/htmlbars/dist/amd/htmlbars-runtime.amd.js',
    'dist/rebound.runtime.js',
    'wrap/end.runtime.frag'
    ])
  .pipe(concat('rebound.runtime.js'))
  .pipe(gulp.dest('dist'))
  .pipe(uglify())
  .pipe(rename({basename: "rebound.runtime.min"}))
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


gulp.task('compile-demo', ['cjs', 'test-helpers', 'docco', 'runtime', 'compile-tests'],  function(){

  var demo = gulp.src(["test/demo/**/*.html", "!test/index.html", "!test/demo/index.html"])
  .pipe(rebound())
  .pipe(gulp.dest('test/demo/templates'));

  return demo;
});
gulp.task('compile-apps', ['cjs', 'test-helpers', 'docco', 'runtime', 'compile-tests'],  function(){

  var apps = gulp.src(["test/dummy-apps/**/*.html"])
  .pipe(rebound())
  .pipe(gulp.dest('test/dummy-apps'));

  return apps;
});

// Start the test server
gulp.task('connect', ['compile-demo', 'compile-apps'], function() {
  return connect.server({
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

gulp.task('test', function() {
  qunit('test/index.html', {
    verbose: true,
    timeout: 15
  }, function(code) {
    process.exit(code);
  })
});


/*******************************************************************************

Release Tasks:

gulp release is run on postpublish and automatically pushes the contents of /dist
to https://github.com/epicmiller/reboundjs-dist for consumption by bower.

*******************************************************************************/
gulp.task('cleanrelease', function(cb){
  return del(['tmp'], cb);
});

// Clone a remote repo
gulp.task('clone', ['cleanrelease'],  function(cb){
  console.log('Cloning reboundjs-dist to /tmp');
  mkdirp.sync('./tmp');
  git.clone('https://github.com/reboundjs/rebound-dist.git', {cwd: './tmp'}, cb);
});

gulp.task('release-copy', ['clone'], function(cb){
  return gulp.src('dist/**/*')
      .pipe(gulp.dest('tmp/reboundjs-dist'));
});

gulp.task('bump-version', ['release-copy'], function(cb){
  return gulp.src(['tmp/reboundjs-dist/bower.json'])
    .pipe(replace(/(.\s"version": ")[^"]*(")/g, '$1'+pjson.version+'$2'))
    .pipe(gulp.dest('tmp/reboundjs-dist'));
});

gulp.task('add', ['bump-version'], function(){
  console.log('Adding Rebound /dist to reboundjs-dist');
  process.chdir('tmp/reboundjs-dist');
  return gulp.src('./*')
      .pipe(git.add({args: '-A'}));
});

gulp.task('commit', ['add'], function(cb){
  console.log('Committing Rebound v' + pjson.version);
  return gulp.src('./*')
      .pipe(git.commit('Rebound version v'+pjson.version));
});

// Tag the repo with a version
gulp.task('tag', ['commit'], function(cb){
  console.log('Tagging Rebound as version ' + pjson.version);
  git.tag(''+pjson.version, "Rebound version v"+pjson.version, cb);
});

gulp.task('push', ['tag'], function(cb){
  console.log('Pushing Rebound v' + pjson.version);
  git.push('origin', 'master', {args: '--tags'}, cb);
});

gulp.task('release', ['push'], function(cb){
  git.status();
  console.log('Rebound v'+pjson.version+' successfully released!');
  return del(['tmp'], cb);
});
