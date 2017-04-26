// Rebound Collection
// -------------------

// If models tend to represent a single row of data, a Rebound Collection is
// more analogous to a table full of data ... or a small slice or page of that
// table, or a collection of rows that belong together for a particular reason
// -- all of the messages in this particular folder, all of the documents
// belonging to this particular author, and so on. Collections maintain
// indexes of their models, both in order, and for lookup by `id`.

// Create a new **Collection**, perhaps to contain a specific type of `model`.
// If a `comparator` is specified, the Collection will maintain
// its models in sort order, as they're added and removed.

import { Data } from "rebound-data/data";
import Model from "rebound-data/model";
import { $ } from "rebound-utils/rebound-utils";
import Path from "rebound-data/path";

// Default options for `Collection#set`.
const SET_OPTIONS = {add: true, remove: true, merge: true, clone: false};

// Function for checking whether an object should be considered a model for
// the purposes of adding to the collection. Looks for any data object
// so we can nest Collections without `Rebound.set` Wrapping them in a Model
function isModel(datum){ return datum && datum.isData; }

// Prepare a hash of attributes (or other model) to be added to this
// collection.
function prepareModel(attrs, options) {

  // If this is already a model, use the original Model unless asked to clone it.
  if (isModel(attrs)) return (options.clone === true) ? this.clone(attrs, options) : attrs;

  // If a plain object, make a new Model instance. Save its attribute data in `_pending`
  // to be set after insertion into the Collection
  options = _.extend({}, options, {hydrate: false});
  var model = new this.model(attrs, options);
  if (!model.validationError) return model;
  this.trigger('invalid', this, model.validationError, options);
  return false;
}

// Internal method called by both remove and set.
function removeModels(models, options) {
  var removed = [];
  for (var i = 0; i < models.length; i++) {
    var model = this.lookup(models[i]);
    var changed = {};
    if (!model) continue;

    var index = this.indexOf(model);
    Data.prototype.change.call(this, index);
    this.models.splice(index, 1);
    this.length--;

    // Remove references before triggering 'remove' event to prevent an
    // infinite loop. #3693
    delete this._byId[model.cid];
    var id = this.modelId(model.attributes);
    if (id != null) delete this._byId[id];

    options.index = index;

    if (!options.silent) {
      model.trigger('remove', model, this, options);
      this.trigger('remove', model, this, options);
    }

    removed.push(model);
    removeReference.call(this, model, options);
  }
  return removed;
}

// Pass modelId the model itself, not just the attributes, so it can get the
// idAttribute from the model itslef and not the collection
function addReference(model, options) {
  this._byId[model.cid] = model;
  var id = this.modelId(model, model.attributes || model);
  if (id != void 0) this._byId[id] = model;
  model.on('all', onModelEvent, this);
}

// Pass modelId the model itself, not just the attributes, so it can get the
// idAttribute from the model itslef and not the collection
function removeReference(model, options) {
  delete this._byId[model.cid];
  var id = this.modelId(model, model);
  if (id != null) delete this._byId[id];
  model.off('all', onModelEvent, this);
}

// Pass modelId the model itself, not just the attributes, so it can get the
// idAttribute from the model itself and not the collection
function onModelEvent(event, model, collection, options) {
  if ((event === 'add' || event === 'remove') && collection !== this) return;
  if (event === 'destroy') this.remove(model, options);
  if (event === 'change') {
    var prevId = this.modelId(model, model.previous());
    var id = this.modelId(model, model);
    if (prevId !== id) {
      if (prevId != null){ delete this._byId[prevId]; }
      if (id != null){ this._byId[id] = model; }
    }
  }
}

// Splices `insert` into `array` at index `at`.
function splice(array, insert, at) {
  at = Math.min(Math.max(at, 0), array.length);
  var tail = Array(array.length - at);
  var length = insert.length;
  var i;
  for (i = 0; i < tail.length; i++) tail[i] = array[i + at];
  for (i = 0; i < length; i++) array[i + at] = insert[i];
  for (i = 0; i < tail.length; i++) array[i + length + at] = tail[i];
};

