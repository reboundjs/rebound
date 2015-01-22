"use strict";
var ComputedProperty = require("rebound-data/computed-property")["default"];
var $ = require("rebound-runtime/utils")["default"];

// If Rebound Runtime has already been run, throw error
if(Rebound.Model){ throw 'Rebound Model is already loaded on the page!'; }
// If Backbone hasn't been started yet, throw error
if(!window.Backbone){ throw "Backbone must be on the page for Rebound to load."; }

function pathGenerator(parent, key){
  return function(){
    var path = parent.__path();
    return path + ((path === '') ? '' : '.') + key;
  };
}

var Model = Backbone.Model.extend({

  isModel: true,
  isData: true,

  __path: function(){ return ''; },

  constructor: function(attributes, options){
    var model;

    attributes || (attributes = {});
    model = attributes || {};
    attributes.isModel && (attributes = attributes.attributes);
    options || (options = {});
    this.helpers = {};
    this.defaults = this.defaults || {};

    // Set lineage
    this.setParent( options.parent || this );
    this.setRoot( options.root || this );
    this.__path = options.path || this.__path;

    Backbone.Model.call( this, attributes, options );
  },

  toggle: function(attr, options) {
    options = options ? _.clone(options) : {};
    var val = this.get(attr);
    if(!_.isBoolean(val)) console.error('Tried to toggle non-boolean value ' + attr +'!', this);
    return this.set(attr, !val, options);
  },

  reset: function(obj, options){

    var changed = {};

    options || (options = {});
    options.reset = true;
    obj = (obj && obj.isModel && obj.attributes) || obj || {};
    options.previousAttributes = _.clone(this.attributes);

    // Iterate over attributes setting properties to obj, default or clearing them
    _.each(this.attributes, function(value, key, model){

      if(_.isUndefined(value)){
        obj[key] && (changed[key] = obj[key]);
      }
      else if (key === this.idAttribute ||  (value && value.isComputedProperty))  return;
      else if (value.isCollection || value.isModel){
        value.reset((obj[key]||[]), {silent: true});
        !_.isEmpty(value.changed) && (changed[key] = value.changed);
      }
      else if (obj.hasOwnProperty(key)){
        if(value !== obj[key]) changed[key] = obj[key];
      }
      else if (this.defaults.hasOwnProperty(key) && !_.isFunction(this.defaults[key])){
        obj[key] = this.defaults[key];
        if(value !== obj[key]) changed[key] = obj[key];
      }
      else{
        changed[key] = undefined;
        this.unset(key, {silent: true});
      }
    }, this);

    // Any unset changed values will be set to obj[key]
    _.each(obj, function(value, key, obj){
      changed[key] = changed[key] || obj[key];
    });

    // Reset our model
    obj = this.set(obj, _.extend({}, options, {silent: true, reset: false}));

    // Trigger custom reset event
    this.changed = changed;
    if (!options.silent) this.trigger('reset', this, options);

    // Return new values
    return obj;
  },

  get: function(key, options){

    // Split the path at all '.', '[' and ']' and find the value referanced.
    var parts  = $.splitPath(key),
        result = this,
        l=parts.length,
        i=0;
        options = _.defaults((options || {}), { raw: false });

    if(_.isUndefined(key) || _.isNull(key)) return key;

    if(key === '' || parts.length === 0) return result;

    if (parts.length > 0) {
      for ( i = 0; i < l; i++) {
        if(result && result.isComputedProperty && options.raw) return result;
        if(result && result && result.isComputedProperty) result = result.value();
        if(_.isUndefined(result) || _.isNull(result)) return result;
        if(parts[i] === '@parent') result = result.__parent__;
        else if(result.isCollection) result = result.models[parts[i]];
        else if(result.isModel) result = result.attributes[parts[i]];
        else if(result && result.hasOwnProperty(parts[i])) result = result[parts[i]];
      }
    }

    if(result && result.isComputedProperty && !options.raw) result = result.value();

    return result;
  },

  // TODO: Moving the head of a data tree should preserve ancestry
  set: function(key, val, options){

    var attrs, attr, newKey, target, destination, props = [], lineage;

    // Set is able to take a object or a key value pair. Normalize this input.
    if (typeof key === 'object') {
      attrs = (key.isModel) ? key.attributes : key;
      options = val;
    } else {
      (attrs = {})[key] = val;
    }
    options || (options = {});

    // If reset is passed, do a reset instead
    if(options.reset === true){
      return this.reset(attrs, options);
    }

    if(_.isEmpty(attrs)){ return; }

    // For each key and value
    _.each(attrs, function(val, key){

      var paths = $.splitPath(key),
          attr  = paths.pop() || '';           // The key        ex: foo[0].bar --> bar
          target = this.get(paths.join('.')),  // The element    ex: foo.bar.baz --> foo.bar
          lineage = {
            name: key,
            parent: target,
            root: this.__root__,
            path: pathGenerator(this, key),
            silent: true,
            clone: options.clone
          };

      // If target currently doesnt exist, construct it
      if(_.isUndefined(target)){
        target = this;
        _.each(paths, function(value){
          var tmp = target.get(value);
          if(_.isUndefined(tmp)){
            target.set(value, {});
            tmp = target.get(value);
          }
          target = tmp;
        }, this);
        return target.set(attr, val);
      }

      var destination = target.get(attr, {raw: true}) || {};  // The current value of attr

      // If val is null or undefined, set to defaults
      if(_.isNull(val) || _.isUndefined(val)) val = this.defaults[key];
      if(val && val.isComputedProperty) val = val.value();

      // If val is null, set to undefined
      else if(_.isNull(val) || _.isUndefined(val)) val = undefined;

      // If this function is the same as the current computed property, continue
      else if(destination.isComputedProperty && destination.func === val) return;

      // If this value is a Function, turn it into a Computed Property
      else if(_.isFunction(val)) val = new ComputedProperty(val, lineage);

      // If this is going to be a cyclical dependancy, use the original object, don't make a copy
      else if(val && val.isData && target.hasParent(val)) val = val;

      // If updating an existing object with its respective data type, let Backbone handle the merge
      else if( destination.isComputedProperty ||
              ( destination.isCollection && ( _.isArray(val) || val.isCollection )) ||
              ( destination.isModel && ( _.isObject(val) || val.isModel ))){
        return destination.set(val, options);
      }


      // If this value is a Model or Collection, create a new instance of it using its constructor
      // This will keep the defaults from the original, but make a new copy so memory isnt shared between data objects
      // This will also keep this instance of the object in sync with its original
      // TODO: This will override defaults set by this model in favor of the passed in model. Do deep defaults here.
      else if(val.isData && options.clone !== false) val = new val.constructor(val.attributes || val.models, lineage);

      // If this value is an Array, turn it into a collection
      else if(_.isArray(val)) val = new Rebound.Collection(val, lineage); // TODO: Remove global referance

      // If this value is a Object, turn it into a model
      else if(_.isObject(val)) val = new Model(val, lineage);

      // Else val is a primitive value, set it accordingly

      // If val is a data object, let this object know it is now a parent
      this._hasAncestry = (val && val.isData || false);

      // Replace the existing value
      return Backbone.Model.prototype.set.call(target, attr, val, options); // TODO: Event cleanup when replacing a model or collection with another value

    }, this);

    return this;

  },

  toJSON: function() {
      if (this._isSerializing) return this.id || this.cid;
      this._isSerializing = true;
      var json = _.clone(this.attributes);
      _.each(json, function(value, name) {
          if( _.isNull(value) || _.isUndefined(value) ){ return; }
          _.isFunction(value.toJSON) && (json[name] = value.toJSON());
      });
      this._isSerializing = false;
      return json;
  }

});

exports["default"] = Model;