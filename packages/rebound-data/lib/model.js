// Rebound Model
// ----------------

// Rebound **Models** are the basic data object in the framework - frequently
// representing a row in a table in a database on your server. The inherit from
// Rebound Models and have all of the same useful methods you are used to for
// performing computations and transformations on that data. Rebound augments
// Rebound Models by enabling deep data nesting. You can now have **Rebound Collections**
// and **Rebound Computed Properties** as properties of the Model.

import { Data } from "rebound-data/data";
import ComputedProperty from "rebound-data/computed-property";
import { $ } from "rebound-utils/rebound-utils";
import Path from "rebound-data/path";

function urlError(){ throw new Error('A "url" property or function must be specified'); }

function isData(val){ return val && val.isData; }

// Run validation against the next complete set of model attributes,
// returning `true` if all is well. Otherwise, fire an `"invalid"` event.
function validate(attrs, options) {
  if (!options.validate || !this.validate){ return true; }
  attrs = _.extend({}, this.attributes, attrs);
  var error = this.validationError = this.validate(attrs, options) || null;
  if (!error){ return true; }
  this.trigger('invalid', this, error, _.extend(options, { validationError: error }));
  return false;
}

export default class Model extends Data {

  // All Models have the read-only property `isModel`
  get isModel(){ return true; }
  set isModel(val){ throw new Error(`Error: Property "isModel" is read-only on object:`, this); }

  // When requesting a model's id, get the values at path `idAttribute`.
  get id(){ return this.get(this.idAttribute); }

  constructor(attrs={}, options={}){
    super(attrs, options);
    this.attributes = {};
    this.validationError = null;


    // Normalize attributes data
    // Convert getters and setters to computed properties
    attrs.isModel && (attrs = attrs.attributes);
    // $.extractComputedProps(attrs);

    // If requested, parse supplied input
    if (options.parse) attrs = this.parse(attrs, options) || {};

    // Set our new values
    attrs = _.defaults(Object.defineProperties({}, Object.getOwnPropertyDescriptors(attrs)), this.defaults);
    options = _.extend({clone: true}, options);
    // attrs = _.defaults(_.extend({}, defaults, attrs), defaults);
    this.set(attrs);

  }

  // Get the value at `key`
  [Data.get] (key) {
    return this.attributes[key];
  }

  // Set the `value` at `key`
  [Data.set] (key, value) {
    this.attributes[key] = value;
    this.trigger(`change:${key}`, this, key, value.valueOf());
    return true;
  }

  // Delete the value at `key`
  [Data.delete] (key) {
    delete this.attributes[key];
    this.trigger(`change:${key}`, this, key, void 0);
    return true;
  }

  // By default, Models only a  ccept hashes for their initial values and defaults.
  // This method may be overridden to validate specific sub-classes.
  validate (attrs) {
    super.validate(attrs);
    return typeof attrs === 'object' && !Array.isArray(attrs);
  }

  // Model Reset does a deep reset on the data tree starting at this Model.
  // When you have more attributes than you want to set or unset individually,
  // you can reset the entire model with properties, without firing any granular
  // `change` events. Fires `reset` when finished. Useful for bulk operations and
  // optimizations. If `{defaults: false}` is passed, default values are ignored.
  reset (obj={}, options={}) {

    if(!_.isObject(obj)){
      console.error("Error resetting", this, "received", obj, "as first argument. Expecting either Model or Hash");
      return this;
    }

    // Accept both hashes and Models
    obj.isModel && (obj = obj.attributes);

    var attrs = this.attributes;
    var toChange = _.clone(obj);
    var defaults = this.defaults;
    var result = this;

    this.transaction(function(){

      // Any unset values will be set back to default
      if (options.defaults !== false) {
        for (let key in defaults) {
          if (!defaults.hasOwnProperty(key)) continue;
          if (toChange[key] === void 0) toChange[key] = defaults[key];
        }
      }

      var newOptions = _.extend({}, options, { silent: true, reset: false, clone: true });

      // Iterate over the Model's attributes:
      for(let key in attrs){
        let value = attrs[key];
        if (!attrs.hasOwnProperty(key)) continue;
        // - If the properties are already the same, don't modify
        if (value === toChange[key]) delete toChange[key];
        // - If the property is a `Component`, ignore it.
        // TODO: This is only in here for Services. Find a better way.
        else if (value && value.isComponent) continue;
        // - If the property is a `Model`, `Collection`, or `ComputedProperty`, reset it.
        else if (isData(value)){ value.reset(toChange[key]); delete toChange[key]; }
        // - Otherwise, unset the attribute.
        else if (!toChange.hasOwnProperty(key)) this.unset(key, newOptions);
      }

      // Reset our model
      result = this.set(toChange, newOptions);

      // Trigger custom reset event
      if (!options.silent && this.hasChanged()) this.trigger('reset', this, _.extend({}, options));

    });

    // Return new values
    return result;
  }

