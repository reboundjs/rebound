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

    // Make a copy of all of our models so we aren't sharing any memory
    models = (!_.isArray(models)) ? (models ? [models] : []) : _.clone(models);

    for (i = 0, l = models.length; i < l; i++) {
      model = data = models[i] || {};

      lineage = {
        __parent__: this,
        __root__: this.__root__,
        __path: pathGenerator(this),
        _hasAncestry: true
      };

      // If model is a backbone model, awesome. If not, make it one. Add its ancestary.
      if (model && model.isModel) {
        _.extend(model, lineage);
      } else {
        options = options ? _.clone(options) : {};
        options.collection = this;
        lineage.defaults = _.defaults(data, this.model.prototype.defaults);
        model = new (this.model.extend(lineage))();
      }

      models[i] = model;
    }

    // Call original set function
    Backbone.Collection.prototype.set.call(this, models, options);

  }

});

exports["default"] = Collection;