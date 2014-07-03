"use strict";
var LazyValue = require("rebound/lazy-value")["default"];

var hooks = this,
    helpers = this;

/*******************************
        Default helpers
********************************/

// Attribute helper handles binding data to dom attributes
function __attribute() {
  var builder = new LazyValue(function(values) {
        return values.join('');
      }),
      options = _.last(arguments),
      name = options.params.shift();

  options.params.forEach(function(node) {
    if (typeof node === 'string' || node.isLazyValue)
      builder.addDependentValue(node);
  });

  builder.onNotify(function(lazyValue) {
    options.element.setAttribute(name, lazyValue.value());
  });

  options.element.setAttribute(name, builder.value());
}

function __if(value, options){
    return value ? options.render(this, options) : options.inverse(this, options)
}

function __unless(value, options){
    return value ? options.inverse(this, options) : options.render(this, options)
}


function __each(value, options){

  // Remove elements at indicies passed to us in the collection's __removedIndex array
  if(_.isArray(value.__removedIndex) && value.__removedIndex.length){
    // For each removed indes, in decending order so we dont mess up the dom for later indicies, destroy its morph element
    _.each(_.sortBy(value.__removedIndex, function(num){return num;}).reverse(), function(index){
      options.placeholder.morphs[index].destroy();
    })
  }

  // Leave our removed index array clean for the next call
  value.__removedIndex = [];
  value.__indexed = false;

  _.each(value, function(obj, key, list){

    // If this object in the collection has already been rendered, move on.
    if(obj.__rendered) return;

    // If this model was added silently, but is now being rendered, removing it will need to update the dom.
    if(obj.__silent) delete obj.__silent;

    // Create a lazyvalue whos value is the content inside our block helper rendered in the context of this current list object. Returns the rendered dom for this list element.
    var lazyValue = new LazyValue(function(){
      return options.render(obj, options);
    })

    // Insert our newly rendered value (a document tree) into our placeholder (the containing element) at its requested position (where we currently are in the object list)
    options.placeholder.insert(key, lazyValue.value());

    // Mark this object as rendered so we will not re-render it a second time
    obj.__rendered = true;

  }, this);

  // No need for a return statement. Our placeholder (containing element) now has all the dom we need.

}


function __with(value, options){

  // Render the content inside our block helper with the context of this object. Returns a dom tree.
  var dom = options.render(value, options);

  // TODO: Needs data binding?...

  // Insert our newly rendered value (a document tree) into our placeholder (the containing element) at its position (where we currently are in the rendering)
  options.placeholder.append(dom);

  // No need to return anything. Our placeholder (containing element) now has all the dom we need.

}


/*******************************
        Hook Utils
********************************/
// Given a model and a path return the value
function get(model, path) {
  // Get function now checks for collection, model or vanillajs object. Accesses appropreately.
  var parts  = {},
      result = {};

  // Split the path at all '.', '[' and ']' and find the value referanced.
  parts = _.compact(path.split(/(?:\.|\[|\])+/));
  // If no path, return current object, otherwise get value of the path
  result = model;
  if (parts.length > 0) {
    for (var i = 0, l = parts.length; i < l; i++) {
      result = (model instanceof Backbone.Collection)? result.at(parts[i]) : ((model instanceof Backbone.Model)? result.get(parts[i]) : result[parts[i]]);
    }
  }

  // A model can return a collection. Make sure when this happens, we get the collection's model array.
  result = (result === undefined) && '' || result;
  return (result instanceof Backbone.Collection) ? result.models : result;

}

// Add a callgack to a given model to trigger when its value at 'path' changes.
function addObserver(model, path, callback) {
  // Ensure _observers exists and is an object
  model.__observers = model.__observers || {};
  // Ensure __obxervers[path] exists and is an array
  model.__observers[path] = model.__observers[path] || [];
  // Add our callback
  model.__observers[path].push(callback);
}

// Given an object (context) and a path, create a LazyValue object that returns the value of object at context and add it as an observer of the context.
function streamFor(context, path) {

  // Lazy value that returns the value of context.path
  var lazyValue = new LazyValue(function() {
    return get(context, path);
  });

  // Whenever context.path changes, have LazyValue notify its listeners.
  addObserver(context, path, function() {
    lazyValue.notify();
  });

  return lazyValue;
}

