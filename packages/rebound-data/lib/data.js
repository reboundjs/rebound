'use strict';

// Rebound Data Core
// ---------------

// A module that can be extended in order to provide subclasses with
// deep parent child relationships using value or key-value storage.
//
//     class Obj extends Rebound.Data {};
//     var parent = new Obj();
//     var child = new Obj();
//     parent.set(child);

import { $ } from "rebound-utils/rebound-utils";
import Events from "rebound-data/events";
import Path from "rebound-data/path";

// Private Symbol where we will store internal state for Data objects instances.
const DATA          = Symbol('<data>');

// Publically exposed symbols so people can extend this class with their own
// data persistance methods.
const GET           = Symbol('<get>');
const SET           = Symbol('<set>');
const DELETE        = Symbol('<delete>');
const VALIDATE      = Symbol('<validate>');
const CONSTRUCTORS  = Symbol('<constructors>');

// Custom Error object for Rebound data errors.
// TODO: Extract into custom error helper. Possibly live along side custom logger?
function BaseError() {
  if (Error.captureStackTrace) { Error.captureStackTrace(this, BaseError); }
  else this.stack = (new Error()).stack;
}
BaseError.prototype = Error.prototype;
class DataError extends BaseError {
  constructor(message) {
    super();
    this.message = 'Uncaught DataException:' + (message || 'Unknown Data Error');
  }
  get [Symbol.toStringTag](){ return this.name; }
  get name(){ return 'DataError'; }
  toString(){ return `${this.name}: ${this.message}`; }
}

// A null-save version of the isData type check.
function isData (obj) { return obj && obj.isData; }

// Given a data object, return the proxied value or return the original value.
function valueOf (obj) { return ( isData(obj) && obj[DATA].isProxy() ) ? obj[DATA].value : obj; }

// Prototype agnostic helper for hasOwnProperty
function hasOwnProperty (obj, prop) { return {}.hasOwnProperty.call(obj, prop); }

// Check for iterability
function isIterable(obj) { return obj != null && typeof obj[Symbol.iterator] === 'function'; }

// The `State` object holds all the ancestry meta data for a given Data instance.
// Any class extending the `Data` interface, defined below, will have an instance
// of this meta-object place on it to track internal ancestry state.
class State {

  // Datum may be one of two types: key-vale stores, or value proxies.
  // TODO: Would like to get rid of this concept.
  isProxy() { return this.self[GET].length == 0; }
  isStore() { return this.self[GET].length >= 1; }

  constructor (data) {

    // If no data instance to observe throw
    if ( !isData(data) ) throw new DataError(`Entries constructor expects a Data object as its first argument.`);

    // Self State Data
    this.self = data;
    this.cid = $.uniqueId(this.self.constructor.name);
    this.value = undefined;
    this.defaults = this.self.defaults.constructor;
    this.dirty_count = 0;

    // Parental State Data
    this.parent = null;
    this.key = null;

    // Children State Data
    this.children = [];
    this.byId = {};
    this.keysList = [];
    this.keysHash = Object.create(null);

  }

  get previous(){
    return this._previous;
  }
  set previous(val) {
    if ( this.isProxy() ) this._previous = val;
    else throw new DataError("Can not override previous hash in a custom cache data store.");
  }

  get changed(){
    return this._changed;
  }
  set changed(val) {
    if ( this.isProxy() ) this._changed = val;
    else throw new DataError("Can not override changed hash in a custom cache data store.");
  }
  // Save a reverance to `value` at `key` in our caches.
  save(key, value) {
    key = String(key);
    var prev = this.keysHash[key];

    // If previous value was a data object, remove its dirty count and unset its parent data
    if ( isData(prev) ) {
      let prevState = prev[DATA];
      this.dirty_count > prevState.dirty_count ? this.dirty_count -= prevState.dirty_count : this.dirty_count = 0;
      prevState.parent = null;
      prevState.key = null;
      delete this.byId[prev.cid];
      this.children.splice(this.children.indexOf(prev), 1);
    }

    // Save the reverance to `value` at `key` in our caches.
    if ( this.isStore() ) {
      !this.keysHash[key] && this.keysList.push(key);
      this.keysHash[key] = value;
      this.byId[value.cid] = {value: value, key: key};
      this.children.push(value);
    }

    // Add new child's dirty count to its new parent and save new parent info
    if ( isData(value) ) {
      let valueState = value[DATA];
      this.dirty_count += valueState.dirty_count;
      valueState.parent = this.self;
      valueState.key = key;
    }

    this.update(key, prev, value);
  }

