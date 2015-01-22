"use strict";
var LazyValue = require("rebound-runtime/lazy-value")["default"];
var $ = require("rebound-runtime/utils")["default"];
var helpers = require("rebound-runtime/helpers")["default"];
var Context = require("rebound-runtime/context")["default"];

var hooks = {},
    attributes = {  abbr: 1,      "accept-charset": 1,   accept: 1,      accesskey: 1,     action: 1,
                    align: 1,      alink: 1,             alt: 1,         archive: 1,       axis: 1,
                    background: 1, bgcolor: 1,           border: 1,      cellpadding: 1,   cellspacing: 1,
                    char: 1,       charoff: 1,           charset: 1,     checked: 1,       cite: 1,
                    class: 1,      classid: 1,           clear: 1,       code: 1,          codebase: 1,
                    codetype: 1,   color: 1,             cols: 1,        colspan: 1,       compact: 1,
                    content: 1,    coords: 1,            data: 1,        datetime: 1,      declare: 1,
                    defer: 1,      dir: 1,               disabled: 1,    enctype: 1,       face: 1,
                    for: 1,        frame: 1,             frameborder: 1, headers: 1,       height: 1,
                    href: 1,       hreflang: 1,          hspace: 1,     "http-equiv": 1,   id: 1,
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

// Given an object (context) and a path, create a LazyValue object that returns the value of object at context and add it as an observer of the context.
function streamProperty(context, path) {

  // Lazy value that returns the value of context.path
  var lazyValue = new LazyValue(function() {
    return context.get(path);
  }, context);

  // Save our path so parent lazyvalues can know the data var or helper they are getting info from
  lazyValue.path = path;

  // Save the observer at this path
  lazyValue.addObserver(path, context);

  return lazyValue;
}

function constructHelper(el, path, context, params, hash, options, env, helper) {
  var lazyValue;

  // Extend options with the helper's containeing Morph element. Used by streamify to track data observers
  options.morph = options.placeholder = el && !el.tagName && el || false; // FIXME: this kinda sucks
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
        plainHash = {},
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
    result = helper.apply((context.__root__ || context), [plainParams, plainHash, options, env]);

    if(result && relpath){
      return result.get(relpath);
    }

    return result;
  });

  options.lazyValue.path = path;

  // For each param passed to our helper, add it to our helper's dependant list. Helper will re-evaluate when one changes.
  params.forEach(function(node) {
    if(node.isLazyValue){
      // Re-evaluate this expression when our condition changes
      node.onNotify(function(){
        options.lazyValue.value();
      });
    }

    if (node && node.isLazyValue) {
      options.lazyValue.addDependentValue(node);
    }
  });

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

hooks.get = function get(env, context, path){
  context.blockParams || (context.blockParams = new Context());
  if(path === 'this'){ path = ''; }
  // context = (context.blockParams.has(path)) ? context.blockParams : context;
  return streamProperty(context, path);
};

hooks.set = function set(env, context, name, value){
  context.blockParams || (context.blockParams = new Context());
  // context.blockParams.set(name, value);
};


hooks.concat = function concat(env, params) {

  if(params.length === 1){
    return params[0];
  }

  var lazyValue = new LazyValue(function() {
    var value = "";

    for (var i = 0, l = params.length; i < l; i++) {
      value += (params[i].isLazyValue) ? params[i].value() : params[i];
    }

    return value;
  }, params[0].context);

  for (var i = 0, l = params.length; i < l; i++) {
    if(params[i].isLazyValue) {
      params[i].onNotify(function(){
        lazyValue.notify();
      });
      lazyValue.addDependentValue(params[i]);
    }
  }

  return lazyValue;

};

hooks.subexpr = function subexpr(env, context, helperName, params, hash) {

  var helper = helpers.lookupHelper(helperName, env, context),
  lazyValue;

  if (helper) {
    // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
    lazyValue = constructHelper(true, helperName, context, params, hash, {}, env, helper);
  } else {
    lazyValue = streamProperty(context, helperName);
  }

  for (var i = 0, l = params.length; i < l; i++) {
    if(params[i].isLazyValue) {
      params[i].onNotify(function(){
        lazyValue.notify();
      });
      lazyValue.addDependentValue(params[i]);
    }
  }

  return lazyValue;
};

