"use strict";

var _interopRequire = function (obj) {
  return obj && (obj["default"] || obj);
};

var DOMHelper = _interopRequire(require("morph/dom-helper"));

var hooks = _interopRequire(require("rebound-runtime/hooks"));

var helpers = _interopRequire(require("rebound-runtime/helpers"));

var env = {
  registerPartial: helpers.registerPartial,
  registerHelper: helpers.registerHelper,
  helpers: helpers.helpers,
  hooks: hooks
};

env.hydrate = function hydrate(spec, options) {
  // Return a wrapper function that will merge user provided helpers and hooks with our defaults
  return function (data, options) {
    // Ensure we have a well-formed object as var options
    var env = options || {},
        contextElement = data.el || document.documentElement;
    env.helpers = env.helpers || {};
    env.hooks = env.hooks || {};
    env.dom = env.dom || new DOMHelper();

    // Merge our default helpers and hooks with user provided helpers
    env.helpers = _.defaults(env.helpers, helpers.helpers);
    env.hooks = _.defaults(env.hooks, hooks);

    // Call our func with merged helpers and hooks
    return spec.render(data, env, contextElement);
  };
};

module.exports = env;