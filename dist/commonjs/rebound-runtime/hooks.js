"use strict";
var LazyValue = require("rebound-runtime/lazy-value")["default"];
var $ = require("rebound-runtime/utils")["default"];
var helpers = require("rebound-runtime/helpers")["default"];

var hooks = {};


/*******************************
        Hook Utils
********************************/

// Returns the computed property's function if true, else false
function isComputedProperty(model, path){
  return _.isFunction(model.get(path, {raw: true}));
}

// Add a callback to a given context to trigger when its value at 'path' changes.
function addObserver(context, path, lazyValue, morph) {
  var length,
      paths = $.splitPath(path);

  if(!_.isObject(context) || !_.isString(path) || !_.isObject(lazyValue)){
    console.error('Error adding observer for', context, path, lazyValue);
    return;
  }

  // Get actual context if any @parent calls
  while(paths[0] === '@parent'){
    context = context.__parent__;
    paths.shift();
  }
  path = paths.join('.');

  // Ensure _observers exists and is an object
  context.__observers = context.__observers || {};
  // Ensure __obxervers[path] exists and is an array
  context.__observers[path] = context.__observers[path] || [];

  // Save the position this is being inserted into the observers array so we can garbage collect later
  length = context.__observers[path].length;

  // Add our callback
  context.__observers[path].push(function() {
    try{
      return lazyValue.notify();
    } catch(err) {
      // If we run into an error running notify, that means we have a dead dependancy chain. Kill it.
      console.log('KILLING OBSERVER', context.__observers, path, length);
      console.log(err.stack);
      lazyValue.destroy();
      delete context.__observers[path][length];
    }
  });

  return {context: context, path: path, index: length};
}

function streamComputedPropertyArgs(lazyValue, helper, context){
  if(helper && _.isArray(helper.__params)){

    var params = [];

    for (var i = 0, l = helper.__params.length; i < l; i++) {
      if (!helper.__params[i].isLazyValue) {
        params[i] = streamProperty(context, helper.__params[i]);
      }
    }

    params.forEach(function(node) {

      // Re-evaluate this expression when our condition changes
      node.onNotify(function(){
        lazyValue.value();
      });

      lazyValue.addDependentValue(node);

      // Whenever context.path changes, have LazyValue notify its listeners.
      // If it contains an @each statement in the path,
      if(node.path.indexOf('@each') > 0){

        // TODO: If the property is n levels deep in nested collections, handle that
        // Listen for changes to collection (add, remove, reset, etc)
        lazyValue.saveObserver(addObserver(context, node.path.split(/\.?@each\.?/)[0], lazyValue));

      }
      else{
        lazyValue.saveObserver(addObserver(context, node.path, lazyValue));
      }

    });
  }

}

// Given an object (context) and a path, create a LazyValue object that returns the value of object at context and add it as an observer of the context.
function streamProperty(context, path) {

    // Our raw value at this path
  var value = context.get(path, {raw: true}),
    // Lazy value that returns the value of context.path
      lazyValue = new LazyValue(function() {
        return context.get(path);
      });

  // Save our path so parent lazyvalues can know the data var or helper they are getting info from
  lazyValue.path = path;

  // If we have custom defined observers, bind to those vars.
  streamComputedPropertyArgs(lazyValue, value, context);

  lazyValue.saveObserver(addObserver(context, path, lazyValue));

  return lazyValue;
}

function streamifyArgs(context, params, options) {
  // Convert ID params to streams
  var morph = options.placeholder || options.element || true;

  for (var i = 0, l = params.length; i < l; i++) {
    if (options.types[i] === 'id' && !params[i].isLazyValue) {
      params[i] = streamProperty(context, params[i]);
    }
  }

  // Convert hash ID values to streams
  var hash = options.hash,
      hashTypes = options.hashTypes;
  for (var key in hash) {
    if (hashTypes[key] === 'id' && !params[i].isLazyValue) {
      hash[key] = streamProperty(context, hash[key]);
    }
  }
}

