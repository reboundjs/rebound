"use strict";
// If Backbone hasn't been started yet, throw error
if(!window.Backbone){
  throw "Backbone must be on the page for Rebound to load.";
}

// Load our client environment
var env = require("rebound-runtime/env")["default"];

// Load our utils
var utils = require("rebound-runtime/utils")["default"];

// Load our utils
var registerComponent = require("rebound-runtime/register")["default"];

// Load Rebound Data
var Model = require("rebound-data/rebound-data").Model;
var Collection = require("rebound-data/rebound-data").Collection;
var ComputedProperty = require("rebound-data/rebound-data").ComputedProperty;

// Load Rebound Components
var Component = require("rebound-runtime/component")["default"];

// Load The Rebound Router
var Router = require("rebound-router/rebound-router")["default"];

// Fetch Rebound Config Object
var Config = JSON.parse(document.getElementById('Rebound').innerHTML);

// If Backbone doesn't have an ajax method from an external DOM library, use ours
window.Backbone.ajax = window.Backbone.$ && window.Backbone.$.ajax && window.Backbone.ajax || utils.ajax;

// Create Global Object
window.Rebound = {
  registerHelper: env.registerHelper,
  registerPartial: env.registerPartial,
  registerComponent: registerComponent,
  Model: Model,
  Collection: Collection,
  ComputedProperty: ComputedProperty,
  Component: Component,
  Config: Config
};

window.Rebound.router = new Router({config: Config});

exports["default"] = Rebound;