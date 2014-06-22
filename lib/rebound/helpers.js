import LazyValue from "rebound/lazy-value";

var helpers = this;

// Given a model and a path return the value
function get(model, path) {
  // var parts  = {},
  //     result = {};
  //
  // if (typeof path !== 'string') {
  //   parts = path[0];
  //   result = model[parts];
  // } else {
  //   parts = path.split('.');
  //   result = model[parts[0]];
  //
  //   for (var i = 1, l = parts.length; i < l; i++) {
  //     result = result[parts[i]];
  //   }
  // }
  // return result;

  // Get function now checks for collection, model or vanillajs object. Accesses appropreately.
  var parts  = {},
      result = {};

  // If just a straight up path, return at that path. Otherise, split the path at all '.', '[' and ']' and find the root value.
  if (typeof path !== 'string') {
    parts = path[0];
    result = (typeof model.at == 'function')? model.get(parts) : ((typeof model.get == 'function')? model.get(parts) : model[parts]);
  } else {
    parts = path.split(/(?:\.|\[|\])+/);
    result =  (typeof model.at == 'function')? model.get(parts[0]) : ((typeof model.get == 'function')? model.get(parts[0]) : model[parts]);

    for (var i = 1, l = parts.length; i < l; i++) {
      result = (typeof result.at == 'function')? result.at(parts[i]) : ((typeof result.get == 'function')? result.get(parts[i]) : result[parts[i]]);
    }
  }

  // A model can return a collection. Make sure when this happens, we get the collection's model array.
  return (typeof result.at == 'function') ? result.models : result;

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
function STREAM_FOR(context, path) {

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
helpers.STREAM_FOR = STREAM_FOR;



// LOOKUP_HELPER returns the given function from the helpers object
function LOOKUP_HELPER(name) {
  return helpers[name];
}
helpers.LOOKUP_HELPER = LOOKUP_HELPER;



// Attribute helper handles binding data to dom attributes
function attribute(element, name, params, options, helpers) {
  var builder = new LazyValue(function(values) {
        return values.join('');
      }),
      name = params.shift();

  params.forEach(function(node) {
    if (typeof node === 'string' || node.isLazyValue) {
      builder.addDependentValue(node);
    } else {
      var helperOptions = node[2];
      helperOptions.helpers = helpers;

      // TODO: support attributes returning more than streams
      var stream = helpers.RESOLVE_IN_ATTR(context, node[0], node[1], helperOptions);
      builder.addDependentValue(stream);
    }
  });

  builder.onNotify(function(lazyValue) {
    element.setAttribute(name, lazyValue.value());
  });

  element.setAttribute(name, builder.value());
}
helpers.attribute = attribute;


// registerHelper is a publically available function to register a helper with HTMLBars
function registerHelper(key, callback){
  helpers[key] = callback;
}
helpers.registerHelper = registerHelper;



// Publically Documented Helpers

function _concat(one, two){
  return one + ' ' + two;
}
helpers.concat = _concat;


function _if(value, options){
    return value ? options.render(this, options) : options.inverse(this, options)
}
helpers.if = _if;


function _unless(value, options){
    return value ? options.inverse(this, options) : options.render(this, options)
}
helpers.unless = _unless;


function _each(value, options){
if(!window.el)
    window.el = options.placeholder
    else
      window.el2 = options.placeholder

  // Remove elements at indicies passed to us in the collection's __removedIndex array
  if(_.isArray(value.__removedIndex) && value.__removedIndex.length){
    // For each removed indes, in decending order so we dont mess up the dom for later indicies, destroy its morph element
    _.each(_.sortBy(value.__removedIndex, function(num){return num;}).reverse(), function(index){
      options.placeholder.morphs[index].destroy();
    })
    // Leave our removed index array clean for the next call
    value.__removedIndex = [];
  }

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

  // No need to return anything. Our placeholder (containing element) now has all the dom we need.

}
helpers.each = _each;


function _with(value, options){

  // Render the content inside our block helper with the context of this object. Returns a dom tree.
  var dom = options.render(value, options);

  // TODO: Needs data binding?...

  // Insert our newly rendered value (a document tree) into our placeholder (the containing element) at its position (where we currently are in the rendering)
  options.placeholder.append(dom);

  // No need to return anything. Our placeholder (containing element) now has all the dom we need.

}
helpers.with = _with;


export default helpers;
