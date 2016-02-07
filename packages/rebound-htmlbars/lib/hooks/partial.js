import $ from "rebound-utils/rebound-utils";
import loader from "rebound-router/loader";
import LazyValue from "rebound-htmlbars/lazy-value";

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
  if(!path){ console.error('Partial helper must be passed a path!'); }

  // Resolve our path value
  path = path.isLazyValue ? path.value : path;

  // Create new child scope for partial
  scope = this.createChildScope(scope);

  var render = this.buildRenderResult;

  // Because of how htmlbars works with re-renders, we need a contextual element
  // for our partial that will not disappear on it when lazy partials are loaded.
  // We use a `<rebound-partial>` element for this.
  var node = document.createElement('rebound-partial');
  node.setAttribute('path', path);

  // If a partial is registered with this path name, render it
  if(PARTIALS[path] && !Array.isArray(PARTIALS[path])){
    node.appendChild(render(PARTIALS[path], env, scope, { contextualElement: renderNode}).fragment);
  }

  // If this partial is not yet registered, add it to a callback list to be called
  // when registered. When registered, replace the dummy node we created with the
  // rendered partial template.
  else{
    PARTIALS[path] || (PARTIALS[path] = []);
    PARTIALS[path].push(function partialCallback(template){
      node.appendChild(render(template, env, scope, { contextualElement: renderNode}).fragment, node);
    });
  }

  return node;

}
