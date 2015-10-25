//     Rebound.js 0.0.92

//     (c) 2015 Adam Miller
//     Rebound may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://reboundjs.com

// Rebound Runtime
// ----------------
debugger;
// If Backbone isn't preset on the page yet, or if `window.Rebound` is already
// in use, throw an error
if(!window.Backbone) throw "Backbone must be on the page for Rebound to load.";

// Load our **Utils**, helper environment, **Rebound Data**,
// **Rebound Components** and the **Rebound Router**
import utils from "rebound-component/utils";
import helpers from "rebound-component/helpers";
import { Model, Collection, ComputedProperty } from "rebound-data/rebound-data";
import Component from "rebound-component/component";
import Router from "rebound-router/rebound-router";

// If Backbone doesn't have an ajax method from an external DOM library, use ours
window.Backbone.ajax = window.Backbone.$ && window.Backbone.$.ajax && window.Backbone.ajax || utils.ajax;

// Create Global Rebound Object
var Rebound = window.Rebound = {
  services: {},
  registerHelper: helpers.registerHelper,
  registerPartial: helpers.registerPartial,
  registerComponent: Component.registerComponent,
  Model: Model,
  Collection: Collection,
  ComputedProperty: ComputedProperty,
  Component: Component,
  start: function(options){
    return new Promise((resolve, reject) => {
      let run = () => {
        if(!document.body) return setTimeout(run.bind(this), 1);
        delete this.router;
        this.router = new Router(options, resolve);
      };
      run();
    });
  },
  stop: function(){
    if(!this.router) return console.error('No running Rebound router found!');
    this.router.stop();
  }
};

// Fetch Rebound's Config Object from Rebound's `script` tag
var Config = document.getElementById('Rebound');
    Config = (Config) ? Config.innerHTML : false;

// Start the router if a config object is preset
if(Config) Rebound.start(JSON.parse(Config));

export default Rebound;
