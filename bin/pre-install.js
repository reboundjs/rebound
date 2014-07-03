#!/usr/bin/env node

var path = require('path'),
    fs = require('fs'),
    filepath = path.join(path.dirname(fs.realpathSync(__filename)), '..'),
    util  = require('util'),
    spawn = require('child_process').spawn;

// Install Rebound's npm dependancies
var ps = spawn('npm', ['install', '--ignore-scripts'], {stdio: "inherit", cwd: filepath});