export default class Collection extends Data {

  // All Collections have the read-only property `isCollection`
  get isCollection(){ return true; }
  set isCollection(val){ throw new Error(`Error: Property "isCollection" is read-only on object:`, this); }

  constructor(models=[], options={}){
    super(models, options);

    // Set Caches
    this.length = 0;
    this.models = [];
    this._byId  = {};
    this._byValue = {};

    // Process instance specific options
    if (options.model) this.model = options.model;
    if (options.comparator) this.comparator = options.comparator;


    // We don't want to pass any defaults to our children models. Delete them.
    delete options.defaults;

    // Normalize Input
    models.isCollection && (models = models.models);
    if (models) this.set(models, _.extend({}, options));
    else if (this.defaults) this.set(this.defaults, _.extend({}, options));

    // Unless told not to, call `hydrate` to set all values on our Collection.
    // if (options.hydrate !== false) this.hydrate();

  }

  // hydrate(models=[], options={}){
  //
  //   if (!this.hasOwnProperty('hydrate')) return console.warn('Warning: Attempted to hydrate an already hydrated Collection:', this);
  //   delete this.hydrate;
  //
  //   // We don't want to pass any defaults to our children models. Delete them.
  //   delete options.defaults;
  //
  //   // Normalize Input
  //   models.isCollection && (models = models.models);
  //   if (models) this.set(models, _.extend({}, options));
  //   else if (this.defaults) this.set(this.defaults, _.extend({}, options));
  //
  //   // Call the user provided initialize callback.
  //   this.initialize.call(this, models, options);
  //
  // }

  // Define how to uniquely identify models in the collection.
  // Always give precedence to the provided model's idAttribute. Fall back to
  // the Collection's idAttribute, and then to the default `id`.
  modelId(model={}, data={}){
    var idAttribute = model.idAttribute || this.model.prototype.idAttribute || 'id';
    return Path.query(idAttribute, data);
  }

  validate(models){
    return Array.isArray(models) || (models && models.isCollection);
  }

  location(obj){
    return this.indexOf(obj);
  }

  // Get a model from the set by id, cid, model object with id or cid
  // properties, or an attributes object that is transformed through modelId.
  lookup(obj=null){
    if (obj === null) return void 0;
    return this._byId[obj] || this._byId[this.modelId(obj, obj)] || obj.cid && this._byId[obj.cid];
  }

  [Data.get](key){
    return this.models[key];
  }

  [Data.set](key, models){
    return this.models.splice(key, 0, models);
  }

  [Data.delete](key){
    return this.models.splice(key, 1);
  }