  remove(key, value) {

    // Validate and sanatize input. Fetch current stored value.
    if ( !isData(value) ) return;
    key = String(key);
    var prev = this.self.get(key, {raw: true});

    // If value is not stored in hash, or has been changed (ex: through calling
    // `set` from within a `delete` operation), we're in sync already. Break.
    if ( prev !== void 0 ) return;

    // Remove the reverance to `value` at `key` in our caches.
    var valueState = value[DATA];
    this.keysList.splice(this.keysList.indexOf(key), 1);
    delete this.keysHash[key];
    delete this.byId[value.cid];
    this.children.splice(this.children.indexOf(value), 1);

    // Remove old child's dirty count from its new parent and remove old parent info
    this.dirty_count > valueState.dirty_count ? this.dirty_count -= valueState.dirty_count : this.dirty_count = 0;
    valueState.parent = null;
    valueState.key = null;

    this.update(key, prev, value);
  }

  update(key, prev, value, force){

    if (this.isProxy()){
      if ( (this.previous === valueOf(value) && force !== true) || force === false) { this.previous = void 0; this.changed = false; }
      else { this.changed = valueOf(value); this.previous = prev; }
    }
    else {
      if ( (this.previous[key] === valueOf(value) && force !== true) || force === false) delete this.previous[key] && delete this.changed[key];
      else { this.previous[key] = valueOf(prev); this.changed[key] = valueOf(value); }
    }
    // TODO: I want there to be a better way to propagate `previous` and `changed` values up the data tree.
    if (isData(this.parent)) {
      this.parent[DATA].update(this.key, this.self, this.self, this.self.hasChanged());
      this.parent[DATA].update( this.isStore() ? Path.join(this.key, key) : this.key, prev, value);
    }
  }

  // Ensure we have a transaction id and increment the dirty counter on self and
  // all parents.
  dirty(){
    var obj = this.self,
        rootState = obj.root[DATA];
    if ( !rootState.dirty_count ) {
      this._history = this._previous;
      this._previous = Object.create(null);
      this._changed = Object.create(null);
    }
    do {
      !obj[DATA].dirty_count++ && obj.trigger('dirty', obj, { bubbles: false });
    } while (obj = obj.parent);
    return this.dirty_count;
  }

  // Once the transaction is finished running, decrement the dirty counter on
  // self and all parents – never go below zero.
  // If sub-tree is completly clean Trigger a final clean event so we know we're done.
  clean(){
    var obj = this.self;
    do {
      let state = obj[DATA];
      if (   state.dirty_count === 0 ) return this.dirty_count;
      if ( --state.dirty_count !== 0 ) continue;
      // Changes can be recursively nested within `"update"` events.
      state.pending = true;
      while (state.pending) {
        state.pending = false;
        obj.trigger('update', obj);
      }
      obj.trigger('clean', obj, { bubbles: false });
      delete this._history;
    } while (obj = obj.parent);
    return this.dirty_count;
  }

}

class Data extends Events {

  // For debugging purposes, override the `Symbol.toStringTag` tag to output
  // `[object ${this.cid}]` when any data type is cast as a string.
  get [Symbol.toStringTag](){ return this.cid; }

  // Return the unwrapped value of this data object. If a Proxy returns the raw value,
  // if a store, returns itself.
  valueOf(){ return valueOf(this); }

