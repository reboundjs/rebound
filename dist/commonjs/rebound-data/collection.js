"use strict";
var Model = require("rebound-data/model")["default"];

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