// Rebound Model
// ----------------

// Rebound **Models** are the basic data object in the framework - frequently
// representing a row in a table in a database on your server. The inherit from
// Backbone Models and have all of the same useful methods you are used to for
// performing computations and transformations on that data. Rebound augments
// Backbone Models by enabling deep data nesting. You can now have **Rebound Collections**
// and **Rebound Computed Properties** as properties of the Model.

import Backbone from "backbone";
import ComputedProperty from "rebound-data/computed-property";
import { Path, $ } from "rebound-utils/rebound-utils";

// Returns a function that, when called, generates a path constructed from its
// parent's path and the key it is assigned to. Keeps us from re-naming children
// when parents change.
function pathGenerator(parent, key){
  return function(){
    var path = parent.__path();
    return path + ((path === '') ? '' : '.') + key;
  };
}

var Model = Backbone.Model.extend({
  // Set this object's data types
  isModel: true,
  isData: true,

  // A method that returns a root path by default. Meant to be overridden on
  // instantiation.
  __path: function(){ return ''; },

  // Create a new Model with the specified attributes. The Model's lineage is set
  // up here to keep track of it's place in the data tree.
  constructor: function(attributes, options={}){
    var self = this;
    if(attributes === null || attributes === undefined){ attributes = {}; }
    attributes.isModel && (attributes = attributes.attributes);
    this.helpers = {};
    this.defaults = this.defaults || {};
    this.setParent( options.parent || this );
    this.setRoot( options.root || this );
    this.__path = options.path || this.__path;

    // Convert getters and setters to computed properties
    $.extractComputedProps(attributes);

    Backbone.Model.call( this, attributes, options );

  },

  // New convenience function to toggle boolean values in the Model.
  toggle: function(attr, options) {
    options = options ? _.clone(options) : {};
    var val = this.get(attr);
    if(!_.isBoolean(val)){ console.error('Tried to toggle non-boolean value ' + attr +'!', this); }
    return this.set(attr, !val, options);
  },

  destroy: function(options) {
    options = options ? _.clone(options) : {};
    var model = this;
    var success = options.success;
    var wait = options.wait;

    var destroy = function() {
      model.trigger('destroy', model, model.collection, options);
    };

    options.success = function(resp) {
      if (wait){ destroy(); }
      if (success){ success.call(options.context, model, resp, options); }
      if (!model.isNew()){ model.trigger('sync', model, resp, options); }
    };

    var xhr = false;
    if (this.isNew()) {
      _.defer(options.success);
    } else {
      wrapError(this, options);
      xhr = this.sync('delete', this, options);
    }
    if (!wait){ destroy(); }
    return xhr;
  },

  // Model Reset does a deep reset on the data tree starting at this Model.
  // A `previousAttributes` property is set on the `options` property with the Model's
  // old values.
  reset: function(obj, options){
    var changed = {}, key, value;
    options || (options = {});
    options.reset = true;
    obj = (obj && obj.isModel && obj.attributes) || obj || {};
    options.previousAttributes = _.clone(this.attributes);

    // Any unset previously existing values will be set back to default
    _.each(this.defaults, function(val, key){
      if(!obj.hasOwnProperty(key)){ obj[key] = val; }
    }, this);

    // Iterate over the Model's attributes:
    // - If the property is the `idAttribute`, skip.
    // - If the properties are already the same, skip
    // - If the property is currently undefined and being changed, assign
    // - If the property is a `Model`, `Collection`, or `ComputedProperty`, reset it.
    // - If the passed object has the property, set it to the new value.
    // - If the Model has a default value for this property, set it back to default.
    // - Otherwise, unset the attribute.
    for(key in this.attributes){
      value = this.attributes[key];
      if(value === obj[key]){ continue; }
      else if(_.isUndefined(value) && !_.isUndefined(obj[key])){ changed[key] = obj[key]; }
      else if (value.isComponent){ continue; }
      else if (value.isCollection || value.isModel || value.isComputedProperty){
        value.reset((obj[key] || []), {silent: true});
        if(value.isCollection) changed[key] = value.previousModels;
        else if(value.isModel && value.isComputedProperty) changed[key] = value.cache.model.changedAttributes();
        else if(value.isModel) changed[key] = value.changedAttributes();
      }
      else if (obj.hasOwnProperty(key)){ changed[key] = obj[key]; }
      else{
        changed[key] = undefined;
        this.unset(key, {silent: true});
      }
    }

    // Any new values will be set to on the model
    _.each(obj, function(val, key){
      if(_.isUndefined(changed[key])){ changed[key] = val; }
    });

    // Reset our model
    obj = this.set(obj, _.extend({}, options, {silent: true, reset: false}));

    // Trigger custom reset event
    this.changed = changed;
    if (!options.silent){ this.trigger('reset', this, options); }

    // Return new values
    return obj;
  },

  // **Model.Get** is overridden to provide support for getting from a deep data tree.
  // `key` may now be any valid json-like identifier. Ex: `obj.coll[3].value`.
  get: function(key, options){
    return Path(key).query(this, options);
  },


  // **Model.Set** is overridden to provide support for getting from a deep data tree.
  // `key` may now be any valid json-like identifier. Ex: `obj.coll[3].value`.
  // It needs to traverse `Models`, `Collections` and `Computed Properties` to
  // find the correct value to call the original `Backbone.Set` on.
  set: function(key, value, options){

    var attrs, newKey, destination, props = [];

    if (typeof key === 'object') {
      attrs = (key.isModel) ? key.attributes : key;
      options = value;
    }
    else (attrs = {})[key] = value;
    options || (options = {});

    // Convert getters and setters to computed properties
    $.extractComputedProps(attrs);

    // If reset option passed, do a reset. If nothing passed, return.
    if(options.reset === true){ return this.reset(attrs, options); }
    if(options.defaults === true){ this.defaults = attrs; }
    if(_.isEmpty(attrs)){ return void 0; }

    // For each attribute passed:
    for(key in attrs){
      let val = attrs[key],
          paths = Path(key).split(),
          attr  = (paths.pop() || ''),       // The key          ex: foo[0].bar --> bar
          target = this.get(paths.join('.')),  // The element    ex: foo.bar.baz --> foo.bar
          lineage;

      // If target currently doesnt exist, construct its tree
      if(_.isUndefined(target)){
        target = this;
        _.each(paths, function(part){
          var tmp = target.get(part);
          if(_.isUndefined(tmp)) tmp = target.set(part, {}).get(part);
          target = tmp;
        }, this);
      }

      // The old value of `attr` in `target`
      destination = target.get(attr, {raw: true}) || {};

      // Create this new object's lineage.
      lineage = {
        name: key,
        parent: target,
        root: this.__root__,
        path: pathGenerator(target, attr),
        silent: true,
        defaults: options.defaults
      };
      // - If val is `null` or `undefined`, set to default value.
      // - If val is a `Computed Property`, get its current cache object.
      // - If val (default value or evaluated computed property) is `null`, set to default value or (fallback `undefined`).
      // - Else If val is a primitive object instance, convert to primitive value.
      // - Else If `{raw: true}` option is passed, set the exact object that was passed. No promotion to a Rebound Data object.
      // - Else If this function is the same as the current computed property, continue.
      // - Else If this value is a `Function`, turn it into a `Computed Property`.
      // - Else If this is going to be a cyclical dependancy, use the original object, don't make a copy.
      // - Else If updating an existing object with its respective data type, let Backbone handle the merge.
      // - Else If this value is a `Model` or `Collection`, create a new copy of it using its constructor, preserving its defaults while ensuring no shared memory between objects.
      // - Else If this value is an `Array`, turn it into a `Collection`.
      // - Else If this value is a `Object`, turn it into a `Model`.
      // - Else val is a primitive value, set it accordingly.


      if(_.isNull(val) || _.isUndefined(val)) val = this.defaults[key];
      if(val && val.isComputedProperty) val = val.value();
      if(_.isNull(val) || _.isUndefined(val)) val = undefined;
      else if(val instanceof String) val = String(val);
      else if(val instanceof Number) val = Number(val);
      else if(val instanceof Boolean) val = Boolean(val.valueOf());
      else if(options.raw === true) val = val;
      else if(destination.isComputedProperty && destination.func === val) continue;
      else if(val.isComputedProto) val = new ComputedProperty(val.get, val.set, lineage);
      else if(val.isData && target.hasParent(val)) val = val;
      else if( destination.isComputedProperty ||
              ( destination.isCollection && ( _.isArray(val) || val.isCollection )) ||
              ( destination.isModel && ( _.isObject(val) || val.isModel ))){
        destination.set(val, options);
        continue;
      }
      else if(val.isData && options.clone !== false) val = new val.constructor(val.attributes || val.models, lineage);
      else if(_.isArray(val)) val = new Rebound.Collection(val, lineage); // TODO: Remove global referance
      else if(_.isObject(val)) val = new Model(val, lineage);

      // If val is a data object, let this object know it is now a parent
      this._hasAncestry = (val && val.isData || false);

      // Set the value
      Backbone.Model.prototype.set.call(target, attr, val, options); // TODO: Event cleanup when replacing a model or collection with another value

    }

    return this;

  },

  // Recursive `toJSON` function traverses the data tree returning a JSON object.
  // If there are any cyclic dependancies the object's `cid` is used instead of looping infinitely.
  toJSON: function() {
    if (this._isSerializing){ return this.id || this.cid; }
    this._isSerializing = true;
    var json = _.clone(this.attributes);
    _.each(json, function(value, name) {
        if( _.isNull(value) || _.isUndefined(value) ){ return void 0; }
        _.isFunction(value.toJSON) && (json[name] = value.toJSON());
    });
    this._isSerializing = false;
    return json;
  }

});

// If default properties are passed into extend, process the computed properties
Model.extend = function(protoProps, staticProps) {
  $.extractComputedProps(protoProps.defaults);
  return Backbone.Model.extend.call(this, protoProps, staticProps);
};

export default Model;