hooks.block = function block(env, morph, context, path, params, hash, template, inverse){
  var options = {
    morph: morph,
    template: template,
    inverse: inverse
  };

  var lazyValue,
  value,
  observer = subtreeObserver,
  helper = helpers.lookupHelper(path, env, context);

  if(!_.isFunction(helper)){
    return console.error(path + ' is not a valid helper!');
  }

  // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
  lazyValue = constructHelper(morph, path, context, params, hash, options, env, helper);

  // If we have our lazy value, update our dom.
  // morph is a morph element representing our dom node
  if (lazyValue) {
    lazyValue.onNotify(function(lazyValue) {
      var val = lazyValue.value();
      val = (_.isUndefined(val)) ? '' : val;
      if(!_.isNull(val)){
        morph.update(val);
      }
    });

    value = lazyValue.value();
    value = (_.isUndefined(value)) ? '' : value;
    if(!_.isNull(value)){ morph.append(value); }

      // Observe this content morph's parent's children.
      // When the morph element's containing element (morph) is removed, clean up the lazyvalue.
      // Timeout delay hack to give out dom a change to get their parent
      if(morph._parent){
        morph._parent.__lazyValue = lazyValue;
        setTimeout(function(){
          if(morph.contextualElement){
            observer.observe(morph.contextualElement, { attributes: false, childList: true, characterData: false, subtree: true });
          }
        }, 0);
      }

    }

};

hooks.inline = function inline(env, morph, context, path, params, hash) {

  var lazyValue,
  value,
  observer = subtreeObserver,
  helper = helpers.lookupHelper(path, env, context);

  if(!_.isFunction(helper)){
    return console.error(path + ' is not a valid helper!');
  }

  // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
  lazyValue = constructHelper(morph, path, context, params, hash, {}, env, helper);

  // If we have our lazy value, update our dom.
  // morph is a morph element representing our dom node
  if (lazyValue) {
    lazyValue.onNotify(function(lazyValue) {
      var val = lazyValue.value();
      val = (_.isUndefined(val)) ? '' : val;
      if(!_.isNull(val)){
        morph.update(val);
      }
    });

    value = lazyValue.value();
    value = (_.isUndefined(value)) ? '' : value;
    if(!_.isNull(value)){ morph.append(value); }

      // Observe this content morph's parent's children.
      // When the morph element's containing element (morph) is removed, clean up the lazyvalue.
      // Timeout delay hack to give out dom a change to get their parent
      if(morph._parent){
        morph._parent.__lazyValue = lazyValue;
        setTimeout(function(){
          if(morph.contextualElement){
            observer.observe(morph.contextualElement, { attributes: false, childList: true, characterData: false, subtree: true });
          }
        }, 0);
      }

    }
  };

hooks.content = function content(env, morph, context, path) {

  var lazyValue,
      value,
      observer = subtreeObserver,
      helper = helpers.lookupHelper(path, env, context);

  lazyValue = streamProperty(context, path);

  // If we have our lazy value, update our dom.
  // morph is a morph element representing our dom node
  if (lazyValue) {
    lazyValue.onNotify(function(lazyValue) {
      var val = lazyValue.value();
      val = (_.isUndefined(val)) ? '' : val;
      if(!_.isNull(val)){
        morph.update(val);
      }
    });

    value = lazyValue.value();
    value = (_.isUndefined(value)) ? '' : value;
    if(!_.isNull(value)){ morph.append(value); }

    // Observe this content morph's parent's children.
    // When the morph element's containing element (morph) is removed, clean up the lazyvalue.
    // Timeout delay hack to give out dom a change to get their parent
    if(morph._parent){
      morph._parent.__lazyValue = lazyValue;
      setTimeout(function(){
        if(morph.contextualElement){
          observer.observe(morph.contextualElement, { attributes: false, childList: true, characterData: false, subtree: true });
        }
      }, 0);
    }

  }
};

// Handle morphs in element tags
hooks.element = function element(env, domElement, context, path, params, hash) {

  var helper = helpers.lookupHelper(path, env, context),
      lazyValue,
      value;

  if (helper) {
    // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
    lazyValue = constructHelper(domElement, path, context, params, hash, {}, env, helper);
  } else {
    lazyValue = streamProperty(context, path);
  }

  // When we have our lazy value run it and start listening for updates.
  lazyValue.onNotify(function(lazyValue) {
    lazyValue.value();
  });

  value = lazyValue.value();

};

