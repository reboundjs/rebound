"use strict";
function partial(params, hash, options, env) {
  var template = env.partials[params[0]];
  return template.render(this, env, options.morph.contextualElement);
}

exports.partial = partial;exports["default"] = {
  partial: partial
};