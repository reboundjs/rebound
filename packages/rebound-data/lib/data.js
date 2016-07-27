'use strict';

// Rebound.Data
// ---------------

// A module that can be mixed in to *any object* in order to provide it with
// a deep parent child relationships.
//
//     var object = {};
//     _.extend(object, Backbone.Events);
//     object.on('expand', function(){ alert('expanded'); });
//     object.trigger('expand');

import { Events } from "rebound-data/events";
import { $, Path } from "rebound-utils/rebound-utils";
import { Model, Collection } from "rebound-data/rebound-data";

// These Symbols are used to hold private internal state of Data
const PARENT = Symbol('parent');
const CHILDREN = Symbol('children');
const CHANGED = Symbol('changed');
const PREVIOUS = Symbol('previous');
const DIRTY_COUNT = Symbol('dirty-count');
const PROPAGATION_QUEUE = Symbol('propagation-queue');
const PROPAGATION_STATE = Symbol('propagation-state');
const PROPAGATION_STATES = {
  NORMAL: 'NORMAL',
  PAUSED: 'PAUSED',
  STOPPED: 'STOPPED'
}

// Given an event name, check if it is a named event
const NAMED_EVENT = /^[^\.\[]+:/;
function isNamedEvent(name){ return $.isString(name) && name.match(NAMED_EVENT); }

// If the passed property name is invalid, wrap it with `[]`
function wrapInvalidProperty(property){
  return Path.isValid(property) ? property : `[${property}]`;
}

// Return a closure over a `key` and `obj`. When called will return the value of
// that key on the data object.
function lazyGetter(key, obj){
  return function lazyGetter(){
    return obj.get(key);
  };
}

// To make obj fully immutable, freeze each object in obj.
// To do so, we use this function.
function deepFreeze(obj) {

  // Retrieve the property names defined on obj
  var propNames = Object.getOwnPropertyNames(obj);

  // Freeze properties before freezing self
  propNames.forEach(function(name) {
    var prop = obj[name];

    // Freeze prop if it is an object
    if (typeof prop == 'object' && prop !== null)
      deepFreeze(prop);
  });

  // Freeze self (no-op if already frozen)
  return Object.freeze(obj);
}

function propagateEvent( ...args ){

  var parent = this.parent;
  var options = args[args.length - 1];
  _.isObject(options) || (options = {});

  // If the options hash asks us not to propagate this even, stop.
  // If this is the root of the data tree, stop.
  if ( options.propagate === false || options.propagate === 0 || !parent ) return this;

  // If `options.propagate` is an interger specifying how far up to propagate, decrement the value.
  Number.isInteger(options.propagate) && options.propagate--;

  // If the event name is a String (as opposed to a Symbol), ensure it is a named
  // event and prepend on the source key to the named event path.
  // TODO: Clean this up. Messy, and modifying the arguments list is very bad.
  if (typeof args[0] === 'string') {
    !isNamedEvent(args[0]) && (args[0] += ':');
    args[0] = args[0].replace(':', ':' + wrapInvalidProperty(this.key) + ((/:\[|:$/g).test(args[0]) ? '' : '.'));
  }

  // Trigger newly named event on our parent
  parent.trigger.apply(parent, args);

  return this;

}


export default class Data extends Events {

  constructor(data, options={}){
    super();

    this.cid = $.uniqueId(this.constructor.name);
    this._key = null;
    this[PARENT] = null;
    this[CHILDREN] = [];
    this[PREVIOUS] = Object.freeze({});
    this[CHANGED] = {};
    this[DIRTY_COUNT] = 0;
    this[PROPAGATION_STATE] = PROPAGATION_STATES.NORMAL;
    this[PROPAGATION_QUEUE] = [];

    $.makeProtected(this, Data, ['change', 'dirty', 'clean']);

    if (options.defaults){
      if (this.validate(options.defaults)){
        this.defaults = _.extend(new this.defaults.constructor(), this.defaults, options.defaults);
      }
      else {
        console.error(`Invalid defaults provided for new ${this.constructor.name}:`, this, "Instead received:", options.defaults);
      }
    }

  }

  // `initialize` is an empty function by default. Override it with your own initialization logic.
  initialize(){}

  // `get`, `set`, `remove` `location` and `validate` are empty functions by default. Override it with your own Data storage logic.
  set(key, value){ return this; }
  get(key){ return this; }
  remove(obj){ return this; }
  location(obj){ return ''; }
  validate(data){ return true; }
  toJSON(){ return {}; }

  // `fetch`, `save`, `destroy` and `toJSON` are empty functions by default. Override it with your own Data persistance logic.
  fetch(options){ return Promise.resolve(); }
  save(options){ return Promise.resolve(); }
  destroy(options){ return Promise.resolve(); }
  parse(resp){ return resp; }

  // For debugging purposes, override the `Symbol.toStringTag` tag to output
  // `[object ${this.cid}]` when any data type is cast as a string.
  get [Symbol.toStringTag](){ return this.cid; }

  // All data object have the read-only property `isData`
  get isData(){ return true; }
  set isData(val){ throw new Error(`Error: Property "getData" is read-only on object:`, this); }

  trigger( ...args ){

    super.trigger.apply(this, args);

    // If propagation is paused, break. If propagation is paused, push event to
    // the propagation queue, otherwise, propagate event. Always return `this`.
    if (this.isPropagationStopped()) return this;
    if (this.isPropagationPaused()) return this[PROPAGATION_QUEUE].push(args) && this;
    return propagateEvent.apply(this, args);

  }

  isPropagationStopped(){ return this[PROPAGATION_STATE] === PROPAGATION_STATES.STOPPED; }
  stopPropagation(){
    this[PROPAGATION_STATE] = PROPAGATION_STATES.STOPPED;
    this[PROPAGATION_QUEUE] = [];
  }

  isPropagationPaused(){ return this[PROPAGATION_STATE] === PROPAGATION_STATES.PAUSED; }
  pausePropagation(){
    if (this.isPropagationStopped()) return;
    Data.prototype.dirty.call(this);
    this[PROPAGATION_STATE] = PROPAGATION_STATES.PAUSED;
  }

  resumePropagation(){
    this[PROPAGATION_STATE] = PROPAGATION_STATES.NORMAL;
    Data.prototype.clean.call(this);
    if (!this[PROPAGATION_QUEUE].length) return;
    this[PROPAGATION_QUEUE].forEach((event) => {
      propagateEvent.apply(this, event);
    });
  }

  // Increment the dirty counter on self and all parents.
  // If not yet changing, reset changed hash and save our previous values.
  dirty(options={}){
    var obj = this;
    do {
      if (!obj[DIRTY_COUNT]++){
        obj[CHANGED] = {};
        obj[PREVIOUS] = deepFreeze(this.toJSON());
        if (!options.silent) obj.trigger('dirty', obj, { propagate: false });
      }
    } while (obj = obj.parent);
    return this;
  }

  // Once the transaction is finished running, decrement the dirty counter on
  // self and all parents – never go below zero.
  // If sub-tree is completly clean Trigger a final clean event so we know we're done.
  clean(options={}){
    var obj = this;
    do {
      if (obj[DIRTY_COUNT] && !--obj[DIRTY_COUNT] && !options.silent) {
        obj.trigger('clean', obj, { propagate: false });
        if (this.isPropagationStopped()) this[PROPAGATION_STATE] = PROPAGATION_STATES.NORMAL;
      }
    } while (obj = obj.parent);
    return this;
  }

  // On get, return the internal changed hash.
  // On set, add a new lazy accessor to the internal changed hash
  change(obj, hasChanged){

    // Validate input
    if ( !$.isObject(obj) && !$.isString(obj) ) throw new Error('ERROR: Expected new changed key to be a string or object. Instead received', obj);

    // If not changing, don't modify any properties on the changed hash
    if (!this.isChanging()) {
      console.error(`ERROR: Attempting to set changed value on the clean data object ${this}. Please mark the data as 'dirty' before logging changed values.`);
      return this;
    }

    // Get a list of paths to add to our changed hash.
    var paths = $.isString(obj) ? [obj] : Object.keys(obj);

    // For each new path, ensure a lazyGetter is on our changed hash and pass change up to parent.
    var current = this;
    do {
      let len = paths.length;
      for (let i=0; i<len; i++) {
        let path = paths[i];

        if (hasChanged === false) delete this[CHANGED][path];
        else if (!current[CHANGED].hasOwnProperty(path)) {
          Object.defineProperty(current[CHANGED], path, {
            get: lazyGetter(path, current),
            set(val){ throw new Error(`ERROR: Property "${path}" is read-only on object:`, current); },
            enumerable: true,
            configurable: true
          });
        }

        var parentKey = current.key;
        paths[i] = Path.join(parentKey, path);
        paths.push(Path.join(parentKey));
      }
    } while ( current = current.parent );

    return this;
  }

  // Set this data object's parent to `parent`, as long as a data object is not its own ancester.
  // If `parent` object passed is falsy or not a data object, remove this Data object's parent entirely.
  // Before switching to a new parent, be sure to remove this object from its previous parent.
  get parent(){ return this[PARENT]; }
  set parent(parent){

    // If this object contains its future parent, this would create a recursive dependancy. Throw.
    if (this.contains(parent)) throw new Error(`Uncaught DataException: Failed to set parent of '${this.cid}' to '${parent.cid}', the child element contains the parent. Please clone this data object to prevent cyclic data dependancies.`, this, parent);

    // Save a referance to the previous parent before clearing it and our key cache.
    var oldParent = this[PARENT];

    // If there was a previous parent, remove ourselves and delete the child referances.
    if(oldParent && !this._removing){
      var oldChildren = oldParent[CHILDREN];
      this._removing = true;
      oldParent.remove(this);
      this._removing = false;
      oldChildren.splice(oldChildren.indexOf(this), 1);
      delete oldChildren[this.cid];
    }

    // Reset our key cache so next call to `key` will re-compute the location.
    this._key = null;

    // If no new parent is provided, return null.
    if (!parent || !parent.isData) return this[PARENT] = null;

    // Save the new parent and add to its child referances.
    this[PARENT] = parent;
    var children = parent[CHILDREN];
    children.push(this);
    children[this.cid] = this;

    // If the new parent is not the same as the previous, add the new sub-tree's dirty
    // count to all parents, and re-set changed values so they are propagated up to our
    // new parent higherarchy.
    if (oldParent !== parent) {
      var obj = parent;
      do { obj[DIRTY_COUNT] += this[DIRTY_COUNT]; } while (obj = obj[PARENT]);

      // TODO: We are bumping DIRTY_COUNT here just so we can use the change propagation
      //       algo in `change()`. We can't call dirty and clean because it may blow away
      //       existing chaned values, but we have to ensure `isChanging()` returns
      //       true so `change()` doesn't log an error. This is a little weird.
      this[DIRTY_COUNT]++;
      Data.prototype.change.call(this, this.changed());
      this[DIRTY_COUNT]--;
    }

    return parent;
  }

  // Returned a frozen shallow copy of this element's children nodes.
  children() { return Object.freeze(Object.assign([], this[CHILDREN])); }

  // Fetch the `root` Data object from this `parent` tree.
  // TODO: I don't like traversing the entire tree each time to get `root`. Fix this.
  get root(){ var obj = this; while(obj.parent){ obj = obj.parent; } return obj; }
  set root(val){ throw new Error(`Error: Property "root" is read-only on object`, this); }

  // Return this element's location in its parent. Cache its value so we only need to recover it once.
  // If data is not found in collection, check previous models list to accurately name `remove` events
  get key(){
    if (this._scope) return this._scope; // TODO: Remove once we figure out how to give Services multiple parents
    if (!this.parent) return '';
    if (this._key !== null) return this._key;
    return this._key = String(this.parent.location(this));
  }
  set key(val){ throw new Error(`Error: Property "key" is read-only on object`, this); }

  get path(){
    var parent = this.parent;
    if (!parent) return '';
    return Path.join(parent.path, this.key);
  }
  set path(val){ throw new Error(`Error: Property "path" is read-only on object`, this); }

  changed(key){ return $.isString(key) ? this[CHANGED][key] : Object.freeze(Object.assign({}, this[CHANGED])); }

  // Get the previous values of a data object, recorded at the time the last
  // `"change"` event was fired.
  previous(path){ return path ? Path(path).query(this[PREVIOUS]) : this[PREVIOUS]; }

  // Determine if the model has changed since the last `"change"` event.
  // If you specify an attribute name, determine if that attribute has changed.
  hasChanged(attr) { return (attr == null) ? !!Object.keys(this[CHANGED]).length : this[CHANGED].hasOwnProperty(attr); }

  isChanging(){ return this[DIRTY_COUNT] >= 1; }

  // Tests to see if `obj` has `this` as an ancestor.
  contains(obj){
    if (obj) do { if(obj === this) return true; } while (obj = obj.parent);
    return false;
  }

  // Select the basic constructor. If array, then Collection, otherwise, Collection default, or Model
  // If data has a custom constructor, use that instead. Always choose the most unique.
  // Give them the same cid so our helpers treat them as the same object
  // Return the new instance.
  clone(data, options={}){
    // List of default constructors that a data object may encounter when cloning
    const DEFAULT_CONSTRUCTORS = [Array, Object, Model];
    data || (data = this);
    var C = (Array.isArray(data) || data.isCollection) ? Collection : (this.model || Model);
    if(!~DEFAULT_CONSTRUCTORS.indexOf(data.constructor)){ C = data.constructor; }
    var obj = new C(data, options);
    obj.cid = data.cid;
    return obj;
  }

  // De-initializes a data tree starting with `this` and recursively calling `deinitialize()` on each child.
  deinitialize() {

  // Undelegate Backbone Events from this data object
    this.stopListening();
    this.off();

  // Destroy this data object's lineage
    this[PARENT] = null;
    var len = this[CHILDREN].length;
    for (let i=0; i<len; i++) this[CHILDREN][i].deinitialize();
    delete this[CHILDREN]

  // Mark as deinitialized
    this.deinitialized = true;

  }

}

export { Data as Data };