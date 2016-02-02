//     Rebound.js v%VER%

//     (c) 2015 Adam Miller
//     Rebound may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://reboundjs.com

// Rebound Runtime
// ----------------

// Import Backbone
import Backbone from "backbone";

// Load our **Utils**, helper environment, **Rebound Data**,
// **Rebound Components** and the **Rebound Router**
import utils from "rebound-utils/rebound-utils";
import { Model, Collection, ComputedProperty } from "rebound-data/rebound-data";
import { services, Router } from "rebound-router/rebound-router";
import { registerHelper, registerPartial } from "rebound-htmlbars/rebound-htmlbars";
import { ComponentFactory, registerComponent } from "rebound-component/factory";

// If Backbone doesn't have an ajax method from an external DOM library, use ours
Backbone.ajax = Backbone.$ && Backbone.$.ajax && Backbone.ajax || utils.ajax;

// Fetch Rebound's Config Object from Rebound's `script` tag
var Config = document.getElementById('Rebound');
    Config = (Config) ? JSON.parse(Config.innerHTML) : false;


var Rebound = window.Rebound = {
  version: '%VER%',
  testing: (window.Rebound && window.Rebound.testing) || (Config && Config.testing) || false,

  registerHelper: registerHelper,
  registerPartial: registerPartial,
  registerComponent: registerComponent,

  Component: ComponentFactory,
  Model: Model,
  Collection: Collection,
  ComputedProperty: ComputedProperty,

  history: Backbone.history,
  services: services,
  start: function start(options){
    var R = this;
    return new Promise(function(resolve, reject){
      var run = function(){
        if(!document.body){ return setTimeout(run.bind(R), 1); }
        delete R.router;
        R.router = new Router(options, resolve);
      };
      run();
    });
  },
  stop: function stop(){
    if(!this.router) return console.error('No running Rebound router found!');
    this.router.stop();
  }
};

// Start the router if a config object is preset
if(Config){ Rebound.start(Config); }

export default Rebound;
