// ### Link-Render-Node Hook

// Called on first creation of any expressions that interact directly with the DOM.
// Whenever it is notified of any changes to it's dependant values, mark the node
// as dirty and add it to the environment's revalidation queue to be rerendered
// during the next animation frame.
export default function linkRenderNode(renderNode, env, scope, path, params, hash){

  function rerender(path, node, lazyValue, env){
    lazyValue.onNotify(function(){
      node.isDirty = true;
      env.template && (env.revalidateQueue[env.template.uid] = env.template);
    });
  }

  // Save the path on our render node for easier debugging
  renderNode.path = path;

  // For every parameter or hash value passed to this render node, if it is a data
  // stream, subscribe to notifications from it and when notified of a change,
  // mark the node as dirty and queue it up for revalidation.
  if (params && params.length) {
    for (var i = 0; i < params.length; i++) {
      if(params[i].isLazyValue){
        rerender(path, renderNode, params[i], env);
      }
    }
  }
  if (hash) {
    for (var key in hash) {
      if(hash.hasOwnProperty(key) && hash[key].isLazyValue){
        rerender(path, renderNode, hash[key], env);
      }
    }
  }
  return 1;
}
