import $ from "rebound-runtime/utils";
import { Model } from "rebound-data/rebound-data";

// New Rebound Context
var Context = Model.extend({

  listen: function(){
    // Listen to relevent data change events
    _.bindAll(this, '_onChange', '_notifySubtree')
    this._toRender = {};
    this.listenTo(this, 'all', this._onChange);
  },

  _onChange: function(type, model, collection, options){
    var shortcircuit = { change: 1, sort: 1, request: 1, destroy: 1, sync: 1, error: 1, invalid: 1, route: 1, dirty: 1 };
    if( shortcircuit[type] ) return;

    var data, index, changed;
    model || (model = {});
    collection || (collection = {});
    options || (options = {});
    !collection.isData && (options = collection) && (collection = model);

    if( (type === 'reset' && options.previousAttributes) || type.indexOf('change:') !== -1){
      data = model;
      changed = model.changedAttributes();
    }
    else if(type === 'add' || type === 'remove' || (type === 'reset' && options.previousModels)){
      data = collection;
      changed = {};
      changed[data.__path()] = data;
    }

    if(!data) return;

    index = data.__path();

    if(changed){
      this._toRender[index] || (this._toRender[index] = {});
      changed = _.defaults(changed, this._toRender[index].changed);
      this._toRender[index] = {data: data, changed: changed};
      if(!this._renderTimeout) this._renderTimeout = window.setTimeout(this._notifySubtree, 0);
    }
  },


  _notifySubtree: function _notifySubtree(){
    delete this._renderTimeout;

    _.each(this._toRender, function(actor, path){
      var context = this, // This root context
          obj = actor.data,
          changed = actor.changed,
          type = actor.data.isCollection ? 'collection' : 'model';
      var path = obj.__path(), // The path of the modified object relative to the root context
      parts = $.splitPath(path), // Array of parts of the modified object's path: test[1].whatever -> ['test', '1', 'whatever']
      keys = _.keys(changed), // Array of all changed keys
      key,
      i = 0,
      len = parts.length,
      paths,
      triggers;


      // Call notify on every object down the data tree starting at the root and all the way down element that triggered the change
      for(i;i<=len;i++){

        // Reset paths for each data layer
        paths = [];
        triggers = [];

        // For every key changed
        // Constructs paths variable relative to current data element
        for(key in keys){
          paths.push(((path && path + '.' || '') + keys[key]).replace(context.__path(), '').replace(/\[[^\]]+\]/g, ".@each").replace(/^\./, ''));
        }

        paths = _.uniq(paths);

        // Call all listeners
        this.notify(context, paths, type);

        // If not at end of path parts, get the next data object
        context = (i === len) || (context.isModel && context.get(parts[i])) || (context.isCollection && context.at(parts[i]));
        if(context === undefined){
          break;
        }
      }

      delete this._toRender[path];

    }, this);
  },
  notify: function notify(obj, paths, type) {

    // If path is not an array of keys, wrap it in array
    paths = (!_.isArray(paths)) ? [paths] : paths;

    // For each path, alert each observer and call its callback
    _.each(paths, function(path){
      _.each(obj.__observers, function(observers, obsPath){
        // Trigger all partial or exact observer matches
        if(obsPath === path || obsPath.indexOf(path + '.') === 0 || path.indexOf(obsPath + '.') === 0){
          _.each(observers, function(callback, index) {
            // If this is a collection change (add, sort, remove) trigger everything, otherwise only trigger property change callbacks
            if(_.isFunction(callback) && (callback.type !== 'collection' || type === 'collection')){
              callback();
            }
          });
        }
      });
    });
  }
});

export default Context;