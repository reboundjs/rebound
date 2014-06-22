import LazyValue from "rebound/lazy-value";

var hooks = this;

function streamifyArgs(context, params, options, helpers) {
  // Convert ID params to streams
  for (var i = 0, l = params.length; i < l; i++) {
    if (options.types[i] === 'id') {
      params[i] = helpers.STREAM_FOR(context, params[i]);
    }
  }

  // Convert hash ID values to streams
  var hash = options.hash,
      hashTypes = options.hashTypes;
  for (var key in hash) {
    if (hashTypes[key] === 'id') {
      hash[key] = helpers.STREAM_FOR(context, hash[key]);
    }
  }
}

function content(placeholder, path, context, params, options, helpers) {

  var lazyValue,
      helper = helpers.LOOKUP_HELPER(path);

  // TODO: just set escaped on the placeholder in HTMLBars
  placeholder.escaped = options.escaped;

  // If we were passed a helper, and it was found in our registered helpers
  if (helper) {

    // For each argument passed to our helper, turn them into LazyValues. Params array is now an array of lazy values that will trigger when their value changes.
    streamifyArgs(context, params, options, helpers);

    // Extend options with the helper's containeing Morph element, hooks and helpers for any subsequent calls from a lazyvalue
    options.placeholder = placeholder; // FIXME: this kinda sucks
    options.params = params; // FIXME: this kinda sucks
    options.hooks = hooks; // FIXME: this kinda sucks
    options.helpers = helpers; // FIXME: this kinda sucks

    // Create a lazy value that returns the value of our evaluated helper.
    lazyValue = new LazyValue(function() {
        var len = params.length,
            i,
            args = [];

        // Assemble our args variable. For each lazyvalue param, push the lazyValue's value to args so helpers can be written handlebars style with no concept of lazyvalues.
        for(i=0; i<len; i++){
            args.push(( (params[i].isLazyValue) ? params[i].value() : params[i] ));
        }

        // Then push our options on to the end. Options are always last.
        args.push(options);

        // Call our helper functions with our assembled args.
        return helper.apply(context, args);
      });

      // For each param passed to our helper, add it to our helper's dependant list. Helper will re-evaluate when one changes.
      params.forEach(function(node) {
        if (typeof node === 'string' || node.isLazyValue) {
          lazyValue.addDependentValue(node);
        }
      }) ;
  } else {
    // If not a helper, just subscribe to the value
    lazyValue = helpers.STREAM_FOR(context, path);
  }

  // If we have our lazy value, update our dom.
  // Placeholder is a morph element representing our dom node
  if (lazyValue) {
    lazyValue.onNotify(function(lazyValue) {
      placeholder.append(lazyValue.value());
    });

    placeholder.append(lazyValue.value()); // Used to be update...which is right?
  }
}

hooks.content = content;

// Handle placeholders in element tags
function element(element, path, context, params, options, helpers) {
  var helper = helpers.LOOKUP_HELPER(path);
  if (helper) {
    streamifyArgs(context, params, options, helpers);
    return helper(element, path, params, options, helpers);
  } else {
    return helpers.STREAM_FOR(context, path);
  }
}

hooks.element = element;


function subexpr(path, context, params, options, helpers) {
  var helper = helpers.LOOKUP_HELPER(path);
  if (helper) {
    streamifyArgs(context, params, options, helpers);
    return helper(params, options);
  } else {
    return helpers.STREAM_FOR(context, path);
  }
}

hooks.subexpr = subexpr;// TODO: Currently tied to `this`. Is that OK



// TODO: When htmlbars adds support for partials, write partials hook


export default hooks;
