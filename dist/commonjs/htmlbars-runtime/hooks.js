"use strict";
function block(env, morph, context, path, params, hash, template, inverse) {
  var options = {
    morph: morph,
    template: template,
    inverse: inverse
  };

  var helper = lookupHelper(env, context, path);
  var value = helper.call(context, params, hash, options, env);

  morph.update(value);
}

exports.block = block;function inline(env, morph, context, path, params, hash) {
  var helper = lookupHelper(env, context, path);
  var value = helper.call(context, params, hash, { morph: morph }, env);

  morph.update(value);
}

exports.inline = inline;function content(env, morph, context, path) {
  var helper = lookupHelper(env, context, path);

  var value;
  if (helper) {
    value = helper.call(context, [], {}, { morph: morph }, env);
  } else {
    value = get(env, context, path);
  }

  morph.update(value);
}

exports.content = content;function element(env, domElement, context, path, params, hash) {
  var helper = lookupHelper(env, context, path);
  if (helper) {
    helper.call(context, params, hash, { element: domElement }, env);
  }
}

exports.element = element;function attribute(env, domElement, name, value) {
  if (value === null) {
    domElement.removeAttribute(name);
  } else {
    domElement.setAttribute(name, value);
  }
}

exports.attribute = attribute;function subexpr(env, context, helperName, params, hash) {
  var helper = lookupHelper(env, context, helperName);
  if (helper) {
    return helper.call(context, params, hash, {}, env);
  } else {
    return get(env, context, helperName);
  }
}

exports.subexpr = subexpr;function get(env, context, path) {
  if (path === '') {
    return context;
  }

  var keys = path.split('.');
  var value = context;
  for (var i = 0; i < keys.length; i++) {
    if (value) {
      value = value[keys[i]];
    } else {
      break;
    }
  }
  return value;
}

exports.get = get;function set(env, context, name, value) {
  context[name] = value;
}

exports.set = set;function component(env, morph, context, tagName, attrs, template) {
  var helper = lookupHelper(env, context, tagName);

  var value;
  if (helper) {
    var options = {
      morph: morph,
      template: template
    };

    value = helper.call(context, [], attrs, options, env);
  } else {
    value = componentFallback(env, morph, context, tagName, attrs, template);
  }

  morph.update(value);
}

exports.component = component;function concat(env, params) {
  var value = "";
  for (var i = 0, l = params.length; i < l; i++) {
    value += params[i];
  }
  return value;
}

exports.concat = concat;function componentFallback(env, morph, context, tagName, attrs, template) {
  var element = env.dom.createElement(tagName);
  for (var name in attrs) {
    element.setAttribute(name, attrs[name]);
  }
  element.appendChild(template.render(context, env, morph.contextualElement));
  return element;
}

function lookupHelper(env, context, helperName) {
  return env.helpers[helperName];
}

exports["default"] = {
  content: content,
  block: block,
  inline: inline,
  component: component,
  element: element,
  attribute: attribute,
  subexpr: subexpr,
  concat: concat,
  get: get,
  set: set
};