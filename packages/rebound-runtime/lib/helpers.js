import LazyValue from "rebound-runtime/lazy-value";
import $ from "rebound-runtime/utils";


var helpers = {},
    partials = {asdf: 1};

helpers.registerPartial = function(name, func){
  if(func && func.isHTMLBars && typeof name === 'string'){
    partials[name] = func;
  }
};

// lookupHelper returns the given function from the helpers object. Manual checks prevent user from overriding reserved words.
helpers.lookupHelper = function(name, env, context) {

  env = env || {};

  name = $.splitPath(name)[0];

  // If a reserved helpers, return it
  if(name === 'attribute') { return this.attribute; }
  if(name === 'if') { return this.if; }
  if(name === 'unless') { return this.unless; }
  if(name === 'each') { return this.each; }
  if(name === 'with') { return this.with; }
  if(name === 'partial') { return this.partial; }
  if(name === 'length') { return this.length; }
  if(name === 'on') { return this.on; }
  if(name === 'concat') { return this.concat; }

  // If not a reserved helper, check env, then global helpers, else return false
  return (env.helpers && _.isObject(context) && _.isObject(env.helpers[context.cid]) && env.helpers[context.cid][name]) || helpers[name] || false;
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

helpers.on = function(params, hash, options, env){

  var i, callback, delegate, eventName, element,
      root = this,
      len = params.length,
      data = hash.data && hash.data.isLazyValue && hash.data.value() || hash.data || options.context;

  // Find our root component
  root = root.__root__;

  eventName = params[0];

  // By default everything is delegated on parent component
  if(len === 2){
    callback = params[1];
    delegate = options.element;
    element = root.el;
  }
  // If a selector is provided, delegate on the helper's element
  else if(len === 3){
    callback = params[2];
    delegate = params[1];
    element = options.element;
  }

  // Attach event
  $(element).on(eventName, delegate, data, function(event){
    return options.helpers.__callOnComponent(callback, event);
  });
};

helpers.concat = function(params, hash, options, env) {
  var value = "";
  // TODO: HTMLBars has a bug where hashes containing a single expression are still placed in a concat()
  if(params.length === 1){ return params[0]; }
  for (var i = 0, l = params.length; i < l; i++) {
    value += params[i];
  }
  return value;
};

helpers.length = function(params, hash, options, env){
    return params[0] && params[0].length || 0;
};

// Attribute helper handles binding data to dom attributes
helpers.attribute = function(params, hash, options, env) {
  var checkboxChange,
      type = options.element.getAttribute("type"),
      inputTypes = {'null': true, 'text':true, 'email':true, 'password':true, 'search':true, 'url':true, 'tel':true},
      attr;

  // If is a text input element's value prop with only one variable, wire default events
  if(options.element.tagName === 'INPUT' && inputTypes[type] && params[0] === 'value' ){

    // If our special input events have not been bound yet, bind them and set flag
    if(!options.lazyValue.inputObserver){

      $(options.element).on('change input propertychange', function(event){
        options.context.set(options.params[1].path, this.value, {quiet: true});
      });

      options.lazyValue.inputObserver = true;

    }

    // Set the attribute on our element for visual referance
    (_.isUndefined(params[1])) ? options.element.removeAttribute(params[0]) : options.element.setAttribute(params[0], params[1]);

    attr = options.context.get(options.params[1].path);

    return options.element.value = (attr) ? attr : '';
  }

  else if(options.element.tagName === 'INPUT' && (type === 'checkbox' || type === 'radio') && params[0] === 'checked' ){

    // If our special input events have not been bound yet, bind them and set flag
    if(!options.lazyValue.eventsBound){

      $(options.element).on('change propertychange', function(event){
        options.context.set(options.params[1].path, ((this.checked) ? true : false), {quiet: true});
      });

      options.lazyValue.eventsBound = true;
    }

    // Set the attribute on our element for visual referance
    (!params[1]) ? options.element.removeAttribute(params[0]) : options.element.setAttribute(params[0], params[1]);

    return options.element.checked = (params[1]) ? true : undefined;
  }

  else {
    // attr = (params[1]) ? params[1] : undefined;
    if(_.isUndefined(params[1])){
      return options.element.removeAttribute(params[0]);
    }
    else{
      return options.element.setAttribute(params.shift(), params.join(''));
    }
  }

  // If param is falsey, return undefined so we don't render the attr
  return attr;
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
  if(options.placeholder.__ifCache === condition){
    return null; // Return null prevent's re-rending of our placeholder.
  }

  options.placeholder.__ifCache = condition;

  // Render the apropreate block statement
  if(condition && options.template){
    return options.template.render(options.context, options, options.morph.element);
  }
  else if(!condition && options.inverse){
    return options.inverse.render(options.context, options, options.morph.element);
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
  if(options.placeholder.__unlessCache === condition){
    return null; // Return null prevent's re-rending of our placeholder.
  }

  options.placeholder.__unlessCache = condition;

  // Render the apropreate block statement
  if(!condition &&  options.template){
    return options.template.render(options.context, options, options.morph.element);
  }
  else if(condition && options.inverse){
    return options.inverse.render(options.context, options, options.morph.element);
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
      start, end, // used below to remove trailing junk morphs from the dom
      position, // Stores the iterated element's integer position in the dom list
      currentModel = function(element, index, array, cid){
        return element.cid === cid; // Returns true if currently observed element is the current model.
      };

  // Create our morph array if it doesnt exist
  options.placeholder.morphs = options.placeholder.morphs || [];

  _.each(value, function(obj, key, list){

    position = findIndex(options.placeholder.morphs, currentModel, obj.cid);

    // Even if rendered already, update each element's index, key, first and last in case of order changes or element removals
    if(_.isArray(value)){
      obj.set({'@index': key, '@first': (key === 0), '@last': (key === value.length-1)}, {silent: true});
    }

    if(!_.isArray(value) && _.isObject(value)){
      obj.set({'@key' : key}, {silent: true});
    }

    // If this model is not the morph element at this index
    if(position !== key){

      // Create a lazyvalue whos value is the content inside our block helper rendered in the context of this current list object. Returns the rendered dom for this list element.
      var lazyValue = new LazyValue(function(){
        return options.template.render(obj, options, options.morph.contextualElement);
      });

      // If this model is rendered somewhere else in the list, destroy it
      if(position > -1){
        options.placeholder.morphs[position].destroy();
      }

      // Destroy the morph we're replacing
      if(options.placeholder.morphs[key]){
        options.placeholder.morphs[key].destroy();
      }

      // Insert our newly rendered value (a document tree) into our placeholder (the containing element) at its requested position (where we currently are in the object list)
      options.placeholder.insert(key, lazyValue.value());

      // Label the inserted morph element with this model's cid
      options.placeholder.morphs[key].cid = obj.cid;

    }

  }, this);

  // If any more morphs are left over, remove them. We've already gone through all the models.
  start = value.length;
  end = options.placeholder.morphs.length - 1;
  for(end; start <= end; end--){
    options.placeholder.morphs[end].destroy();
  }

  // Return null prevent's re-rending of our placeholder. Our placeholder (containing element) now has all the dom we need.
  return null;

};

helpers.with = function(params, hash, options, env){

  // Render the content inside our block helper with the context of this object. Returns a dom tree.
  return options.template.render(params[0], options, options.morph.element);

};

helpers.partial = function(params, hash, options, env){
  var partial = partials[params[0]];
  if( partial && partial.isHTMLBars ){
    return partial.render(options.context, env);
  }

};

export default helpers;