"use strict";

var _interopRequire = function (obj) {
  return obj && (obj["default"] || obj);
};

// If Backbone hasn't been started yet, throw error
if (!window.Backbone) {
  throw "Backbone must be on the page for Rebound to load.";
}

// Load our client environment
var env = _interopRequire(require("rebound-runtime/env"));

// Load our utils
var utils = _interopRequire(require("rebound-runtime/utils"));

// Load our utils
var registerComponent = _interopRequire(require("rebound-runtime/register"));

// Load Rebound Data
var Model = require("rebound-data/rebound-data").Model;
var Collection = require("rebound-data/rebound-data").Collection;
var ComputedProperty = require("rebound-data/rebound-data").ComputedProperty;


// Load Rebound Components
var Component = _interopRequire(require("rebound-runtime/component"));

// Load The Rebound Router
var Router = _interopRequire(require("rebound-router/rebound-router"));

// Fetch Rebound Config Object
var Config = JSON.parse(document.getElementById("Rebound").innerHTML);

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

window.Rebound.router = new Router({ config: Config });

module.exports = Rebound;