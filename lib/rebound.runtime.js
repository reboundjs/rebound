import { registerHelper, registerPartial, registerTemplate, notify, hydrate, templates } from "rebound/runtime";
import propertyCompiler from "rebound/property-processor";

  var __computedProperties = [];
// If Backbone hasn't been started yet, throw error
if(!window.Backbone)
  throw "Backbone must be on the page for Rebound to load.";
// If Rebound Runtime has already been run, exit
if(!window.Backbone.Controller){

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

    // Split the path at all '.', '[' and ']' and find the value referanced.
    parts = _.compact(key.split(/(?:\.|\[|\])+/));
    result = this;
    l = parts.length;

    if (parts.length > 0) {
      for ( i = 0; i < l-1; i++) {
        if(_.isFunction(result))
          result = result();
        else if(result instanceof Backbone.Collection)
          result = result.models[parts[i]]
        else if(result instanceof Backbone.Model)
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
      else if(_.isObject(val) && !_.isArray(val) && !_.isFunction(val)){
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
      if(!(this.has(key)) && val instanceof Backbone.Model || val instanceof Backbone.Collection){
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
          else if(result instanceof Backbone.Collection)
            result = result.models[parts[i]]
          else if(result instanceof Backbone.Model)
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

  // By default, __path returns the root object unless overridden
  Backbone.Collection.prototype.__path = function(){return '';};
  // Have collections set its model's names.
  Backbone.Collection.prototype.__set = Backbone.Collection.prototype.set;
  Backbone.Collection.prototype.set = function(models, options){
    var models = (!_.isArray(models)) ? (models ? [models] : []) : _.clone(models),
        id, model, i, l;

    // If a silent remove and this is the first silent remove since the last dom update, save our initial indicies
    if( options && options.silent && !this.models.__indexed ){
      _.each(this.models, function(model, index){
        model.__originalIndex = index;
      }, this)
      this.models.__indexed = true;
    }

    for (i = 0, l = models.length; i < l; i++) {
      model = models[i] || {};
      // If model is a backbone model, awesome. If not, make it one.
      if (model instanceof Backbone.Model) {
        id = model;
      } else {
        id = model[this.model.prototype.idAttribute || 'id'];
        options = options ? _.clone(options) : {};
        options.collection = this;
        model = new this.model(model, options);
      }

      // If model does not already exist in the collection, set its name.
      if (!this.get(id)){
        // When requesting the name value of our value, return the its index appended to the computed name value of our parent
        // Closure is needed to preserve values in the instance so they dont get set to the prototype
        model.__path = (function(collection, model){ return function(){return collection.__path() + '.[' + collection.indexOf(model) + ']' }; })(this, model);
        model.__parent = this;
      }

      // If added silently, make note. If removed later, before it is rendered in the dom, we can remove it without alerting the dom.
      if (options.silent){
        model.__silent = true;
      }

      models[i] = model;
    }

    // Call original set function
    this.__set.call(this, models, options);

  }

  // We override the _reset function to mark all models for removal in the dom and preserve our __removedIndex array on internal _reset.
  Backbone.Collection.prototype.___reset = Backbone.Collection.prototype._reset;
  Backbone.Collection.prototype._reset = function(){
    // Ensure existance of __removedIndex array. Saves indicies of removed elements to be passed to our #each helper.
    var cachedArray = this.models && this.models.__removedIndex || [];
    // Mark everything for removal from dom
    _.each(this.models, function(model){
      // If we have been accumulating silent removes, use the original index, otherwise use our current one.
      this.remove(model, {silent: true, __silent: true});
    }, this)
    this.___reset.call(this);
    this.models = this.models || [];
    this.models.__removedIndex = cachedArray;
  }

  // We override the remove function to always trigger a dom sync on removal.
  Backbone.Collection.prototype.__remove = Backbone.Collection.prototype.remove;
  Backbone.Collection.prototype.remove = function(models, options){
    var singular = !_.isArray(models),
        prevLength = this.models.__removedIndex.length  > 0;
    models = singular ? [models] : _.clone(models);
    options = _.extend({}, options);

    // If a silent remove and this is the first silent remove since the last dom update, save our initial indicies
    if( options.silent && !this.models.__indexed ){
      _.each(this.models, function(model, index){
        model.__originalIndex = index;
      })
      this.models.__indexed = true;
    }

    // Keep referance of removed elements' index so our each helper can stay in sync when elements are removed silently.
    _.each(models, function(model, index){
      // If this model was added silently, we do not need to alert the dom about its removal.
      if(model.__silent) return;
      // If we have been accumulating silent removes, use the original index, otherwise use our current one.
      var index = (prevLength  > 0) ? model.__originalIndex : this.indexOf(model);
      this.models.__removedIndex.push(index);
    }, this)

    // Call original set function.
    if(!options.__silent)
      this.__remove.call(this, models, options);
  }

  // New Backbone Controller
  var Controller = Backbone.Controller = function(options){
    this.cid = _.uniqueId('controller');
    _.bindAll(this, '_onModelChange', '_onCollectionChange', '__callOnController');
    options || (options = {});
    _.extend(this, _.pick(options, controllerOptions));
    registerHelper('__callOnController', this.__callOnController);
    this.initialize.apply(this, arguments);
    this.data = options.data;

    propertyCompiler.compile(this.data);

    // Take our precompiled template and hydrates it. When Rebound Compiler is included, can be a handlebars template string.
    this._setTemplate();
    this._startListening();
  }


  var controllerOptions = ['models', 'collections', 'outlet', 'template'];

  _.extend(Controller.prototype, Backbone.Events, {

    // Initialize is an empty function by default. Override it with your own initialization logic.
    initialize: function(){},

    __callOnController: function(name, event){
        this[name].call(this, event);
    },

    // Hydrate our template
    // Rebound Compiler overrides and gives the option for out template variable to be a handlebars template string
    _setTemplate: function(){
      if (typeof this.template === 'string') this.template = Rebound.templates[this.template];
      if (typeof this.template !== 'function') throw "Template is required";
      return this.template = hydrate(this.template);
    },

    _startListening: function(){
      this.dom = this.template(this.data);


      //this.listenTo(this.data, 'add destroy reset', this._notify)
      this.listenTo(this.data, 'change', this._onModelChange);
      this.listenTo(this.data, 'add remove reset', this._onCollectionChange);

      this.outlet.html(this.dom);
    },

    _getValue: function(key){

    },

    _onModelChange: function(model, options){
      this._notify(model, model.changedAttributes())
    },

    _onCollectionChange: function(model, collection, options){
      var changed = {};
      if(model instanceof Backbone.Collection){
        options = collection
        collection = model;
      }
      changed[collection.__path()] = collection;
      this._notify(this.data, changed)
    },

    _notify: function(obj, changed){

      var path = obj.__path(),
          newPath,
          paths,
          queue = [], i, len;

      // Call notify on every object down the data tree starting at the root and all the way down element that triggered the change
      while(obj){
        // Constructs paths variable relative to current data element
        paths = _.map((_.keys(changed)), function(attr){
                  var str = obj.__path().replace(/([.\[\]])/g, '\\$1')+'\\.',
                      regex = new RegExp('^'+ (str || ''), '');
                  return ((path && path + '.') + attr).replace(regex, '');
                });
        // TODO: Clean this up
        if(obj.__observers && paths.length){
          _.each(paths, function(path){
            // For elements in array syntax for a specific element, also notify of a change on the collection for any element changing
            // ex: test.[1].whatever -> test.@each.whatever
            if(path.match(/\[.+\]/g)){
              newPath = path.replace(/\[.+\]/g, "@each");
              paths.push(newPath);
              // Also listen to collection changes. Adds, removes, etc, if applicible.
              if(newPath.match(/\.@each\.?/)){
                newPath = newPath.split(/\.@each\.?/);
                paths.push(newPath[0]);
              }
            }

          })
          queue.push({obj: obj, paths: paths});
        }
        obj = obj.__parent;
      }
      len = queue.length;
      for(i=len-1; i>=0; i--){
        notify(queue[i].obj, queue[i].paths);
      }
    }

  });

  Controller.extend = window.Backbone.Router.extend;

}

export { registerHelper, registerPartial, registerTemplate, templates};
