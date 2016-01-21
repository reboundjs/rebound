// Rebound Lazy Value
// ----------------

import $ from "rebound-utils/rebound-utils";

var NIL = function NIL(){},
    EMPTY_ARRAY = [];

function LazyValue(fn, options={}) {
  this.cid = $.uniqueId('lazyValue');
  this.valueFn = fn;
  this.cache = NIL;
  this.context = options.context || null;
  this.children = [];
  this.subscribers = [];
  this.observers = [];
  _.extend(this, options);
}

LazyValue.prototype = {
  isLazyValue: true,

  get value(){
    if (this.cache !== NIL) { return this.cache; }
    this.values = this.values || new Array(this.children.length); // For the sake of re-using an array

    if (this.children.length) {
      for (var i = 0, l = this.children.length, child; i < l; i++) {
        child = this.children[i];
        this.values[i] = (child && child.isLazyValue) ? child.value : child;
      }
    }

    this.cache = this.valueFn(this.children.length ? this.values : EMPTY_ARRAY);
    return this.cache;
  },

  set: function(key, value, options){
    if(this.context){
      return this.context.set(key, value, options);
    }
    return null;
  },

  addDependentValue: function(value) {
    this.children.push(value);
    if(value && value.onNotify){ value.onNotify(this); }
    return this;
  },

  addObserver: function(path, context, env) {
    var position, res;

    if(!_.isObject(context) || !_.isString(path)){ return console.error('Error adding observer for', context, path); }

    var cache = env.streams[context.cid] || (env.streams[context.cid] = {});
    cache[path] || (cache[path] = []);
    var position = cache[path].push(this) - 1;

    this.observers.push({cid: context.cid, path: path, index: position});

    return;

    // Ensure _observers exists and is an object
    context.__observers || (context.__observers = {});

    // Ensure __observers[path] exists and is an array
    context.__observers[path] || (context.__observers[path] = {collection: [], model: []});

    // Save the type of object events this observer is for
    res = context.get(this.path, {isPath: true});
    res = (res && res.isCollection) ? 'collection' : 'model';

    // Add our callback, save the position it is being inserted so we can garbage collect later.
    position = context.__observers[path][res].push(this) - 1;

    // Lazyvalue needs referance to its observers to remove listeners on destroy
    this.observers.push({context: context, path: path, index: position});

    return this;
  },

  makeDirty: function(){
    this.cache = NIL;
    for (var i = 0, l = this.subscribers.length; i < l; i++) {
      this.subscribers[i].isLazyValue && this.subscribers[i].makeDirty();
    }
  },

  notify: function() {
    this.cache = NIL;
    for (var i = 0, l = this.subscribers.length; i < l; i++) {
      (this.subscribers[i].isLazyValue) ? this.subscribers[i].notify() : this.subscribers[i](this);
    }
  },

  onNotify: function(callback) {
    var subscribers = this.subscribers || (this.subscribers = []);
    subscribers.push(callback);
    return this;
  },

  destroy: function() {
    _.each(this.children, function(child){
      if (child && child.isLazyValue){ child.destroy(); }
    });
    _.each(this.subscribers, function(subscriber){
      if (subscriber && subscriber.isLazyValue){ subscriber.destroy(); }
    });

    this.children = this.cache = this.valueFn = this.subscribers = this._childValues = null;

    _.each(this.observers, function(observer){
      if(_.isObject(observer.context.__observers[observer.path])){
        delete observer.context.__observers[observer.path][observer.index];
      }
    });

    this.observers = null;
  }
};

export default LazyValue;
