import propertyCompiler from "property-compiler/property-compiler";

// If Rebound Runtime has already been run, throw error
if(Rebound.Model){ throw 'Rebound Model is already loaded on the page!'; }
// If Backbone hasn't been started yet, throw error
if(!window.Backbone){ throw "Backbone must be on the page for Rebound to load."; }

var Model = Backbone.Model.extend({

  isModel: true,

  __path: function(){ return ''; },

  get: function(key, val, options){

    // Split the path at all '.', '[' and ']' and find the value referanced.
    var parts  = _.compact(key.split(/(?:\.|\[|\])+/)),
        result = this,
        l=parts.length,
        i=0;

    if(_.isUndefined(key) || _.isNull(key)){ return key; }

    if(key === '' || parts.length === 0){ return result; }

    if (parts.length > 0) {
      for ( i = 0; i < l; i++) {

        if(_.isUndefined(result) || _.isNull(result)){
          return result;
        }

        if( _.isFunction(result )){
          result = result.call(this);
        }

        if( result.isCollection ){
          result = result.models[parts[i]];
        }
        else if( result.isModel ){
          result = result.attributes[parts[i]];
        }
        else if( result && result.hasOwnProperty(parts[i]) ){
          result = result[parts[i]];
        }
      }
    }

    if( _.isFunction(result )){
      result = result.call(this);
    }

    return result;
  },

  set: function(key, val, options){
    var attrs, newKey, obj;

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
      obj = undefined;

      // If val is null, set to undefined
      if(val === null){
        val = undefined;
      }
      // If this value is a vanilla object, turn it into a model
      else if(_.isObject(val) && !_.isArray(val) && !_.isFunction(val) && !(val.isModel || val.isCollection)){
        obj = new Rebound.Model();
      }
      // If this value is an array, turn it into a collection
      else if(_.isArray(val)){
        obj = new Rebound.Collection();
      }
      // If this value is a computed property,
      else if(_.isFunction(val)){
        obj = val;
      }

      // Mutations to apply if this value is a model, collection or computed property
      if(obj !== undefined){

        // Set this object's path function
        obj.__path = (function(parent, key){ parent = parent.__path(); return function(){ return  parent + ((parent === '') ? '' : '.') + key ; }; })(this, key);

        // Save this object's ancestary
        obj.__parent = this;

        // If a computed property, register it for compilation.
        if(_.isFunction(val)){
          propertyCompiler.register(this, key, val, this.__path());
        }

        // If an eventable object (Model or Collection), propagate all its events up the chain and finally, set its children
        if(obj.isModel || obj.isCollection){
          obj.on('all', this.trigger, this);
          obj.set(val);
        }

        // Save our changes
        val = attrs[key] = obj;
      }


      // Set the apropreate object if setting a child element.
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
          if(_.isFunction(result)){
            result = result();
          }
          else if(result.isCollection){
            result = result.models[parts[i]];
          }
          else if(result.isModel){
            result = result.attributes[parts[i]];
          }
          else if(result && result[parts[i]]){
            result = result[parts[i]];
          }
          else{
            result = '';
          }
        }
      }

      // Call original backbone set function on this object
      Backbone.Model.prototype.set.call(result, parts[i], val, options);

    }
  },

  toJSON: function() {
      if (this._isSerializing) {
          return this.id || this.cid;
      }
      this._isSerializing = true;
      var json = _.clone(this.attributes);
      _.each(json, function(value, name) {
          if( _.isNull(value) || _.isUndefined(value) ){ return; }
          _.isFunction(value.toJSON) && (json[name] = value.toJSON());
      });
      this._isSerializing = false;
      return json;
  }

});

export default Model;