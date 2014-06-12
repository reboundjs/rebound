import { compile as htmlbarsCompile } from "htmlbars-compiler/compiler";
import { merge } from "htmlbars-runtime/utils";
import LazyValue from "rebound/lazy-value";
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
  // console.log(func)

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

var registerHelper = defaultHelpers.registerHelper;

export { compile, LazyValue, registerHelper, notify };
