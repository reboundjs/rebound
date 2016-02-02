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

    // Rebound Data
    'packages/rebound-data/lib/rebound-data.js',
      'packages/rebound-data/lib/model.js',
      'packages/rebound-data/lib/collection.js',
      'packages/rebound-data/lib/computed-property.js',

    // Rebound Component
    'packages/rebound-component/lib/component.js',
    'packages/rebound-component/lib/factory.js',

    // Rebound View
    'packages/rebound-htmlbars/lib/rebound-htmlbars.js',
    'packages/rebound-htmlbars/lib/lazy-value.js',
    'packages/rebound-htmlbars/lib/hooks.js',
      'packages/rebound-htmlbars/lib/hooks/createFreshEnv.js',
      'packages/rebound-htmlbars/lib/hooks/createChildEnv.js',

      'packages/rebound-htmlbars/lib/hooks/createFreshScope.js',
      'packages/rebound-htmlbars/lib/hooks/createChildScope.js',
      'packages/rebound-htmlbars/lib/hooks/bindScope.js',

      'packages/rebound-htmlbars/lib/hooks/linkRenderNode.js',
      'packages/rebound-htmlbars/lib/hooks/willCleanupTree.js',
      'packages/rebound-htmlbars/lib/hooks/cleanupRenderNode.js',
      'packages/rebound-htmlbars/lib/hooks/destroyRenderNode.js',
      'packages/rebound-htmlbars/lib/hooks/didCleanupTree.js',

      'packages/rebound-htmlbars/lib/hooks/get.js',
      'packages/rebound-htmlbars/lib/hooks/invokeHelper.js',
      'packages/rebound-htmlbars/lib/hooks/getValue.js',
      'packages/rebound-htmlbars/lib/hooks/subexpr.js',
      'packages/rebound-htmlbars/lib/hooks/concat.js',

      'packages/rebound-htmlbars/lib/hooks/content.js',
      'packages/rebound-htmlbars/lib/hooks/attribute.js',
      'packages/rebound-htmlbars/lib/hooks/partial.js',
      'packages/rebound-htmlbars/lib/hooks/component.js',

    'packages/rebound-htmlbars/lib/helpers.js',

    'packages/rebound-htmlbars/lib/compile.js',
    'packages/rebound-htmlbars/lib/render.js',



    // Rebound Router
    'packages/rebound-router/lib/rebound-router.js',
    'packages/rebound-router/lib/loader.js',

    // Rebound Utils
    'packages/rebound-component/lib/rebound-utils.js',
      'packages/rebound-component/lib/ajax.js',
      'packages/rebound-component/lib/events.js',
      'packages/rebound-component/lib/urls.js',

    'packages/property-compiler/lib/property-compiler.js'
  ])
  .pipe(concat('rebound.js'))
  .pipe(docco())
  .pipe(gulp.dest('dist/docs'));
});
