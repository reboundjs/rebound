import propertyCompiler from "rebound/property-processor";
import { registerHelper, registerPartial, registerTemplate, notify, hydrate, templates } from "rebound/runtime";

// If Rebound Runtime has already been run, throw error
if(Backbone.Controller)
  throw 'Rebound is already loaded on the page!';
// If Backbone hasn't been started yet, throw error
if(!window.Backbone)
  throw "Backbone must be on the page for Rebound to load.";

var controllerOptions = ['template', 'routes', 'immortal', 'data'];

// New Backbone Controller
var Controller = Backbone.Controller = function(options){

  var dom;
  options || (options = {});
  this.cid = _.uniqueId('controller');
  this.attributes = {};
  this.changed = {};
  this.defaults = this.defaults || {};

  _.bindAll(this, '_onModelChange', '_onCollectionChange', '__callOnController');

  // Take our parsed data and convert it to a backbone model.
  // In the model, primatives (arrays, objects, etc) are converted to Backbone Objects
  // Functions are compiled to find their dependancies and registerd as compiled properties
  this.set(_.defaults((options.data || {}), this.defaults));
  propertyCompiler.compile(this);

  // Get any additional routes passed in from options
  this.routes =  _.defaults((options.routes || {}), this.routes);
  // Ensure that all route functions exist
  _.each(this.routes, function(value, key, routes){
      // TODO: Better error output
      if(typeof value !== 'string') throw('Function name passed to routes must be a string!');
      if(!this[value]) throw('Callback function '+value+' does not exist on the controller!');
  }, this)

  // Set our outlet and template if we have one
  this.outlet = options.outlet || undefined;
  this.template = options.template || this.template || undefined;

  // Take our precompiled template and hydrates it. When Rebound Compiler is included, can be a handlebars template string.
  this._setTemplate();

  // Listen to relevent data change events
  this._startListening();

  // Render our dom
  dom = this.template(this, {helpers: {'__callOnController': this.__callOnController}});

  // Save our dom elements on our controller
  this.$el = $('<div></div>').attr('id', this.name).html(dom)
  this.el = this.$el[0]

  if(this.created){
    this.created.call(this);
  }

  // Output if given an outlet
  if(this.outlet){
    this.outlet.html(this.el);
    if(this.attached){
      var instance = this;
      setTimeout(function(){instance.attached.call(instance);}, 0)
    }
  }
}

_.extend(Controller.prototype, Backbone.Model.prototype, {

  // Initialize is an empty function by default. Override it with your own initialization logic.
  initialize: function(){},

  isController: true,

  $: function(selector) {
    return this.$el.find(selector);
  },

  __callOnController: function(name, event){
      this[name].call(this, event);
  },

  // Hydrate our template
  // Rebound Compiler overrides and gives the option for out template variable to be a handlebars template string
  _setTemplate: function(){
    // TODO: Better errro output
    if (typeof this.template === 'string') this.template = Rebound.templates[this.template];
    if (typeof this.template !== 'function') throw "Template is required";
    return this.template = hydrate(this.template);
  },

  _startListening: function(){
    this.listenTo(this, 'change', this._onModelChange);
    this.listenTo(this, 'add remove reset', this._onCollectionChange);
  },

  _getValue: function(key){

  },

  _onModelChange: function(model, options){
    this._notify(model, model.changedAttributes())
  },

  _onCollectionChange: function(model, collection, options){
    var changed = {};
    if(model.isCollection){
      options = collection
      collection = model;
    }
    changed[collection.__path()] = collection;
    this._notify(this, changed)
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

Controller.extend = function(protoProps, staticProps) {
    var parent = this,
        child,
        reservedMethods = {'constructor':1, 'get':1, 'set':1, 'has':1, 'extend':1, 'escape':1, 'unset':1, 'clear':1, 'cid':1, 'attributes':1, 'changed':1, 'toJSON':1, 'validationError':1, 'isValid':1, 'isNew':1, 'hasChanged':1, 'changedAttributes':1, 'previous':1, 'previousAttributes':1},
        configProperties = {'routes':1, 'template':1, 'defaults':1, 'outlet':1, 'url':1, 'urlRoot':1, 'idAttribute':1, 'id':1, 'created':1, 'attached':1, 'detached':1};

    protoProps.defaults = {};

    // For each primative value, or computed property (functions with that take no arguments and have a return value), add it to our data object
    _.each(protoProps, function(value, key, protoProps){
      var str = value.toString();
      // If a configuration property, return
      if(configProperties[key]) return;
      // Primative or backbone type equivalent, or computed property which takes no arguments and returns a value
      if(    !_.isFunction(value)
          || value.isModel
          || value.isController
          || (value && value.length === 0 && str.indexOf('return') > -1)){
        protoProps.defaults[key] = value;
        delete protoProps[key];
      }

      // All other values are controller methods, leave them be unless already defined.
      // TODO: better error output.
      if(reservedMethods[key]) throw "ERROR: " + key + " is a reserved method name!";

    }, this);

    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    _.extend(child, parent, staticProps);

    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    if (protoProps) _.extend(child.prototype, protoProps);

    child.__super__ = parent.prototype;

    return child;
  };

export { Controller }