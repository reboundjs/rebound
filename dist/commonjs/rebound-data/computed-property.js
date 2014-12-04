"use strict";
var propertyCompiler = require("property-compiler/property-compiler")["default"];
var $ = require("rebound-runtime/utils")["default"];

// If Rebound Runtime has already been run, throw error
if(Rebound.ComputedProperty){ throw 'Rebound ComputedProperty is already loaded on the page!'; }
// If Backbone hasn't been started yet, throw error
if(!window.Backbone){ throw "Backbone must be on the page for Rebound to load."; }

var ComputedProperty = function(prop, options){

  options = options || {};

  // Assign unique id
  this.cid = _.uniqueId('computedPropety');
  this.name = options.name;
  this.__observers = {};
  this.helpers = {};

  options.parent = this.setParent( options.parent || this );
  options.root = this.setRoot( options.root || options.parent || this );
  options.path = this.__path = options.path || this.__path;

  // All comptued properties' dependancies are calculated and added to their __params attribute. Save these in the context's helper cache.
  options.root.helpers[options.parent.cid] = options.root.helpers[options.parent.cid] || {};
  options.root.helpers[options.parent.cid][options.name] = this;

  // Compute the property function's dependancies
  this.deps = prop.__params = prop.__params || propertyCompiler.compile(prop, this.name);

  // Save referance original function
  this.func = prop;

  // Cached result objects
  this.cache = {
    model: new Rebound.Model({}, {
      parent: this.__parent__,
      root: this.__root__,
      path: this.__path
    }),
    collection: new Rebound.Collection([], {
      parent: this.__parent__,
      root: this.__root__,
      path: this.__path
    }),
    value: undefined // TODO: On set value, trigger change event on parent? Maybe?
  };

  // Propagate cache's changes to parent
  // this.cache.model.on('all', this.__parent__.trigger, this.__parent__);
  // this.cache.collection.on('all', this.__parent__.trigger, this.__parent__);

};

_.extend(ComputedProperty.prototype, Backbone.Events, {

  isComputedProperty: true,
  isData: true,
  returnType: 'value',

  __path: function(){ return ''; },

  hasParent: function(obj){
    var tmp = this;
    while(tmp !== obj){
      tmp = tmp.__parent__;
      if(_.isUndefined(tmp)){ return false; }
      if(tmp === obj){ return true; }
      if(tmp.__parent__ === tmp){ return false; }
    }
    return true;
  },

  call: function(){
    var args = Array.prototype.slice.call(arguments),
        context = args.shift();
    return this.apply(context, args);

  },

  apply: function(context, params){

    // Get result from computed property function
    var result = this.func.apply(context || this.__parent__, params);

    // Get raw data from result
    result = (result && (result.attributes || result.models)) || result;

        // Set result and return type
    if(_.isArray(result)){
      this.returnType = 'collection';
      this.isCollection = true;
      this.isModel = false;
      this.cache.collection.set(result);
    }
    else if(result && _.isObject(result)){
      this.returnType = 'model';
      this.isCollection = false;
      this.isModel = true;
      this.cache.model.set(result);
    }
    else{
      this.returnType = 'value';
      this.isCollection = this.isModel = false;
      this.cache.value = result;
    }

    return this.cache[this.returnType];
  },

  get: function(key, options){
    options || (options = {});
    if(this.returnType === 'value'){
      if(!options.quiet){ console.error('Called get on the `'+ this.name +'` computed property which returns a primitive value.'); }
      return undefined;
    }

    return this.cache[this.returnType].get(key, options);

  },

  // TODO: Moving the head of a data tree should preserve ancestry
  set: function(key, val, options){
    if (typeof key === 'object') {
      attrs = (key.isModel) ? key.attributes : key;
      options = val;
    } else {
      (attrs = {})[key] = val;
    }
    options || (options = {});
    if(this.returnType === 'value'){
      if(!options.quiet){ console.error('Called set on the `'+ this.name +'` computed property which returns a primitive value.'); }
      return undefined;
    }

    return this.cache[this.returnType].set(key, val, options);

  },

  toJSON: function() {
    if (this._isSerializing) {
        return this.cid;
    }
    this._isSerializing = true;
    var json = (this.returnType === 'value') ? this.cache.value : this.cache[this.returnType].toJSON();
    this._isSerializing = false;
    return json;
  }

});

exports["default"] = ComputedProperty;