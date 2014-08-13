"use strict";
var registerHelper = require("./rebound.runtime").registerHelper;
var registerPartial = require("./rebound.runtime").registerPartial;
var router = require("./rebound.runtime").router;
var seedData = require("./rebound.runtime").seedData;
var compile = require("./rebound/compiler").compile;

exports.compile = compile;
exports.registerHelper = registerHelper;
exports.registerPartial = registerPartial;
exports.router = router;
exports.seedData = seedData;