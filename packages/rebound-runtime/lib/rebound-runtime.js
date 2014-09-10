import env  from "rebound-runtime/env";

// TODO: This is silly. Fix it.
var registerHelper = env.registerHelper;
var registerPartial = env.registerPartial;

// If Backbone hasn't been started yet, throw error
if(!window.Backbone){
  throw "Backbone must be on the page for Rebound to load.";
}

// Load Rebound Components
import Component from "rebound-runtime/component";

// Load The Rebound Router
import Router from "rebound-router/rebound-router";

var ReboundConfig = jQuery.parseJSON($('#Rebound').html()),
    router = (new Router({config: ReboundConfig})).router;

export { registerHelper, registerPartial, router };
