// Rebound Data
// ----------------
// These are methods inherited by all Rebound data types: **Models**,
// **Collections** and **Computed Properties**. Controls tree ancestry
// tracking, deep event propagation and tree destruction.

import Backbone from "backbone";
import Model from "rebound-data/model";
import Collection from "rebound-data/collection";
import ComputedProperty from "rebound-data/computed-property";
import $ from "rebound-utils/rebound-utils";

const PROPAGATION_BLACKLIST = { "dirty": 1 };
const LAST_PATH_SEGMENT = /[\.\[]?[^\.\[\:]*$/;

var sharedMethods = {

  // Override every object's `trigger` method to propagate events up to parent datum.
  trigger: function(type){

    // Call original trigger method to call applicable callbacks on this model
    Backbone.Events.trigger.apply(this, arguments);

    // If the options hash asks us not to propagate this even, stop.
    // Options will always be the last variable passed to this function.
    var options = arguments[arguments.length-1] || {};
    if(options.propagate === false){ return this; }

    // Save a mutable copy of the arguments passed to this function that we can
    // edit as we pass it to our `parent`.
    var args = [].slice.apply(arguments);
    var parent = this.__parent__;

    // If this is a named change event
    if(!!~type.indexOf('change:')){

      // Get our data object and raw event path
      var model = arguments[1];
      var path = type.replace('change:', '');

      // Trigger an event on this data object for each intermediate object between
      // the changed model and `this`. Ex: If `a.b[0].c` was modified, the Events
      // `change:a.b[0].c`, `change:a.b[0]`, `change:a.b` would be triggered on
      // object `a`.
      while((path = path.replace(LAST_PATH_SEGMENT, ''))){
        model = model.__parent__;
        this.trigger('change:'+path, model, this.get(path, {isPath: 1}), {propagate: false});
      }

      // Get the key of our last path segment. This is the un-stripped value: keys
      // pointing to collections will still be wrapped in brackets (ex: [1]).
      var key = (this.__path().match(LAST_PATH_SEGMENT) || [''])[0].replace(/^\./, '');

      // If we have a key to work with, make any modifications needed before proxying up.
      // TODO: Make internal path manipulation helper to encompass path mod logic
      if(key){

        // For Computed Properties, only handle those of type value that don't generate
        // change events internally. Add to change hash and Proxy them right through
        // to the parent with no modification – they already have the right event path name.
        if(this.isComputedProperty){
          parent.changed[key.replace(/\[([^\]*])\]/, '$1')] = this.returnType === 'value' ? this.cache.value : this.cache[this.returnType].changed;
          if(this.returnType !== 'value'){ return this; }
        }

        // For all others, add to changed hash and add this model's location in
        // its parent to the begining of the named `change:` event's path before
        // proxying up to its parent.
        else {
          parent.changed[key.replace(/\[([^\]*])\]/, '$1')] = this.changed;
          if(!!~args[0].indexOf('change:[')){ args[0] = args[0].replace(':', ':' + key); }
          else{ args[0] = args[0].replace(':', ':' + key + '.'); }
        }
      }
    }

    // If this is not the root data element, or a blacklisted event, propagate
    // the event up to this datum's parent.
    if(parent !== this && !PROPAGATION_BLACKLIST[type]){
      parent._changing = true;
      parent.trigger.apply(parent, args);
      parent._changing = false;
    }

    return this;

  },

  // Set this data object's parent to `parent` and, as long as a data object is
  // not its own parent, propagate every event triggered on `this` up the tree.
  setParent: function(parent){
    this.__parent__ = parent;
    this._hasAncestry = true;
    return parent;
  },

  // Recursively set a data tree's root element starting with `this` to the deepest child.
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

  // Tests to see if `this` has a parent `obj`.
  hasParent: function(obj){
    var tmp = this;
    while(tmp !== obj){
      tmp = tmp.__parent__;
      if(_.isUndefined(tmp)) return false;
      if(tmp === obj) return true;
      if(tmp.__parent__ === tmp) return false;
    }
    return true;
  },

  // De-initializes a data tree starting with `this` and recursively calling `deinitialize()` on each child.
  deinitialize: function () {

  // Undelegate Backbone Events from this data object
    if (this.undelegateEvents){ this.undelegateEvents(); }
    if (this.stopListening){ this.stopListening(); }
    if (this.off){ this.off(); }
    if (this.unwire){ this.unwire(); }

  // Destroy this data object's lineage
    delete this.__parent__;
    delete this.__root__;
    delete this.__path;

  // If there is a dom element associated with this data object, destroy all listeners associated with it.
  // Remove all event listeners from this dom element, recursively remove element lazyvalues,
  // and then remove the element referance itself.
    if(this.el){
      _.each(this.el.__listeners, function(handler, eventType){
        if (this.el.removeEventListener){ this.el.removeEventListener(eventType, handler, false); }
        if (this.el.detachEvent){ this.el.detachEvent('on'+eventType, handler); }
      }, this);
      $(this.el).walkTheDOM(function(el){
        if(el.__lazyValue && el.__lazyValue.destroy()){ n.__lazyValue.destroy(); }
      });
      delete this.el.__listeners;
      delete this.el.__events;
      delete this.$el;
      delete this.el;
    }

  // Clean up Hook callback references
    delete this.__observers;

  // Mark as deinitialized so we don't loop on cyclic dependancies.
    this.deinitialized = true;

  // Destroy all children of this data object.
  // If a Collection, de-init all of its Models, if a Model, de-init all of its
  // Attributes that aren't services, if a Computed Property, de-init its Cache objects.
    _.each(this.models, function(val){ val && val.deinitialize && val.deinitialize(); });
    this.models && (this.models.length = 0);
    _.each(this.attributes, (val, key) => {
      delete this.attributes[key];
      val && !val.isComponent && val.deinitialize && val.deinitialize();
    });
    if(this.cache){
      this.cache.collection.deinitialize();
      this.cache.model.deinitialize();
    }
  }
};

// Extend all of the **Rebound Data** prototypes with these shared methods
_.extend(Model.prototype, sharedMethods);
_.extend(Collection.prototype, sharedMethods);
_.extend(ComputedProperty.prototype, sharedMethods);

export { Model as Model };
export { Collection as Collection };
export { ComputedProperty as ComputedProperty };
export default { Model, Collection, ComputedProperty };
