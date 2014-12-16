import propertyCompiler from "property-compiler/property-compiler";
import $ from "rebound-runtime/utils";

// If Rebound Runtime has already been run, throw error
if(Rebound.ComputedProperty){ throw 'Rebound ComputedProperty is already loaded on the page!'; }
// If Backbone hasn't been started yet, throw error
if(!window.Backbone){ throw "Backbone must be on the page for Rebound to load."; }

var ComputedProperty = function(prop, options){

  options = options || {};

  // Assign unique id
  this.cid = _.uniqueId('computedPropety');
  this.name = options.name;
  this.returnType = null;
  this.__observers = {};
  this.helpers = {};
  this.changing = false;

  options.parent = this.setParent( options.parent || this );
  options.root = this.setRoot( options.root || options.parent || this );
  options.path = this.__path = options.path || this.__path;

  // Compute the property function's dependancies
  this.deps = prop.__params = prop.__params || propertyCompiler.compile(prop, this.name);

  _.each(this.deps, function(path, index, deps){

    var context = this.__parent__,
        computedProperty = this,
        paths = $.splitPath(path);
    // Get actual context if any @parent calls
    while(paths[0] === '@parent'){
      context = context.__parent__;
      paths.shift();
    }
    path = paths.join('.');

    // Ensure _observers exists and is an object
    context.__observers = context.__observers || {};
    // Ensure __obxervers[path] exists and is an array
    context.__observers[path] = context.__observers[path] || [];
    context.__observers[path].push(function(){
      computedProperty.call();
    });
    context.__observers[path][context.__observers[path].length-1].type = 'model';

  }, this);


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

};

_.extend(ComputedProperty.prototype, Backbone.Events, {

  isComputedProperty: true,
  isData: true,
  returnType: null,

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

    if(_.isUndefined(result)){
      return this.reset();
    }

    // If you're already resetting its cache, I'ma let you finish.
    // Cannot be this.value() because on first run will enter loop
    if(this.changing) return this.cache[this.returnType];
    this.changing = true;

    // Un-bind events from the old data source
    if(this.value() && this.value().isData){
      this.value().off('change add remove reset sort');
    }

    // Set result and return type
    if(result && (result.isCollection || _.isArray(result))){
      this.returnType = 'collection';
      this.isCollection = true;
      this.isModel = false;
      this.set(result, {remove: true, merge: true});
    }
    else if(result && (result.isModel || _.isObject(result))){
      this.returnType = 'model';
      this.isCollection = false;
      this.isModel = true;
      this.reset(result);
    }
    else{
      this.returnType = 'value';
      this.isCollection = this.isModel = false;
      this.set(result);
    }

    // Pass all changes to this model back to the model used to set it
    if(result && result.isModel){
      this.value().on('change', function(model){
        result.set(model.changedAttributes());
      });
    }
    if(result && result.isCollection){
      this.value().on('add reset', function(model, collection, options){
        result.set(model, options);
      });
      this.value().on('remove', function(model, collection, options){
        result.remove(model, options);
      });
    }

    this.changing = false;

    return this.value();
  },

  get: function(key, options){
    options || (options = {});
    if(this.returnType === 'value'){
      if(!options.quiet){ console.error('Called get on the `'+ this.name +'` computed property which returns a primitive value.'); }
      return undefined;
    }

    return (this.value()).get(key, options);

  },

  // TODO: Moving the head of a data tree should preserve ancestry
  set: function(key, val, options){

    options || (options = {});

    if(this.returnType === 'value' && this.cache.value !== key){
      this.cache.value = key;
      // Manually trigger events on the parent model for this attribute
      if(!options.quiet){
        this.__parent__.changed[this.name] = key;
        this.trigger('change', this.__parent__);
        this.trigger('change:'+this.name, this.__parent__, key);
        delete this.__parent__.changed[this.name];
      }
    }

    return (this.returnType === 'value') ? key : this.value().set(key, val, options);

  },

  value: function(){
    if(_.isNull(this.returnType)){
      this.apply(this.__parent__);
    }
    return this.cache[this.returnType];
  },

  reset: function(obj, options){
    (this.returnType === 'value') ? this.set(undefined) : this.value().reset(obj, options);
  },

  toJSON: function() {
    if (this._isSerializing) {
        return this.cid;
    }
    var val = this.value();
    this._isSerializing = true;
    var json = (val && _.isFunction(val.toJSON)) ? val.toJSON() : val;
    this._isSerializing = false;
    return json;
  }

});

export default ComputedProperty;