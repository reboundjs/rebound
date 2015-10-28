var gulp = require('gulp');
var del = require('del');
var git = require('gulp-git');
var pjson = require('../package.json');
var mkdirp = require('mkdirp');
var replace = require('gulp-replace');

/*******************************************************************************

Release Tasks:

gulp release is run on postpublish and automatically pushes the contents of /dist
to https://github.com/epicmiller/rebound-dist for consumption by bower.

*******************************************************************************/
gulp.task('cleanrelease', ['build'], function(cb){
  return del(['tmp'], cb);
});

// Clone a remote repo
gulp.task('clone', ['cleanrelease'],  function(cb){
  console.log('Cloning rebound-dist to /tmp');
  mkdirp.sync('./tmp');
  git.clone('https://github.com/reboundjs/rebound-dist.git', {cwd: './tmp'}, cb);
});

gulp.task('release-copy', ['clone'], function(cb){
  return gulp.src('dist/**/*')
      .pipe(gulp.dest('tmp/rebound-dist'));
});

gulp.task('bump-version', ['release-copy'], function(cb){
  return gulp.src(['tmp/rebound-dist/bower.json'])
    .pipe(replace(/(.\s"version": ")[^"]*(")/g, '$1'+pjson.version+'$2'))
    .pipe(gulp.dest('tmp/rebound-dist'));
});

gulp.task('add', ['bump-version'], function(){
  console.log('Adding Rebound /dist directory to rebound-dist');
  process.chdir('tmp/rebound-dist');
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