  // All data object have the read-only property `isData`. For convenience, we
  // also expose a null safe `Data.isData()` method on the constructor.
  get    isData()    { return true; }
  set    isData(val) { throw new DataError(`Cannot set value ${val} to read-only property "isData".`); }
  static isData(obj) { return obj && obj.isData; }


  // The instance's unique cid is read-only and stored in the instance's internal state object.
  get    cid()    { return this[DATA].cid; }
  set    cid(val) { throw new DataError(`Cannot set value ${val} to read-only property "cid".`); }

  // Expose private data persistance method symbols and the Path parser library on
  // the `Data` constructor so extensions can implement novel data persistance strategies.
  static get path()     { return Path;     }
  static get get()      { return GET;      }
  static get set()      { return SET;      }
  static get delete()   { return DELETE;   }
  static get validate() { return VALIDATE; }

  // Returns the default constructors for this data object. Determines how vanilla
  // values are upgraded to Rebound data objects.
  static get constructors(){
    return (this.hasOwnProperty(CONSTRUCTORS)) ? this[CONSTRUCTORS] : (this[CONSTRUCTORS] = Object.create(this[CONSTRUCTORS]));
  }

  static config(key, val){
    return (val) ? (this.constructors[key] = val) : false;
  }

  constructor(data, options={}){
    super();

    // If any of the required data persistance methods are missing on the subclass, throw.
    var proto = Data.prototype;
    if ( this.constructor !== Data && ( this[GET] === proto[GET] || this[SET] === proto[SET] || this[DELETE] === proto[DELETE] )) {
      throw new DataError(`Data type ${this.constructor.name} does not implement the required data persistance methods.`);
    }

    // Create this instance's internal state object
    this[DATA] = new State(this);

    // Protect the dirty and clean methods so they can only be accessed by subclasses.
    $.makeProtected(this, Data, ['dirty', 'clean', 'cache']);

    // Validate provided default options passed to contructor. If invalid, warn,
    // otherwise merge with the prototype default values.
    if (options.defaults){
      if (this.validate(options.defaults)) this.defaults = Object.assign(new this[DATA].defaults(), this.defaults, options.defaults);
      else console.error(`Invalid defaults provided for new ${this.constructor.name}:`, this, "Instead received:", options.defaults);
    }

    // If we are not subclassed, set our data
    if (this.constructor === Data) this.set(data);

  }

  // The cache property provides access to the underlying value cache store. By
  // default this is simply the `value` attribute of the instance's private state
  // object. To provide a custom cache object type, pass `Data` a cache constructor
  // when subclassing. Made protected in the constructor (in liu of a propper
  // `protected` keyword in JavaScript).
  get cache() { return this[DATA] && this[DATA].value; }
  set cache(val) {
    if ( this[DATA].isProxy() ) this[DATA].value = val;
    else throw new DataError("Can not override cache object type in a custom cache data store.");
  }

  // Expose the dirty and clean state methods. These are made protected in the
  // constructor (in liu of a propper `protected` keyword in JavaScript).
  dirty(){ return this[DATA].dirty(); }
  clean(){ return this[DATA].clean(); }

  transaction(func){
    this[DATA].dirty();
    func.call(this);
    this[DATA].clean();
  }

