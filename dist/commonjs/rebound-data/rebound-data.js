"use strict";
var Model = require("rebound-data/model")["default"];
var Collection = require("rebound-data/collection")["default"];
var $ = require("rebound-runtime/utils")["default"];


/**
 * Deinitializes the current class and subclasses associated with it
 * Note: this functionality is common for all Backbone derived class
 *
 */
Model.prototype.deinitialize =
Collection.prototype.deinitialize = function () {

  // deinitialize current class

  // undelegate events..(events specified as part of event:{})
  if (this.undelegateEvents) {
    this.undelegateEvents();
  }

  // stop listening model events
  if (this.stopListening) {
    this.stopListening();
  }

  // unbind events
  if (this.off) {
    this.off();
  }

  // if data has a dom element associated with it, remove all dom events and the dom referance
  if(this.el){

    // Recursively remove all event bindings on dom tree
    $(this.el).walkTheDOM(function(el){
      _.each(el.__events, function(callbacks, eventType){
        _.each(callbacks, function(callback){
          console.log('off', el, eventType);
          $(el).off(eventType, callback);
        });
        el.__events[eventType].length = 0;
      });
    });

    delete this.el.__events;
    delete this.$el;
    delete this.el;
  }

  // mark it as deinitialized
  this.deinitialized = true;
  // deinitialize subclasses
  if(this.data && this.data.deinitialize){
    this.data.deinitialize();
  }

  _.each(this.models, function (value, index) {
    if (value && value.deinitialize) {
      value.deinitialize();
    }
  });

  _.each(this.attributes, function (value, index) {
    if (value && value.deinitialize) {
      value.deinitialize();
    }
  });

  // clean up references
  this.__observers = {};
  // this.models = [];
  this.data = {};
  // this.attributes = {};

};

exports.Model = Model;
exports.Collection = Collection;