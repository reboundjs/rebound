//     Rebound.js 0.0.60

//     (c) 2015 Adam Miller
//     Rebound may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://reboundjs.com

// Rebound Runtime
// ----------------

// If Backbone isn't preset on the page yet, or if `window.Rebound` is already
// in use, throw an error
if(!window.Backbone) throw "Backbone must be on the page for Rebound to load.";
if(!window.Rebound) throw "Global Rebound namespace already taken.";

// Load our **Utils**, helper environment, **Rebound Data**,
// **Rebound Components** and the **Rebound Router**
import utils from "rebound-component/utils";
import helpers from "rebound-component/helpers";
import { Model, Collection, ComputedProperty } from "rebound-data/rebound-data";
import Component from "rebound-component/component";
import Router from "rebound-router/rebound-router";

// If Backbone doesn't have an ajax method from an external DOM library, use ours
window.Backbone.ajax = window.Backbone.$ && window.Backbone.$.ajax && window.Backbone.ajax || utils.ajax;

// Fetch Rebound's Config Object from Rebound's `script` tag
var Config = document.getElementById('Rebound').innerHTML;

// Create Global Rebound Object
window.Rebound = {
  services: {},
  registerHelper: helpers.registerHelper,
  registerPartial: helpers.registerPartial,
  registerComponent: Component.register,
  Model: Model,
  Collection: Collection,
  ComputedProperty: ComputedProperty,
  Component: Component
};

// Start the router if a config object is preset
if(Config) window.Rebound.router = new Router({config: JSON.parse(Config)});

export default Rebound;
