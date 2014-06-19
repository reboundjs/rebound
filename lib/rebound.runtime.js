import { registerHelper, notify, hydrate } from "rebound/runtime";

// If Backbone hasn't been started yet, throw error
if(!window.Backbone)
  throw "Backbone must be on the page for Rebound to load.";
// If Rebound Runtime has already been run, exit
if(!window.Backbone.Controller){

  // New Backbone Controller
  var Controller = Backbone.Controller = function(options){
    this.cid = _.uniqueId('controller');
    options || (options = {});
    _.extend(this, _.pick(options, controllerOptions));
    this.initialize.apply(this, arguments);
    this.data = options.models;

    // Take our precompiled template and hydrates it. When Rebound Compiler is included, can be a handlebars template string.
    this._setTemplate();
    this._assembleData();
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

    _assembleData: function(){

      _.each(this.models, function(model, key, list){
        // Make our model aware of its assigned name
        model.__name = key;

        this.listenTo(model, 'change', this._notify)
      }, this)
    },

    _startListening: function(){
      this.dom = this.template(this.data);
      this.outlet.html(this.dom)
    },

    _getValue: function(key){

    },

    _notify: function(event){
      var name = event.__name;
      notify(this.data, _.map(_.keys(event.changedAttributes()), function(attr){ return name + '.' + attr; }))
    }

  });

  Controller.extend = window.Backbone.Router.extend;

}

export { registerHelper };
