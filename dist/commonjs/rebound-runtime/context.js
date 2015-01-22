"use strict";
var $ = require("rebound-runtime/utils")["default"];
var Model = require("rebound-data/rebound-data").Model;

// New Rebound Context
var Context = Model.extend({

  listen: function(){
    // Listen to relevent data change events
    this.listenTo(this, 'change', this._onModelChange);
    this.listenTo(this, 'add remove', this._onCollectionChange);
    this.listenTo(this, 'reset', this._onReset);
  },

  _onReset: function(data, options){
    if(data && data.isModel){
      return this._onModelChange(data, options);
    }
    else if(data.isCollection){
      return this._onCollectionChange(data, options);
    }
  },

  _onModelChange: function(model, options){
    var changed = model.changedAttributes();
    if(changed) this._notifySubtree(model, changed, 'model');
  },

  _onCollectionChange: function(model, collection, options){
    var changed = {},
    that = this;
    if(model.isCollection){
      options = collection;
      collection = model;
    }
    changed[collection.__path()] = collection;
    if(collection._timeout){
      clearTimeout(collection._timeout);
      collection._timeout = undefined;
    }
    collection._timeout = setTimeout(function(){
      that._notifySubtree(that, changed, 'collection');
    }, 20);
  },

  _notifySubtree: function _notifySubtree(obj, changed, type){

    var context = this, // This root context
    path = obj.__path(), // The path of the modified object relative to the root context
    parts = $.splitPath(path), // Array of parts of the modified object's path: test[1].whatever -> ['test', '1', 'whatever']
    keys = _.keys(changed), // Array of all changed keys
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
      _.each(keys, function(attr){

        // Constructs paths variable relative to current data element
        paths.push(((path && path + '.' || '') + attr).replace(context.__path(), '').replace(/\[([^\]]+)\]/g, ".$1").replace(/^\./, ''));
        paths.push(((path && path + '.' || '') + attr).replace(context.__path(), '').replace(/\[[^\]]+\]/g, ".@each").replace(/^\./, ''));
        paths = _.uniq(paths);
      });

      // Call all listeners
      this.notify(context, paths, type);

      // If not at end of path parts, get the next data object
      context = (i === len) || (context.isModel && context.get(parts[i])) || (context.isCollection && context.at(parts[i]));
      if(context === undefined){
        break;
      }
    }
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

exports["default"] = Context;