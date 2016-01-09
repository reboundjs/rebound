// Rebound Helpers
// ----------------

import $ from "rebound-utils/rebound-utils";
import LazyValue from "rebound-htmlbars/lazy-value";

var HELPERS  = {};

function NOOP(){ return ''; }

export function hasHelper(env, scope, name) {
  (env && env.helpers) || (env = { helpers: HELPERS });
  return !!(HELPERS[name] || env.helpers[name]);
};

// lookupHelper returns the given function from the helpers object. Manual checks prevent user from overriding reserved words.
export function lookupHelper(env, scope, name) {
  if(_.isString(env)){ name = env; }
  (env && env.helpers) || (env = { helpers: HELPERS });

  // If `name` is a reserved helper, return it
  if(name === 'length')    return HELPERS.length;
  if(name === 'if')        return HELPERS.if;
  if(name === 'unless')    return HELPERS.unless;
  if(name === 'each')      return HELPERS.each;
  if(name === 'on')        return HELPERS.on;
  if(name === 'debugger')  return HELPERS.debugger;
  if(name === 'log')       return HELPERS.log;

  // If not a reserved helper, check env, then global helpers, or return undefined.
  if(!hasHelper(env, null, name)){ console.error('No helper named', name, 'registered with Rebound'); }
  return HELPERS[name] || env.helpers[name] || NOOP;
};

export function registerHelper(name, callback, env){
  if(!_.isString(name)) return console.error('Name provided to registerHelper must be a string!');
  if(!_.isFunction(callback)) return console.error('Callback provided to regierHelper must be a function!');
  if(hasHelper(env, null, name)) return console.error('A helper called "' + name + '" is already registered!');

  HELPERS[name] = callback;

};

/*******************************
        Default helpers
********************************/

HELPERS.debugger = function debuggerHelper(params, hash, options, env){
  /* jshint -W087 */
  debugger;
  return '';
};

HELPERS.log = function logHelper(params, hash, options, env){
  console.log.apply(console, params);
  return '';
};

HELPERS.on = function onHelper(params, hash, options, env){
  var i, callback, delegate, element,
      eventName = params[0],
      len = params.length;

  // By default everything is delegated on the parent component
  if(len === 2){
    callback = params[1];
    delegate = options.element;
    element = options.element;
  }
  // If a selector is provided, delegate on the helper's element
  else if(len === 3){
    callback = params[2];
    delegate = params[1];
    element = options.element;
  }

  // Attach event
  $(element).on(eventName, delegate, hash, function(event){
    if(!_.isFunction(env.root[callback])){ throw "ERROR: No method named " + callback + " on component " + env.root.tagName + "!"; }
    return env.root[callback].call(env.root, event);
  });
};

HELPERS.length = function lengthHelper(params, hash, options, env){
    return params[0] && params[0].length || 0;
};

function isTruthy(condition){

  if(condition === true || condition === false){ return condition; }

  // Handle null values
  if(condition === undefined || condition === null){ return false; }

  // Handle models
  if(condition.isModel){ return true };

  // Handle arrays and collection
  if(_.isArray(condition) || condition.isCollection){ return !!condition.length; }

  // Handle string values
  if(condition === 'true'){ return true; }
  if(condition === 'false'){ return false; }

  return false;
}

HELPERS.if = function ifHelper(params, hash, templates){

  var condition = isTruthy(params[0]);

  // If yield does not exist, this is not a block helper.
  if(!this.yield) {
    return (condition) ? params[1] : ( params[2] || '');
  }

  // Render the apropreate block statement
  if(condition && this.yield) {
    this.yield();
  }
  else if(!condition && templates.inverse && templates.inverse.yield) {
    templates.inverse.yield();
  }
  else {
    return '';
  }
};

// Unless proxies to the if helper with an inverted conditional value.
HELPERS.unless = function unlessHelper(params, hash, templates){
  params[0] = !isTruthy(params[0]);
  return HELPERS.if.apply(this, [params, hash, templates]);
};

HELPERS.each = function eachHelper(params, hash, templates) {

  // Accepts collections, arrays, models, or objects
  var value = params[0].isCollection ? params[0].models : (params[0].isModel ? params[0].attributes : params[0]);

  // If the scope has values, render them
  if (value && ((_.isArray(value) && value.length > 0) || (_.isObject(value) && Object.keys(value).length > 0))) {
    // For each value in the array, yield using that data model
    for (let key in value) {
      let eachId = (value[key] && value[key].isData) ? value[key].cid : params[0].cid + key;
      if (value.hasOwnProperty(key)){ this.yieldItem(eachId, [value[key], key]); }
    }
  }

  // Otherwise, render the inverse template
  else {
    if(templates.inverse && templates.inverse["yield"]){ templates.inverse["yield"](); }
  }

};

export default HELPERS;
