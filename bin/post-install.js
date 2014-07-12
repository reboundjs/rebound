#!/usr/bin/env node

var path = require('path'),
    fs = require('fs'),
    filepath = path.join(path.dirname(fs.realpathSync(__filename)), '..'),
    util  = require('util'),
    spawn = require('child_process').spawn;

// Install Rebound's bower dependancies
function installBowerDeps(){
  console.log('Start installBowerDeps');

  ps = spawn('bower', ['install'], {stdio: "inherit", cwd: filepath});
  console.log('Finish installBowerDeps');

  ps.on('exit', npmInstallHandlebars);
}

// npm install our handlebars dependancy
function npmInstallHandlebars(){
  console.log('Start npmInstallHandlebars');

  ps = spawn('npm', ['install'], {stdio: "inherit", cwd: filepath + '/bower_components/handlebars'});
  console.log('Finish npmInstallHandlebars');

  ps.on('exit', gruntBuildHandlebars);
}

// Build handlebars to generate parser.js file
function gruntBuildHandlebars(){
  console.log('Start gruntBuildHandlebars');

  ps = spawn('grunt', ['build'], {stdio: "inherit", cwd: filepath + '/bower_components/handlebars'});
  console.log('Finish gruntBuildHandlebars');

  ps.on('exit', gruntBuildRebound);
}

// Build our project
function gruntBuildRebound(){
  console.log('Start gruntBuildRebound');

  ps = spawn('grunt', ['build'], {stdio: "inherit", cwd: filepath});
  console.log('Finish gruntBuildRebound');

  ps.on('exit', done);
}

// Notify finished
function done(){
  console.log('Post Install Finished');
}

installBowerDeps();
