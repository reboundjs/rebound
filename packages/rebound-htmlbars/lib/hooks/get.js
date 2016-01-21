// ### Get Hook

// The get hook streams a property at a named path from a given scope. It returns
// a `LazyValue` that other code can subscribe to and be alerted when values change.
import $ from "rebound-utils/rebound-utils";
import LazyValue from "rebound-htmlbars/lazy-value";

// Given a context and a path, create a LazyValue object that returns
// the value of object at path and add an observer to the context at path.
function streamProperty(context, path, env) {
  return new LazyValue(function() {
    return context.get(path, {isPath: true});
  }, {
    context: context,
    path: path
  }).addObserver(path, context, env);
}

export default function get(env, scope, path){
  var value = scope.self;

  // The special word `this` should referance empty string
  if(path === 'this'){ path = ''; }

  // Split the requested path string into its components
  var rest = $.splitPath(path),
      key = rest.shift();

  // If this path referances a block param, use that as the context instead.
  if(scope.localPresent[key]){
    value = scope.locals[key];
    path = rest.join('.');
  }

  // If this stream is cached, return the cached LazyValue
  var setPath = value.cid + ': ' + path;

  // Cache and return our new LazyValue
  return env.streams[setPath] || (env.streams[setPath] = streamProperty(value, path, env));
}
