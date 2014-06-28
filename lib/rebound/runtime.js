import { merge } from "htmlbars-runtime/utils";
//import { domHelpers, Morph } from "htmlbars-runtime/main";
import { domHelpers } from "htmlbars-runtime/dom_helpers";
import Morph from "morph";
import LazyValue from "rebound/lazy-value";
import defaultEnv  from "rebound/hooks";

function htmlbarsHydrate(spec, options) {
  return spec(domHelpers(options && options.extensions), Morph);
}

function hydrate(spec, options){
  // Ensure we have a well-formed object as var options
  options = options || {};
  options.helpers = options.helpers || {};
  options.hooks = options.hooks || {};

  // Merge our default helpers with user provided helpers
  options.helpers = merge(defaultEnv.helpers, options.helpers);
  options.hooks = merge(defaultEnv.hooks, options.hooks);

  // Compile our template function
  var func = htmlbarsHydrate(spec, {
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
    options.helpers = merge(defaultEnv.helpers, options.helpers);
    options.hooks = merge(defaultEnv.hooks, options.hooks);

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

var registerHelper = defaultEnv.registerHelper;

export { registerHelper, notify, hydrate };