  // Update a collection by `set`-ing a new list of models, adding new ones,
  // removing models that are no longer present, and merging models that
  // already exist in the collection, as necessary. Similar to **Model#set**,
  // the core operation for updating the data contained by the collection.
  set(models=null, options={}){

    if (models == null) return;

    // If models is a string, and it has parts, call set at that path
    if(typeof models === 'string'){
      let parts = Path.split(models),
          index = Number(parts[0]);
      if (Number.isNaN(index)) return this;
      return this.at(index).set(parts.splice(1, parts.length).join('.'), options);
    }

    if (models == null) return;

    // By default, set options are `{ add: true, remove: false, merge: true, clone: false }`
    options = _.extend({}, SET_OPTIONS, options);

    // If asked to parse the input, do so.
    if (options.parse) models = this.parse(models, options);

    // If another collection, treat like an array. If a plain model, wrap in array.
    var singular = !Array.isArray(models) && !models.isCollection;
    models = singular ? [models] : models.slice();

    super.dirty(options);

    // Determine the index at which to start adding models
    var at = options.at;
    if (at != null) at = +at;
    if (at > this.length) at = this.length;
    if (at < 0) at += this.length + 1;

    var set = [];
    var toAdd = [];
    var toMerge = [];
    var toRemove = [];
    var modelMap = {};

    var add = options.add;
    var merge = options.merge;
    var remove = options.remove;

    var sort = false;
    var sortable = this.comparator && at == null && options.sort !== false;
    var sortAttr = _.isString(this.comparator) ? this.comparator : null;

    // Turn bare objects into model references, and prevent invalid models
    // from being added.
    var model, i;
    for (i = 0; i < models.length; i++) {
      model = models[i];

      // If a duplicate is found, prevent it from being added and
      // optionally merge it into the existing model.
      var existing = this.lookup(model);
      if (window.foo) debugger;
      if (existing) {
        if (merge && model !== existing) {
          var attrs = isModel(model) ? model.attributes : model;
          if (options.parse) attrs = existing.parse(attrs, options);
          existing.set(attrs, options);
          toMerge.push(existing);
          if (sortable && !sort) sort = existing.hasChanged(sortAttr);
        }
        if (!modelMap[existing.cid]) {
          modelMap[existing.cid] = true;
          set.push(existing);
        }
        models[i] = existing;

      // If this is a new, valid model, push it to the `toAdd` list.
      } else if (add) {
        model = models[i] = prepareModel.call(this, model, options);
        if (model) {
          toAdd.push(model);
          modelMap[model.cid] = true;
          set.push(model);
        }
      }
    }

    // Remove stale models.
    if (remove) {
      for (i = 0; i < this.length; i++) {
        model = this.models[i];
        if (!modelMap[model.cid]) toRemove.push(model);
      }
      if (toRemove.length){ removeModels.call(this, toRemove, options); }
    }

    // See if sorting is needed, update `length` and splice in new models.
    var orderChanged = false;
    var replace = !sortable && add && remove;
    if (set.length && replace) {
      orderChanged = this.length !== set.length || _.some(this.models, function(m, index) {
        return m !== set[index];
      });
      this.models.length = 0;
      splice(this.models, set, 0);
      this.length = this.models.length;
    } else if (toAdd.length) {
      if (sortable) sort = true;
      splice(this.models, toAdd, at == null ? this.length : at);
      this.length = this.models.length;
    }

    // Silently sort the collection if appropriate.
    if (sort) this.sort({silent: true});

    // Unless silenced, it's time to fire all appropriate add/sort/update events.
    for (i = 0; i < toAdd.length; i++) {
      if (at != null) options.index = at + i;
      model = toAdd[i];
      addReference.call(this, model, options);
      if (!options.silent) {
        model.trigger('add', model, this, options);
        this.trigger('add', model, this, options);
      }
    }
    if (!options.silent) {
      if (sort || orderChanged) this.trigger('sort', this, options);
      if (toAdd.length || toRemove.length || toMerge.length) {
        options.changes = {
          added: toAdd,
          removed: toRemove,
          merged: toMerge
        };
        this.trigger('update', this, options);
      }
    }

    var previous = this.previous();
    var len = previous.length > this.length ? previous: this.models;
    for (let i=0; i<len; i++){
      if(previous[i].cid !== this.models[i]) super.change(`[${i}]`);
    }

    super.clean(options);

    // Return the added (or merged) model (or models).
    return singular ? models[0] : models;

  }

  // Add a model, or list of models to the set. `models` may be Rebound
  // Models or raw JavaScript objects to be converted to Models, or any
  // combination of the two.
  add(models, options) {
    return this.set(models, _.extend({merge: false, remove: false}, options));
  }

  // Remove a model, or a list of models from the set.
  remove(models, options) {
    super.dirty();
    options = _.extend({}, options);
    var singular = !_.isArray(models);
    models = singular ? [models] : models.slice();
    var removed = removeModels.call(this, models, options);
    if (!options.silent && removed.length) {
      options.changes = {added: [], merged: [], removed: removed};
      this.trigger('update', this, options);
    }
    super.clean();
    return singular ? removed[0] : removed;
  }

