"use strict";
var env = require("rebound-runtime/env")["default"];

// If Backbone hasn't been started yet, throw error
if(!window.Backbone){
  throw "Backbone must be on the page for Rebound to load.";
}

// Load Rebound Data
var Model = require("rebound-data/rebound-data").Model;
var Collection = require("rebound-data/rebound-data").Collection;

// Load Rebound Components
var Component = require("rebound-runtime/component")["default"];

// Load The Rebound Router
var Router = require("rebound-router/rebound-router")["default"];

// Fetch Rebound Config Object
var Config = jQuery.parseJSON($('#Rebound').html());

// Create Global Object
window.Rebound = {
  registerHelper: env.registerHelper,
  registerPartial: env.registerPartial,
  Model: Model,
  Collection: Collection,
  Component: Component,
  Config: Config
};

window.Rebound.router = (new Router({config: Config})).router;

exports["default"] = Rebound;