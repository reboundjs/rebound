// ### Invoke-Helper Hook

// The `invokeHelper` hook streams a the result of a helper function. It returns
// a `LazyValue` that other code can subscribe to and be alerted when values change.
import $ from "rebound-utils/rebound-utils";
import LazyValue from "rebound-htmlbars/lazy-value";

export default function invokeHelper(morph, env, scope, visitor, params, hash, helper, templates, context){

  // If this is not a valid helper, log an error and return an empty string value.
  if(!_.isFunction(helper)){
    console.error('Invalid helper!', helper);
    return {value: ''};
  }

  // Each helper LazyValue is unique to its inputs. Compute it's unique name.
  var name = `${helper.name}:`;
  _.each(params, function(param, index){
    name += ` ${(param && param.isLazyValue) ? param.cid : param}`;
  });
  _.each(hash, function(hash, key){
    name += ` ${key}=${hash.cid}`;
  });

  // Check the stream cache for this LazyValue, return it if it exists.
  if(scope.streams[name]){ return scope.streams[name]; }

  // Create a LazyValue that returns the value of our evaluated helper.
  var lazyValue = new LazyValue(function(params, hash){
    return helper.call((context || {}), params, hash, templates, env);
  }, {
    path: name,
    params: params,
    hash: hash
  });

  // If this is not a block or element helper, cache the new lazyValue.
  // Only block helpers will have a context set passed. Non-element helpers will
  // have the morph set. Block and morph helpers have re-rendered dom that must
  // be fresh in the LazyValue's closure each run.
  if(!context && morph){ scope.streams[name] = lazyValue; }

  // Seed the cache and return the new LazyValue
  lazyValue.value;
  return lazyValue;
}
