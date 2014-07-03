"use strict";
var registerHelper = require("./rebound/runtime").registerHelper;
var notify = require("./rebound/runtime").notify;
var hydrate = require("./rebound/runtime").hydrate;
var compile = require("./rebound/compiler").compile;

// If Backbone hasn't been started yet, throw error
if(!window.Backbone)
  throw "Backbone must be on the page for Rebound to load.";


// New Backbone Controller
var Controller = Backbone.Controller = function(options){
  this.cid = _.uniqueId('controller');
  options || (options = {});
  _.extend(this, _.pick(options, controllerOptions));
  this.initialize.apply(this, arguments);
  this.data = {};

  this.template = ((typeof this.template === 'string') && compile(this.template)) || ((typeof this.template === 'function') && this.template) || false;

  this._assembleData();
  this._startListening();
}

var controllerOptions = ['models', 'collections', 'outlet', 'template'];

_.extend(Controller.prototype, Backbone.Events, {

  // Initialize is an empty function by default. Override it with your own initialization logic.
  initialize: function(){},

  _assembleData: function(){

    _.each(this.models, function(model, key, list){
      // Make our model aware of its assigned name
      model.__name = key;
      // Construct our vanilla js data model. All objects are passed by referance so this will reflect the current state of our models.
      this.data[key] = model.attributes;
      this.listenTo(model, 'change', this._notify)
    }, this)
    console.log(this.data)
  },

  _startListening: function(){
    console.log(this.data)
    this.dom = this.template(this.data);
    this.outlet.html(this.dom)
  },

  _notify: function(event){
    var name = event.__name;
    console.log(this.data)
    console.log(_.map(_.keys(event.changedAttributes()), function(attr){ return name + '.' + attr; }))
    notify(this.data, _.map(_.keys(event.changedAttributes()), function(attr){ return name + '.' + attr; }))
  }

});

Controller.extend = window.Backbone.Router.extend;

exports.compile = compile;
exports.registerHelper = registerHelper;
exports.notify = notify;
exports.hydrate = hydrate;