import { merge } from "htmlbars-runtime/utils";
//import { domHelpers, Morph } from "htmlbars-runtime/main";
import DOMHelper from "morph/dom-helper";
// import Morph from "rebound/morph";
import LazyValue from "rebound/lazy-value";
import defaultEnv  from "rebound/hooks";

function hydrate(spec, options){
  // Return a wrapper function that will merge user provided helpers with our defaults
  return function(data, options){
    // Ensure we have a well-formed object as var options
    var env = options || {};
    env.helpers = env.helpers || {};
    env.hooks = env.hooks || {};
    env.dom = env.dom || new DOMHelper();

    // Merge our default helpers and hooks with user provided helpers
    env.helpers = merge(defaultEnv.helpers, env.helpers);
    env.hooks = merge(defaultEnv.hooks, env.hooks);

    // Call our func with merged helpers and hooks
    return spec.call(this, data, env);
  }
}

// Notify all of a object's observers of the change, execute the callback
function notify(obj, path) {
  // If path is not an array of keys, wrap it in array
  var observers = (obj instanceof Backbone.Collection) ? obj.models.__observers : obj.__observers;
  path = (Object.prototype.toString.call(path) === '[object Array]') ? path : [path];

  // For each path, alert each observer and call its callback
  _.each(path, function(path){
    if(_.isArray(observers[path])){
      _.each(observers[path], function(callback) {
        callback();
      });
    }
  });
}

// TODO: This is silly. Fix it.
var registerHelper = defaultEnv.registerHelper;
var registerPartial = defaultEnv.registerPartial;
var registerTemplate = defaultEnv.registerTemplate;
var templates = defaultEnv.templates;

export { registerHelper, registerPartial, registerTemplate, notify, hydrate, templates };