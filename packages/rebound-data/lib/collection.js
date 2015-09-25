// Rebound Collection
// ----------------

import Model from "rebound-data/model";
import $ from "rebound-component/utils";

const VALUE_KEY = '__rebound_primitive_model_value__';

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

  // Custom _removeModels to properly remove primitive models from collections
  _removeModels: function(models, options) {
    var removed = [];
    for (var i = 0; i < models.length; i++) {
      var model = this.get(models[i], {raw: true});
      if (!model) continue;

      var index = this.indexOf(model);
      this.models.splice(index, 1);
      this.length--;

      // Remove primitive models from _byValue cache
      if(model.isPrimitiveModel){
        let values = this._byValue[model.attributes[VALUE_KEY]],
            idx = 0;
        for(idx in values){
          if(values[idx] === model){
            values.splice(idx, 1);
            break;
          }
        }
      }

      if (!options.silent) {
        options.index = index;
        model.trigger('remove', model, this, options);
      }

      removed.push(model);
      this._removeReference(model, options);
    }
    return removed.length ? removed : false;
  },

  constructor: function(models, options){
    models || (models = []);
    options || (options = {});
    this._byValue = {};
    this.__observers = {};
    this.helpers = {};
    this.cid = _.uniqueId('collection');

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

  at: function(index, options){
    options || (options = {});
    var res = Backbone.Collection.prototype.at.apply(this, arguments);
    return (res && res.isPrimitiveModel && !options.raw) ? res.attributes[VALUE_KEY] : res;
  },

  get: function(key, options){

    // Split the path at all '.', '[' and ']' and find the value referanced.
    var parts = _.isString(key) ? $.splitPath(key) : [],
        result = this,
        l=parts.length,
        i=0;
        options || (options = {});

    // If the key is a number or object, or just a single string that is not a path,
    // get by id or primitive value and return the first occurance
    if(typeof key == 'number' || typeof key == 'object' || (parts.length == 1 && !options.isPath)){
      if (key === null) return void 0;
      var id = this.modelId(this._isModel(key) ? key.attributes : key);
      var responses = [].concat(this._byValue[key], (this._byId[key] || this._byId[id] || this._byId[key.cid]));
      var res = responses[0], idx = Infinity;

      responses.forEach((value) => {
        if(!value) return;
        let i = _.indexOf(this.models, value);
        if(i > -1 && i < idx){ idx = i; res = value;}
      });

      return (res && res.isPrimitiveModel && !options.raw) ? res.attributes[VALUE_KEY] : res;
    }

    // If key is not a string, return undefined
    if (!_.isString(key)) return void 0;

    if(_.isUndefined(key) || _.isNull(key)) return key;
    if(key === '' || parts.length === 0) return result;

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
    // If this model is a primitive model, add it to our by value hash
    _.each(models, function(data, index){
      if(data.isModel && options.clone === false || this._byId[data.cid]) return newModels[index] = data;
      var constructor = (data.constructor !== Object && data.constructor !== Rebound.Model) ? data.constructor : this.model;
      newModels[index] = new constructor(data, _.defaults(lineage, options));
      data.isModel && (newModels[index].cid = data.cid);
      if(newModels[index].isPrimitiveModel){
        let value = newModels[index].attributes[VALUE_KEY];
        this._byValue[value] = (this._byValue[value] || []).concat(newModels[index]);
      }
    }, this);

    // Ensure that this element now knows that it has children now. Without this cyclic dependancies cause issues
    this._hasAncestry || (this._hasAncestry = newModels.length > 0);

    // Call original set function with model duplicates
    return Backbone.Collection.prototype.set.call(this, newModels, options);

  },

  // The JSON representation of a Collection is an array of the models’ attributes.
  // If the model is a primitive model, return the value attribute
  toJSON: function(options) {
    return this.map(function(model) {
      if(model.isPrimitiveModel) return model.attributes[VALUE_KEY];
      return model.toJSON(options);
    });
  },

});

var collectionMethods = { slice: 1,
     forEach: 3, each: 3, map: 3, collect: 3, reduce: 4,
     foldl: 4, inject: 4, reduceRight: 4, foldr: 4, find: 3, detect: 3, filter: 3,
     select: 3, reject: 3, every: 3, all: 3, some: 3, any: 3, include: 3, includes: 3,
     contains: 3, invoke: 0, max: 3, min: 3, toArray: 1, size: 1, first: 3,
     head: 3, take: 3, initial: 3, rest: 3, tail: 3, drop: 3, last: 3,
     without: 0, difference: 0, indexOf: 3, shuffle: 1, lastIndexOf: 3,
     isEmpty: 1, chain: 1, sample: 3, partition: 3, groupBy: 3, countBy: 3,
     sortBy: 3, indexBy: 3};

function sanitize(res){
  if(_.isArray(res)){
    _.each(res, function(item, index){
      if(item && item.isPrimitiveModel) res[index] = item.get('value');
    });
  }
  else if(res && res.isPrimitiveModel) res = res.get('value');
  return res;
}

function wrapMethod(length, method){
  var proto = Backbone.Collection.prototype;
  return function() {
    return sanitize(proto[method].apply(this, arguments));
  };
}

_.each(collectionMethods, function(length, method) {
  var proto = Backbone.Collection.prototype;
  if (proto[method]) Collection.prototype[method] = wrapMethod(length, method);
});

export default Collection;