function constructHelper(el, path, context, params, options, env, helper) {
  var lazyValue;

  // Extend options with the helper's containeing Morph element. Used by streamify to track data observers
  options.placeholder = el && !el.tagName && el || false; // FIXME: this kinda sucks
  options.element = el && el.tagName && el || false;      // FIXME: this kinda sucks

  // Extend options with hooks and helpers for any subsequent calls from a lazyvalue
  options.params = params;                                 // FIXME: this kinda sucks
  options.hooks = env.hooks;                               // FIXME: this kinda sucks
  options.helpers = env.helpers;                           // FIXME: this kinda sucks
  options.context = context;                               // FIXME: this kinda sucks
  options.dom = env.dom;                                   // FIXME: this kinda sucks
  options.path = path;                                     // FIXME: this kinda sucks

  // Create a lazy value that returns the value of our evaluated helper.
  options.lazyValue = new LazyValue(function() {
    var len = params.length,
        i,
        plainParams = [],
        plainHash = [],
        result,
        relpath = $.splitPath(path),
        first, rest;
        relpath.shift();
        relpath = relpath.join('.');

        rest = $.splitPath(relpath);
        first = rest.shift();
        rest = rest.join('.');

    // Assemble our args and hash variables. For each lazyvalue param, push the lazyValue's value so helpers with no concept of lazyvalues.
    for(i=0; i<len; i++){
      plainParams.push(( (params[i].isLazyValue) ? params[i].value() : params[i] ));
    }

    _.each(options.hash, function(hash, key){
      plainHash[key] = (hash.isLazyValue) ? hash.value() : hash;
    });

    // Call our helper functions with our assembled args.
    result = helper.apply(context, [plainParams, plainHash, options, env]);

    // TODO: Shouldnt have to do this. Its bad.
    // Promote arrays returnd by helpers to collections
    result = (_.isArray(result)) ? new Rebound.Collection(result) : result;


    if(result && relpath && ( result.isModel || result.isCollection )){
      return result.get(relpath);
    }

    if(result && relpath &&  (_.isObject(result) || _.isArray(result)) && result.hasOwnProperty(relpath)){
      console.log(relpath, first, rest);
      return result[first].get(rest);
    }

    return result;

  });


  // For each argument passed to our helper, turn them into LazyValues. Params array is now an array of lazy values that will trigger when their value changes.
  streamifyArgs(context, params, options);

  options.lazyValue.path = path;

  // For each param passed to our helper, add it to our helper's dependant list. Helper will re-evaluate when one changes.
  params.forEach(function(node) {
    if(node.isLazyValue){
      // Re-evaluate this expression when our condition changes
      node.onNotify(function(){
        options.lazyValue.value();
      });
    }

    if (node && typeof node === 'string' || node && node.isLazyValue) {
      options.lazyValue.addDependentValue(node);
    }
  });

  // If we have custom defined observers, bind to those vars.
  streamComputedPropertyArgs(options.lazyValue, helper, context);

  return options.lazyValue;
}

// Given a root element, cleans all of the morph lazyValues for a given subtree
function cleanSubtree(mutations, observer){
  // For each mutation observed, if there are nodes removed, destroy all associated lazyValues
  mutations.forEach(function(mutation) {
    if(mutation.removedNodes){
      _.each(mutation.removedNodes, function(node, index){
        $(node).walkTheDOM(function(n){
          if(n.__lazyValue && n.__lazyValue.destroy()){
            n.__lazyValue.destroy();
          }
        });
      });
    }
  });

}

var subtreeObserver = new MutationObserver(cleanSubtree);

/*******************************
        Default Hooks
********************************/

