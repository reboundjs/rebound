// Rebound Helpers
// ----------------

import LazyValue from "rebound-component/lazy-value";
import $ from "rebound-component/utils";

var helpers  = {},
    partials = {};

window.partials = partials;
helpers.registerPartial = function(name, func){
  if(func && typeof name === 'string'){
    return partials[name] = func;
  }
};

helpers.hasHelper = function(env, scope, name) {
  return env.helpers[name] !== undefined;
};

// lookupHelper returns the given function from the helpers object. Manual checks prevent user from overriding reserved words.
helpers.lookupHelper = function(env, scope, name) {
  if(_.isString(env)) name = env;
  (env && env.helpers) || (env = {helpers:helpers});
  // If a reserved helper, return it
  if(name === 'attribute') { return env.helpers.attribute; }
  if(name === 'if') { return env.helpers.if; }
  if(name === 'unless') { return env.helpers.unless; }
  if(name === 'each') { return env.helpers.each; }
  if(name === 'partial') { return env.helpers.partial; }
  if(name === 'on') { return env.helpers.on; }
  if(name === 'debugger') { return env.helpers.debugger; }
  if(name === 'log') { return env.helpers.log; }

  // If not a reserved helper, check env, then global helpers, else return false
  return helpers[name] || env.helpers[name];
};

helpers.registerHelper = function(name, callback){
  if(!_.isString(name)){
    console.error('Name provided to registerHelper must be a string!');
    return;
  }
  if(!_.isFunction(callback)){
    console.error('Callback provided to regierHelper must be a function!');
    return;
  }
  if(helpers.lookupHelper(null, null, name)){
    console.error('A helper called "' + name + '" is already registered!');
    return;
  }

  helpers[name] = callback;

};

/*******************************
        Default helpers
********************************/

helpers.debugger = function(params, hash, options, env){
  /* jshint -W087 */
  debugger;
  return '';
};

helpers.log = function(params, hash, options, env){
  console.log.apply(console, params);
  return '';
};

helpers.on = function(params, hash, options, env){
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
    return env.helpers._callOnComponent(callback, event);
  });
};

helpers.length = function(params, hash, options, env){
    return params[0] && params[0].length || 0;
};

function isTruthy(condition){

  if(condition === true || condition === false) return condition;

  if(condition === undefined || condition === null){
    condition = false;
  }

  condition.isModel && (condition = true);

  // If our condition is an array, handle properly
  if(_.isArray(condition) || condition.isCollection){
    condition = condition.length ? true : false;
  }

  // Handle string values
  (condition === 'true') && (condition = true);
  (condition === 'false') && (condition = false);

  return condition;
}

helpers.if = function(params, hash, templates){

  var condition = isTruthy(params[0]);

  // If yield does not exist, this is not a block helper.
  if(!this.yield){
    return (condition) ? params[1] : ( params[2] || '');
  }

  // Render the apropreate block statement
  if(condition && this.yield){
    this.yield();
  }
  else if(!condition && templates.inverse && templates.inverse.yield){
    templates.inverse.yield();
  }
  else{
    return '';
  }
};

// Unless proxies to the if helper with an inverted conditional value.
helpers.unless = function(params, hash, templates){
  params[0] = !isTruthy(params[0]);
  return helpers.if.apply((templates.template || {}), [params, hash, templates]);
};

// Given an array, predicate and optional extra variable, finds the index in the array where predicate is true
function findIndex(arr, predicate, cid) {
  if (arr === null) {
    throw new TypeError('findIndex called on null or undefined');
  }
  if (typeof predicate !== 'function') {
    throw new TypeError('predicate must be a function');
  }
  var list = Object(arr);
  var length = list.length >>> 0;
  var thisArg = arguments[1];
  var value;

  for (var i = 0; i < length; i++) {
    value = list[i];
    if (predicate.call(thisArg, value, i, list, cid)) {
      return i;
    }
  }
  return -1;
}

helpers.each = function(params, hash, templates){

  if(_.isNull(params[0]) || _.isUndefined(params[0])){ console.warn('Undefined value passed to each helper! Maybe try providing a default value?', params, hash); return null; }

  var key, value = (params[0].isCollection) ? params[0].models : params[0]; // Accepts collections or arrays

  if((!_.isArray(value) || value.length === 0)){
    if(templates.inverse && templates.inverse.yield)
      templates.inverse.yield();
  }
  else{
    for (key in value) {
      if(value.hasOwnProperty(key))
        this.yieldItem(value[key].cid, [ value[key] ]);
    }
  }
  return _.uniqueId('rand');
};

helpers.partial = function(params, hash, options, env){
  var partial = partials[params[0]];
  if( partial && partial.isHTMLBars ){
    return partial.render(options.context, env);
  }
};

export default helpers;
export { partials };
