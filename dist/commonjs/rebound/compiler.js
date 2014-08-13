"use strict";
var htmlbarsCompile = require("../htmlbars-compiler/compiler").compile;
var htmlbarsCompileSpec = require("../htmlbars-compiler/compiler").compileSpec;
var merge = require("../htmlbars-runtime/utils").merge;
var defaultHelpers = require("../rebound/helpers")["default"];
var defaultHooks = require("../rebound/hooks")["default"];

function compile(string, options){
  // Ensure we have a well-formed object as var options
  options = options || {};
  options.helpers = options.helpers || {};
  options.hooks = options.hooks || {};

  // Merge our default helpers with user provided helpers
  options.helpers = merge(defaultHelpers, options.helpers);
  options.hooks = merge(defaultHooks, options.hooks);

  // Compile our template function
  var func = htmlbarsCompile(string, {
    helpers: options.helpers,
    hooks: options.hooks
  });

  // Return a wrapper function that will merge user provided helpers with our defaults
  return function(data, options){
    // Ensure we have a well-formed object as var options
    options = options || {};
    options.helpers = options.helpers || {};
    options.hooks = options.hooks || {};

    // Merge our default helpers and hooks with user provided helpers
    options.helpers = merge(defaultHelpers, options.helpers);
    options.hooks = merge(defaultHooks, options.hooks);

    // Call our func with merged helpers and hooks
    return func.call(this, data, {
      helpers: options.helpers,
      hooks: options.hooks
    });
  };
}

exports.compile = compile;