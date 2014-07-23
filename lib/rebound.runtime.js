import { registerHelper, registerPartial, registerTemplate, templates } from "rebound/runtime";

// If Backbone hasn't been started yet, throw error
if(!window.Backbone)
  throw "Backbone must be on the page for Rebound to load.";

// Load our modified backbone objects
import Model from "rebound/components/model";
import Collection from "rebound/components/collection";
import Controller from "rebound/components/controller";
import Router from "rebound/components/router";
import "rebound/components/base";

var ReboundConfig = jQuery.parseJSON($('#Rebound').html());
var router = new Router({config: ReboundConfig});

export { registerHelper, registerPartial, registerTemplate, templates};
