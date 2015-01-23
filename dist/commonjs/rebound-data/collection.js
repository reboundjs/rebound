"use strict";
var Model = require("rebound-data/model")["default"];
var $ = require("rebound-runtime/utils")["default"];

// If Rebound Runtime has already been run, throw error
if(Rebound.Collection){
  throw 'Rebound Collection is already loaded on the page!';
}
// If Backbone hasn't been started yet, throw error
if(!window.Backbone){
  throw "Backbone must be on the page for Rebound to load.";
}

function pathGenerator(collection){
  return function(){
    return collection.__path() + '[' + collection.indexOf(this) + ']';
  };
}

function linkedModels(original){
  return function(model, options){
    if(model.collection === undefined){
      return model.deinitialize();
    }
    if(original.collection === undefined){
      return original.deinitialize();
    }
    if(original.collection === model.collection){
      return;
    }

    if(!original.synced[model._cid]){
      model.synced[original._cid] = true;
      original.set(model.changedAttributes(), options);
      model.synced[original._cid] = false;
    }
  };
}

var Collection = Backbone.Collection.extend({

  isCollection: true,
  isData: true,

  model: this.model || Model,

  __path: function(){return '';},

  constructor: function(models, options){
    options = options || {};
    this.__observers = {};
    this.helpers = {};

    this.setParent( options.parent || this );
    this.setRoot( options.root || this );
    this.__path = options.path || this.__path;

    Backbone.Collection.apply( this, arguments );

    this.on('remove', function(model, collection, options){
      model.deinitialize();
    });

  },

  get: function(key, options){

    // If the key is a number or object, default to backbone's collection get
    if(typeof key == 'number' || typeof key == 'object'){
      return Backbone.Collection.prototype.get.call(this, key);
    }

    // If key is not a string, return undefined
    if (!_.isString(key)){ return void 0; }

    // Split the path at all '.', '[' and ']' and find the value referanced.
    var parts  = $.splitPath(key),
        result = this,
        l=parts.length,
        i=0;
        options = _.defaults((options || {}), { parent: 0, raw: false });

    if(_.isUndefined(key) || _.isNull(key)){ return key; }

    if(key === '' || parts.length === 0){ return result; }

    if (parts.length > 0) {
      for ( i = 0; i < l - options.parent; i++) {

        if( result && result.isComputedProperty ){
          // If returning raw, always return the first computed property in a chian.
          if(options.raw){ return result; }
            result = result.value();
        }

        if(_.isUndefined(result) || _.isNull(result)){
          return result;
        }

        if(parts[i] === '@parent'){
          result = result.__parent__;
        }
        else if( result.isCollection ){
          result = result.models[parts[i]];
        }
        else if( result.isModel ){
          result = result.attributes[parts[i]];
        }
        else if( result && result.hasOwnProperty(parts[i]) ){
          result = result[parts[i]];
        }
      }
    }

    if( result && result.isComputedProperty && !options.raw){
      result = result.value();
    }

    return result;
  },

  set: function(models, options){
    var newModels = [];
        options = options || {};

    // If no models passed, implies an empty array
    models || (models = []);

    if(!_.isObject(models)){
      return console.error('Collection.set must be passed a Model, Object, array or Models and Objects, or another Collection');
    }

    // If another collection, treat like an array
    models = (models.isCollection) ? models.models : models;

    // Ensure models is an array
    models = (!_.isArray(models)) ? [models] : models;

    // For each model, construct a copy of it
    _.each(models, function(data, index){
      var model,
          id = (data instanceof Model)  ? data : data[this.model.idAttribute || 'id'];

      // If the model already exists in this collection, let Backbone handle the merge
      if(this.get(id)){
        return newModels[index] = data;
      }

      // TODO: This will override things set by the passed model to appease the collection's model's defaults. Do a smart default set here.
      model = new this.model((data.isModel && data.attributes || data), _.defaults({
         parent: this,
         root: this.__root__,
         path: pathGenerator(this)
       }, options));

       // Keep this new collection's models in sync with the originals.
       if(data.isModel){

          // Preserve each Model's original cid value
          model._cid = model._cid || model.cid;
          data._cid = data._cid || data.cid;

          // Synced Model should share the same cid so helpers interpert them as the same object
          model.cid = data.cid;

          if(!model.synced[data._cid]){
            data.on('change', linkedModels(model));
            model.synced[data._cid] = false;
          }

          if(!data.synced[model._cid]){
            model.on('change', linkedModels(data));
            data.synced[model._cid] = false;
          }
        }

       newModels[index] = model;

    }, this);

    // Ensure that this element now knows that it has children now. Without this cyclic dependancies cause issues
    this._hasAncestry = this._hasAncestry || (newModels.length > 0);

    // Call original set function with model duplicates
    Backbone.Collection.prototype.set.call(this, newModels, options);

  }

});

exports["default"] = Collection;