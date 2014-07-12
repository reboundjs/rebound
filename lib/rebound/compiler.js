import { compile as htmlbarsCompile, compileSpec as htmlbarsCompileSpec } from "htmlbars-compiler/compiler";
import { merge } from "htmlbars-runtime/utils";
import defaultHelpers from "rebound/helpers";
import defaultHooks from "rebound/hooks";

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

  // For debugging, output the compiled function
   console.log(func)

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
    })
  }
}

function precompile(str){
  if( !str || str.length === 0 )
    return console.error('No template provided!');

  return '' + htmlbarsCompileSpec(str);
}

export { compile, precompile };
