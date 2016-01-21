import $ from "rebound-utils/rebound-utils";
import loader from "rebound-router/loader";

var PARTIALS = {};

export function registerPartial(name, template){
  if(template && _.isString(name)){

    // If this partial has a callback list associated with its name, call all of
    // the callbacks before registering the partial.
    if(Array.isArray(PARTIALS[name])){
      PARTIALS[name].forEach(function(cb) { cb(template); });
    }

    // Save the partial template in our cache and return it
    loader.register('/'+name+'.js');
    return PARTIALS[name] = template;
  }
}

export default function partial(renderNode, env, scope, path){

  // If no path is passed, yell
  if(!path){ console.error('Partial hook must be passed path!'); }

  // Resolve the value of path
  path = path.isLazyValue ? path.value : path;

  // Create a child environment for the partial
  env = this.createChildEnv(env);

  var render = this.buildRenderResult;

  // If a partial is registered with this path name, render it
  if(PARTIALS[path] && !Array.isArray(PARTIALS[path])){
    return render(PARTIALS[path], env, scope, { contextualElement: renderNode}).fragment;
  }

  // If this partial is not yet registered, add it to a callback list to be called
  // when registered. When registered, replace the dummy node we created with the
  // rendered partial template.
  var node = document.createTextNode('');
  PARTIALS[path] || (PARTIALS[path] = []);
  PARTIALS[path].push(function partialCallback(template){
    if(!node.parentNode){ return void 0; }
    (node.parentNode).replaceChild(render(template, env, scope, { contextualElement: renderNode}).fragment, node);
  });
  return node;
}
