"use strict";
var registerHelper = require("./rebound/runtime").registerHelper;
var registerPartial = require("./rebound/runtime").registerPartial;

// If Backbone hasn't been started yet, throw error
if(!window.Backbone){
  throw "Backbone must be on the page for Rebound to load.";
}

// Load our modified backbone objects
var Model = require("./rebound/components/model")["default"];
var Collection = require("./rebound/components/collection")["default"];
var Controller = require("./rebound/components/controller")["default"];
var Router = require("./rebound/components/router")["default"];
require("./rebound/components/base");
var ReboundConfig = jQuery.parseJSON($('#Rebound').html()),
    router = (new Router({config: ReboundConfig})).router;

var seedData = {};

exports.registerHelper = registerHelper;
exports.registerPartial = registerPartial;
exports.router = router;
exports.seedData = seedData;