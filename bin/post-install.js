#!/usr/bin/env node

var path = require('path'),
    fs = require('fs'),
    filepath = path.join(path.dirname(fs.realpathSync(__filename)), '..'),
    util  = require('util'),
    spawn = require('child_process').spawn;

// Install Rebound's bower dependancies
function installBowerDeps(){
  ps = spawn('bower', ['install'], {stdio: "inherit", cwd: filepath});
  ps.on('exit', npmInstallHandlebars);
}

// npm install our handlebars dependancy
function npmInstallHandlebars(){
  ps = spawn('npm', ['install'], {stdio: "inherit", cwd: filepath + '/bower_components/handlebars'});
  ps.on('exit', gruntBuildHandlebars);
}

// Build handlebars to generate parser.js file
function gruntBuildHandlebars(){
  ps = spawn('grunt', ['build'], {stdio: "inherit", cwd: filepath + '/bower_components/handlebars'});
  ps.on('exit', gruntBuildRebound);
}

// Build our project
function gruntBuildRebound(){
  console.log("Starting Grunt Build");
  ps = spawn('grunt', ['build'], {stdio: "inherit", cwd: filepath});
  spawn.on('error', function (err) {
    console.log('Error Running Grunt Build:', err);
  })
}

installBowerDeps();
