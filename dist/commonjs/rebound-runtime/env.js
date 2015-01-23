"use strict";
var merge = require("htmlbars-runtime/utils").merge;
var DOMHelper = require("morph/dom-helper")["default"];
var hooks = require("rebound-runtime/hooks")["default"];
var helpers = require("rebound-runtime/helpers")["default"];

var env = {
  registerPartial: helpers.registerPartial,
  registerHelper: helpers.registerHelper,
  helpers: helpers.helpers,
  hooks: hooks
};

env.hydrate = function(spec, options){
  // Return a wrapper function that will merge user provided helpers and hooks with our defaults
  return function(data, options){
    // Ensure we have a well-formed object as var options
    var env = options || {},
        contextElement = data.el || document.documentElement;
    env.helpers = env.helpers || {};
    env.hooks = env.hooks || {};
    env.dom = env.dom || new DOMHelper();

    // Merge our default helpers and hooks with user provided helpers
    env.helpers = merge(env.helpers, helpers.helpers);
    env.hooks = merge(env.hooks, hooks);

    // Call our func with merged helpers and hooks
    return spec.render(data, env, contextElement);
  };
};

// Notify all of a object's observers of the change, execute the callback
env.notify = function(obj, paths, type) {

    // If path is not an array of keys, wrap it in array
  paths = (!_.isArray(paths)) ? [paths] : paths;

  // For each path, alert each observer and call its callback
  _.each(paths, function(path){
    _.each(obj.__observers, function(observers, obsPath){
      // Trigger all partial or exact observer matches
      if(obsPath === path || obsPath.indexOf(path + '.') === 0 || path.indexOf(obsPath + '.') === 0){
        _.each(observers, function(callback, index) {
          // If this is a collection change (add, sort, remove) trigger everything, otherwise only trigger property change callbacks
          if(_.isFunction(callback) && (callback.type === 'model' || type === 'collection')){ callback(); }
        });
      }
    });
  });

};

exports["default"] = env;