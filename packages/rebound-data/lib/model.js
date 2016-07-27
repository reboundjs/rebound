// Rebound Model
// ----------------

// Rebound **Models** are the basic data object in the framework - frequently
// representing a row in a table in a database on your server. The inherit from
// Backbone Models and have all of the same useful methods you are used to for
// performing computations and transformations on that data. Rebound augments
// Backbone Models by enabling deep data nesting. You can now have **Rebound Collections**
// and **Rebound Computed Properties** as properties of the Model.

import { Data } from "rebound-data/data";
import ComputedProperty from "rebound-data/computed-property";
import { Path, $ } from "rebound-utils/rebound-utils";

function urlError(){
  throw new Error('A "url" property or function must be specified');
}

function isData(val){
  return val && val.isData;
}

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

  // Create a new model with the specified attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  constructor(attrs={}, options={}){
    super(attrs, options);

    // Create caches
    this.attributes = {};
    this.validationError = null;

    // Prepare the hydrate method for callback and call unless we are instructed not to.
    this.hydrate = this.hydrate.bind(this, attrs, options);
    if (options.hydrate !== false) this.hydrate();

  }

  hydrate(attrs={}, options={}){

    if (!this.hasOwnProperty('hydrate')) return console.warn('Warning: Attempted to hydrate an already hydrated Model:', this);
    delete this.hydrate;

    // Normalize attributes data
    // Convert getters and setters to computed properties
    attrs.isModel && (attrs = attrs.attributes);
    $.extractComputedProps(attrs);

    // If requested, parse supplied input
    if (options.parse) attrs = this.parse(attrs, options) || {};

    // Set our new values
    var defaults = this.defaults;
    attrs = _.defaults(_.extend({}, defaults, attrs), defaults);
    this.set(attrs, options);

    // Call the user provided initialize callback.
    this.initialize.call(this, attrs, options);

  }

  validate(attrs){
    return typeof attrs === 'object' && !Array.isArray(attrs);
  }

  location (obj){ return _.findKey(this.attributes, obj); }

  // **Model.Get** is overridden to provide support for getting from a deep data tree.
  // `key` may now be any valid json-like identifier. Ex: `obj.coll[3].value`.
  get (key){ return Path(key).query(this); }


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

    super.dirty(options);

    // Any unset values will be set back to default
    if (options.defaults !== false) {
      for (let key in defaults) {
        if (!defaults.hasOwnProperty(key)) continue;
        if (toChange[key] === void 0) toChange[key] = defaults[key];
      }
    }

    var newOptions = _.extend({}, options, { silent: true, reset: false });

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
    if (!options.silent && this.hasChanged()) this.trigger('reset', this, options);

    super.clean(options);

    // Return new values
    return result;
  }


  // **Model.Set** is overridden to provide support for getting from a deep data tree.
  // `key` may now be any valid json-like identifier. Ex: `obj.coll[3].value`.
  // It needs to traverse `Models`, `Collections` and `Computed Properties` to
  // find the correct value to call the original `Backbone.Set` on.
  // Set a hash of model attributes on the object, firing `"change"`. This is
  // the core primitive operation of a model, updating the data and notifying
  // anyone who needs to know about the change in state. The heart of the beast.
  set (key, value, options={}) {

    if (key == null){ return this; }

    // Handle both `"key", value` and `{key: value}` -style arguments.
    var attrs;
    if (typeof key === 'object') {
      attrs = (key.isModel) ? key.attributes : key;
      options = value || {};
    } else {
      (attrs = {})[key] = value;
    }

    // If reset option passed, do a reset. If nothing passed, return.
    if (options.reset === true) return this.reset(attrs, options);
    if (_.isEmpty(attrs)) return this;

    // Convert getters and setters to computed properties
    $.extractComputedProps(attrs);

    // Run validation.
    if (!validate.call(this, attrs, options)) return false;

    super.dirty();

    // Extract attributes and options.
    var unset      = options.unset;
    var silent     = options.silent;
    var changes    = [];
    var defaults   = this.defaults;
    var current    = this.attributes;
    var prev       = this.previous();

    // For each `set` attribute, update or delete the current value.
    for (var key in attrs) {

      let val    = attrs[key],
          paths  = Path(key).split(),
          attr   = (paths.pop() || ''),
          target = this, data;

      // If target currently doesnt exist, construct its ancestry tree
      for (let idx in paths){
        let part = paths[idx];
        let test = target.get(part);
        if (!test || !test.isData) target = target.set(part, {}, {silent: true}).get(part);
        else target = test;
      }

      // If target is a data object and not the operating Model, call set on it instead.
      if (isData(target) && target !== this){
        target.set(attr, val, options);
        continue;
      }

      // From here on out, we are guarenteed that `this` is the target Model, and
      // `attrs` is the attribute we are changing on it. Let `dest` be the old value of `attr`.
      let dest = current[attr];
      let newoptions = {
        defaults: defaults[attr],
        hydrate: false
      };

      // If val is a `Computed Property`, get its current cache object.
      if (val && val.isComputedProperty) val = val.value();

      // If val is `undefined` and we are not asked to ignore defaults, set to default value if it exists.
      else if (val === void 0 && options.defaults !== false) val = defaults.hasOwnProperty(attr) ? defaults[attr] : void 0;

      // - If val (default value or evaluated computed property) is `null`, set to default value or (fallback `undefined`).
      // - Else If val is a primitive object instance, convert to primitive value.
      // - Else If this value is a `Function`, turn it into a `Computed Property`.
      // - Else If this is going to be a cyclical dependancy, use the original object, don't make a copy.
      // - Else If updating an existing object with its respective data type, let Backbone handle the merge.
      // - Else If this value is a `Model` or `Collection`, create a new copy of it using its constructor, preserving its defaults while ensuring no shared memory between objects.
      // - Else If this value is an `Array`, turn it into a `Collection`.
      // - Else If this value is a `Object`, turn it into a `Model`.
      // - Else val is a primitive value, set it as is.
      if (val === void 0  || val === null) val = undefined;
      else if (val instanceof String)  val = String(val);
      else if (val instanceof Number)  val = Number(val);
      else if (val instanceof Boolean) val = Boolean(val.valueOf());
      else if (val.isComputedProto)    val = new ComputedProperty(val.get, val.set, newoptions);
      else if ( dest && (dest.isComputedProperty || ( dest.isCollection && ( _.isArray(val) || val.isCollection )) || ( dest.isModel && ( _.isObject(val) || val.isModel )))){
        dest.set(val, options);
        continue;
      }
      else if (val.isData && options.clone) val = this.clone(val);
      else if (val.isData) val = val;
      else if (Array.isArray(val)) { val = new Rebound.Collection(val, newoptions); } // TODO: Remove global referance
      else if (_.isObject(val)) { val = new Model(val, newoptions); }

      // If this value is different, add it to our list of changed values
      if (dest !== val) changes.push(key);

      // If this value is different than the previous value, add it to our changed hash.
      // If not differnt, remove from our changed hash.
      super.change(key, (prev[key] !== val));
      
      // Set the value in this Model's attributes hash
      unset ? delete current[key] : current[key] = val;

      // If current value is a data object, remove ourselves as a parent
      if (unset && isData(dest)) dest.parent = null;

      // If the new val is a data object, make sure it knows who its daddy is.
      if (isData(val)) val.parent = this;

    }

    // Update the `id`.
    if (this.idAttribute in attrs) this.id = this.get(this.idAttribute);

    // Hydrate and Trigger all relevant attribute changes.
    for (var i = 0; i < changes.length; i++) {
      let key = changes[i];
      let val = current[key];
      if (val && val.hydrate) val.hydrate();
      if (!silent) this.trigger(`change:${key}`, this, key, val, options);
    }

    // If this model is in the process of changing, this is a recursive change.
    // Mark as clean and exit – the `"update"` event will be triggered by the root change.
    super.clean()
    if (this.isChanging()) return this;

    // You might be wondering why there's a `while` loop here. Changes can
    // be recursively nested within `"update"` events.
    this._pending = options;
    if (!silent) {
      while (this._pending) {
        options = this._pending;
        this._pending = false;
        this.trigger('update', this, options);
      }
    }
    this._pending = false;

    return this;

  }

  // Recursive `toJSON` function traverses the data tree returning a JSON object.
  // If there are any cyclic dependancies the object's `cid` is used instead of looping infinitely.
  toJSON() {
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

  // New convenience function to toggle boolean values in the Model.
  toggle(attr, options) {
    options = options ? _.clone(options) : {};
    var val = this.get(attr, {isPath: true});
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

  // Remove a data object from this Model, firing `"change"`. `remove` is a noop
  // if the data object is not a direct child of the Model
  remove(obj, options) {
    if (obj.parent !== this) return obj;
    return this.unset(obj.key, options);
  }

  // Clear all attributes on the model, firing `"change"`.
  clear(options) {
    var attrs = {};
    for (var key in this.attributes){ attrs[key] = void 0; }
    return this.set(attrs, _.extend({}, options, {unset: true}));
  }

  // Default URL for the model's representation on the server -- if you're
  // using Backbone's restful methods, override this to change the endpoint
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

}

// Attach all inheritable methods to the Model prototype.
_.extend(Model.prototype, {

  // Set this object's data types
  isModel: true,

  // Set default...defaults
  defaults: {},

  // The default name for the JSON `id` attribute is `"id"`. MongoDB and
  // CouchDB users may want to set this to `"_id"`.
  idAttribute: 'id',

});
