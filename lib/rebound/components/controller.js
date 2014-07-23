import propertyCompiler from "rebound/property-processor";
import { registerHelper, registerPartial, registerTemplate, notify, hydrate, templates } from "rebound/runtime";

// If Rebound Runtime has already been run, throw error
if(Backbone.Controller)
  throw 'Rebound is already loaded on the page!';
// If Backbone hasn't been started yet, throw error
if(!window.Backbone)
  throw "Backbone must be on the page for Rebound to load.";

var controllerOptions = ['models', 'collections', 'outlet', 'template', 'routes', 'immortal'];

// New Backbone Controller
var Controller = Backbone.Controller = function(options){
  this.cid = _.uniqueId('controller');
  _.bindAll(this, '_onModelChange', '_onCollectionChange', '__callOnController');
  options || (options = {});
  _.extend(this, _.pick(options, controllerOptions));
  this.initialize.apply(this, arguments);
  this.data = options.data || this.data || {};
  this.routes = options.routes || this.routes || {};

  propertyCompiler.compile(this.data);

  // Ensure that any route functions exist
  _.each(this.routes, function(value, key, routes){
      if(typeof value !== 'string') throw('Function name passed to routes must be a string!');
      if(!this[value]) throw('Callback function '+value+' does not exist on the controller!');
  }, this)

  // Take our precompiled template and hydrates it. When Rebound Compiler is included, can be a handlebars template string.
  this._setTemplate();
  this._startListening();

}

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
    this.dom = this.template(this.data, {helpers: {'__callOnController': this.__callOnController}});

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

export { Controller }