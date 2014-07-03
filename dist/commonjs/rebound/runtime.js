"use strict";
var merge = require("htmlbars-runtime/utils").merge;
//import { domHelpers, Morph } from "htmlbars-runtime/main";
var DOMHelper = require("morph/dom-helper")["default"];
var Morph = require("morph/morph")["default"];
var LazyValue = require("rebound/lazy-value")["default"];
var defaultEnv = require("rebound/hooks")["default"];

function htmlbarsHydrate(spec, options) {
  return spec(options.dom, Morph);
}

function hydrate(spec, options){
  // Ensure we have a well-formed object as var options
  options = options || {};
  options.helpers = options.helpers || {};
  options.hooks = options.hooks || {};
  options.dom = options.dom || new DOMHelper(document.createElement('div'));

  // Merge our default helpers with user provided helpers
  options.helpers = merge(defaultEnv.helpers, options.helpers);
  options.hooks = merge(defaultEnv.hooks, options.hooks);

  // Compile our template function
  var func = htmlbarsHydrate(spec, options);

  // Return a wrapper function that will merge user provided helpers with our defaults
  return function(data, options){
    // Ensure we have a well-formed object as var options
    options = options || {};
    options.helpers = options.helpers || {};
    options.hooks = options.hooks || {};
    options.dom = options.dom || new DOMHelper(document.createElement('div'));

    // Merge our default helpers and hooks with user provided helpers
    options.helpers = merge(defaultEnv.helpers, options.helpers);
    options.hooks = merge(defaultEnv.hooks, options.hooks);

    // Call our func with merged helpers and hooks
    return func.call(this, data, options)
  }
}

// Notify all of a model's observers of the change, execute the callback
function notify(model, path) {
  // If path is not an array of keys, wrap it in array
  path = (Object.prototype.toString.call(path) === '[object Array]') ? path : [path];

  // For each path, alert each observer and call its callback
  path.forEach(function(path){
    if(Object.prototype.toString.call(model.__observers[path]) === '[object Array]'){
      model.__observers[path].forEach(function(callback) {
        callback();
      });
    }
  });
}

var registerHelper = defaultEnv.registerHelper;

exports.registerHelper = registerHelper;
exports.notify = notify;
exports.hydrate = hydrate;