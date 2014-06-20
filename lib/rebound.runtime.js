import { registerHelper, notify, hydrate } from "rebound/runtime";

// If Backbone hasn't been started yet, throw error
if(!window.Backbone)
  throw "Backbone must be on the page for Rebound to load.";
// If Rebound Runtime has already been run, exit
if(!window.Backbone.Controller){

  // By default, __path returns the root object unless overridden
  Backbone.Model.prototype.__path = function(){return '';};
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

      // If this is a new key, and it is an eventable object, propagate its event to our parent
      if(!(this.has(key)) && val instanceof Backbone.Model || val instanceof Backbone.Collection){
        // When requesting the name value of our value, return the its key appended to the computed name value of our parent
        // Closure is needed to preserve values in the instance so they dont get set to the prototype
        val.__path = (function(model, key){ return function(){ return model.__path() + key + '.'; }; })(this, key);
        val.__parent = this;
        val.on('all', this.trigger, this);
      }

      // Call original backbone set function
      this.__set.call(this, key, val, options);

    }
  }

  // By default, __path returns the root object unless overridden
  Backbone.Collection.prototype.__path = function(){return '';};
  // Have collections set its model's names.
  Backbone.Collection.prototype.__set = Backbone.Collection.prototype.set;
  Backbone.Collection.prototype.set = function(models, options){
    var models = (!_.isArray(models)) ? (models ? [models] : []) : _.clone(models),
        id, model, i, l;

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
        model.__path = (function(collection, i){ return function(){return collection.__path() + '[' + i + '].' }; })(this, i);
        model.__parent = this;
      }

      // Call original set function
      this.__set.call(this, model, options);
    }
  }

  // New Backbone Controller
  var Controller = Backbone.Controller = function(options){
    this.cid = _.uniqueId('controller');
    options || (options = {});
    _.extend(this, _.pick(options, controllerOptions));
    this.initialize.apply(this, arguments);
    this.data = options.data;

    // Take our precompiled template and hydrates it. When Rebound Compiler is included, can be a handlebars template string.
    this._setTemplate();
    this._startListening();
  }


  var controllerOptions = ['models', 'collections', 'outlet', 'template'];

  _.extend(Controller.prototype, Backbone.Events, {

    // Initialize is an empty function by default. Override it with your own initialization logic.
    initialize: function(){},

    // Hydrate our template
    // Rebound Compiler overrides and gives the option for out template variable to be a handlebars template string
    _setTemplate: function(){
      if (typeof this.template === 'string') throw "Please include rebound compiler to use client side string templates, otherwise be sure to pre-compile.";
      if (typeof this.template !== 'function') throw "Template is required";
      return this.template = hydrate(this.template);
    },

    _startListening: function(){
      this.dom = this.template(this.data);
      this.listenTo(this.data, 'change', this._notify)
      this.outlet.html(this.dom);
    },

    _getValue: function(key){

    },

    _notify: function(event){
      var path = event.__path(),
          obj = event,
          paths;

      // Call notify on every object up the data tree starting at the element that triggered the change
      while(obj){
        // Constructs path variable relative to current data element
        paths = _.map(_.keys(event.changedAttributes()), function(attr){return (path + attr).replace(obj.__path(), '');});
        if(obj.__observers){
          notify(obj, paths);
        }
        obj = obj.__parent;
      }
    }

  });

  Controller.extend = window.Backbone.Router.extend;

}

export { registerHelper };
