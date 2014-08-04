#!/usr/bin/env node

var path = require('path'),
    fs = require('fs'),
    filepath = path.join(path.dirname(fs.realpathSync(__filename)), '..'),
    util  = require('util'),
    spawn = require('child_process').spawn;


// Install Rebound's bower dependancies
function installNpmDeps(){
  console.log('REBOUND POSTINSTALL: Installing Additional Rebound NPM Deps...')
  ps = spawn('npm', ['install', '--ignore-scripts'], {stdio: "inherit", cwd: filepath});
  ps.on('exit', installBowerDeps);
  ps.on('error', function (err) {
    console.log('REBOUND POSTINSTALL: Error Running Rebound NPM Install!', err);
  })
}

// Install Rebound's bower dependancies
function installBowerDeps(){
  console.log('REBOUND POSTINSTALL: Rebound NPM Install Success!')
  console.log('REBOUND POSTINSTALL: Installing Rebound Bower Deps...')
  ps = spawn('bower', ['install'], {stdio: "inherit", cwd: filepath});
  ps.on('exit', npmInstallHandlebars);
  ps.on('error', function (err) {
    console.log('REBOUND POSTINSTALL: Error Running Rebound Bower Install!', err);
  })
}

// npm install our handlebars dependancy
function npmInstallHandlebars(){
  console.log('REBOUND POSTINSTALL: Rebound Bower Install Success!')
  console.log('REBOUND POSTINSTALL: Installing Handlebars NPM Deps...')
  ps = spawn('npm', ['install'], {stdio: "inherit", cwd: filepath + '/bower_components/handlebars'});
  ps.on('exit', gruntBuildHandlebars);
  ps.on('error', function (err) {
    console.log('REBOUND POSTINSTALL: Error Running Handlebars NPM Install!', err);
  })
}

// Build handlebars to generate parser.js file
function gruntBuildHandlebars(){
  console.log('REBOUND POSTINSTALL: Handlebars NPM Install Success!')
  console.log('REBOUND POSTINSTALL: Building Handlebars...')
  ps = spawn('grunt', ['build'], {stdio: "inherit", cwd: filepath + '/bower_components/handlebars'});
  ps.on('exit', gruntBuildRebound);
  ps.on('error', function (err) {
    console.log('REBOUND POSTINSTALL: Error Running Handlebars Grunt Build!', err);
  })
}

// Build our project
function gruntBuildRebound(){
  console.log('REBOUND POSTINSTALL: Handlebars Grunt Build Success!')
  console.log('REBOUND POSTINSTALL: Running Rebound Grunt Build...')
  ps = spawn('grunt', ['build'], {stdio: "inherit", cwd: filepath});
  ps.on('error', function (err) {
    console.log('REBOUND POSTINSTALL: Error Running Rebound Grunt Build!', err);
  })
}

installNpmDeps();
