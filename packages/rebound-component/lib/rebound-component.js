// If Backbone hasn't been started yet, throw error
if(!window.Backbone){
  throw "Backbone must be on the page for Rebound to load.";
}

// Load our client environment
import env  from "rebound-component/env";

// Load our utils
import utils from "rebound-component/utils";

// Load our utils
import registerComponent from "rebound-component/register";

// Load Rebound Data
import { Model, Collection, ComputedProperty } from "rebound-data/rebound-data";

// Load Rebound Components
import Component from "rebound-component/component";

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
  Component: Component
};

export default Rebound;
