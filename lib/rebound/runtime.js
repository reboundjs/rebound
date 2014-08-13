import { merge } from "htmlbars-runtime/utils";
import DOMHelper from "morph/dom-helper";
import Morph from "morph/morph";
import LazyValue from "rebound/lazy-value";
import defaultEnv  from "rebound/hooks";

Morph.prototype.__removeMorph = Morph.prototype.removeMorph;
Morph.prototype.removeMorph = function(){
  this.__removeMorph.apply(this, arguments);
};

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
  };
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
        if(callback){ callback(); }
        else{ delete obj.__observers[path][index]; }
      });
    }
  });
}

// TODO: This is silly. Fix it.
var registerHelper = defaultEnv.registerHelper;
var registerPartial = defaultEnv.registerPartial;

export { registerHelper, registerPartial, notify, hydrate };