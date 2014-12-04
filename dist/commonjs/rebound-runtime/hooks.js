"use strict";
var LazyValue = require("rebound-runtime/lazy-value")["default"];
var $ = require("rebound-runtime/utils")["default"];
var helpers = require("rebound-runtime/helpers")["default"];

var hooks = {},
    attributes = {  abbr: 1,       "accept-charset": 1,  accept: 1,      accesskey: 1,     action: 1,
                    align: 1,      alink: 1,             alt: 1,         archive: 1,       axis: 1,
                    background: 1, bgcolor: 1,           border: 1,      cellpadding: 1,   cellspacing: 1,
                    char: 1,       charoff: 1,           charset: 1,     checked: 1,       cite: 1,
                    class: 1,      classid: 1,           clear: 1,       code: 1,          codebase: 1,
                    codetype: 1,   color: 1,             cols: 1,        colspan: 1,       compact: 1,
                    content: 1,    coords: 1,            data: 1,        datetime: 1,      declare: 1,
                    defer: 1,      dir: 1,               disabled: 1,    enctype: 1,       face: 1,
                    for: 1,        frame: 1,             frameborder: 1, headers: 1,       height: 1,
                    href: 1,       hreflang: 1,          hspace: 1,      "http-equiv": 1,  id: 1,
                    ismap: 1,      label: 1,             lang: 1,        language: 1,      link: 1,
                    longdesc: 1,   marginheight: 1,      marginwidth: 1, maxlength: 1,     media: 1,
                    method: 1,     multiple: 1,          name: 1,        nohref: 1,        noresize: 1,
                    noshade: 1,    nowrap: 1,            object: 1,      onblur: 1,        onchange: 1,
                    onclick: 1,    ondblclick: 1,        onfocus: 1,     onkeydown: 1,     onkeypress: 1,
                    onkeyup: 1,    onload: 1,            onmousedown: 1, onmousemove: 1,   onmouseout: 1,
                    onmouseover: 1,onmouseup: 1,         onreset: 1,     onselect: 1,      onsubmit: 1,
                    onunload: 1,   profile: 1,           prompt: 1,      readonly: 1,      rel: 1,
                    rev: 1,        rows: 1,              rowspan: 1,     rules: 1,         scheme: 1,
                    scope: 1,      scrolling: 1,         selected: 1,    shape: 1,         size: 1,
                    span: 1,       src: 1,               standby: 1,     start: 1,         style: 1,
                    summary: 1,    tabindex: 1,          target: 1,      text: 1,          title: 1,
                    type: 1,       usemap: 1,            valign: 1,      value: 1,         valuetype: 1,
                    version: 1,    vlink: 1,             vspace: 1,      width: 1  };


/*******************************
        Hook Utils
********************************/

// Returns the computed property's function if true, else false
function isComputedProperty(model, path){
  return _.isFunction(model.get(path, {raw: true}));
}

// Add a callback to a given context to trigger when its value at 'path' changes.
function addObserver(context, path, lazyValue, morph) {
  var length, res,
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

  res = context.get(lazyValue.path);

  context.__observers[path][length].type = (res && res.isCollection) ? 'collection' : 'model';

  return {context: context, path: path, index: length};
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

  // Save the observer at this path
  lazyValue.saveObserver(addObserver(context, path, lazyValue));

  return lazyValue;
}

function streamComputedPropertyArgs(lazyValue, computedProperty, context){
  if(computedProperty && _.isArray(computedProperty.deps)){

    var params = [];

    for (var i = 0, l = computedProperty.deps.length; i < l; i++) {
      if(!computedProperty.deps[i].isLazyValue) {
        params[i] = streamProperty(context, computedProperty.deps[i]);
      }
      // Re-evaluate this expression when our condition changes
      params[i].onNotify(function(){
        lazyValue.value();
      });

      lazyValue.addDependentValue(params[i]);

      // Whenever context.path changes, have LazyValue notify its listeners.
      lazyValue.saveObserver(addObserver(context, params[i].path, lazyValue));
    }
  }
}

