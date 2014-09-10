"use strict";
var env = require("rebound-runtime/env")["default"];

// TODO: This is silly. Fix it.
var registerHelper = env.registerHelper;
var registerPartial = env.registerPartial;

// If Backbone hasn't been started yet, throw error
if(!window.Backbone){
  throw "Backbone must be on the page for Rebound to load.";
}

// Load Rebound Components
var Component = require("rebound-runtime/component")["default"];

// Load The Rebound Router
var Router = require("rebound-router/rebound-router")["default"];

var ReboundConfig = jQuery.parseJSON($('#Rebound').html()),
    router = (new Router({config: ReboundConfig})).router;

exports.registerHelper = registerHelper;
exports.registerPartial = registerPartial;
exports.router = router;