hooks.content = function(placeholder, path, context, params, options, env) {

  var lazyValue,
      value,
      observer = subtreeObserver,
      helper = helpers.lookupHelper(path, env, context);

  // If we were passed a helper, and it was found in our registered helpers
  if (helper) {
    // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
    lazyValue = constructHelper(placeholder, path, context, params, options, env, helper);
  } else {
    // If not a helper, just subscribe to the value
    lazyValue = streamProperty(context, path, placeholder, options);
  }

  // If we have our lazy value, update our dom.
  // Placeholder is a morph element representing our dom node
  if (lazyValue) {
    lazyValue.onNotify(function(lazyValue) {
      var val = lazyValue.value();
      value = (_.isUndefined(val)) ? '' : val;
      if(!_.isNull(val)){
        placeholder.update(val);
      }
    });

    value = lazyValue.value();
    value = (_.isUndefined(value)) ? '' : value;
    if(!_.isNull(value)){ placeholder.append(value); }

    // Observe this content morph's parent's children.
    // When the morph element's containing element (placeholder) is removed, clean up the lazyvalue.
    // Timeout delay hack to give out dom a change to get their parent
    if(placeholder._parent){
      placeholder._parent.__lazyValue = lazyValue;
      setTimeout(function(){
        if(placeholder.contextualElement){
          observer.observe(placeholder.contextualElement, { attributes: false, childList: true, characterData: false, subtree: true });
        }
      }, 0);
    }

  }
};

// Handle placeholders in element tags
hooks.element = function(element, path, context, params, options, env) {
  var helper = helpers.lookupHelper(path, env, context),
      lazyValue,
      value;

  if (helper) {
    // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
    lazyValue = constructHelper(element, path, context, params, options, env, helper);
  } else {
    lazyValue = streamProperty(context, path, element, options);
  }

  // When we have our lazy value run it and start listening for updates.
  lazyValue.onNotify(function(lazyValue) {
    lazyValue.value();
  });

  value = lazyValue.value();

};

