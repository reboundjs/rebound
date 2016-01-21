import $ from "rebound-utils/rebound-utils";
import _hooks from "rebound-htmlbars/hooks";

var RENDER_TIMEOUT;
var TO_RENDER = [];
var ENV_QUEUE = [];


// A convenience method to push only unique eleents in an array of objects to
// the TO_RENDER queue. If the element is a Lazy Value, it marks it as dirty in
// the process
var push = function(arr){
  var i, len = arr.length;
  this.added || (this.added = {});
  for(i=0;i<len;i++){
    if(this.added[arr[i].cid]){ continue; }
    this.added[arr[i].cid] = 1;
    if(arr[i].isLazyValue){ arr[i].makeDirty(); }
    this.push(arr[i]);
  }
};

// Called on animation frame. TO_RENDER is a list of lazy-values to notify.
// When notified, they mark themselves as dirty. Then, call revalidate on all
// dirty expressions for each environment we need to re-render. Use `while(queue.length)`
// to accomodate synchronous renders where the render queue callbacks may trigger
// nested calls of `renderCallback`.
function renderCallback(){
  console.log('~~~~~ NOTIFYING ~~~~~')

  while(TO_RENDER.length){
    var a = TO_RENDER.shift();
    console.log(a.cid, a.path, a.cache)
    a.notify();
  }
  console.log('~~~~~ NOTIFIED ~~~~~')

  TO_RENDER.added = {};

  while(ENV_QUEUE.length){
    let env = ENV_QUEUE.shift();
    for(let key in env.revalidateQueue){
      env.revalidateQueue[key].revalidate();
    }
  }
  ENV_QUEUE.added = {};
}

// TODO: This will be a hair faster if we have a callback for each event we care about
 function onChange(type, model={}, collection={}, options={}){
   var data, changed;

  // If we don't care about this type of event, short circuit
  var shortcircuit = { sort: 1, request: 1, destroy: 1, sync: 1, error: 1, invalid: 1, route: 1, dirty: 1 };
  if( shortcircuit[type] || !!~type.indexOf('change:')){ return void 0; }

  // If the third value is not a data object, then it is the options hash
  !collection.isData && (options = collection) && (collection = model);

  // This can be called for any type of modification event. Normalize the data coming
  // in depending on the type of change.
  if((type === 'reset' && options.previousAttributes) || type === 'change'){
    data = model;
    changed = model.changedAttributes();
  }
  else if(type === 'add' || type === 'remove' || type === 'update' || (type === 'reset' && options.previousModels)){
    data = collection;
    changed = {
      '@each': data
    };
  }

  // If nothing has changed, exit.
  if(!data || !changed){ return void 0; }

  var basePath = data.__path();

  // If this event came from within a service, include the service key in the base path
  if(options.service){ basePath = options.service + '.' + basePath; }

  // For each changed key, walk down the data tree from the root to the data
  // element that triggered the event and add all relevent callbacks to this
  // object's TO_RENDER queue.
  var context = this,
      parts = $.splitPath(basePath);

  do {
    let key, obsPath, path, observers;
console.log(type, basePath, context.__path(), parts, changed, (basePath + (basePath && '.') + 'KEY').replace(context.__path(), '').replace(/\[[^\]]+\]/g, ".@each").replace(/^\./, ''))
    for(key in changed){
      path = (basePath + (basePath && key && '.') + key).replace(context.__path(), '').replace(/\[[^\]]+\]/g, ".@each").replace(/^\./, '');
      for(obsPath in context.__observers){
        observers = context.__observers[obsPath];
        if($.startsWith(obsPath, path)){
          // If this is a collection event, trigger everything, otherwise only trigger property change callbacks
          if(_.isArray(changed[key]) || data.isCollection){ push.call(TO_RENDER, observers.collection); }
          push.call(TO_RENDER, observers.model);
          push.call(ENV_QUEUE, [this.env]);
        }
      }
    }
  } while(context !== data && (context = context.get(parts.shift(), {isPath: true})));
console.log('--------------------')
  // If Rebound is loaded in a testing environment, call renderCallback syncronously
  // so that changes to the data reflect in the DOM immediately.
  if(window.Rebound && window.Rebound.testing){ return renderCallback(); }

  // Otherwise, queue our render callback to be called on the next animation frame,
  // after the current call stack has been exhausted.
  window.cancelAnimationFrame(RENDER_TIMEOUT);
  RENDER_TIMEOUT = window.requestAnimationFrame(renderCallback);
}


// A render function that will merge user provided helpers and hooks with our defaults
// and bind a method that re-renders dirty expressions on data change and executes
// other delegated listeners added by our hooks.
export default function render(template, data, options={}){

  // Fix for stupid Babel module importer
  // TODO: Fix this. This is dumb. Modules don't resolve in by time of this file's
  // execution because of the dependancy tree so babel doesn't get a chance to
  // interop the default value of these imports. We need to do this at runtime instead.
  var hooks = _hooks.default || _hooks;

  // If no data is passed to render, exit with an error
  if(!data){ return console.error('No data passed to render function.'); }

  // Create a fresh scope if it doesn't exist
  var scope = scope || hooks.createFreshScope();

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
  // If there is no template, just return an empty fragment
  return env.template = template ? hooks.buildRenderResult(template, env, scope, options) : { fragment: document.createDocumentFragment() };
}
