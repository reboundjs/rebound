#!/usr/bin/env node

// We need to build handlebars to generate its compiler/parser.js file
var exec = require('child_process').exec;
var path = require('path');
var fs = require('fs');
var filepath = path.join(path.dirname(fs.realpathSync(__filename)), '..');

// TODO: this is dumb...fix this.
// Install bower deps, build handlebars to generate its parser.js file, build our project.
exec( 'bower install && cd ' + filepath + '/bower_components/handlebars && npm install && grunt build && cd ../../ && grunt build', function (error, stdout, stderr) {
  if (stderr !== null) {
    console.log('' + stderr);
  }
  if (stdout !== null) {
    console.log('' + stdout);
  }
  if (error !== null) {
    console.log('' + error);
  }
});
