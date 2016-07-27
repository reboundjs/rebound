// Rebound Computed Property
// ----------------

import { Data, CHANGE_EVENT } from "rebound-data/data";
import propertyCompiler from "property-compiler/property-compiler";
import { $, Path, Queue } from "rebound-utils/rebound-utils";

const NOOP = function(){ return void 0; };

const QUEUE = new Queue(function(item){ item.call(); });

var CALL_TIMEOUT;

function computeCallback(){
  CALL_TIMEOUT = null;
  QUEUE.process();
}

// Returns true if str starts with test
function startsWith(str, test){
  if(str === test){ return true; }
  return str.substring(0, test.length+1) === test+'.';
}

// Attached to listen to all events where this Computed Property's dependancies
// are stored. See wire(). Will re-evaluate any computed properties that
// depend on the changed data value which triggered this callback.
function onChange(model, options={}){
  // Compute the path to this data object that triggered the event
  // TODO: Figure out a better way to prefix service data paths with their local path name
  var path, vector;
  vector = path = ((options.service) ? `${options.service}.`: '') + model.path.replace(/\.?\[.*\]/ig, '.@each');

  // For each changed attribute, queue up anything that depends on that changed path.
  var key, dependancy, changed = model.changed();
  for(key in changed){
    if(!changed.hasOwnProperty(key)){ continue; }
    vector = path + (path && '.') + key.replace(/\.?\[.*\]/ig, '.@each');
    for(dependancy in this.__computedDeps){
      if(!this.__computedDeps.hasOwnProperty(dependancy)){ continue; }
      startsWith(vector, dependancy) && QUEUE.add(this.__computedDeps[dependancy]);
    }
  }

  // Notifies all computed properties in the dependants array to recompute.
  // Push all recomputes to the end of our stack trace so all Computed Properties
  // already queued for recompute get a chance to.
  if(!CALL_TIMEOUT){ CALL_TIMEOUT = setTimeout(computeCallback, 0); }

}

function onUpdate(collection, options={}){

  // Compute the path to this data object that triggered the event
  // TODO: Figure out a better way to prefix service data paths with their local path name
  var path, vector;
  vector = path = ((options.service) ? `${options.service}.`: '') + collection.path.replace(/\.?\[.*\]/ig, '.@each');

  // If an add or remove event, check for computed properties that depend on
  // anything inside that collection or that contains that collection.
  _.each(this.__computedDeps, function(dependants, dependancy){
    if( startsWith(dependancy, vector) || startsWith(vector, dependancy) ){ QUEUE.add(dependants); }
  }, this);

  // Notifies all computed properties in the dependants array to recompute.
  // Push all recomputes to the end of our stack trace so all Computed Properties
  // already queued for recompute get a chance to.
  if(!CALL_TIMEOUT){ CALL_TIMEOUT = setTimeout(computeCallback, 0); }

}

function onReset(data, options={}){

  // Compute the path to this data object that triggered the event
  // TODO: Figure out a better way to prefix service data paths with their local path name
  var path, vector;
  vector = path = ((options.service) ? `${options.service}.`: '') + data.path.replace(/\.?\[.*\]/ig, '.@each');

  // If a reset event on a Model, check for computed properties that depend
  // on each changed attribute's full path.
  if(data.isModel){
    _.each(options.previous, function(value, key){
      vector = path + (path && '.') + key.replace(/\.?\[.*\]/ig, '.@each');
      _.each(this.__computedDeps, function(dependants, dependancy){
        startsWith(vector, dependancy) && QUEUE.add(dependants);
      }, this);
    }, this);
  }

  // If a reset event on a Collction, check for computed properties that depend
  // on anything inside that collection.
  else if(data.isCollection){
    _.each(this.__computedDeps, function(dependants, dependancy){
      startsWith(dependancy, vector) && QUEUE.add(dependants);
    }, this);
  }

  // Notifies all computed properties in the dependants array to recompute.
  // Push all recomputes to the end of our stack trace so all Computed Properties
  // already queued for recompute get a chance to.
  if(!CALL_TIMEOUT){ CALL_TIMEOUT = setTimeout(computeCallback, 0); }

}


class ComputedProperty extends Data {
  constructor(getter, setter, options={}){

      if(!_.isFunction(getter) && !_.isFunction(setter)){
        return console.error('ComputedProperty constructor must be passed getter and setter functions!', getter, 'and', setter, 'Found instead.');
      }

      super();

      this.cid = $.uniqueId('computedPropety');
      this.returnType = null;
      this.waiting = {};
      this.isChanging = false;
      this.isDirty = true;

      if(getter){ this.getter = getter; }
      if(setter){ this.setter = setter; }

      // Create lineage to pass to our cache objects
      this.parent = options.parent;

      // Fetch our list of dependancies by statically analyzing the getter
      this.deps = propertyCompiler.compile(this.getter, this.key);

      // Results Cache Objects
      // These data objects will never be re-created for the lifetime of the Computed Proeprty
      // On Recompute they are updated with new values.
      // On Change their new values are pushed to the object it is tracking
      var lineage = { parent: this.parent };
      this.cache = {
        model: new Rebound.Model({}, lineage),
        collection: new Rebound.Collection([], lineage),
        value: undefined
      };

      // Listen to objects in the cache and push changes to them on modify
      this.listenTo(this.cache.model, 'all', this.onModify, this);
      this.listenTo(this.cache.collection, 'all', this.onModify, this);

      this.wire();
      this.makeDirty();
  }


