"use strict";
var merge = require("htmlbars-runtime/utils").merge;
var DOMHelper = require("morph/dom-helper")["default"];
var hooks = require("rebound-runtime/hooks")["default"];
var helpers = require("rebound-runtime/helpers")["default"];
var Model = require("rebound-data/rebound-data").Model;
var Collection = require("rebound-data/rebound-data").Collection;


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
    return spec.call(this, data, env, contextElement);
  };
};

// Notify all of a object's observers of the change, execute the callback
env.notify = function(obj, path) {

  // If path is not an array of keys, wrap it in array
  path = (_.isString(path)) ? [path] : path;

  // If this is a change from a model inside of a collection, alert all collection's watchers of the change too
  _.each(path, function(path, index, arr){
    // TODO: Make this work for nexted collections. Only works at 1 level right now.
    var collectionPath = path.split('.@each.')[0];
    if(collectionPath){
      arr.push(collectionPath);
    }
  });

  // For each path, alert each observer and call its callback
  _.each(path, function(path){
    if(obj.__observers && _.isArray(obj.__observers[path])){
      _.each(obj.__observers[path], function(callback, index) {
        if(callback){ callback(); }
        else{ delete obj.__observers[path][index]; }
      });
    }
  });
};

exports["default"] = env;