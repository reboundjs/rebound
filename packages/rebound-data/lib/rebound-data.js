import Model from "rebound-data/model";
import Collection from "rebound-data/collection";
import $ from "rebound-runtime/utils";


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

  // if data has a dom element associated with it, remove all dom events
  if(this.el && this.el.__events){
    _.each(this.el.__events, function(callbacks, eventType){
      _.each(callbacks, function(callback){
        $(this.el).off(eventType, callback);
      }, this);
      this.el.__events[eventType].length = 0;
    }, this);
    delete this.el.__events;
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

export { Model, Collection };