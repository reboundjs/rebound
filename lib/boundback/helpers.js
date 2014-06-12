import LazyValue from "boundback/lazy-value";

var helpers = this;

// Given a model and a path return the value
function get(model, path) {
  var parts  = {},
      result = {};

  if (typeof path !== 'string') {
    parts = path[0];
    result = model[parts];
  } else {
    parts = path.split('.');
    result = model[parts[0]];

    for (var i = 1, l = parts.length; i < l; i++) {
      result = result[parts[i]];
    }
  }
  return result;
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
  console.log('REGISTER HELPER: ', key, helpers)
}

helpers.registerHelper = registerHelper;

export default helpers;
