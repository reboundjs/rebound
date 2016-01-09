import $ from "rebound-utils/rebound-utils";

var RENDER_TIMEOUT;
var TO_RENDER = [];
var ENV_QUEUE = [];

// Called on animation frame. TO_RENDER is a list of lazy-values to notify.
// When notified, they mark themselves as dirty. Then, call revalidate on all
// dirty expressions for each environment we need to re-render. Use `while(queue.length)`
// to accomodate synchronous renders where the render queue callbacks may trigger
// nested calls of `renderCallback`.
function renderCallback(){
  while(TO_RENDER.length){
    TO_RENDER.shift().notify();
  }
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
export default function onChange(type, model, collection, options){

  // If we don't care about this type of event, short circuit
  var shortcircuit = { change: 1, sort: 1, request: 1, destroy: 1, sync: 1, error: 1, invalid: 1, route: 1, dirty: 1 };
  if( shortcircuit[type] ){ return void 0; }

  var data, changed;
  model || (model = {});
  collection || (collection = {});
  options || (options = {});
  !collection.isData && (type.indexOf('change:') === -1) && (options = collection) && (collection = model);

  // This can be called for any type of modification event. Normalize the data coming
  // in depending on the type of change.
  if( (type === 'reset' && options.previousAttributes) || type.indexOf('change:') !== -1){
    data = model;
    changed = model.changedAttributes();
  }
  else if(type === 'add' || type === 'remove' || type === 'update' || (type === 'reset' && options.previousModels)){
    data = collection;
    changed = {
      '@each': data
    };
  }
  console.log( type, data.__path(), changed)

  // If nothing has changed, exit.
  if(!data || !changed){ return void 0; }

  // A convenience method to push only unique eleents in an array of objects to
  // the TO_RENDER queue.
  var push = function(arr){
    var i, len = arr.length;
    this.added || (this.added = {});
    for(i=0;i<len;i++){
      if(this.added[arr[i].cid]){ continue; }
      this.added[arr[i].cid] = 1;
      this.push(arr[i]);
    }
  };

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

  // If Rebound is loaded in a testing environment, call renderCallback syncronously
  // so that changes to the data reflect in the DOM immediately.
  if(window.Rebound && window.Rebound.testing){ return renderCallback(); }

  // Otherwise, queue our render callback to be called on the next animation frame,
  // after the current call stack has been exhausted.
  window.cancelAnimationFrame(RENDER_TIMEOUT);
  RENDER_TIMEOUT = window.requestAnimationFrame(renderCallback);
}
