// If Backbone hasn't been started yet, throw error
if(!window.Backbone){
  throw "Backbone must be on the page for Rebound to load.";
}

// Load our client environment
import env  from "rebound-runtime/env";

// Load our utils
import utils from "rebound-runtime/utils";

// Load Rebound Data
import { Model, Collection} from "rebound-data/rebound-data";

// Load Rebound Components
import Component from "rebound-runtime/component";

// Load The Rebound Router
import Router from "rebound-router/rebound-router";

// Fetch Rebound Config Object
var Config = JSON.parse(document.getElementById('Rebound').innerText);

// If Backbone doesn't have an ajax method from an external DOM library, use ours
window.Backbone.ajax = window.Backbone.$ && window.Backbone.$.ajax && window.Backbone.ajax || utils.ajax;

// Create Global Object
window.Rebound = {
  registerHelper: env.registerHelper,
  registerPartial: env.registerPartial,
  Model: Model,
  Collection: Collection,
  Component: Component,
  Config: Config
};

window.Rebound.router = new Router({config: Config});

export default Rebound;