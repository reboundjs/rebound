// Rebound Hooks
// ----------------
// Here we augment HTMLBars' default hooks to make use of Rebound's evented data
// objects for automatic databinding.

import hooks from "htmlbars-runtime/hooks";

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


export default hooks;
