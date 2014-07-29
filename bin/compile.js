#!/usr/bin/env node
var path = require('path');
var fs = require('fs');
var lib = path.join(path.dirname(fs.realpathSync(__filename)), '../dist/commonjs/rebound/compiler.js');
var Rebound = require(lib);
if(typeof process.argv[4] === 'string') process.argv[4] = JSON.parse(process.argv[4]);
console.log(Rebound.precompile(process.argv[2], process.argv[3], process.argv[4]));
return;
