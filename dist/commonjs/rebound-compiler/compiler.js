"use strict";
var htmlbarsCompile = require("htmlbars-compiler/compiler").compile;
var htmlbarsCompileSpec = require("htmlbars-compiler/compiler").compileSpec;
var merge = require("htmlbars-runtime/utils").merge;
var DOMHelper = require("morph/dom-helper")["default"];
var helpers = require("rebound-runtime/helpers")["default"];
var hooks = require("rebound-runtime/hooks")["default"];

function compile(string, options){
  // Ensure we have a well-formed object as var options
  options = options || {};
  options.helpers = options.helpers || {};
  options.hooks = options.hooks || {};

  // Merge our default helpers with user provided helpers
  options.helpers = merge(helpers, options.helpers);
  options.hooks = merge(hooks, options.hooks);

  // Compile our template function
  var func = htmlbarsCompile(string, {
    helpers: options.helpers,
    hooks: options.hooks
  });

  // Return a wrapper function that will merge user provided helpers with our defaults
  var template = function(data, env, context){
    // Ensure we have a well-formed object as var options
    env = env || {};
    env.helpers = env.helpers || {};
    env.hooks = env.hooks || {};
    env.dom = env.dom || new DOMHelper();

    // Merge our default helpers and hooks with user provided helpers
    env.helpers = merge(helpers, env.helpers);
    env.hooks = merge(hooks, env.hooks);

    // Set a default context if it doesn't exist
    context = context || document.body;

    // Call our func with merged helpers and hooks
    return func.call(this, data, env, context);
  };

  helpers.registerPartial( options.name, template);

  return template;

}

exports["default"] = compile;