  // If the Computed Property is not already dirty, mark it as such and trigger
  // a `dirty` event.
  makeDirty(){
    if (this.isDirty) return void 0;
    this.isDirty = true;
    this.trigger('dirty', this, {propagate: false});
  }

  // Called when a Computed Property's active cache object changes.
  // Pushes any changes to Computed Property that returns a data object back to
  // the original object.
  // TODO: Will be a hair faster with individual callbacks for each event type
  onModify(type, model={}, collection={}, options={}){

    var shortcircuit = { sort: 1, request: 1, destroy: 1, sync: 1, error: 1, invalid: 1, route: 1 };
    if( this.isChanging || !this.tracking || shortcircuit[type] || ~type.indexOf('change:') ){ return void 0; }
    !collection.isData && _.isObject(collection) && (options = collection) && (collection = model);

    var path = collection.path.replace(this.path, '').replace(/^\./, '');

    // Need to pass isPath: true here because when syncing across computed properties
    // that return collections we may just be passing the model index for the path.
    var dest = Path(path).query(this.tracking);

    if(dest === void 0){ return void 0; }
    if(type === 'change' && model.hasChanged()){ dest.set && dest.set(model.changed(), {clone: true}); }
    else if(type === 'reset'){ dest.reset && dest.reset(model, {clone: true}); }
    else if(type === 'update'){ dest.set && dest.set(model, {clone: true}); }
    else if(type === 'add'){ dest.add && dest.add(model, {clone: true}); }
    else if(type === 'remove'){ dest.remove && dest.remove(model); }
    // TODO: Add sort

  }

  // Adds a litener to the root object and tells it what properties this
  // Computed Property depend on.
  // The listener will re-compute this Computed Property when any are changed.
  wire(){

    var root = this.__root__;
    var context = this.parent;
    root.__computedDeps || (root.__computedDeps = {});

    _.each(this.deps, function(path){

      // For each dependancy, mark ourselves as dirty if they become dirty
      var dep = root.get(path, {raw: true, isPath: true});
      if(dep && dep.isComputedProperty){ dep.on('dirty', this.makeDirty, this); }

      // Find actual context and path from relative paths
      var split = Path(path).split();
      while(split[0] === '@parent'){
        context && (context = context.parent);
        split.shift();
      }
      path = context.path.replace(/\.?\[.*\]/ig, '.@each');
      path = path + (path && '.') + split.join('.');

      // Add ourselves as dependants
      root.__computedDeps[path] || (root.__computedDeps[path] = []);
      root.__computedDeps[path].push(this);
    }, this);

    // Ensure we only have one listener per Model at a time.
    root.off(null, onChange).off(null, onReset).off(null, onUpdate);
    root.on('change', onChange).on('reset', onReset).on('update', onUpdate);

  }

  unwire(){
    var root = this.__root__;
    var context = this.parent;

    _.each(this.deps, function(path){
      var dep = root.get(path, {raw: true, isPath: true});
      if(!dep || !dep.isComputedProperty){ return void 0; }
      dep.off('dirty', this.makeDirty);
    }, this);

    context && context.off(null, onChange).off(null, onReset).off(null, onUpdate);
  }

  // Call this computed property like you would with Function.call()
  call(){
    var args = Array.prototype.slice.call(arguments),
        context = args.shift();
    return this.apply(context, args);
  }

