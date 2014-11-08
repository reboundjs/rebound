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

var Collection = Backbone.Collection.extend({

  isCollection: true,
  isData: true,

  __path: function(){return '';},

  initialize: function(){
    this.__parent__ = this.__parent__ || this;
    this.__root__ =  this.__root__ || this;
  },

  model: this.model || Model,


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

        if( _.isFunction(result )){
          // If returning raw, always return the first computed property in a chian.
          if(options.raw){ return result; }
          result = evaluateComputedProperty(result, result.__parent__, parts[i-1]);
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

    if( _.isFunction(result) && !options.raw){

      result = evaluateComputedProperty(result, this, parts[i-1]);

    }

    return result;
  },

  set: function(models, options){
    var id,
        model,
        data,
        lineage,
        i=0, l;

    // Ensure models is an array
    models = (!_.isArray(models)) ? (models ? [models] : []) : models;

    for (i = 0, l = models.length; i < l; i++) {
      model = data = models[i] || {};

      if(model.__parent__ == this){
        models[i] = model;
        continue;
      }

      lineage = {
        __parent__: this,
        __root__: this.__root__,
        __path: pathGenerator(this),
        _hasAncestry: true
      };

      // Ensure that this element now knows that it has children now. WIthout this cyclic dependancies cause issues
      this._hasAncestry = true;

     // TODO: This will override things set by the new model to appease the collection's model's defaults. Do a smart default set here.
      options = options ? _.clone(options) : {};
      options.collection = this;
      lineage.defaults = _.defaults(((data.isModel) ? data.attributes : data), this.model.prototype.defaults);
      model = new (this.model.extend(lineage))();

      models[i] = model;
    }

    // Call original set function
    Backbone.Collection.prototype.set.call(this, models, options);

  }

});

exports["default"] = Collection;