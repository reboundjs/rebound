// Rebound Helpers
// ----------------

import LazyValue from "rebound-component/lazy-value";
import $ from "rebound-component/utils";


var helpers  = {},
    partials = {};

helpers.registerPartial = function(name, func){
  if(func && func.isHTMLBars && typeof name === 'string'){
    partials[name] = func;
  }
};

// lookupHelper returns the given function from the helpers object. Manual checks prevent user from overriding reserved words.
helpers.lookupHelper = function(name, env) {
  (env && env.helpers) || (env = {helpers:{}});
  // If a reserved helper, return it
  if(name === 'attribute') { return this.attribute; }
  if(name === 'if') { return this.if; }
  if(name === 'unless') { return this.unless; }
  if(name === 'each') { return this.each; }
  if(name === 'partial') { return this.partial; }
  if(name === 'on') { return this.on; }
  if(name === 'debugger') { return this.debugger; }
  if(name === 'log') { return this.log; }

  // If not a reserved helper, check env, then global helpers, else return false
  return env.helpers[name] || helpers[name] || false;
};

helpers.registerHelper = function(name, callback, params){
  if(!_.isString(name)){
    console.error('Name provided to registerHelper must be a string!');
    return;
  }
  if(!_.isFunction(callback)){
    console.error('Callback provided to regierHelper must be a function!');
    return;
  }
  if(helpers.lookupHelper(name)){
    console.error('A helper called "' + name + '" is already registered!');
    return;
  }

  params = (_.isArray(params)) ? params : [params];
  callback.__params = params;

  helpers[name] = callback;

};

/*******************************
        Default helpers
********************************/

helpers.debugger = function(params, hash, options, env){
  debugger;
  return '';
}

helpers.log = function(params, hash, options, env){
  console.log.apply(console, params);
  return '';
}

helpers.on = function(params, hash, options, env){
  var i, callback, delegate, element,
      eventName = params[0],
      len = params.length,
      data = hash;

  // By default everything is delegated on the parent component
  // if(len === 2){
    callback = params[1];
    delegate = options.element;
    element = (this.el || options.element);
  // }
  // // If a selector is provided, delegate on the helper's element
  // else if(len === 3){
  //   callback = params[2];
  //   delegate = params[1];
  //   element = options.element;
  // }

  // Attach event
  $(element).on(eventName, delegate, hash, function(event){
    return env.helpers.__callOnComponent(callback, event);
  });
};

helpers.length = function(params, hash, options, env){
    return params[0] && params[0].length || 0;
};

helpers.if = function(params, hash, options, env){

  var condition = params[0];

  if(condition === undefined){
    return null;
  }

  if(condition.isModel){
    condition = true;
  }

  // If our condition is an array, handle properly
  if(_.isArray(condition) || condition.isCollection){
    condition = condition.length ? true : false;
  }

  if(condition === 'true'){ condition = true; }
  if(condition === 'false'){ condition = false; }

  // If more than one param, this is not a block helper. Eval as such.
  if(params.length > 1){
    return (condition) ? params[1] : ( params[2] || '');
  }

  // Check our cache. If the value hasn't actually changed, don't evaluate. Important for re-rendering of #each helpers.
  if(options.morph.__ifCache === condition){
    return null; // Return null prevent's re-rending of our placeholder.
  }

  options.morph.__ifCache = condition;

  // Render the apropreate block statement
  if(condition && options.template){
    return options.template.render(options.context, env, options.morph.contextualElement);
  }
  else if(!condition && options.inverse){
    return options.inverse.render(options.context, env, options.morph.contextualElement);
  }

  return '';
};


// TODO: Proxy to if helper with inverted params
helpers.unless = function(params, hash, options, env){
  var condition = params[0];

  if(condition === undefined){
    return null;
  }

  if(condition.isModel){
    condition = true;
  }

  // If our condition is an array, handle properly
  if(_.isArray(condition) || condition.isCollection){
    condition = condition.length ? true : false;
  }

  // If more than one param, this is not a block helper. Eval as such.
  if(params.length > 1){
    return (!condition) ? params[1] : ( params[2] || '');
  }

  // Check our cache. If the value hasn't actually changed, don't evaluate. Important for re-rendering of #each helpers.
  if(options.morph.__unlessCache === condition){
    return null; // Return null prevent's re-rending of our placeholder.
  }

  options.morph.__unlessCache = condition;

  // Render the apropreate block statement
  if(!condition &&  options.template){
    return options.template.render(options.context, env, options.morph.contextualElement);
  }
  else if(condition && options.inverse){
    return options.inverse.render(options.context, env, options.morph.contextualElement);
  }

  return '';
};

// Given an array, predicate and optional extra variable, finds the index in the array where predicate is true
function findIndex(arr, predicate, cid) {
  if (arr == null) {
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

helpers.each = function(params, hash, options, env){

  if(_.isNull(params[0]) || _.isUndefined(params[0])){ console.warn('Undefined value passed to each helper! Maybe try providing a default value?', options.context); return null; }

  var value = (params[0].isCollection) ? params[0].models : params[0], // Accepts collections or arrays
      morph = options.morph.firstChildMorph, obj, next, lazyValue, nmorph, i,  // used below to remove trailing junk morphs from the dom
      position, // Stores the iterated element's integer position in the dom list
      currentModel = function(element, index, array, cid){
        return element.cid === cid; // Returns true if currently observed element is the current model.
      };

  // For each item in this collection
  for(i=0;i < value.length;i++){
    obj = value[i];
    next = (morph) ? morph.nextMorph : null;

    // If this morph is the rendered version of this model, continue to the next one.
    if(morph && morph.cid == obj.cid){ morph = next; continue; }

    nmorph = options.morph.insertContentBeforeMorph('', morph);

    // Create a lazyvalue whos value is the content inside our block helper rendered in the context of this current list object. Returns the rendered dom for this list item.
    lazyValue = new LazyValue(function(){
      return options.template.render(options.context, env, options.morph.contextualElement, [obj]);
    }, {morph: options.morph});

    // Insert our newly rendered value (a document tree) into our placeholder (the containing element) at its requested position (where we currently are in the object list)
    nmorph.setContent(lazyValue.value());

    // Label the inserted morph element with this model's cid
    nmorph.cid = obj.cid;

    // Destroy the old morph that was here
    morph && morph.destroy();

    // Move on to the next morph
    morph = next;
  }

  // If any more morphs are left over, remove them. We've already gone through all the models.
  while(morph){
    next = morph.nextMorph;
    morph.destroy();
    morph = next;
  }

  // Return null prevent's re-rending of our placeholder. Our placeholder (containing element) now has all the dom we need.
  return null;

};

helpers.partial = function(params, hash, options, env){
  var partial = partials[params[0]];
  if( partial && partial.isHTMLBars ){
    return partial.render(options.context, env);
  }

};

export default helpers;
