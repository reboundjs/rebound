import propertyCompiler from "rebound/property-processor";

// If Rebound Runtime has already been run, throw error
if(Backbone.Model.rebound)
  throw 'Rebound Model is already loaded on the page!';
// If Backbone hasn't been started yet, throw error
if(!window.Backbone)
  throw "Backbone must be on the page for Rebound to load.";

var Model = Backbone.Model;

Backbone.Model.prototype.rebound = true;
Backbone.Model.prototype.isModel = true;

// By default, __path returns the root object unless overridden
Backbone.Model.prototype.__path = function(){return '';};
// Override get to return value of computed parameters
Backbone.Model.prototype.__get = Backbone.Model.prototype.get;
Backbone.Model.prototype.get = function(key, val, options){

  // Get function now checks for collection, model or vanillajs object. Accesses appropreately.
  var parts  = {},
      result = {},
      model,
      i=0, l=0;

  if(!key) return;

  // Split the path at all '.', '[' and ']' and find the value referanced.
  parts = _.compact(key.split(/(?:\.|\[|\])+/));
  result = this;
  l = parts.length;

  if (parts.length > 0) {
    for ( i = 0; i < l-1; i++) {
      if(_.isFunction(result))
        result = result();
      else if(result.isCollection)
        result = result.models[parts[i]]
      else if(result.isModel)
        result = result.attributes[parts[i]]
      else if(result && result[parts[i]])
        result = result[parts[i]]
      else
        result = '';
    }
  }

  // Call original backbone set function
  var value = this.__get.call(result, parts[i], val, options);

  if(_.isFunction(value)){
    return value.call(this);
  }
  return value;
};
// Modify the Backbone.Model.set() function to have models' eventable attributes propagate their events to their parent and keep a referance to their name.
Backbone.Model.prototype.__set = Backbone.Model.prototype.set;
Backbone.Model.prototype.set = function(key, val, options){
  var attrs, val, newKey;
console.log('SETTING',key, val, options)
  // Set is able to take a object or a key value pair. Normalize this input.
  if (typeof key === 'object') {
    attrs = key;
    options = val;
  } else {
    (attrs = {})[key] = val;
  }

  // For each key and value, call original set and propagate its events up to parent if it is eventable.
  for (key in attrs) {
    val = attrs[key];

    // If any value is a function, turn it into a computed property
    if(_.isFunction(val)){
      propertyCompiler.register(this, key, val);
    }
    // If any value is an object, turn it into a model
    else if(_.isObject(val) && !_.isArray(val) && !_.isFunction(val) && !(val.isModel || val.isCollection)){
      val = attrs[key] = new Backbone.Model(val);
    }
    // If any value is an array, turn it into a collection
    else if(_.isArray(val)){
      val = attrs[key] = new Backbone.Collection(val)
    }

    // Set this element's path variable. Returns the fully formed json path of this element
    if(val){
      val.__path = (function(model, key){ return function(){ return model.__path() + '.' + key ; }; })(this, key);
    }

    // If this is a new key, and it is an eventable object, propagate its event to our parent
    if(!(this.has(key)) && val.isModel || val.isCollection){
      // When requesting the name value of our value, return the its key appended to the computed name value of our parent
      // Closure is needed to preserve values in the instance so they dont get set to the prototype
      val.__parent = this;
      val.on('all', this.trigger, this);
    }

    // Get function now checks for collection, model or vanillajs object. Accesses appropreately.
    var parts  = {},
        result = {},
        model,
        i=0, l=0;

    // Split the path at all '.', '[' and ']' and find the value referanced.
    parts = _.compact(key.split(/(?:\.|\[|\])+/));
    result = this;
    l = parts.length;

    if (parts.length > 0) {
      for ( i = 0; i < l-1; i++) {
        if(_.isFunction(result))
          result = result();
        else if(result.isCollection)
          result = result.models[parts[i]]
        else if(result.isModel)
          result = result.attributes[parts[i]]
        else if(result && result[parts[i]])
          result = result[parts[i]]
        else
          result = '';
      }
    }

    // Call original backbone set function
    this.__set.call(result, parts[i], val, options);

  }
}

export { Model }