  // Call this computed property like you would with Function.apply()
  // Only properties that are marked as dirty and are not already computing
  // themselves are evaluated to prevent cyclic callbacks. If any dependants
  // aren't finished computeding, we add ourselved to their waiting list.
  // Vanilla objects returned from the function are promoted to Rebound Objects.
  // Then, set the proper return type for future fetches from the cache and set
  // the new computed value. Track changes to the cache to push it back up to
  // the original object and return the value.
  apply(context, params){

    context || (context = this.parent);

    // Only re-evaluate this Computed Property if this value is dirty, not already
    // evaluating, and part of a data tree.
    if( !this.isDirty || this.isChanging || !context ){ return void 0; }

    // Mark this Computed Property as in the process of changing
    this.isChanging = true;

    // Check all of our dependancies to see if they are evaluating.
    // If we have a dependancy that is dirty and this isnt its first run,
    // Let this dependancy know that we are waiting for it.
    // It will re-run this Computed Property after it finishes.
    _.each(this.deps, function(dep){
      var dependancy = context.get(dep, {raw: true, isPath: true});
      if( !dependancy || !dependancy.isComputedProperty ){ return void 0; }
      if(dependancy.isDirty && dependancy.returnType !== null){
        dependancy.waiting[this.cid] = this;
        dependancy.apply(); // Try to re-evaluate this dependancy if it is dirty
        if(dependancy.isDirty){ return this.isChanging = false; }
      }
      delete dependancy.waiting[this.cid];
      // TODO: There can be a check here looking for cyclic dependancies.
    }, this);

    if(!this.isChanging){ return void 0; }


    // Get our existing value object
    var value = this.cache[this.returnType];

    // Run our getter method to fetch the new result value and retreive current
    // value from the cache
    var result = this.getter.apply(context, params);

    // If result is undefined, reset our cache item
    if(result === void 0 || result === null){
      this.returnType = 'value';
      this.isCollection = this.isModel = false;
      this.set(undefined);
    }

    // Set result and return types, bind events
    // Ensure that the collection's model constructor and comparator matches the returned collection.
    // Use .set instead of .reset to trigger individual changes for internal models
    else if(result.isCollection || _.isArray(result)){
      this.returnType = 'collection';
      this.isCollection = true;
      this.isModel = false;
      this.cache.collection.model = result.isCollection ? result.model : Rebound.Model;
      this.cache.collection.comparator = result.isCollection ? result.comparator : (void 0);
      this.set(result);
    }

    // If this is a model, set the return types and bind events.
    // If this model is the same as a previus run, just apply the changes to it.
    // If this is a different model, reset all of the values to the new ones.
    else if(result.isModel || _.isObject(result)){
      this.returnType = 'model';
      this.isCollection = false;
      this.isModel = true;
      this.reset(result);
    }

    // Otherwise, result is a primitive. Set values appropreately.
    else{
      this.returnType = 'value';
      this.isCollection = this.isModel = false;
      this.set(result);
    }

    // Track result to push changes in the computed property back to the original object
    this.track(result);

    return this.value();
  }

  // When we receive a new model to set in our cache, unbind the tracker from
  // the previous cache object, sync the objects' cids so helpers think they
  // are the same object, save a referance to the object we are tracking,
  // and re-bind our onModify hook.
  track(object){
    this.tracking = object;
    var target = this.value();
    if(!object || !target || !target.isData || !object.isData){ return void 0; }
    target._cid || (target._cid = target.cid);
    object._cid || (object._cid = object.cid);
    target.cid = object.cid;
  }

  // Get from the Computed Property's cache
  get(key, options={}){
    if(this.returnType === 'value'){ return console.error('Called get on the `'+ this.key +'` computed property which returns a primitive value.'); }
    return this.value().get(key, options);
  }

  // Set the Computed Property's cache to a new value and trigger appropreate events.
  // Changes will propagate back to the original object if a Rebound Data Object and re-compute.
  // If Computed Property returns a value, all downstream dependancies will re-compute.
  set(key, val, options={}){

    var attrs = key;
    var value = this.value();

    // If return type is still null after calling `this.value`, we must be waiting
    // for something else to resolve. We can't set right now. Break.
    if(this.returnType === null){ return void 0; }

    // Noralize the data passed in
    if(this.returnType === 'model'){
      if (typeof key === 'object') {
        attrs = (key.isModel) ? key.attributes : key;
        options = val || {};
      } else {
        (attrs = {})[key] = val;
      }
    }
    if(this.returnType !== 'model'){ options = val || {}; }
    attrs = (attrs && attrs.isComputedProperty) ? attrs.value() : attrs;

    // If a new value, set it and trigger events
    this.setter && this.setter.call(this.__root__, attrs);

    if(this.returnType === 'value' && this.cache.value !== attrs) {
      this.cache.value = attrs;
      if(!options.quiet){
        // If set was called not through computedProperty.call(), this is a fresh new event burst.
        if(!this.isDirty && !this.isChanging) this.parent._changed = {};
        this.trigger('change:'+this.key, this.parent, attrs);
        this.parent._changed[this.key] = attrs;
        this.trigger('change', this.parent);
        delete this.parent._changed[this.key];
      }
    }
    else if(this.returnType !== 'value' && options.reset){ key = value.reset(attrs, options); }
    else if(this.returnType !== 'value'){ key = value.set(attrs, options); }
    this.isDirty = this.isChanging = false;

    // Call all reamining computed properties waiting for this value to resolve.
    _.each(this.waiting, function(prop){ prop && prop.call(); });

    return key;
  }

  // Return the current value from the cache, running if dirty.
  value(){
    if(this.isDirty && !this.isChanging){ this.apply(); }
    return this.cache[this.returnType];
  }

  // Reset the current value in the cache, unless if first run.
  reset(obj, options={}){
    if(this.returnType === null){ return void 0; }
    options.reset = true;
    return this.set(obj, options);
  }

  // Cyclic dependancy safe toJSON method.
  toJSON() {
    if (this._isSerializing){ return this.cid; }
    var val = this.value();
    this._isSerializing = true;
    var json = (val && _.isFunction(val.toJSON)) ? val.toJSON() : val;
    this._isSerializing = false;
    return json;
  }

  deinitialize(){
    super.deinitialise();
    this.unwire();
    this.cache.collection.deinitialize();
    this.cache.model.deinitialize();
  }

}

_.extend(ComputedProperty.prototype, {

  isComputedProperty: true,
  getter: NOOP,
  setter: NOOP

});

export default ComputedProperty;
