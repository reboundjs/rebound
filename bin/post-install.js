#!/usr/bin/env node

// We need to build handlebars to generate its compiler/parser.js file
var exec = require('child_process').exec;
var path = require('path');
var fs = require('fs');
var filepath = path.join(path.dirname(fs.realpathSync(__filename)), '..');

exec( 'bower install && cd ' + filepath + '/bower_components/handlebars && npm install && grunt build && cd -', function (error, stdout, stderr) {
  if (stderr !== null) {
    console.log('' + stderr);
  }
  if (stdout !== null) {
    console.log('' + stdout);
  }
  if (error !== null) {
    console.log('' + error);
  }

  // Now, with everything install, build our project
  require('grunt').tasks(['build']);

});
