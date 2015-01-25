"use strict";

var Model = require("rebound-data/rebound-data").Model;


var NIL = function NIL() {},
    EMPTY_ARRAY = [];

function LazyValue(fn, context) {
  this.valueFn = fn;
  this.context = context || null;
  _.bindAll(this, "value", "set", "addDependentValue", "addObserver", "notify", "onNotify", "destroy");
}

LazyValue.prototype = {
  isLazyValue: true,
  parent: null, // TODO: is parent even needed? could be modeled as a subscriber
  children: null,
  observers: null,
  cache: NIL,
  valueFn: null,
  subscribers: null, // TODO: do we need multiple subscribers?
  _childValues: null, // just for reusing the array, might not work well if children.length changes after computation

  value: function () {
    var cache = this.cache;
    if (cache !== NIL) {
      return cache;
    }

    var children = this.children;
    if (children) {
      var child,
          values = this._childValues || new Array(children.length);

      for (var i = 0, l = children.length; i < l; i++) {
        child = children[i];
        values[i] = child && child.isLazyValue ? child.value() : child;
      }

      return this.cache = this.valueFn(values);
    } else {
      return this.cache = this.valueFn(EMPTY_ARRAY);
    }
  },

  set: function (key, value, options) {
    if (this.context) {
      return this.context.set(key, value, options);
    }
    return null;
  },

  addDependentValue: function (value) {
    var children = this.children;
    if (!children) {
      children = this.children = [value];
    } else {
      children.push(value);
    }

    if (value && value.isLazyValue) {
      value.parent = this;
    }

    return this;
  },

  addObserver: function (path, context) {
    var observers = this.observers || (this.observers = []),
        position,
        res;

    if (!_.isObject(context) || !_.isString(path)) {
      return console.error("Error adding observer for", context, path);
    }

    // Ensure _observers exists and is an object
    context.__observers = context.__observers || {};
    // Ensure __observers[path] exists and is an array
    context.__observers[path] = context.__observers[path] || [];

    // Add our callback, save the position it is being inserted so we can garbage collect later.
    position = context.__observers[path].push(this.notify) - 1;

    // Save the type of object events this observer is for
    res = context.get(this.path);
    context.__observers[path][position].type = res && res.isCollection ? "collection" : "model";

    // Lazyvalue needs referance to its observers to remove listeners on destroy
    observers.push({ context: context, path: path, index: position });

    return this;
  },

  notify: function (sender) {
    try {
      var cache = this.cache,
          parent,
          subscribers;

      if (cache !== NIL) {
        parent = this.parent;
        subscribers = this.subscribers;
        cache = this.cache = NIL;

        if (parent) {
          parent.notify(this);
        }
        if (!subscribers) {
          return;
        }
        for (var i = 0, l = subscribers.length; i < l; i++) {
          subscribers[i](this);
        }
      }
    } catch (err) {
      console.log("KILLING OBSERVER", sender);
      console.log(err.stack);
      this.destroy();
    }
  },

  onNotify: function (callback) {
    var subscribers = this.subscribers || (this.subscribers = []);
    subscribers.push(callback);
    return this;
  },

  destroy: function () {
    _.each(this.children, function (child) {
      if (child && child.isLazyValue) {
        child.destroy();
      }
    });
    _.each(this.subscribers, function (subscriber) {
      if (subscriber && subscriber.isLazyValue) {
        subscriber.destroy();
      }
    });

    this.parent = this.children = this.cache = this.valueFn = this.subscribers = this._childValues = null;

    _.each(this.observers, function (observer) {
      if (_.isObject(observer.context.__observers[observer.path])) {
        delete observer.context.__observers[observer.path][observer.index];
      }
    });

    this.observers = null;
  }
};

module.exports = LazyValue;