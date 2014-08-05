"use strict";
var registerHelper = require("./rebound.runtime").registerHelper;
var registerPartial = require("./rebound.runtime").registerPartial;
var registerComponent = require("./rebound.runtime").registerComponent;
var components = require("./rebound.runtime").components;
var router = require("./rebound.runtime").router;
var compile = require("./rebound/compiler").compile;

exports.compile = compile;
exports.registerHelper = registerHelper;
exports.registerPartial = registerPartial;
exports.registerComponent = registerComponent;
exports.components = components;
exports.router = router;