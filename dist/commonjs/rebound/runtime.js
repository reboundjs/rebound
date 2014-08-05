"use strict";
var merge = require("../htmlbars-runtime/utils").merge;
var DOMHelper = require("../morph/dom-helper")["default"];
var Morph = require("../morph/morph")["default"];
var LazyValue = require("../rebound/lazy-value")["default"];
var defaultEnv = require("../rebound/hooks")["default"];

Morph.prototype.__removeMorph = Morph.prototype.removeMorph;
Morph.prototype.removeMorph = function(){
  this.__removeMorph.apply(this, arguments)
}

function hydrate(spec, options){
  // Return a wrapper function that will merge user provided helpers with our defaults
  return function(data, options){
    // Ensure we have a well-formed object as var options
    var env = options || {};
    env.helpers = env.helpers || {};
    env.hooks = env.hooks || {};
    env.dom = env.dom || new DOMHelper();

    // Merge our default helpers and hooks with user provided helpers
    env.helpers = merge(env.helpers, defaultEnv.helpers);
    env.hooks = merge(env.hooks, defaultEnv.hooks);

    // Call our func with merged helpers and hooks
    return spec.call(this, data, env);
  }
}

// Notify all of a object's observers of the change, execute the callback
function notify(obj, path, controllerName) {
  defaultEnv.controller = controllerName;
  // If path is not an array of keys, wrap it in array
  path = (Object.prototype.toString.call(path) === '[object Array]') ? path : [path];

  // For each path, alert each observer and call its callback
  _.each(path, function(path){
    if(_.isArray(obj.__observers[path])){
      _.each(obj.__observers[path], function(callback, index) {
        if(callback) callback();
        else delete obj.__observers[path][index];
      });
    }
  });
}

// TODO: This is silly. Fix it.
var registerHelper = defaultEnv.registerHelper;
var registerPartial = defaultEnv.registerPartial;
var registerComponent = defaultEnv.registerComponent;
var components = defaultEnv.components;

exports.registerHelper = registerHelper;
exports.registerPartial = registerPartial;
exports.registerComponent = registerComponent;
exports.notify = notify;
exports.hydrate = hydrate;
exports.components = components;