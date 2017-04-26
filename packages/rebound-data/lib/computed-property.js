// Rebound Computed Property
// ----------------

import { Data } from "rebound-data/data";
import propertyCompiler from "property-compiler/property-compiler";
import { $, Queue } from "rebound-utils/rebound-utils";
import Path from "rebound-data/path";

const QUEUE = new Queue(function(item){ item.call(); });

var CALL_TIMEOUT;

function computeCallback(obj){
  CALL_TIMEOUT = null;
  QUEUE.process();
}

// Returns true if str starts with test
function startsWith(str, test){
  if(str === test){ return true; }
  return str.substring(0, test.length+1) === test+'.' || test.substring(0, str.length+1) === str+'.';
}

// Attached to listen to all events where this Computed Property's dependancies
// are stored. See wire(). Will re-evaluate any computed properties that
// depend on the changed data value which triggered this callback.
function onChange(model, options={}){
if ( window.foo ) debugger;
  // Get all changed properties since the last update
  var changed = Object.keys(this.changed());
  var computed = Object.keys(this.__computedDeps);

  for(let i=0;i<computed.length;i++){
    for(let j=0;j<changed.length;j++){
      startsWith(computed[i], changed[j]) && QUEUE.add(this.__computedDeps[computed[i]])
    }
  }

  // Notifies all computed properties in the dependants array to recompute.
  // Push all recomputes to the end of our stack trace so all Computed Properties
  // already queued for recompute get a chance to.
  if(!CALL_TIMEOUT){ CALL_TIMEOUT = setTimeout(computeCallback, 0, this); }

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
      this.isEvaluating = false;

      if(getter){ this.getter = getter; }
      if(setter){ this.setter = setter; }

      // Create lineage to pass to our cache objects
      // this.parent = options.parent;

      // Fetch our list of dependancies by statically analyzing the getter
      this.deps = propertyCompiler.compile(this.getter, this.key);

      // Results Cache Objects
      // These data objects will never be re-created for the lifetime of the Computed Proeprty
      // On Recompute they are updated with new values.
      // On Change their new values are pushed to the object it is tracking
      this.cache = {
        model: new Rebound.Model({}),
        collection: new Rebound.Collection([]),
        value: undefined
      };

      // Listen to objects in the cache and push changes to them on modify
      this.listenTo(this.cache.model, 'all', this.onModify, this);
      this.listenTo(this.cache.collection, 'all', this.onModify, this);

      var cache = this.cache;
      cache.model.cid = cache.collection.cid = this.cid;
      // cache.model.parent = cache.collection.parent = this.parent;

      this.makeDirty();
      this.wire();
      this.call();

      // Prepare the hydrate method for callback and call unless we are instructed not to.
      // this.hydrate = this.hydrate.bind(this, getter, setter, options);
      // if (options.hydrate !== false) this.hydrate();

  }

  // All ComputedProperties have the read-only property `isComputedProperty`
  get isComputedProperty(){ return true; }
  set isComputedProperty(val){ throw new Error(`Error: Property "isModel" is read-only on object:`, this); }

  // Getter and setter values are noop by default.
  // These are overwritten by methods passed into the constructor.
  getter(){ return void 0; };
  setter(){ return void 0; };

  makeDirty(){
    return !this.isChanging() && !!super.dirty();
  }

  // Called when a Computed Property's active cache object changes.
  // Pushes any changes to Computed Property that returns a data object back to
  // the original object.
  // TODO: Will be a hair faster with individual callbacks for each event type
  // TODO: There may be a more selective way to push changes out to the source rather than let `set` handle the merge
  onModify(type, model={}, collection={}, options={}){
    if( this.isEvaluating || !this.tracking || !this.tracking.reset ) return void 0;
    this.tracking.reset(this.value(), {clone: true});
  }

  // Adds a litener to the root object and tells it what properties this
  // Computed Property depend on.
  // The listener will re-compute this Computed Property when any are changed.
  wire(){

    var root = this.root;
    var context = this.parent;
    root.__computedDeps || (root.__computedDeps = {});

    _.each(this.deps, function(path){

      // For each dependancy, mark ourselves as dirty if they become dirty
      var dep = root.get(path, {raw: true});
      if(dep && dep.isComputedProperty){ dep.on('dirty', this.makeDirty, this); }

      // Find actual context and path from relative paths
      var split = Path.split(path);
      while(split[0] === '@parent'){
        context && (context = context.parent || context); // TODO: Do we really want to allow unlimited `@parent` calls? Will stay at root as of now.
        split.shift();
      }
      path = context.path.replace(/\.?\[.*\]/ig, '.@each');
      path = path + (path && '.') + split.join('.');

      // Add ourselves as dependants
      root.__computedDeps[path] || (root.__computedDeps[path] = []);
      root.__computedDeps[path].push(this);
    }, this);

    // Ensure we only have one listener per Model at a time.
    root.off(null, onChange).off(null, onChange);
    root.on('reset:@all', onChange).on('update:@all', onChange);

  }

  unwire(){
    var root = this.__root__;
    var context = this.parent;

    _.each(this.deps, function(path){
      var dep = root.get(path, {raw: true});
      if(!dep || !dep.isComputedProperty){ return void 0; }
      dep.off('dirty', this.makeDirty);
    }, this);

    context && context.off(null, onChange);
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
    if( !this.isChanging() || this.isEvaluating || !context ){ return void 0; }

    // Mark this Computed Property as in the process of changing
    this.isEvaluating = true;

    // Check all of our dependancies to see if they are evaluating.
    // If we have a dependancy that is dirty and this isnt its first run,
    // Let this dependancy know that we are waiting for it.
    // It will re-run this Computed Property after it finishes.
    _.each(this.deps, function(dep){
      var dependancy = context.get(dep, {raw: true});
      if( !dependancy || !dependancy.isComputedProperty ){ return void 0; }
      if(dependancy.isChanging() && dependancy.returnType !== null){
        dependancy.waiting[this.cid] = this;
        dependancy.apply(); // Try to re-evaluate this dependancy if it is dirty
        if(dependancy.isChanging()){ return this.isEvaluating = false; }
      }
      delete dependancy.waiting[this.cid];
      // TODO: There can be a check here looking for cyclic dependancies.
    }, this);

    if(!this.isEvaluating){ return void 0; }


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
      this.reset(result, {clone: true});
    }

    // If this is a model, set the return types and bind events.
    // If this model is the same as a previus run, just apply the changes to it.
    // If this is a different model, reset all of the values to the new ones.
    else if(result.isModel || _.isObject(result)){
      this.returnType = 'model';
      this.isCollection = false;
      this.isModel = true;
      this.reset(result, {clone: true});
    }

    // Otherwise, result is a primitive. Set values appropreately.
    else{
      this.returnType = 'value';
      this.isCollection = this.isModel = false;
      this.set(result);
    }

    // Track result to push changes in the computed property back to the original object
    this.track(result);
    this.isEvaluating = false;
    super.clean();
    return this.value();
  }

  // When we receive a new model to set in our cache, unbind the tracker from
  // the previous cache object, sync the objects' cids so helpers think they
  // are the same object, save a referance to the object we are tracking,
  // and re-bind our onModify hook.
  track(object){ this.tracking = object; }

  // Get from the Computed Property's cache
  at(key, options={}){
    if (options.raw) return this;
    if(this.returnType === 'value'){ return console.error('Called at on the `'+ this.path +'` computed property which returns a primitive value.'); }
    return this.value().at(key, options);
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

    this.makeDirty();

    // If a new value, set it and trigger events
    this.setter && this.setter.call(this.parent, attrs);

    if(this.returnType === 'value' && this.cache.value !== attrs) {
      this.cache.value = attrs;
      super.change.call(this.parent, this.key);
      if(!options.quiet){
        this.parent.trigger('change:'+this.key, this.parent, attrs);
        this.parent.trigger('update', this.parent);
      }
    }
    else if(this.returnType !== 'value' && options.reset){ key = value.reset(attrs, options); }
    else if(this.returnType !== 'value'){ key = value.set(attrs, options); }

    // Mark self as clean
    this.isEvaluating = false;
    super.clean();

    // Call all reamining computed properties waiting for this value to resolve.
    _.each(this.waiting, function(prop){ prop && prop.call(); });

    return key;
  }

  get [Data.value](){
    if(this.isChanging() && !this.isEvaluating){ this.apply(); }
    return this.cache[this.returnType];
  }
  set [Data.value](val){ return this.set(val); }

  // Return the current value from the cache, running if dirty.
  value(){
    if(this.isChanging() && !this.isEvaluating){ this.apply(); }
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

export default ComputedProperty;
