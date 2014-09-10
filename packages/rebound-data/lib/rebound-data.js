import Model from "rebound-data/model";
import Collection from "rebound-data/collection";

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