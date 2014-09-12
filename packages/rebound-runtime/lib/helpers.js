import LazyValue from "rebound-runtime/lazy-value";

var helpers = {},
    partials = {};

helpers.registerPartial = function(name, func){
  if(_.isFunction(func) && typeof name === 'string'){
    partials[name] = func;
  }
};

// lookupHelper returns the given function from the helpers object. Manual checks prevent user from overriding reserved words.
helpers.lookupHelper = function(name, env, path) {

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
  return (env.helpers[path + '.' + name]) || helpers[name] || false;
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
  var id = $(options.element).attr('data-event') || _.uniqueId('event'),
      i, callback,
      len = params.length,
      delegate = hash.selector || '[data-event='+id+']',
      data = hash.data && hash.data.isLazyValue && hash.data.value() || hash.data || options.context;

  // Set our element's data-event id
  $(options.element).attr('data-event', id);

  // Make sure we only attach once for each combination of delagate selector and callback
  for(i = 1; i<len; i++){
    callback = params[i];
    $(env.dom.document).on(params[0], delegate, data, function(event){
      return options.helpers.__callOnComponent(callback, event);
    });
    // this.outlet.off(eventName, delegate, this[params[i]]).on(eventName, delegate, data, this[params[i]]);
  }
};

helpers.concat = function(params, hash, options, env) {
  var value = "";
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
      inputTypes = {'text':true, 'email':true, 'password':true, 'search':true, 'url':true, 'tel':true,},
      attr;

  // If is a text input element's value prop with only one variable, wire default events
  if(options.element.tagName === 'INPUT' && inputTypes[type] && params[0] === 'value' && !options.params[1].children ){

    // If our special input events have not been bound yet, bind them and set flag
    if(!options.lazyValue.eventsBound){

      // If a submit action has been set
      $(options.element).on('input propertychange', options.context, function(event){
        options.context.set(options.params[1].path, this.value);
      });

      options.lazyValue.eventsBound = true;
    }

    return options.context.get(options.params[1].path);
  }

  if(options.element.tagName === 'INPUT' && options.element.getAttribute("type") === 'checkbox' && params[0] === 'checked' && !options.params[1].children ){

    // If our special input events have not been bound yet, bind them and set flag
    if(!options.lazyValue.eventsBound){
      $(options.element).on('change', function(){
        options.context.set(options.params[1].path, this.checked);
      });

      options.lazyValue.eventsBound = true;
    }

    return options.element.checked = (params[1]) ? true : undefined;
  }

  return params[1];
};

helpers.if = function(params, hash, options, env){
  var condition = params[0];

  if(condition === undefined){ return console.error("Condition passed to if helper is undefined!"); }

  if(condition.isModel){
    condition = true;
  }

  // If our condition is an array, handle properly
  if(_.isArray(condition) || Backbone && condition.isCollection){
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
    return undefined;
  }

  options.placeholder.__ifCache = condition;

  // Render the apropreate block statement
  if(condition && typeof options.render === 'function'){
    return options.render(options.context, options);
  }
  else if(!condition && typeof options.inverse === 'function'){
    return options.inverse(options.context, options);
  }

  return '';
};


// TODO: Proxy to if helper with inverted params
helpers.unless = function(params, hash, options, env){
  var condition = params[0];

  if(condition === undefined){ return console.error("Condition passed to unless helper is undefined!"); }

  if(condition.isModel){
    condition = true;
  }

  // If our condition is an array, handle properly
  if(_.isArray(condition) || Backbone && condition.isCollection){
    condition = condition.length ? true : false;
  }

  // If more than one param, this is not a block helper. Eval as such.
  if(params.length > 1){
    return (!condition) ? params[1] : ( params[2] || '');
  }

  // Check our cache. If the value hasn't actually changed, don't evaluate. Important for re-rendering of #each helpers.
  if(options.placeholder.__unlessCache === condition){ return undefined; }

  options.placeholder.__unlessCache = condition;

  // Render the apropreate block statement
  if(!condition && typeof options.render === 'function'){
    return options.render(options.context, options);
  }
  else if(condition && typeof options.inverse === 'function'){
    return options.inverse(options.context, options);
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

  if(_.isNull(params[0]) || _.isUndefined(params[0])){ console.error('Undefined value passed to each helper. Provide a default value.'); return; }

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

      // If this model was added silently, but is now being rendered, removing it will need to update the dom.
      if(obj.__silent){ delete obj.__silent; }

      // Create a lazyvalue whos value is the content inside our block helper rendered in the context of this current list object. Returns the rendered dom for this list element.
      var lazyValue = new LazyValue(function(){
        return options.render(obj, options);
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

  // No need for a return statement. Our placeholder (containing element) now has all the dom we need.

};

helpers.with = function(params, hash, options, env){

  // Render the content inside our block helper with the context of this object. Returns a dom tree.
  return options.render(params[0], options);

};

helpers.partial = function(params, hash, options, env){

  if(typeof partials[params[0]] === 'function'){
    return partials[params[0]](options.context, env);
  }

};

export default helpers;