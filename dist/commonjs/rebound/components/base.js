"use strict";

/**
 * Deinitializes the current class and subclasses associated with it
 * Note: this functionality is common for all Backbone derived class
 *
 */
Backbone.Model.prototype.deinitialize =
Backbone.Collection.prototype.deinitialize =
Backbone.View.prototype.deinitialize =
Backbone.Controller.prototype.deinitialize = function () {

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
  console.log('DESTROY', this.__observers);

  // clean up references
  this.__observers = {};
  this.models = [];
  this.data = {};
  this.attributes = {};

};