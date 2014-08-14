import LazyValue from "rebound/lazy-value";
import util from "rebound/util";


var hooks = {},
    helpers = {},
    partials = {},
    components = {};


/*******************************
        Default helpers
********************************/

function __on(params, hash, options, env){
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
      return options.helpers.__callOnController(callback, event);
    });
    // this.outlet.off(eventName, delegate, this[params[i]]).on(eventName, delegate, data, this[params[i]]);
  }
}

function __action(params, hash, options, env){

}

function __length(params, hash, options, env){
    return params[0] && params[0].length || 0;
}

// Attribute helper handles binding data to dom attributes
function __attribute(params, hash, options, env) {
  var checkboxChange,
      type = options.element.getAttribute("type"),
      inputTypes = {'text':true, 'email':true, 'password':true, 'search':true, 'url':true, 'tel':true,},
      attr;

  // If is a text input element's value prop with only one variable, wire default events
  if(options.element.tagName === 'INPUT' && inputTypes[type] && params[0] === 'value' && !options.params[1].children ){

    // If our special input events have not been bound yet, bind them and set flag
    if(!options.lazyValue.eventsBound){

      // If a submit action has been set
      attr = $(options.element).attr('rebound-action');
      $(options.element).on('input propertychange', options.context, function(event){
        options.context.set(options.params[1].path, this.value);
      });
      $(options.element).on('keyup', options.context, function(event){
        if(event.keyCode === 13 && attr){
          options.helpers.__callOnController(attr, event);
        }
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
}

function __concat(params, hash, options, env) {
  var value = "";
  for (var i = 0, l = params.length; i < l; i++) {
    value += params[i];
  }
  return value;
}

function __if(params, hash, options, env){
  var condition = params[0];

  if(condition === undefined){ return console.log("Condition passed to if helper is undefined!"); }

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
}

function __unless(params, hash, options, env){
  var condition = params[0];

  if(condition === undefined){ return console.log("Condition passed to unless helper is undefined!"); }

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
}

function __each(params, hash, options, env){
  var value = params[0];

  if(!value){ return; }

  if(value.isCollection){
    value = value.models;
  }

  // Remove elements at indicies passed to us in the collection's __removedIndex array
  if(_.isArray(value.__removedIndex) && value.__removedIndex.length && options.placeholder.morphs){
    // For each removed indes, in decending order so we dont mess up the dom for later indicies, destroy its morph element
    _.each(_.sortBy(value.__removedIndex, function(num){return num;}).reverse(), function(index){
      options.placeholder.morphs[index].destroy();
    });
    // Leave our removed index array clean for the next call
    value.__removedIndex.length = 0;
  }

  value.__indexed = false;

  _.each(value, function(obj, key, list){

    // Even if rendered already, update each element's index, key, first and last in case of order changes or element removals
    if(_.isArray(value)){
      obj.set({'@index': key, '@first': (key === 0), '@last': (key === value.length-1)});
    }

    if(!_.isArray(value) && _.isObject(value)){
      obj.set({'@key' : key});
    }

    // If this object in the collection has already been rendered, move on.
    if(obj.__rendered){ return; }

    // If this model was added silently, but is now being rendered, removing it will need to update the dom.
    if(obj.__silent){ delete obj.__silent; }

    // Create a lazyvalue whos value is the content inside our block helper rendered in the context of this current list object. Returns the rendered dom for this list element.
    var lazyValue = new LazyValue(function(){
      return options.render(obj, options);
    });

    // Insert our newly rendered value (a document tree) into our placeholder (the containing element) at its requested position (where we currently are in the object list)
    options.placeholder.insert(key, lazyValue.value());

    // Mark this object as rendered so we will not re-render it a second time
    obj.__rendered = true;

  }, this);

  // No need for a return statement. Our placeholder (containing element) now has all the dom we need.

}

function __with(params, hash, options, env){

  // Render the content inside our block helper with the context of this object. Returns a dom tree.
  return options.render(params[0], options);

  // TODO: Needs data binding?...

}

function __partial(params, hash, options, env){

  if(typeof partials[params[0]] === 'function'){
    return partials[params[0]](options.context, env);
  }

}


/*******************************
        Hook Utils
********************************/

// Given a model and a path return the raw value at that path
function getRaw(context, path) {
  // Get function now checks for collection, model or vanillajs object. Accesses appropreately.
  var parts  = {},
      result = {};

  // Split the path at all '.', '[' and ']' and find the value referanced.
  parts = _.compact(path.split(/(?:\.|\[|\])+/));
  // If no path, return current object, otherwise get value of the path
  result = context;

  if (parts.length > 0) {
    for (var i = 0, l = parts.length; i < l; i++) {
      if(_.isFunction(result)){
        result = result();
      }
      else if(result.isCollection){
        result = result.models[parts[i]];
      }
      else if(result.isModel){
        result = result.attributes[parts[i]];
      }
      else if(result && result[parts[i]]){
        result = result[parts[i]];
      }
      else{
        result = '';
      }
    }
  }

  return result;

}

// Takes the raw value at that path and makes it pretty. Computed values are evaluated, undefineds are empty strings
function get(context, path) {
  var val = getRaw(context, path);
  if( _.isFunction(val)){ return val.call(context); }
  return val;
}

// Returns the computed property's function if true, else false
function isComputedProperty(model, path){
  return _.isFunction(getRaw(model, path));
}

// Add a callback to a given context to trigger when its value at 'path' changes.
function addObserver(context, path, lazyValue, morph) {
  var length;

  // Ensure _observers exists and is an object
  context.__observers = context.__observers || {};
  // Ensure __obxervers[path] exists and is an array
  context.__observers[path] = context.__observers[path] || [];

  // Save the position this is being inserted into the observers array so we can garbage collect later
  length = context.__observers[path].length;

  // Add our callback
  context.__observers[path].push(function() {
    // TODO: Add a garbage collector that periodically walks over the data and cleans observers.
    try{
      // If morph element is no longer on the page, remove our bound observer. Otherwise, notify our lazy value of the value change.

      // This method breaks shit...good idea though
      // if(morph && morph.element && !document.contains(morph.element)){
      //   delete context.__observers[path][length];
      //   return;
      // }
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

function addComputedPropertyObservers(lazyValue, helper, context, morph){

  if(_.isArray(helper.__params)){
    var len = helper.__params.length;
    // For each extra paramater dependancy, computed or user provided
    for (var i = 0; i < len; i++) {

      if(_.isString(helper.__params[i])){

        // If it contains an @each statement in the path,
        if(helper.__params[i].indexOf('@each') > 0){

          // TODO: If the property is n levels deep in nested collections, handle that
          var collectionPath = helper.__params[i].split(/\.?@each\.?/);

          // Delagated on the collection, when the collection receives a change event for the specified child model attribute, notify our lazyvalue.
          lazyValue.saveObserver(addObserver(get(context, collectionPath[0]), '@each.' + collectionPath[1], lazyValue, morph));

          // Listen to collection changes (add, remove, reset, etc)
          lazyValue.saveObserver(addObserver(context, collectionPath[0], lazyValue, morph));

        }
        else{
          lazyValue.saveObserver(addObserver(context, helper.__params[i], lazyValue, morph));
        }
      }
    }
  }
}

function streamComputedProperty(context, path, morph, options ){

  // Our raw computed property function
  var helper = getRaw(context, path),

  // New lazy value calls each of this computed property's observers and returns its value
  lazyValue = new LazyValue(function() {

    // Notify all computed properties that depend on this computed property of its change
    if(_.isArray(context.__observers[path])){
      _.each(context.__observers[path], function(callback, index) {
        if(callback){
          callback();
        }
        else{
          delete context.__observers[path][index];
        }
      });
    }

    return get(context, path);
  });

  // Save our path so parent lazyvalues can know the data var or helper they are getting info from
  lazyValue.path = path;

  // If we have custom defined observers, bind to those vars.
  addComputedPropertyObservers(lazyValue, helper, context, morph);

  return lazyValue;
}

// Given an object (context) and a path, create a LazyValue object that returns the value of object at context and add it as an observer of the context.
function streamStaticProperty(context, path, morph, options) {
  // Lazy value that returns the value of context.path
  var lazyValue = new LazyValue(function() {
    return get(context, path);
  });

  // Save our path so parent lazyvalues can know the data var or helper they are getting info from
  lazyValue.path = path;

  // Whenever context.path changes, have LazyValue notify its listeners.
  lazyValue.saveObserver(addObserver(context, path, lazyValue, morph));

  return lazyValue;
}

function streamifyArgs(context, params, options, helpers) {
  // Convert ID params to streams
  var morph = options.placeholder || options.element || true;

  for (var i = 0, l = params.length; i < l; i++) {
    if (options.types[i] === 'id') {
      if (isComputedProperty(context, params[i])){
        params[i] = streamComputedProperty(context, params[i], morph, options);
      }
      else {
        params[i] = streamStaticProperty(context, params[i], morph, options);
      }
    }
  }

  // Convert hash ID values to streams
  var hash = options.hash,
      hashTypes = options.hashTypes;
  for (var key in hash) {
    if (hashTypes[key] === 'id') {
      if (isComputedProperty(context, params[i])){
        hash[key] = streamComputedProperty(context, hash[key], morph, options);
      }
      else {
        hash[key] = streamStaticProperty(context, hash[key], morph, options);
      }
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
  if(name === 'partial') { return __partial; }
  if(name === 'concat') { return __concat; }
  if(name === 'on') { return __on; }
  if(name === 'action') { return __action; }
  return helpers[name];
}

function constructHelper(el, path, context, params, options, env, helper) {
  var lazyValue;

  // Extend options with the helper's containeing Morph element. Used by streamify to track data observers
  options.placeholder = el && !el.tagName && el || false; // FIXME: this kinda sucks
  options.element = el && el.tagName && el || false;      // FIXME: this kinda sucks

  // For each argument passed to our helper, turn them into LazyValues. Params array is now an array of lazy values that will trigger when their value changes.
  streamifyArgs(context, params, options, env.helpers);

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
        plainHash = [];

    // Assemble our args and hash variables. For each lazyvalue param, push the lazyValue's value so helpers with no concept of lazyvalues.
    for(i=0; i<len; i++){
      plainParams.push(( (params[i].isLazyValue) ? params[i].value() : params[i] ));
    }

    _.each(options.hash, function(hash, key){
      plainHash[key] = (hash.isLazyValue) ? hash.value() : hash;
    });

    // Call our helper functions with our assembled args.
    return helper.apply(context, [plainParams, plainHash, options, env]);
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

    if (node && typeof node === 'string' || node && node.isLazyValue) {
      options.lazyValue.addDependentValue(node);
    }
  });

  // If we have custom defined observers, bind to those vars.
  addComputedPropertyObservers(options.lazyValue, helper, context, (options.placeholder || options.element));

  return options.lazyValue;
}

/*******************************
        Default Hooks
********************************/

// Given a root element, cleans all of the morph lazyValues for a given subtree
// TODO: Theres probably a more efficient way to write this function.
function cleanSubtree(mutations, observer){
  // For each mutation observed, if there are nodes removed, destroy all associated lazyValues
  mutations.forEach(function(mutation) {
    if(mutation.removedNodes){
      _.each(mutation.removedNodes, function(node, index){
        util.walkTheDOM(node, function(n){
          if(n.__lazyValue && n.__lazyValue.destroy()){
            n.__lazyValue.destroy();
          }
        });
      });
    }
  });
}

var subtreeObserver = new MutationObserver(cleanSubtree);

hooks.content = function(placeholder, path, context, params, options, env) {

  var lazyValue,
      value,
      observer = subtreeObserver,
      helper = lookupHelper(path, env);

  // TODO: just set escaped on the placeholder in HTMLBars
  placeholder.escaped = options.escaped;

  // If we were passed a helper, and it was found in our registered helpers
  if (helper) {
    // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
    lazyValue = constructHelper(placeholder, path, context, params, options, env, helper);
  } else {
    // If not a helper, just subscribe to the value
    lazyValue = streamStaticProperty(context, path, placeholder, options);
  }

  // If we have our lazy value, update our dom.
  // Placeholder is a morph element representing our dom node
  if (lazyValue) {
    lazyValue.onNotify(function(lazyValue) {
      var val = lazyValue.value();
      if(val !== undefined){ placeholder.update(val); }
    });

    value = lazyValue.value();
    if(value !== undefined){ placeholder.append(value); }

    // Observe this content morph's parent's children.
    // When the morph element's containing element (placeholder) is removed, clean up the lazyvalue.
    // Timeout delay hack to give out dom a change to get their parent
    placeholder.element.__lazyValue = lazyValue;
    setTimeout(function(){
      if(placeholder.element.parentNode){
        observer.observe(placeholder.element.parentNode, { attributes: false, childList: true, characterData: false, subtree: true });
      }
    }, 0);

  }
};

// Handle placeholders in element tags
hooks.element = function(element, path, context, params, options, env) {
  var helper = lookupHelper(path, env),
      lazyValue,
      value;

  if (helper) {
    // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
    lazyValue = constructHelper(element, path, context, params, options, env, helper);
  } else {
    lazyValue = streamStaticProperty(context, path, element, options);
  }

  // When we have our lazy value run it and start listening for updates.
  lazyValue.onNotify(function(lazyValue) {
    var val = lazyValue.value();
    // If an input element, set its new value if different
    if(params[0] === 'value' && val !== undefined && element.value !== val){
        element.value = val;
    }
    if(val !== undefined){ element.setAttribute(params[0], val); }
  });

  value = lazyValue.value();
  // If an input element, set its new value if different
  if(params[0] === 'value' && value !== undefined && element.value !== value){
      element.value = value;
  }
  if(value !== undefined){
    element.setAttribute(params[0], value);
  }
};

hooks.webComponent = function(placeholder, path, context, options, env) {

  var component,
      element,
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
    Rebound.seedData = data;
    element = document.createElement(path);
    Rebound.seedData = {};
    component = element.__template;

    // For each param passed to our shared component, create a new lazyValue
    _.each(data, function(value, key) {
      lazyData[key] = streamStaticProperty(component, key, placeholder, options);
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
      var path = model.__path().replace(context.__path(), ''),
          split = path.split('.'),
          json = {};

      if(options.hash[split[1]]){
        split[1] = options.hash[split[1]].path;
      }
      path = split.join('.');

      if(context.get(path)){
        context.get(path).set(model.changedAttributes());
      }

      // Set the properties on our element for visual referance
      json = component.toJSON();
      _.each(json, function(value, key){
        value = (_.isObject(value)) ? JSON.stringify(value) : value;
        element.setAttribute(key, value);
      });
    });

    // For each change to the original context, update our component
    component.listenTo(context, 'change', function(model){
      var path = model.__path(),
          split = path.split('.');

      if(!options.hash[split[1]]){
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

  var helper = lookupHelper(path, env),
      lazyValue;
  if (helper) {
    // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
    lazyValue = constructHelper((options || true), path, context, params, options, env, helper);
  } else {
    lazyValue = streamStaticProperty(context, path, (options || true), options);
  }

  return lazyValue;
};

// registerHelper is a publically available function to register a helper with HTMLBars
function registerHelper(key, callback, params){
  if(_.isArray(params)){
    callback.__params = params;
  }
  else if(_.isString(params)){
    callback.__params = [params];
  }
  helpers[key] = callback;
}

function registerPartial(name, func){
  if(_.isFunction(func) && typeof name === 'string'){
    partials[name] = func;
  }
}

export default {
  registerHelper: registerHelper,
  registerPartial: registerPartial,
  hooks: hooks,
  helpers: helpers,
  components: components
};
