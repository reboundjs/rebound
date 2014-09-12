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

function pathGenerator(collection, model){
  return function(){
    return collection.__path() + '[' + collection.indexOf(model) + ']';
  };
}

var Collection = Backbone.Collection.extend({

  isCollection: true,

  __path: function(){return '';},

  model: Model,

  set: set = function(models, options){
    var id,
        model,
        i, l;
    models = (!_.isArray(models)) ? (models ? [models] : []) : _.clone(models);

    // If a silent remove and this is the first silent remove since the last dom update, save our initial indicies
    if( options && options.silent && !this.models.__indexed ){
      _.each(this.models, function(model, index){
        model.__originalIndex = index;
      }, this);
      this.models.__indexed = true;
    }

    for (i = 0, l = models.length; i < l; i++) {
      model = models[i] || {};
      // If model is a backbone model, awesome. If not, make it one.
      if (model.isModel) {
        id = model;
      } else {
        id = model[this.model.prototype.idAttribute || 'id'];
        options = options ? _.clone(options) : {};
        options.collection = this;
        model = new this.model(model, options);
      }

      // If model does not already exist in the collection, set its name.
      if (!this.get(id)){
        // When requesting the name value of our value, return the its index appended to the computed name value of our parent
        model.__path = pathGenerator(this, model);
        model.__parent = this;
      }

      // If added silently, make note. If removed later, before it is rendered in the dom, we can remove it without alerting the dom.
      if (options.silent){
        model.__silent = true;
      }

      models[i] = model;
    }

    // Call original set function
    Backbone.Collection.prototype.set.call(this, models, options);

  }

});

exports["default"] = Collection;