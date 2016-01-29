// ### Concat Hook

// The `concat` hook creates a LazyValue for adjacent expressions so they may be
// used as a single data point in its parent expression. For example:
// ```
// <div class="{{foo}} active {{bar}}"></div>
// ```
// The div's attribute expression is passed a concat LazyValue that alerts its
// subscribers whenever any of its dynamic values change.

var CONCAT_CACHE = {};

import LazyValue from "rebound-htmlbars/lazy-value";

export default function concat(env, params){

  // If the concat expression only contains a single value, return it.
  if(params.length === 1){ return params[0]; }

  // Each concat LazyValue is unique to its inputs. Compute it's unique name.
  var name = "concat: ";
  _.each(params, function(param, index){
    name += `${((param && param.isLazyValue) ? param.cid : param )}`;
  });

  // Check the streams cache and return if this LazyValue has already been made
  if(CONCAT_CACHE[name]){ return CONCAT_CACHE[name]; }

  // Create a lazyvalue that returns the concatted values of all input params
  // Add it to the streams cache and return
  return CONCAT_CACHE[name] = new LazyValue(function(params) {
    return params.join('');
  }, {
    context: params[0].context,
    path: name,
    params: params
  });

}
