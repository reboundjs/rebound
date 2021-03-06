// Rebound Hooks
// ----------------
// Here we augment HTMLBars' default hooks to make use of Rebound's evented data
// objects for automatic databinding.

import $ from "rebound-utils/rebound-utils";
import hooks from "htmlbars-runtime/hooks";
import { default as _render } from "htmlbars-runtime/render";

// __Environment Hooks__ create and modify the template environment objects
import createFreshEnv from "rebound-htmlbars/hooks/createFreshEnv";
import createChildEnv from "rebound-htmlbars/hooks/createChildEnv";
hooks.createFreshEnv = createFreshEnv;
hooks.createChildEnv = createChildEnv;


// __Scope Hooks__ create, access and modify the template scope and data objects
import createFreshScope from "rebound-htmlbars/hooks/createFreshScope";
import createChildScope from "rebound-htmlbars/hooks/createChildScope";
import bindScope from "rebound-htmlbars/hooks/bindScope";
hooks.createFreshScope = createFreshScope;
hooks.createChildScope = createChildScope;
hooks.bindScope = bindScope;


// __Lifecycle Hooks__ construct, deconstruct and clean up render nodes over their lifecycles
import linkRenderNode from "rebound-htmlbars/hooks/linkRenderNode";
import cleanupRenderNode from "rebound-htmlbars/hooks/cleanupRenderNode";
import destroyRenderNode from "rebound-htmlbars/hooks/destroyRenderNode";
import willCleanupTree from "rebound-htmlbars/hooks/willCleanupTree";
import didCleanupTree from "rebound-htmlbars/hooks/didCleanupTree";
hooks.linkRenderNode = linkRenderNode;
hooks.willCleanupTree = willCleanupTree;
hooks.cleanupRenderNode = cleanupRenderNode;
hooks.destroyRenderNode = cleanupRenderNode;
hooks.didCleanupTree = didCleanupTree;


// __Streaming Hooks__ create streams via LazyValues for data values, helpers, subexpressions and concat groups
import get from "rebound-htmlbars/hooks/get";
import getValue from "rebound-htmlbars/hooks/getValue";
import invokeHelper from "rebound-htmlbars/hooks/invokeHelper";
import subexpr from "rebound-htmlbars/hooks/subexpr";
import concat from "rebound-htmlbars/hooks/concat";
hooks.get = get;
hooks.getValue = getValue;
hooks.invokeHelper = invokeHelper;
hooks.subexpr = subexpr;
hooks.concat = concat;


// __Render Hooks__ interact with the DOM to output content and bind to form elements for two way databinding
import content from "rebound-htmlbars/hooks/content";
import attribute from "rebound-htmlbars/hooks/attribute";
import partial, { registerPartial } from "rebound-htmlbars/hooks/partial";
import component from "rebound-htmlbars/hooks/component";
hooks.content = content;
hooks.attribute = attribute;
hooks.partial = partial;
hooks.registerPartial = registerPartial;
hooks.component = component;


// __Helper Hooks__ manage the environment's registered helpers
import { hasHelper, lookupHelper, registerHelper } from "rebound-htmlbars/helpers";
hooks.hasHelper = hasHelper;
hooks.lookupHelper = lookupHelper;
hooks.registerHelper = registerHelper;


// Bind local binds a local variable to the scope object and tracks the scope
// level at which that local was added. See `createChildScope` for description
// of scope levels
hooks.bindLocal = function bindLocal(env, scope, name, value){
  scope.localPresent[name] = scope.level;
  scope.locals[name] = value;
};


// __buildRenderResult__ is a wrapper for the native HTMLBars render function. It
// ensures every template is rendered with its own child environment, every environment
// saves a referance to its unique render result for re-renders, and every render
// result has a unique id.
hooks.buildRenderResult = function buildRenderResult(template, env, scope, options){
  var render = _render.default || _render; // Fix for stupid Babel imports
  env = hooks.createChildEnv(env);
  env.template = render(template, env, scope, options);
  env.template.uid = $.uniqueId('template');
  return env.template;
};

export default hooks;