function constructHelper(el, path, context, params, hash, options, env, helper) {
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
  options.hash = hash || [];                               // FIXME: this kinda sucks

  // Create a lazy value that returns the value of our evaluated helper.
  options.lazyValue = new LazyValue(function() {
    var plainParams = [],
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
    _.each(params, function(param, index){
      plainParams.push(( (param && param.isLazyValue) ? param.value() : param ));
    });
    _.each(hash, function(hash, key){
      plainHash[key] = (hash && hash.isLazyValue) ? hash.value() : hash;
    });

    // Call our helper functions with our assembled args.
    result = helper.apply(context, [plainParams, plainHash, options, env]);

    if(result && relpath){
      return result.get(relpath);
    }

    return result;
  });

  if(helper.deps){
    var computedPropLazyVal = streamProperty(context, path);
    computedPropLazyVal.onNotify(function(){
      options.lazyValue.value();
    });
    options.lazyValue.addDependentValue(computedPropLazyVal);
  }

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

hooks.get = function(context, path){
  return streamProperty(context, path);
};

hooks.content = function(placeholder, path, context, params, hash, options, env) {

  var lazyValue,
      value,
      observer = subtreeObserver,
      helper = helpers.lookupHelper(path, env, context);

  // If we were passed a helper, and it was found in our registered helpers
  if (helper) {
    // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
    lazyValue = constructHelper(placeholder, path, context, params, hash, options, env, helper);
  } else {
    // If not a helper, just subscribe to the value
    lazyValue = streamProperty(context, path);
  }

  // If we have our lazy value, update our dom.
  // Placeholder is a morph element representing our dom node
  if (lazyValue) {
    lazyValue.onNotify(function(lazyValue) {
      var val = lazyValue.value();
      val = (_.isUndefined(val)) ? '' : val;
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

hooks.attribute = function(domElement, attributeName, quoted, context, parts, options, env){
  parts.unshift(attributeName);
  hooks.element(domElement, 'attribute', context, parts, [], options, env);
};

// Handle placeholders in element tags
hooks.element = function(element, path, context, params, hash, options, env) {
  var helper = helpers.lookupHelper(path, env, context),
      lazyValue,
      value;

  if (helper) {
    // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
    lazyValue = constructHelper(element, path, context, params, hash, options, env, helper);
  } else {
    lazyValue = streamProperty(context, path);
  }

  // When we have our lazy value run it and start listening for updates.
  lazyValue.onNotify(function(lazyValue) {
    lazyValue.value();
  });

  value = lazyValue.value();

};

hooks.component = function(placeholder, path, context, hash, options, env) {
  var component,
      element,
      outlet,
      data = {},
      lazyData = {},
      lazyValue;

  // Create a plain data object from the lazyvalues/values passed to our component
  _.each(hash, function(value, key) {
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
      lazyData[key] = streamProperty(component, key);
    });

    // For each param passed to our helper, have it update the original context when changed.
    // For each new lazyValue, bind it to its original context's value and to its scoped context
    _.each( lazyData, function(value, key){

      // If this value was passed in from outside, set up our two way data binding
      // TODO: Make this sync work with complex arguments with more than one part
      if(hash[key] && hash[key].children && hash[key].children.length === 1){
        value.onNotify(function(){
          // Update the context where we inherited this value from.
          context.set(hash[key].children[0].path, value.value());
        });

        // For each param passed to our component, if it exists, add it to our component's dependant list. Value will re-evaluate when its original changes.
        if(hash[key] && hash[key].isLazyValue){
          hash[key].onNotify(function(){
            component.set(key, hash[key].value());
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
    context.listenTo(component, 'change ', function(model){

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
          // TODO: Make this sync work with complex arguments with more than one part
          if(hash[componentKey] && hash[componentKey].children &&  hash[componentKey].children.length === 1){
            contextAttrs[hash[componentKey].children[0].path] = value;
          }
        });
        context.get(contextPath).set(contextAttrs);
      }
      // If changed model is a sub object of the component, only update the values that were passed in to our component
      else{
        // If base model was renamed, create the actual path on the context we're updating
        contextPath = $.splitPath(componentPath);
        if(hash.hasOwnProperty(contextPath[0])){
          // TODO: Make this sync work with complex arguments with more than one part
          contextPath[0] = hash[contextPath[0]].children[0].path;
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
            try{ (attributes[key]) ? element.setAttribute(key, value) : element.dataset[key] = value; }
            catch(e){
              console.error(e.message);
            }
          }
        });
      }
    });

    // For each change to the original context, update our component
    component.listenTo(context, 'change', function(model){

      var path = model.__path(),
          split = path.split('.');

      if(!hash[split[0]]){
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
        try{ (attributes[key]) ? element.setAttribute(key, value) : element.dataset[key] = value; }
        catch(e){
          console.error(e.message);
        }
      }
    });


    // If an outlet marker is present in component's template, and options.render is a function, render it into <content>
    outlet = element.getElementsByTagName('content')[0];
    if(options.template && _.isElement(outlet)){
      outlet.appendChild(options.template.render(context, env, outlet));
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


hooks.subexpr = function(path, context, params, hash, options, env) {

  var helper = helpers.lookupHelper(path, env, context),
      lazyValue;

  if (helper) {
    // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
    lazyValue = constructHelper((options || true), path, context, params, hash, options, env, helper);
  } else {
    lazyValue = streamProperty(context, path);
  }

  return lazyValue;
};

// registerHelper is a publically available function to register a helper with HTMLBars

exports["default"] = hooks;