hooks.webComponent = function(placeholder, path, context, options, env) {

  var component,
      element,
      outlet,
      data = {},
      lazyData = {},
      lazyValue;

  // Create a plain data object from the lazyvalues/values passed to our component
  _.each(options.hash, function(value, key) {
    data[key] = (value.isLazyValue) ? value.value() : value;
  });

  // Create a lazy value that returns the value of our evaluated component.
  lazyValue = new LazyValue(function() {

    // For each param passed to our shared component, add it to our custom element
    // TODO: there has to be a better way to get seed data to element instances
    // Global seed data is consumed by element as its created. This is not scoped and very dumb.
    Rebound.seedData = data;
    element = document.createElement(path);
    Rebound.seedData = {};
    component = element.__component__;

    // For each param passed to our shared component, create a new lazyValue
    _.each(data, function(value, key) {
      lazyData[key] = streamProperty(component, key, placeholder, options);
    });

    // For each param passed to our helper, have it update the original context when changed.
    // For each new lazyValue, bind it to its original context's value and to its scoped context
    _.each( lazyData, function(value, key){

      // If this value was passed in from outside, set up our two way data binding
      if(options.hash[key]){
        value.onNotify(function(){
          // Update the context where we inherited this value from.
          options.context.set(options.hash[key].path, value.value());
        });

        // For each param passed to our component, if it exists, add it to our component's dependant list. Value will re-evaluate when its original changes.
        if(options.hash[key] && options.hash[key].isLazyValue){
          options.hash[key].onNotify(function(){
            component.set(key, options.hash[key].value());
            value.notify();
          });
        }
      }

      // Seed the cache
      value.value();

      // Notify the component's lazyvalue when our model updates
      value.saveObserver(addObserver(component, key, value, placeholder));
    });

  /*******************************************************

    Set up our data dependancy chains.

      Players:

        Context: The original context of the data passed into our component

        Component: The data stricture of our component that handles all syncronization and binding

        Element: The actual dom element associated with our component

      Chain structure:

        Context <---> Component <---> Element

  *******************************************************/

    // For each change on our component, update the states of the original context and the element's proeprties.
    context.listenTo(component, 'change', function(model){

      var componentPath = (model.__path()),
          componentAttrs = model.changedAttributes(),
          contextPath = '',
          contextAttrs = {},
          json = model.toJSON();

      // If changed model is our top level component object, then the value changed is a primitive
      // Only update the values that were passed in to our component
      // Variable names may change when passed into components (ex: user={{person}}).
      // When user changes on the component, be sure to update the person variable
      if(componentPath === ""){
        // For each attribute modified on our component, update the context's corrosponding key
        _.each(componentAttrs, function(value, componentKey){
          if(options.hash[componentKey] && options.hash[componentKey].path){
            contextAttrs[options.hash[componentKey].path] = value;
          }
        });
        context.get(contextPath).set(contextAttrs);
      }
      // If changed model is a sub object of the component, only update the values that were passed in to our component
      else{
        // If base model was renamed, create the actual path on the context we're updating
        contextPath = $.splitPath(componentPath);
        if(options.hash.hasOwnProperty(contextPath[0])){
          contextPath[0] = options.hash[contextPath[0]].path;
          contextPath = contextPath.join('.');
          // All values were passed in as is, use all of them
          contextAttrs = componentAttrs;
          context.get(contextPath).set(contextAttrs);
        }
      }


      // Set the properties on our element for visual referance if we are on a top level attribute
      if(componentPath === ""){
        _.each(json, function(value, key){
          // TODO: Currently, showing objects as properties on the custom element causes problems. Linked models between the context and component become the same exact model and all hell breaks loose. Find a way to remedy this. Until then, don't show objects.
          if((_.isObject(value))){ return; }
          value = (_.isObject(value)) ? JSON.stringify(value) : value;
          if(!_.isUndefined(value)){
            element.setAttribute(key, value);
          }
        });
      }
    });

    // For each change to the original context, update our component
    component.listenTo(context, 'change', function(model){

      var path = model.__path(),
          split = path.split('.');

      if(!options.hash[split[0]]){
        return;
      }

      if(component.get(path)){
        component.get(path).set(model.changedAttributes());
      }
    });

    /** The attributeChangedCallback on our custom element updates the component's data. **/


  /*******************************************************

    End data dependancy chain

  *******************************************************/


    // TODO: break this out into its own function
    // Set the properties on our element for visual referance if we are on a top level attribute
    var compjson = component.toJSON();
    _.each(compjson, function(value, key){
      // TODO: Currently, showing objects as properties on the custom element causes problems. Linked models between the context and component become the same exact model and all hell breaks loose. Find a way to remedy this. Until then, don't show objects.
      if((_.isObject(value))){ return; }
      value = (_.isObject(value)) ? JSON.stringify(value) : value;
      if(!_.isNull(value) && !_.isUndefined(value)){
        element.setAttribute(key, value);
      }
    });


    // If an outlet marker is present in component's template, and options.render is a function, render it into <content>
    outlet = element.getElementsByTagName('content')[0];
    if(_.isFunction(options.render) && _.isElement(outlet)){
      outlet.appendChild(options.render(options.context, env, outlet));
    }

    // Return the new element.
    return element;
  });



  // If we have our lazy value, update our dom.
  // Placeholder is a morph element representing our dom node
  if (lazyValue) {
    lazyValue.onNotify(function(lazyValue) {
      var val = lazyValue.value();
      if(val !== undefined){ placeholder.update(val); }
    });

    value = lazyValue.value();
    if(value !== undefined){ placeholder.append(value); }
  }
};


hooks.subexpr = function(path, context, params, options, env) {

  var helper = helpers.lookupHelper(path, env, context),
      lazyValue;

  if (helper) {
    // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
    lazyValue = constructHelper((options || true), path, context, params, options, env, helper);
  } else {
    lazyValue = streamProperty(context, path, (options || true), options);
  }

  return lazyValue;
};

// registerHelper is a publically available function to register a helper with HTMLBars

exports["default"] = hooks;