function streamifyArgs(context, params, options, helpers) {
  // Convert ID params to streams
  for (var i = 0, l = params.length; i < l; i++) {
    if (options.types[i] === 'id') {
      params[i] = streamFor(context, params[i]);
    }
  }

  // Convert hash ID values to streams
  var hash = options.hash,
      hashTypes = options.hashTypes;
  for (var key in hash) {
    if (hashTypes[key] === 'id') {
      hash[key] = streamFor(context, hash[key]);
    }
  }
}

// lookupHelper returns the given function from the helpers object. Manual checks prevent user from overriding reserved words.
function lookupHelper(name, env) {
  if(name === 'attribute') { return __attribute; }
  if(name === 'if') { return __if; }
  if(name === 'unless') { return __unless; }
  if(name === 'each') { return __each; }
  if(name === 'with') { return __with; }
  return helpers[name];
}

function constructHelper(el, path, context, params, options, env, helper) {
  var lazyValue;

  // For each argument passed to our helper, turn them into LazyValues. Params array is now an array of lazy values that will trigger when their value changes.
  streamifyArgs(context, params, options, env.helpers);

  // Extend options with the helper's containeing Morph element, hooks and helpers for any subsequent calls from a lazyvalue
  options.placeholder = el; // FIXME: this kinda sucks
  options.element = el; // FIXME: this kinda sucks
  options.params = params; // FIXME: this kinda sucks
  options.hooks = env.hooks; // FIXME: this kinda sucks
  options.helpers = env.helpers; // FIXME: this kinda sucks
  options.context = context; // FIXME: this kinda sucks
  options.dom = env.dom; // FIXME: this kinda sucks

  // Create a lazy value that returns the value of our evaluated helper.
  lazyValue = new LazyValue(function() {
    var len = params.length,
        i,
        args = [];

    // Assemble our args variable. For each lazyvalue param, push the lazyValue's value to args so helpers can be written handlebars style with no concept of lazyvalues.
    for(i=0; i<len; i++){
      args.push(( (params[i].isLazyValue) ? params[i].value() : params[i] ));
    }

    // Then push our options on to the end. Options are always last.
    args.push(options);

    // Call our helper functions with our assembled args.
    return helper.apply(context, args);
  });

  // For each param passed to our helper, add it to our helper's dependant list. Helper will re-evaluate when one changes.
  params.forEach(function(node) {
    if (typeof node === 'string' || node.isLazyValue) {
      lazyValue.addDependentValue(node);
    }
  });

  return lazyValue;
}

/*******************************
        Default Hooks
********************************/

hooks.content = function(placeholder, path, context, params, options, env) {

  var lazyValue,
      value,
      helper = lookupHelper(path, env);

  // TODO: just set escaped on the placeholder in HTMLBars
  placeholder.escaped = options.escaped;

  // If we were passed a helper, and it was found in our registered helpers
  if (helper) {
    // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
    lazyValue = constructHelper(placeholder, path, context, params, options, env, helper)
  } else {
    // If not a helper, just subscribe to the value
    lazyValue = streamFor(context, path);
  }

  // If we have our lazy value, update our dom.
  // Placeholder is a morph element representing our dom node
  if (lazyValue) {
    lazyValue.onNotify(function(lazyValue) {
      var val = lazyValue.value();
      if(val) placeholder.update(val);
    });

    value = lazyValue.value();
    if(value) placeholder.append(value);
  }
}

// Handle placeholders in element tags
hooks.element = function(element, path, context, params, options, env) {
  var helper = lookupHelper(path, env),
      lazyValue;

  //streamifyArgs(context, params, options, env.helpers);

  if (helper) {

    // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
    lazyValue = constructHelper(element, path, context, params, options, env, helper)

    // When we have our lazy value run it and start listening for updates.
    lazyValue.onNotify(function(lazyValue) {
      lazyValue.value();
    });
    lazyValue.value();

    //return helper(element, path, params, options, helpers);
  } else {
    return streamFor(context, path);
  }
}


hooks.subexpr = function(path, context, params, options, env) {
  var helper = lookupHelper(path, env);
  if (helper) {
    streamifyArgs(context, params, options, env.helpers);
    return helper(params, options);
  } else {
    return streamFor(context, path);
  }
}

// registerHelper is a publically available function to register a helper with HTMLBars
function registerHelper(key, callback){
  helpers[key] = callback;
}


// TODO: When htmlbars adds support for partials, write partials hook


exports["default"] = { registerHelper: registerHelper, hooks: hooks, helpers: helpers }