  // When you have more items than you want to add or remove individually,
  // you can reset the entire set with a new list of models, without firing
  // any granular `add` or `remove` events. Fires `reset` when finished.
  // Useful for bulk operations and optimizations.
  reset(models=[], options={}) {

    options = options ? _.extend({clone: true}, options) : {clone: true};

    // Validate input is an array or collection.
    // If asked to parse the input, do so – this must happen before we validate inuput.
    var input = (options.parse) ? this.parse(models, options) : models;
    if (!this.validate(input)) {
      throw new Error('Expected type Array or Collection for Collection.reset. Instead received:', models);
    }

    // If our parsed input is empty, use default values. Otherwise, keep the same. 
    // `Set` will re-parse the input for itself.
    models = input.length ? models : this.defaults;

    super.dirty(options);

    for (var i = 0; i < this.models.length; i++) {
      super.change(`[${i}]`);
      super.change(Data.flatten(this.models[i], `[${i}]`));
      removeReference.call(this, this.models[i], options);
    }
    options.previousModels = this.models;
    this.length = 0;
    this.models = [];
    this._byId  = {};
    models = this.add(models, _.extend({silent: true}, options));
    if (!options.silent) this.trigger('reset', this, options);
    super.clean(options);
    return models;
  }

  // Add a model to the end of the collection.
  push(model, options) { return this.add(model, _.extend({at: this.length}, options)); }

  // Remove a model from the end of the collection.
  pop(options) { return this.remove(this.at(this.length - 1), options); }

  // Add a model to the beginning of the collection.
  unshift(model, options) { return this.add(model, _.extend({at: 0}, options)); }

  // Remove a model from the beginning of the collection.
  shift(options) { return this.remove(this.at(0), options); }

  // Slice out a sub-array of models from the collection.
  slice() { return Array.prototype.slice.apply(this.models, arguments); }

  // Returns `true` if the model is in the collection.
  has(obj) { return this.lookup(obj) != null; }

  // Get the model at the given index.
  at(index) { index = parseInt(index); return this.models[(index < 0) ? index += this.length : index]; }

  // Return models with matching attributes. Useful for simple cases of
  // `filter`.
  where(attrs, first) { return this[first ? 'find' : 'filter'](attrs); }

  // Return the first model with matching attributes. Useful for simple cases
  // of `find`.
  findWhere(attrs) { return this.where(attrs, true); }

  // Pluck an attribute from each model in the collection.
  pluck(attr) { return this.map(attr + ''); }

  // Force the collection to re-sort itself. You don't need to call this under
  // normal circumstances, as the set will maintain sort order as each item
  // is added.
  sort(options={}) {
    var comparator = this.comparator;
    if (!comparator) throw new Error('Cannot sort a set without a comparator');
    options = _.extend({}, options);
    var length = comparator.length;
    if (_.isFunction(comparator)) comparator = comparator.bind(this);

    // Run sort based on type of `comparator`.
    if (length === 1 || _.isString(comparator)) {
      this.models = this.sortBy(comparator);
    } else {
      this.models.sort(comparator);
    }
    if (!options.silent) this.trigger('sort', this, options);
    return this;
  }

  // Create a new instance of a model in this collection. Add the model to the
  // collection immediately, unless `wait: true` is passed, in which case we
  // wait for the server to agree.
  create(model, options) {
    options = options ? _.clone(options) : {};
    var wait = options.wait;
    model = prepareModel.call(this, model, options);
    if (!model) return false;
    if (!wait) this.add(model, options);
    var collection = this;
    var success = options.success;
    options.success = function(m, resp, callbackOpts) {
      if (wait) collection.add(m, callbackOpts);
      if (success) success.call(callbackOpts.context, m, resp, callbackOpts);
    };
    model.save(null, options);
    return model;
  }

  // The JSON representation of a Collection is an array of the
  // models' attributes.
  toJSON(options) {
    if (this._isSerializing) return this.cid;
    this._isSerializing = true;
    var json = this.map(function(model) { return model.toJSON(options); });
    this._isSerializing = false;
    return json;
  }

  deinitialize(){
    super.deinitialize();
    _.each(this.models, function(val){ val && val.deinitialize && val.deinitialize(); });
    this.models.length = 0;
  }
}

// Set default...defaults
Collection.prototype.defaults = [];

// The default model for a collection is just a **Rebound.Model**.
// This should be overridden in most cases.
Collection.prototype.model = Model;
