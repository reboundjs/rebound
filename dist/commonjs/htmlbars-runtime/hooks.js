"use strict";
var merge = require("./utils").merge;
var SafeString = require("../handlebars/safe-string")["default"];

function content(morph, helperName, context, params, options, env) {
  var value, helper = this.lookupHelper(helperName, context, options);
  if (helper) {
    value = helper(context, params, options, env);
  } else {
    value = this.simple(context, helperName, options);
  }
  if (!options.escaped) {
    value = new SafeString(value);
  }
  morph.update(value);
}

exports.content = content;function webComponent(morph, tagName, context, options, env) {
  var value, helper = this.lookupHelper(tagName, context, options);
  if (helper) {
    value = helper(context, null, options, env);
  } else {
    value = this.webComponentFallback(morph, tagName, context, options, env);
  }
  morph.update(value);
}

exports.webComponent = webComponent;function webComponentFallback(morph, tagName, context, options, env) {
  var element = env.dom.createElement(tagName);
  var hash = options.hash, hashTypes = options.hashTypes;

  for (var name in hash) {
    if (hashTypes[name] === 'id') {
      element.setAttribute(name, this.simple(context, hash[name], options));
    } else {
      element.setAttribute(name, hash[name]);
    }
  }
  element.appendChild(options.render(context, env));
  return element;
}

exports.webComponentFallback = webComponentFallback;function element(domElement, helperName, context, params, options) {
  var helper = this.lookupHelper(helperName, context, options);
  if (helper) {
    options.element = domElement;
    helper(context, params, options);
  }
}

exports.element = element;function attribute(context, params, options) {
  options.element.setAttribute(params[0], params[1]);
}

exports.attribute = attribute;function concat(context, params, options) {
  var value = "";
  for (var i = 0, l = params.length; i < l; i++) {
    if (options.types[i] === 'id') {
      value += this.simple(context, params[i], options);
    } else {
      value += params[i];
    }
  }
  return value;
}

exports.concat = concat;function subexpr(helperName, context, params, options) {
  var helper = this.lookupHelper(helperName, context, options);
  if (helper) {
    return helper(context, params, options);
  } else {
    return this.simple(context, helperName, options);
  }
}

exports.subexpr = subexpr;function lookupHelper(helperName, context, options) {
  if (helperName === 'attribute') {
    return this.attribute;
  } else if (helperName === 'concat') {
    return this.concat;
  }
}

exports.lookupHelper = lookupHelper;function simple(context, name, options) {
  return context[name];
}

exports.simple = simple;function hydrationHooks(extensions) {
  var base = {
    content: content,
    webComponent: webComponent,
    webComponentFallback: webComponentFallback,
    element: element,
    attribute: attribute,
    concat: concat,
    subexpr: subexpr,
    lookupHelper: lookupHelper,
    simple: simple
  };

  return extensions ? merge(extensions, base) : base;
}

exports.hydrationHooks = hydrationHooks;