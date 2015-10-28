var gulp = require('gulp');
var concat = require('gulp-concat');
var docco = require("gulp-docco");

/*******************************************************************************

Docco Task:

docco is run on prepublish to automatically generate annotated source code in
/dist.

*******************************************************************************/

gulp.task('docco', [], function() {
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
