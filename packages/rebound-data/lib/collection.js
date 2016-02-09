// Rebound Collection
// ----------------

import Backbone from "backbone";
import Model from "rebound-data/model";
import $ from "rebound-utils/rebound-utils";

function pathGenerator(collection){
  return function(){
    return collection.__path() + '[' + collection.indexOf(collection._byId[this.cid]) + ']';
  };
}

var Collection = Backbone.Collection.extend({

  isCollection: true,
  isData: true,

  model: Model,

  __path: function(){return '';},

  constructor: function(models, options){
    models || (models = []);
    options || (options = {});
    this._byValue = {};
    this.helpers = {};
    this.cid = $.uniqueId('collection');

    // Set lineage
    this.setParent( options.parent || this );
    this.setRoot( options.root || this );
    this.__path = options.path || this.__path;

    Backbone.Collection.apply( this, arguments );

    // When a model is removed from its original collection, destroy it
    // TODO: Fix this. Computed properties now somehow allow collection to share a model. They may be removed from one but not the other. That is bad.
    // The clone = false options is the culprit. Find a better way to copy all of the collections custom attributes over to the clone.
    this.on('remove', function(model, collection, options){
      // model.deinitialize();
    });

  },

  // TODO: Start - `Upstream to Backbone?`.
  // Always give precedence to the provided model's idAttribute. Fall back to
  // the Collection's idAttribute, and then to the default `id`.
  modelId: function(model={}, data={}){
    // Always give precedence to the provided model's idAttribute. Fall back to
    // the Collection's idAttribute, and then to the default `id`.
    var idAttribute = model.idAttribute || this.model.prototype.idAttribute || 'id';

    // If this is a data element, just return the id
    if(data.isData){ return data.get(idAttribute); }

    // Otherwise, iterate down the object trying to get the id
    $.splitPath(idAttribute).forEach(function(val, key){
      if(!_.isObject(data)){ return; }
      data = data.isData ? data.get(val) : data[val];
    });

    return data;
  },

  // Pass modelId the model itself, not just the attributes, so it can get the
  // idAttribute from the model itslef and not the collection
  _addReference: function(model, options) {
    this._byId[model.cid] = model;
    var id = this.modelId(model, model);
    if (id != null){ this._byId[id] = model; }
    model.on('all', this._onModelEvent, this);
  },

  // Pass modelId the model itself, not just the attributes, so it can get the
  // idAttribute from the model itslef and not the collection
  _removeReference: function(model, options) {
    delete this._byId[model.cid];
    var id = this.modelId(model, model);
    if (id != null){ delete this._byId[id]; }
    if (this === model.collection){ delete model.collection; }
    model.off('all', this._onModelEvent, this);
  },

  // Pass modelId the model itself, not just the attributes, so it can get the
  // idAttribute from the model itslef and not the collection
  _onModelEvent: function(event, model, collection, options) {
    if ((event === 'add' || event === 'remove') && collection !== this) return;
    if (event === 'destroy') this.remove(model, options);
    if (event === 'change') {
      var prevId = this.modelId(model, model.previousAttributes());
      var id = this.modelId(model, model);
      if (prevId !== id) {
        if (prevId != null){ delete this._byId[prevId]; }
        if (id != null){ this._byId[id] = model; }
      }
    }
    this.trigger.apply(this, arguments);
  },
  // TODO: End - `Upstream to Backbone?`.


  get: function(key, options){

    // Split the path at all '.', '[' and ']' and find the value referanced.
    var parts = _.isString(key) ? $.splitPath(key) : [],
        result = this,
        l=parts.length,
        i=0;
        options || (options = {});

    // If the key is a number or object, or just a single string that is not a path,
    // get by id and return the first occurance
    if(typeof key == 'number' || typeof key == 'object' || (parts.length == 1 && !options.isPath)){
      if (key === null){ return void 0; }
      var id = this.modelId(key, key);
      var responses = [].concat(this._byValue[key], (this._byId[key] || this._byId[id] || this._byId[key.cid]));
      var res = responses[0], idx = Infinity;

      responses.forEach((value) => {
        if(!value){ return void 0; }
        let i = _.indexOf(this.models, value);
        if(i > -1 && i < idx){ idx = i; res = value;}
      });

      return res;
    }

    // If key is not a string, return undefined
    if (!_.isString(key)){ return void 0; }

    if(_.isUndefined(key) || _.isNull(key)){ return key; }
    if(key === '' || parts.length === 0){ return result; }

    if (parts.length > 0) {
      for ( i = 0; i < l; i++) {
        // If returning raw, always return the first computed property found. If undefined, you're done.
        if(result && result.isComputedProperty && options.raw) return result;
        if(result && result.isComputedProperty) result = result.value();
        if(_.isUndefined(result) || _.isNull(result)) return result;
        if(parts[i] === '@parent') result = result.__parent__;
        else if(result.isCollection) result = result.models[parts[i]];
        else if(result.isModel) result = result.attributes[parts[i]];
        else if(result.hasOwnProperty(parts[i])) result = result[parts[i]];
      }
    }

    if(result && result.isComputedProperty && !options.raw) result = result.value();

    return result;
  },

  set: function(models, options){
    var newModels = [],
        parts = _.isString(models) ? $.splitPath(models) : [],
        res,
        lineage = {
          parent: this,
          root: this.__root__,
          path: pathGenerator(this),
          silent: true
        };
        options = options || {},

    // If no models passed, implies an empty array
    models || (models = []);

    // If models is a string, and it has parts, call set at that path
    if(_.isString(models) && parts.length > 1 && !isNaN(Number(parts[0]))){
      let index = Number(parts[0]);
      return this.at(index).set(parts.splice(1, parts.length).join('.'), options);
    }

    // If another collection, treat like an array
    models = (models.isCollection) ? models.models : models;
    // Ensure models is an array
    models = (!_.isArray(models)) ? [models] : models;

    // If the model already exists in this collection, or we are told not to clone it, let Backbone handle the merge
    // Otherwise, create our copy of this model, give them the same cid so our helpers treat them as the same object
    // Use the more unique of the two constructors. If our Model has a custom constructor, use that. Otherwise, use
    // Collection default Model constructor.
    _.each(models, function(data, index){
      if(data.isModel && options.clone === false || this._byId[data.cid]) return newModels[index] = data;
      var constructor = (data.constructor !== Object && data.constructor !== Rebound.Model) ? data.constructor : this.model;
      newModels[index] = new constructor(data, _.defaults(lineage, options));
      data.isModel && (newModels[index].cid = data.cid);
    }, this);

    // Ensure that this element now knows that it has children now. Without this cyclic dependancies cause issues
    this._hasAncestry || (this._hasAncestry = newModels.length > 0);

    // Call original set function with model duplicates
    return Backbone.Collection.prototype.set.call(this, newModels, options);

  }

});

export default Collection;
