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
    name += ` ${key}=${(hash && hash.isLazyValue) ? hash.cid : hash}`;
  });

  // Check the stream cache for this LazyValue, update value and return it if it exists.
  // Context is only passed for block helpers. Never use the streams cache for block helpers.
  // if(env.streams[name] && !context){ env.streams[name].value; return env.streams[name]; }

  // Create a LazyValue that returns the value of our evaluated helper.
  var lazyValue = new LazyValue(function(){
    var plainParams = [],
        plainHash = {};

    // Assemble our args and hash variables for the helper. For each LazyValue
    // param or hash, insert the evaluated value so helpers don't need to have any
    // concept of lazyvalues.
    _.each(params, function(param, index){
      plainParams[index] = (param && param.isLazyValue) ? param.value : param;
    });
    _.each(hash, function(hash, key){
      plainHash[key] = (hash && hash.isLazyValue) ? hash.value : hash;
    });

    // Call our helper function with our assembled args.
    return helper.call((context || {}), plainParams, plainHash, templates, env);

  }, { path: name });

  // For each param or hash value passed to our helper's LazyValue, add it to the
  // dependant list. The helper's LazyValue will re-evaluate when one changes.
  _.each(params, function(param, index){
    lazyValue.addDependentValue(param);
  });
  _.each(hash, function(hash, key){
    lazyValue.addDependentValue(hash[key]);
  })

  // Save the stream and return the new LazyValue
  lazyValue.value;
  return env.streams[name] = lazyValue;
};