hooks.attribute = function attribute(env, domElement, name, value){

  var lazyValue = new LazyValue(function() {
        var val = value.value(),
            checkboxChange,
            type = domElement.getAttribute("type"),
            inputTypes = {'null': true, 'text':true, 'email':true, 'password':true, 'search':true, 'url':true, 'tel':true, 'hidden':true},
            attr;

        // If is a text input element's value prop with only one variable, wire default events
        if( domElement.tagName === 'INPUT' && inputTypes[type] && name === 'value' ){

          // If our special input events have not been bound yet, bind them and set flag
          if(!lazyValue.inputObserver){

            $(domElement).on('change input propertychange', function(event){
              value.set(value.path, this.value);
            });

            lazyValue.inputObserver = true;

          }

          // Set the attribute on our element for visual referance
          (_.isUndefined(val)) ? domElement.removeAttribute(name) : domElement.setAttribute(name, val);

          attr = val;

          return domElement.value = (attr) ? attr : '';
        }

        else if( domElement.tagName === 'INPUT' && (type === 'checkbox' || type === 'radio') && name === 'checked' ){

          // If our special input events have not been bound yet, bind them and set flag
          if(!lazyValue.eventsBound){

            $(domElement).on('change propertychange', function(event){
              value.set(value.path, ((this.checked) ? true : false), {quiet: true});
            });

            lazyValue.eventsBound = true;
          }

          // Set the attribute on our element for visual referance
          (!val) ? domElement.removeAttribute(name) : domElement.setAttribute(name, val);

          return domElement.checked = (val) ? true : undefined;
        }

        else {
          _.isString(val) && (val = val.trim());
          val || (val = undefined);
          if(_.isUndefined(val)){
            domElement.removeAttribute(name);
          }
          else{
            domElement.setAttribute(name, val);
          }
        }

        return val;

      });

  value.onNotify(function(){
    lazyValue.value();
  });
  lazyValue.addDependentValue(value);


  return lazyValue.value();

};

hooks.component = function(env, morph, context, tagName, contextData, template) {

  var component,
      element,
      outlet,
      plainData = {},
      componentData = {},
      lazyValue;

  // Create a lazy value that returns the value of our evaluated component.
  lazyValue = new LazyValue(function() {

    // Create a plain data object from the lazyvalues/values passed to our component
    _.each(contextData, function(value, key) {
      plainData[key] = (value.isLazyValue) ? value.value() : value;
    });

    // For each param passed to our shared component, add it to our custom element
    // TODO: there has to be a better way to get seed data to element instances
    // Global seed data is consumed by element as its created. This is not scoped and very dumb.
    Rebound.seedData = plainData;
    element = document.createElement(tagName);
    Rebound.seedData = {};
    component = element.__component__;

    // For each lazy param passed to our component, create its lazyValue
    _.each(plainData, function(value, key) {
      if(contextData[key] && contextData[key].isLazyValue){
        componentData[key] = streamProperty(component, key);
      }
    });

    // Set up two way binding between component and original context for non-data attributes
    // Syncing between models and collections passed are handled in model and collection
    _.each( componentData, function(componentDataValue, key){

      // TODO: Make this sync work with complex arguments with more than one child
      if(contextData[key].children === null){
        // For each lazy param passed to our component, have it update the original context when changed.
        componentDataValue.onNotify(function(){
          contextData[key].set(contextData[key].path, componentDataValue.value());
        });
      }

      // For each lazy param passed to our component, have it update the component when changed.
      contextData[key].onNotify(function(){
        componentDataValue.set(key, contextData[key].value());
      });

      // Seed the cache
      componentDataValue.value();

      // Notify the component's lazyvalue when our model updates
      contextData[key].addObserver(contextData[key].path, context);
      componentDataValue.addObserver(key, component);
      console.log(component.__name, component.cid, component);

    });

    // // For each change on our component, update the states of the original context and the element's proeprties.
    component.listenTo(component, 'change', function(model){
      var json = component.toJSON();

      if(_.isString(json)) return; // If is a string, this model is seralizing already

      // Set the properties on our element for visual referance if we are on a top level attribute
      _.each(json, function(value, key){
        // TODO: Currently, showing objects as properties on the custom element causes problems.
        // Linked models between the context and component become the same exact model and all hell breaks loose.
        // Find a way to remedy this. Until then, don't show objects.
        if((_.isObject(value))){ return; }
        value = (_.isObject(value)) ? JSON.stringify(value) : value;
          try{ (attributes[key]) ? element.setAttribute(key, value) : element.dataset[key] = value; }
          catch(e){
            console.error(e.message);
          }
      });
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


    // If an outlet marker is present in component's template, and a template is provided, render it into <content>
    outlet = element.getElementsByTagName('content')[0];
    if(template && _.isElement(outlet)){
      outlet.appendChild(template.render(context, env, outlet));
    }

    // Return the new element.
    return element;
  });



  // If we have our lazy value, update our dom.
  // morph is a morph element representing our dom node
  if (lazyValue) {
    lazyValue.onNotify(function(lazyValue) {
      var val = lazyValue.value();
      if(val !== undefined){ morph.update(val); }
    });

    value = lazyValue.value();
    if(value !== undefined){ morph.append(value); }
  }
};

// registerHelper is a publically available function to register a helper with HTMLBars

exports["default"] = hooks;