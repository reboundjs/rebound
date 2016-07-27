// Rebound Lazy Value
// ----------------

import $ from "rebound-utils/rebound-utils";

var NIL = function NIL(){},
    EMPTY_ARRAY = [];

    var LAZYVALUE_COUNT = 0;

function LazyValue(fn, options={}) {
  this.cid = $.uniqueId('lazyValue');
  this.valueFn = fn;
  this.cache = NIL;
  this.context = options.context || null;
  this.children = [];
  this.hash = {};
  this.subscribers = [];
  this.observers = [];
  this.referance = 0;
  _.extend(this, options);

  // For each param or hash value passed to our helper's LazyValue, add it to the
  // dependant list. The helper's LazyValue will re-evaluate when one changes.
  _.each(options.params, function(param, index){
    param || (param = '');
    this.children.push(param);
    param.isLazyValue && param.onNotify(this);
  }, this);

  _.each(options.hash, function(value, key){
    value || (value = '');
    value.isLazyValue && value.onNotify(this);
    this.hash[key] = value;
  }, this);

}

LazyValue.prototype = {

  isLazyValue: true,

  get value(){

    // If cache is already computed, return it
    if (this.cache !== NIL) { return this.cache; }

    // Assemble our args and hash variables for the helper. For each LazyValue
    // param or hash, insert the evaluated value so helpers don't need to have any
    // concept of lazyvalues.
    var params = new Array(this.children.length),
        hash = {};

    for (var i = 0, l = this.children.length; i < l; i++) {
      let child = this.children[i];
      params[i] = (child && child.isLazyValue) ? child.value : child;
    }

    for(var key in this.hash){
      if(!this.hash.hasOwnProperty(key)){ continue; }
      let child = this.hash[key];
      hash[key] = (child && child.isLazyValue) ? child.value : child;
    }

    return this.cache = this.valueFn(params, hash);
  },

  set: function(key, value, options){
    return (this.context && this.context.set(key, value, options)) || null;
  },

  addObserver: function(path, context, env) {

    if(!_.isObject(context) || !_.isString(path)){ return console.error('Error adding observer for', context, path); }
    path = path.trim();
    var origin = context.path.replace(/\[[^\]]+\]/g, ".@each").trim();
    var cache = env.observers[origin] || (env.observers[origin] = {});
    cache[path] || (cache[path] = []);
    var position = cache[path].push(this) - 1;

    this.observers.push({env: env, origin: origin, path: path, index: position});

    return this;

  },

  // Mark this LazyValue, and all who depend on it, as dirty by setting its cache
  // to NIL. This will force a full re-compute of its value when next requests rather
  // than just returning the cache object.
  makeDirty: function(){
    if(this.cache === NIL){ return void 0; }
    this.cache = NIL;
    for (var i = 0, l = this.subscribers.length; i < l; i++) {
      this.subscribers[i].isLazyValue && this.subscribers[i].makeDirty();
    }
  },

  // Ensure that this node and all of its dependants are dirty, then call each
  // of its dependants. If a dependant is a LazyValue, and marked as destroyed,
  // remove it fromt the array
  notify: function() {
    this.makeDirty();
    for (var i = 0, l = this.subscribers.length; i < l; i++) {
      if(!this.subscribers[i]){ continue; }
      else if(this.subscribers[i].isLazyValue){
        this.subscribers[i].destroyed ? (this.subscribers[i] = void 0) : this.subscribers[i].notify();
      }
      else{
        this.subscribers[i](this);
      }
    }
  },

  onNotify: function(callback) {
    this.subscribers.push(callback);
    this.referance++;
    return this;
  },

  destroy: function destroyLazyValue() {
    this.destroyed = true;

    _.each(this.children, function(child){
      if(!child || !child.isLazyValue){ return void 0; }
      if(--child.referance === 0){ child.destroy(); }
    });
    _.each(this.hash, function(child){
      if(!child || !child.isLazyValue){ return void 0; }
      if(--child.referance === 0){ child.destroy(); }
    });

    this.subscribers = [];
    this.valueFn = NIL;
    this.cache = NIL;
    this.children = [];
    this.cache = {};

    _.each(this.observers, function(observer){
      if(observer.env.observers[observer.origin] && observer.env.observers[observer.origin][observer.path]){
        delete observer.env.observers[observer.origin][observer.path][observer.index];
      }
      delete observer.env;
    });

    this.observers = null;
  }
};

export default LazyValue;
