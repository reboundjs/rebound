"use strict";
var Model = require("rebound-data/model")["default"];
var Collection = require("rebound-data/collection")["default"];
var ComputedProperty = require("rebound-data/computed-property")["default"];
var $ = require("rebound-runtime/utils")["default"];


var sharedMethods = {
  setParent: function(parent){

    if(this.__parent__){
      this.off('all', this.__parent__.trigger);
    }

    this.__parent__ = parent;
    this._hasAncestry = true;

    // If parent is not self, propagate all events up
    if(parent !== this && !parent.isCollection){
      this.on('all', parent.trigger, parent);
    }

    return parent;

  },

  // TODO: I dont like this recursively setting elements root when one element's root changes. Fix this.
  setRoot: function (root){
    var obj = this;
    obj.__root__ = root;
    var val = obj.models ||  obj.attributes || obj.cache;
    _.each(val, function(value, key){
      if(value && value.isData){
        value.setRoot(root);
      }
    });
    return root;
  },

  hasParent: function(obj){
    var tmp = this;
    while(tmp !== obj){
      tmp = tmp.__parent__;
      if(_.isUndefined(tmp)){ return false; }
      if(tmp === obj){ return true; }
      if(tmp.__parent__ === tmp){ return false; }
    }
    return true;
  },

  deinitialize: function () {

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

    delete this.__parent__;
    delete this.__root__;
    delete this.__path;

    // if data has a dom element associated with it, remove all dom events and the dom referance
    if(this.el){

      _.each(this.el.__listeners, function(handler, eventType){
        if (this.el.removeEventListener){ this.el.removeEventListener(eventType, handler, false); }
        if (this.el.detachEvent){ this.el.detachEvent('on'+eventType, handler); }
      }, this);

      // Remove all event delegates
      delete this.el.__listeners;
      delete this.el.__events;

      // Recursively remove element lazyvalues
      $(this.el).walkTheDOM(function(el){
        if(el.__lazyValue && el.__lazyValue.destroy()){
          n.__lazyValue.destroy();
        }
      });

      // Remove element referances
      delete this.$el;
      delete this.el;
    }

    // Mark it as deinitialized
    this.deinitialized = true;
    // deinitialize subclasses
    if(this.data && this.data.deinitialize){
      this.data.deinitialize();
    }

    // De-init all models in a collection
    _.each(this.models, function (value, index) {
      if (value && value.deinitialize) {
        value.deinitialize();
      }
    });

    // De-init all attributes in a model
    _.each(this.attributes, function (value, index) {
      if (value && value.deinitialize) {
        value.deinitialize();
      }
    });

    // De-init computed proeprties' cache objects
    if(this.cache){
      this.cache.collection.deinitialize();
      this.cache.model.deinitialize();
    }

    // clean up references
    this.__observers = {};
    // this.models = [];
    this.data = {};
    // this.attributes = {};

  }
};

_.extend(Model.prototype, sharedMethods);
_.extend(Collection.prototype, sharedMethods);
_.extend(ComputedProperty.prototype, sharedMethods);


exports.Model = Model;
exports.Collection = Collection;
exports.ComputedProperty = ComputedProperty;