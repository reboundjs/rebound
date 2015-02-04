import $ from "rebound-runtime/utils";
import { Model } from "rebound-data/rebound-data";


// Returns true if str starts with test
function startsWith(str, test){
  if(str === test) return true;
  return str.substring(0, test.length+1) === test+'.';
}

function renderCallback(){
  var i = 0, len = this._toRender.length;
  delete this._renderTimeout;
  for(i=0;i<len;i++){
    this._toRender.shift().call();
  }
}

// New Rebound Context
var Context = Model.extend({

  listen: function(){
    // Listen to relevent data change events
    this.listenTo(this, 'all', this._onChange);
  },

  _onChange: function(type, model, collection, options){
    var shortcircuit = { change: 1, sort: 1, request: 1, destroy: 1, sync: 1, error: 1, invalid: 1, route: 1, dirty: 1 };
    if( shortcircuit[type] ) return;

    var data, changed;
    model || (model = {});
    collection || (collection = {});
    options || (options = {});
    !collection.isData && (options = collection) && (collection = model);
    this._toRender || (this._toRender = []);

    if( (type === 'reset' && options.previousAttributes) || type.indexOf('change:') !== -1){
      data = model;
      changed = model.changedAttributes();
    }
    else if(type === 'add' || type === 'remove' || (type === 'reset' && options.previousModels)){
      data = collection;
      changed = {};
      changed[data.__path()] = data;
    }

    if(!data || !changed) return;

    var push = Array.prototype.push;
    var context = this;
    var basePath = data.__path();
    var parts = $.splitPath(basePath);
    var key, obsPath, path, observers;

    // For each changed key, walk down the data tree from the root to the data
    // element that triggered the event and add all relevent callbacks to this
    // object's _toRender queue.
    do{
      for(key in changed){
        path = (basePath + (basePath && '.') + key).replace(context.__path(), '').replace(/\[[^\]]+\]/g, ".@each").replace(/^\./, '');
        for(obsPath in context.__observers){
          observers = context.__observers[obsPath];
          if(startsWith(obsPath, path) || startsWith(path, obsPath)){
            // If this is a collection event, trigger everything, otherwise only trigger property change callbacks
            if(data.isCollection) push.apply(this._toRender, observers.collection);
            push.apply(this._toRender, observers.model);
          }
        }
      }
    } while(context !== data && (context = context.get(parts.shift())))

    // Queue our render callback to be called after the current call stack has been exhausted
    window.clearTimeout(this._renderTimeout);
    this._renderTimeout = window.setTimeout(_.bind(renderCallback, this), 0);
  }
});

export default Context;