  // New convenience function to toggle boolean values in the Model.
  toggle(attr, options) {
    options = options ? _.clone(options) : {};
    var val = this.get(attr);
    if(!_.isBoolean(val)){
      console.error('Tried to toggle non-boolean value ' + attr +'!', this);
      return this;
    }
    return this.set(attr, !val, options);
  }

  // Get the HTML-escaped value of an attribute.
  escape(attr) {
    var val = this.get(attr);
    return typeof val === "string" ? _.escape(val) : val;
  }

  // Returns `true` if the attribute contains a value that is not null
  // or undefined.
  has(attr) { return this.get(attr) != null; }

  // Special-cased proxy to underscore's `_.matches` method.
  matches(attrs) { return !!_.iteratee(attrs, this)(this.attributes); }

  // Remove an attribute from the model, firing `"change"`. `unset` is a noop
  // if the attribute doesn't exist.
  unset(attr, options) { return this.set(attr, void 0, _.extend({}, options, {unset: true})); }

  remove(obj){
    if (!obj || obj.parent !== this || !obj.isData) return obj;
    var key = obj.key;
    this.delete(key);
    return this;
  }

  // Clear all attributes on the model, firing `"change"`.
  clear(options) {
    super.dirty();
    var attrs = {};
    for (var key in this.attributes){
      this.delete(key);
    }
    super.clean();
    return this;
  }

  // Default URL for the model's representation on the server -- if you're
  // using Rebound's restful methods, override this to change the endpoint
  // that will be called.
  url() {
    var base =
      _.result(this, 'urlRoot') ||
      _.result(this.parent, 'url') ||
      urlError();
    if (this.isNew()) return base;
    var id = this.get(this.idAttribute);
    return base.replace(/[^\/]$/, '$&/') + encodeURIComponent(id);
  }

  // A model is new if it has never been saved to the server, and lacks an id.
  isNew() { return !this.has(this.idAttribute); }

  // Check if the model is currently in a valid state.
  isValid(options) {
    return validate.call(this, {}, _.extend({}, options, {validate: true}));
  }

  deinitialize(){
    super.deinitialize();
    _.each(this.attributes, (val, key) => {
      delete this.attributes[key];
      val && !val.isComponent && val.deinitialize && val.deinitialize();
    });
  }

  // Recursive `toJSON` function traverses the data tree returning a JSON object.
  // If there are any cyclic dependancies the object's `cid` is used instead of looping infinitely.
  toJSON () {
    super.toJSON();
    if (this._isSerializing){ return this.id || this.cid; }
    this._isSerializing = true;
    var json = _.clone(this.attributes);
    _.each(json, function(value, name) {
        if( value === null || value === void 0 ){ return void 0; }
        _.isFunction(value.toJSON) && (json[name] = value.toJSON());
    });
    this._isSerializing = false;
    return json;
  }

}

// Set default...defaults
Model.prototype.defaults = {};

// The default name for the JSON `id` attribute is `"id"`. MongoDB and
// CouchDB users may want to set this to `"_id"`.
Model.prototype.idAttribute = 'id';
