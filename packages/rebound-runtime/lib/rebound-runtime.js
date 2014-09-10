import env  from "rebound-runtime/env";

// If Backbone hasn't been started yet, throw error
if(!window.Backbone){
  throw "Backbone must be on the page for Rebound to load.";
}

// Load Rebound Data
import { Model, Collection} from "rebound-data/rebound-data";

// Load Rebound Components
import Component from "rebound-runtime/component";

// Load The Rebound Router
import Router from "rebound-router/rebound-router";

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

export default Rebound;