import $ from "rebound-utils/rebound-utils";
import { default as _render } from "htmlbars-runtime/render";
import onChange from "rebound-htmlbars/render";
import hooks from "rebound-htmlbars/hooks";

var render = _render.default || _render; // Fix for stupid Babel imports

const DUMMY_RENDER_RESULT = {
  fragment: new DocumentFragment(),
  revalidate: function(){}
}

// Return a wrapper function that will merge user provided helpers and hooks with our defaults
export function wrapPartial(template = { isPlaceholder: true }){
  template.reboundTemplate = true;
  template.uid = $.uniqueId('template');
  template.render = function(scope, options={}){ // jshint ignore:line
    var env = hooks.createChildEnv(options.env || hooks.createFreshEnv());

    // Ensure we have a contextual element to pass to render
    options.contextualElement || (options.contextualElement = document.body);

    // Call our func with merged helpers and hooks
    env.template = template.isPlaceholder ? { fragment: new DocumentFragment() } : render(template, env, scope, options);

    return env.template;
  }
  return template;
}

// A wrapper function that will merge user provided helpers and hooks with our defaults
// and bind a method that re-renders dirty expressions on data change
export function wrapComponent(template = { isPlaceholder: true }){
  template.reboundTemplate = true;
  template.uid = $.uniqueId('template');
  template.render = function(data, options={}){

    // If no data is passed to render, exit with an error
    if(!data){ return console.error('No data passed to render function.'); }

    // Create a fresh scope if it doesn't exist
    var scope = hooks.createFreshScope();

    // Every component's template is rendered using a unique environment
    var env = hooks.createChildEnv(options.env || hooks.createFreshEnv());
    _.extend(env.helpers, options.helpers);
    data.env = env;
    env.root = data;

    // Ensure we have a contextual element to pass to render
    options.contextualElement || (options.contextualElement = (data.el || document.body));
    options.self = data;

    // If data is an eventable object, run the onChange helper on any change
    if(data.listenTo){
      data.stopListening(data, 'all', onChange);
      data.listenTo(data, 'all', onChange);
    }

    // If this is a real template, run it with our merged helpers and hooks
    return env.template = template.isPlaceholder ? DUMMY_RENDER_RESULT : render(template, env, scope, options);
  };
  return template;
};
