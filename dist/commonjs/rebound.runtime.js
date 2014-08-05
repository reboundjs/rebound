"use strict";
var registerHelper = require("./rebound/runtime").registerHelper;
var registerPartial = require("./rebound/runtime").registerPartial;
var registerComponent = require("./rebound/runtime").registerComponent;
var components = require("./rebound/runtime").components;

// If Backbone hasn't been started yet, throw error
if(!window.Backbone)
  throw "Backbone must be on the page for Rebound to load.";

// Load our modified backbone objects
var Model = require("./rebound/components/model")["default"];
var Collection = require("./rebound/components/collection")["default"];
var Controller = require("./rebound/components/controller")["default"];
var Router = require("./rebound/components/router")["default"];
require("./rebound/components/base");
var ReboundConfig = jQuery.parseJSON($('#Rebound').html()),
    router = (new Router({config: ReboundConfig})).router;

exports.registerHelper = registerHelper;
exports.registerPartial = registerPartial;
exports.registerComponent = registerComponent;
exports.components = components;
exports.router = router;