  // Update `trigger` to bubble the event up to its parent once finished triggering
  // on itself. When bubbling, modify the event name to include the datum's path location.
  // TODO: Clean this up. Messy, and modifying the arguments list is very bad.
  trigger( ...args ){
    var options = args[args.length-1] || {};
    super.trigger.apply(this, args);
    if ( options.bubbles === false || !this.parent ) return;
    if (typeof args[0] === 'string') {
      !name.match(/^[^\.\[]+:/) && (args[0] += ':');
      args[0] = args[0].replace(':', ':' + Path.isValid(this.key) ? this.key : `[${this.key}]` + ((/:\[|:$/g).test(args[0]) ? '' : '.'));
    }
    this.parent.trigger.apply(this.parent, args);
    return this;
  }

  // `Data.get`, `Data.set`, `Data.delete`, `Data.validate`, and `toJSON` are generic
  // value stores by default. Override them with your own Data persistance logic.
  [GET](){ return this[DATA].value; }
  [SET](val){
    this[DATA].value = val;
    this.trigger('change', this.parent, this.key, valueOf(val));
    return true;
  }
  [DELETE](){ this.set(void 0); }
  [VALIDATE](data){ return !!~Boolean(data); } // Always return true regardless of input
  toJSON(){ return this[DATA].value; }

  touch(key, value){
    if (!isData(value) || value.key === key) return;
    if (this.get(key) !== valueOf(value)) throw new DataError(`Cannot touch value '${value}' for key '${key}'. Value at 'this.get(${key})' does not match.`);
    this[DATA].remove(key, value);
    this[DATA].save(key, value);
  }

  // `fetch`, `save`, `destroy` and `parse` are NOOPs by default. Override it with your own Data persistance logic.
  fetch(){ return Promise.resolve(); }
  save(){ return Promise.resolve(); }
  destroy(){ return Promise.resolve(); }
  parse(resp){ return resp; }

  // Public Ancestry Properties
  //  TODO: I don't like traversing the entire tree each time to get `root` and `path`. Fix this.
  //  - `keys`:     A frozen list of keys contained in this node.
  //  - `children`: A frozen shallow copy of children nodes.
  //  - `root`:     A read-only property for the data tree's root node.
  //  - `parent`:   A read-only property for the datum's parent node.
  //  - `path`:     A path string where the node is accessable relative to root.
  //  - `key`:      The key where it is accessable on it's parent node.
  keys()       { return Object.freeze( this[DATA].keysList.slice(0) ); }
  children()   { return Object.freeze( this[DATA].children.slice(0) ); }

  get root() { var obj = this; while (obj.parent) obj = obj.parent; return obj; }
  get path() { var parent = this.parent; return (parent) ? Path.join(parent.path, this.key) : '';}
  get parent() { return this[DATA].parent; }
  get key() {
    if (this._scope) return this._scope; // TODO: Remove once we figure out how to give Services multiple parents
    var state = this[DATA];
    if (!this.parent) return '';
    return String( state.key || (state.key = this.parent.location(this)) );
  }

  set root(val) { throw new DataError(`Cannot set value ${val} to read-only property "root".`);   }
  set path(val) { throw new DataError(`Cannot set value ${val} to read-only property "path".`);   }
  set parent(val) { throw new DataError(`Cannot set value ${val} to read-only property "parent".`); }
  set key(val) { throw new DataError(`Cannot set value ${val} to read-only property "key".`); }

  // Return `true` or `false` if `key` is stored in this entries object.
  has(key){ return !!this[DATA].keysHash[key]; }

  // Returns a new iterator for each key in this Entries object.
  // Uses the live copy of the keys list, so additions to this entries object
  // after this iterator has been created will also be iterated over.
  [Symbol.iterator](options){
    var self = this;
    var idx = 0;
    var cache = this[DATA].value;

    // Standardize Array iterables to return `[key, value]` as thier result
    if ( $.isArray(cache) ) {
      var len = cache.length;
      return {
        next() {
          var key = idx++;
          if (idx > len) return { done: true };
          return { value: [key, self.get(key, options)], done: false };
        }
      };
    }

    // If the cache object is a default iterable (Ex: Map and Set), use the native iterable.
    if ( cache && cache[Symbol.iterator] ) return cache[Symbol.iterator]();

    // Fall back to using the keys cache to iterate if cache is not a native iterable.
    var keys = this.keys();
    return {
      next() {
        var key = keys[idx++];
        if (idx > keys.length) return { done: true };
        return { value: [key, self.get(key, options)], done: false };
      }
    };
  }

  // `Data.entries` is an alias for `Data[Symbol.iterator]`.
  entries(options){ return this[Symbol.iterator](options); }

  // Calls the passed callback for each value in the data object, passing it`key`
  // and `value`. You may pass an optional `scope` as a secon argument. Intentionally
  // re-calculates `keys.length` each time to iterate over values added in the
  // callback.
  forEach(fn, scope){
    var keys = this.keys();
    scope || (scope = this);
    for (let idx=0; idx<keys.length; idx++) fn.call(scope, keys[idx], this.get(keys[idx]));
    return this;
  }

  // Return `true` or `false` if `obj` is stored in this entries object.
  // First argument `obj` may be any data object or value. Accepts an optional
  // second argument `deep`. Pass `true` to do a deep search of the data tree.
  contains(obj, deep){
    deep = (deep === true);

    if (!isData(obj)) {
      let parent = this, iter = parent.entries(), entry;
      while ( (entry = iter.next()) && !entry.done ) {
        let value = entry.value[1];
        if ( valueOf(value) === obj ) return true;
        if (deep && isData(value) && value.contains(obj, true) === true) return true;
      }
    }
    else if (!deep) return !!this[DATA].byId[obj.cid];
    else do { if(obj === this) return true; } while (obj = obj.parent);
    return false;
  }

  // Get the previous values of a data object, recorded at the time the last
  // `"change"` event was fired.
  previous(path){ return path ? Path.query(path, this[DATA].previous) || Path.query(path, this) : _.defaults(this[DATA].previous, this.toJSON() ); }

  // Determine if the model has changed since the last `"change"` event.
  // If you specify an attribute name, determine if that attribute has changed.
  changed(key){ return $.isString(key) ? this[DATA].changed[key] : this[DATA].changed; }
  hasChanged(attr) { return (attr == null) ? !!Object.keys(this[DATA].changed).length : hasOwnProperty(this[DATA].changed, attr); }
  isChanging(){ return !!this[DATA].dirty_count; }

  // **Data.validate** tests to see if `data` is a valid input for this class. You
  // may provide a custom validation function via a `Data.validate` method.
  validate(data){
    return (data instanceof this.constructor) || this[VALIDATE](data);
  }


  // **Data.get** provides support for getting from a deep data tree.
  // `key` may be any valid json-like identifier. Ex: `obj.coll[3].value`.
  // It will traverse any data object implementing the `Data.get` method to
  // find the correct value at the specified location.
  get (key, options={}) {
    let parts = new Path(key, {sanatize: true}).split();
    let len = parts.length;
    let res = this;
    for (let i=0; i<len; i++){
      if ( !isData(res) ) return void 0;
      if ( key === '@parent' && isData(res) ){ res = res.parent; continue; }
      // An optimized dispatch to the user-defined get method.
      switch (res[GET].length) {
        case 0:  res = res[GET](); break;
        case 1:  res = res[GET](parts[i]); break;
      }
      if ( !options.raw ) res = valueOf(res);
    }
    return res;
  }

  // **Data.location** Inverse of `get`. Given `val`, return the `key` where it
  // is stored in this data object. Check for both value equality (`===`) and
  // `cid` equality to accomodate for cloned / proxied data objects.
  location (obj){
    var entry, iter = this.entries();
    while((entry = iter.next()) && !entry.done){
      let key = entry.value[0];
      let val = entry.value[1];
      if(obj === val || valueOf(obj) === val || (obj && val && obj.cid === val.cid)) return key;
    }
    return void 0;
  }

  set () {

    var Types  = this.constructor.constructors,
        res    = true,
        target = this,
        value  = arguments[0],
        path   = '',
        key    = null;

    // If called like `set(value)`, we are all set from the var delairation
    // block above. If called like `set(key, value)`, fetch the correct target,
    // extract the key,  If path is deep, ensure target exists.
    if (arguments.length > 1) {
      value  = arguments[1];
      path   = new Path(arguments[0], { sanatize: true });
      key    = (path.pop() || '');
      target = this.ensure((path = path.join()));
    }

    // Fetch the previous value and its state at this key.
    var state = target[DATA],
        Type = isData(value) ? value.constructor : (value && Types[value.constructor.name]) || Types.Value,
        prev = target.get(key, {raw: true});

    // If set would be a no-op, short circuit.
    if (isData(prev) && prev.valueOf() === value) return this;

    state.dirty();

    // If the previous data object is the same type as the input, set it on the
    // existing Datum. The accepting object will handle the merge.
    if ( isData(prev) && prev.constructor === Type ) {
      prev.set(value);
      state.clean();
      return this;
    }

    // If input is a datum, ensure it is removed from its previous location and
    // save the previous key and parent. If this would create a recursive dependancy – throw.
    if ( isData(value) ) {
      if ( value.contains(target, true) ) throw new DataError(`Failed to set parent of '${target.cid}' to '${parent.cid}', the child element contains the parent. Please clone this data object to prevent cyclic data dependancies.`);
      var oldParent = value.parent;
      var oldKey = value.key;
      isData(oldParent) && oldParent.delete(oldKey);
    }

    // If `target` is a value proxy, set the updated value, saving the previous and
    // marking changed state. If an invalid number of arguments were passed, throw.
    if ( state.isProxy() ) {
      if (arguments.length > 1) throw new DataError(`Attempted to set invalid number of arguments on value proxy ${target.cid}`);
      res = target[SET](value);
      if ( res !== false ) state.save(key, value);
    }

    // If `target` is a store, and a single argument has been passed to `set`, try
    // to iterate over the iterable / object, setting individual key value pairs
    // on `target` – merging the objects. If value is not iterable, throw.
    // TODO: Roll back full merge if any set fails.
    else if ( state.isStore() && arguments.length === 1 ) {
      if (isIterable(value)) {
        let idx = 0;
        for ( let val of value ) value instanceof Map || isData(value) ? target.set(val[0], val[1]) : target.set(idx++, val);
      }
      else if (value && value.constructor === Object) for ( let key in value ) target.set(key, value[key]);
      else throw new DataError(`Attempted to set key value pair ${target.cid} without passing both key and value.`);
    }

    // If `target` is a store, and a key value pair have been passed, save the
    // previous and mark the changed state, save a referance to the new object,
    // and call the custom set implementation.
    else if ( state.isStore() && arguments.length === 2 ) {
      value = isData(value) ? value : new Type(value);
      res = target[SET](key, value);

      // If `set` returned a string, that means the set function chose its own key.
      // Use this key from here on out.
      if ( $.isString(res) ) key = res;

      // If `set` has not returned `false`, save the updated state.
      if ( res !== false ) state.save(key, value);
    }

    // If none of the above cases are true, we did not get a valid input. Throw.
    else throw new DataError(`Invalid number of arguments passed to set on object ${target.cid}`);

    // If `set` has not returned `false`, we're done.
    if ( res !== false ) {
      state.clean();
      return this;
    }

    // If the return value of the custom set function is anythng but true, roll
    // back the caches, reset to the previous value, add value back to its old parent,
    // and throw.
    state.remove(key, value);
    target[SET](key, prev);
    isData(oldParent) && oldParent[SET](oldKey, value);
    state.clean();
    throw new DataError(`Cannot set value '${value}' at path '${path}'.`);

  }

  // **Data.ensure** returns the data object or value at `path`. If targeted path
  // does not exist, it will construct the ancestry tree using `Object` so it does.
  ensure(path) {
    if ( !$.isString(path) ) path = '';
    path = Path.split(path, {sanatize: true});
    var target = this;
    for (let idx=0; idx<path.length; idx++) {
      let test = target.get(path[idx]);
      if ( !isData(test) ) target.set(path[idx], (test = new target.constructor.constructors.Object()) );
      target = test;
    }
    return target;
  }

  // **Data.delete** removes a value at a given path. If the target data object
  // exists, delete that value and return true. Else, return false.
  delete(path){

    // Split and sanatize our input path.
    path = new Path(path, { sanatize: true });

    // From the given `path` fetch our `target` and `key`.
    var key    = path.pop(),
        target = this.get(path.toString());

    // If no target at this path, return false.
    if ( !isData(target) ) return false;

    // Fetch `target`'s state, the previous value at `key`, and `prev`'s state.
    var state     = target[DATA],
        prev      = target.get(key, {raw: true}),
        prevState = prev && prev[DATA] || this[DATA];

    // If no value is stored in `target` at `key`, or already in the process of
    // removing this value return true.
    if ( prevState && prevState._removing === true ) return true;

    // Mark our states dirty while processing
    state.dirty();
    prevState._removing = true;

    // Call our custom delete function. If if it does not return true, we can assume
    // it failed. Clean our state and Exit.
    if ( this[DELETE](key) !== true ) {
      state.clean();
      return prevState._removing = false;
    }

    // If the delete method worked, remove the referances in the caches. This is
    // called after removal so helper methods will work in the custom delete method.
    state.remove(key, prev);

    // Done! Clean our state and return true.
    state.clean();
    prevState._removing = false;
    return true;
  }

  // Inverse method call for `delete`. Given `obj`, find its location in the data
  // object, and remove it.
  remove(obj) {
    var key = this.location(obj);
    return (key) ? this.delete(key) : false;
  }

  // Select the basic constructor. If array, then Collection, otherwise, Collection default, or Model
  // If data has a custom constructor, use that instead. Always choose the most unique.
  // Give them the same cid so our helpers treat them as the same object
  // Return the new instance.
  clone(){
    var C = this.constructor;
    var obj = new C();
    obj[DATA].cid = this.cid;
    obj[DATA].original = this;
    var item, iter = this.entries({raw: true});
    if (this[DATA].isProxy()) obj.set(this.valueOf());
    else while ( (item = iter.next()) && !item.done) obj.set(item.value[0], item.value[1].clone());
    return obj;
  }

  // De-initializes a data tree starting with `this` and recursively calling `deinitialize()` on each child.
  deinitialize() {

    var ancestry = this[DATA];

  // Undelegate Rebound Events from this data object
    this.stopListening();
    this.off();

  // Destroy this data object's lineage
    ancestry.parent = null;
    var len = ancestry.children.length;
    for (let i=0; i<len; i++) ancestry.children[i].deinitialize();
    delete ancestry.children;

  // Mark as deinitialized
    this.deinitialized = true;

  }

}

// Default...defaults
Data.prototype.defaults = {};
Data[CONSTRUCTORS] = { 'Array': Data, 'Object': Data, 'Property': Data, 'Value': Data };

// **DataFactory** is what this module actually exposes and provides convenience
// functionality when extending the core `Data` class. Name the function `Data`
// so the prototype chain looks nice.
var DataFactory = function Data(C){

  // If called with the `new` keyword, it just proxies directly to the `Data` constructor.
  if ( this instanceof DataFactory ) return Data.prototype.constructor.apply(this, arguments);

  // If called as a function, and an invalid cache constructor is passed, throw.
  if ( !$.isFunction(C) || C !== Object && ( C === String || !C.prototype.hasOwnProperty(Symbol.iterator) ) ) {
    throw new DataError(`Can not use constructor ${C.name || C} as a default cache constructor. Caches must be iterable data stores.`);
  }

  // If called as a function and a valid cache constructor is passed, create the
  // private cache object.
  return class Data extends Data {
    constructor() {
      super();
      this[DATA].value = new C();
    }
  };

};

// `DataFactory` extends `Data` – the old school ES5 way to enable both Class and
// Function ergonomics.
DataFactory.prototype = Data.prototype;
Object.setPrototypeOf(DataFactory, Data);

// Export `DataFactory` as our main entrypoint.
export default DataFactory;
export { DataFactory as Data };
