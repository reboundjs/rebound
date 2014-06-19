#!/usr/bin/env node
var path = require('path');
var fs = require('fs');
var lib = path.join(path.dirname(fs.realpathSync(__filename)), '../lib');
console.log(lib + '/main.js')
var Rebound = require(lib + '/main.js');
console.log(Rebound)
console.log(Rebound.precompile(process.argv[2]));
return;
