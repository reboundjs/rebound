var through = require('through2');
var path = require('path');
var gutil = require('gulp-util');
var rebound = require('../dist/cjs/rebound-compiler/precompile').default;
var PluginError = gutil.PluginError;

// Consts
const PLUGIN_NAME = 'gulp-rebound';

function prefixStream(prefixText) {
  var stream = through();
  stream.write(prefixText);
  return stream;
}

// Plugin level function(dealing with files)
function gulpRebound(options) {

  options || (options = {});

  // Creating a stream through which each file will pass
  return through.obj(function(file, enc, cb) {
    // return empty file
    if (file.isNull()) return cb(null, file);

    if (file.isStream()) {
      throw new PluginError(PLUGIN_NAME, "Gulp Rebound doesn't handle streams!");
    }

    // Compile
    try {

      file.contents = new Buffer(rebound(file.contents.toString(enc), {
        name: options.root + '/' + path.parse(file.relative).name, // file.stem not reliable
      }).src, enc);

      gutil.log(gutil.colors.green('File ' + file.relative + ' compiled'));
      file.path = file.path.replace('.html', '.js');
    } catch(err){
      gutil.log(gutil.colors.red('Error in ' + file.relative));
      gutil.log(err);
    }

    cb(null, file);

  });

}

// Exporting the plugin main function
module.exports = gulpRebound;
