// Rebound Utils
// ----------------

import Backbone from "backbone";
import { query } from "rebound-utils/urls";
import ajax from "rebound-utils/ajax";
import events from "rebound-utils/events";
import Path from "rebound-utils/paths";
import Queue from "rebound-utils/queue";

var ID_COUNTERS = {};

const REBOUND_SYMBOL = '__REBOUND_SYMBOL_PROPERTY_NAME__';

var $ = function $(query){

  var i, selector = [];

  // Allow instantiation without the 'new' keyword
  if ( !(this instanceof $) ) { return new $(query); }

  // Ensure query is an array
  query = Array.isArray(query) ? query : [query];

  // For each query in query array: If it is an element, push it to the selectors
  // array. If it is a string, push all elements that match to selectors array.
  $.each(query, function(item){
    if(_.isElement(item) || item === document || item === window || item instanceof DocumentFragment){ selector.push(item); }
    // Call slice to convert node list to array for push. Save selector used.
    else if($.isString(item)){
      this.selector = item;
      Array.prototype.push.apply(selector, Array.prototype.slice.call(document.querySelectorAll(item))); }
  }, this);

  // Cache the length of our matched elements
  this.length = selector.length;

  // Add selector to object for method chaining
  for (i=0; i < this.length; i++) { this[i] = selector[i]; }

};

$.each = function(obj, iteratee, context) {
    var i, length;
    if (Array.isArray(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee.call(context, obj[i], i, obj);
      }
    }
    else {
      var keys = Object.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee.call(context, obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

// Add url utils
$.url = { query: query };

// Add ajax util
$.ajax = ajax;

// Add event utils
$.prototype.trigger = events.trigger;
$.prototype.on = events.on;
$.prototype.off = events.off;

// Generate a unique integer id (unique within the entire client session).
$.uniqueId = $.prototype.uniqueId = function uniqueId(prefix='') {
  ID_COUNTERS.hasOwnProperty(prefix) || (ID_COUNTERS[prefix] = 0);
  return prefix + (++ID_COUNTERS[prefix]);
};

// Applies function `func` depth first to every node in the subtree starting from `root`
// If the callback returns `false`, short circuit that tree.
$.prototype.walkTheDOM = function walkTheDOM(func) {
  var el, root, len = this.length, result;
  while(len--){
    root = this[len];
    result = func(root);
    if(result === false){ return void 0; }
    root = root.firstChild;
    while (root) {
        $(root).walkTheDOM(func);
        root = root.nextSibling;
    }
  }
};


$.prototype.unMarkLinks = function unMarkLinks(){
  var len = this.length;
  while(len--){
    var links = this[len].querySelectorAll('a');
    for(var i=0;i<links.length;i++){
      links.item(i).classList.remove('active');
      links.item(i).active = false;
    }
  }
  return this;
};

$.prototype.markLinks = function markLinks(){
  var len = this.length;
  while(len--){
    var links = this[len].querySelectorAll('a[href="/'+Backbone.history.fragment+'"]');
    for(var i=0;i<links.length;i++){
      links.item(i).classList.add('active');
      links.item(i).active = true;
    }
  }
  return this;
};

// Empty all selected nodes
$.prototype.empty = function empty(){
  var len = this.length;
  while(len--){
    while (this[len].hasChildNodes()) {
      this[len].removeChild(this[len].firstChild);
    }
  }
  return this;
};

// Searches each key in an object and tests if the property has a lookupGetter or
// lookupSetter. If either are preset convert the property into a computed property.
$.extractComputedProps = function extractComputedProps(obj){
  for(var key in obj){
    let get, set;
    if(!Object.hasOwnProperty.call(obj, key)) continue;
    var desc = Object.getOwnPropertyDescriptor(obj, key);
    get = desc.hasOwnProperty('get') && desc.get;
    set = desc.hasOwnProperty('set') && desc.set;
    if(get || set){
      delete obj[key];
      obj[key] = {get: get, set: set, isComputedProto: true};
    }
  }
};

// Returns true if the data path `str` starts with `test`
$.startsWith = function startsWith(str, test){
  if(str === test) return true;
  str = Path(str).split();
  test = Path(test).split();
  while(test[0] && str[0]){
    if(str[0] !== test[0] && str[0] !== '@each' && test[0] !== '@each') return false;
    test.shift();
    str.shift();
  }
  return true;
};

['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error', 'Object', 'Array'].forEach(function(name) {
  $['is' + name] = function(obj) {
    return Object.prototype.toString.call(obj) === '[object ' + name + ']';
  };
});

// Use native isArray if present
$.isArray = Array.isArray || $.isArray;

$.makeProtected = function makeProtected(obj, parent, keys){
  var proto = parent.prototype;
  var attrs = {};
  keys.forEach((key) => {
    if (proto[key] !== obj[key]) return;
    attrs[key] = {
      get: function(){
        console.error(`Error: Attempted to get value of protected property ${key} on ${this}. This property may be used internally by a subclass by calling "super.${key}"`);
        return void 0;
      },
      set: function(val){
        console.error(`Error: Attempted to set value of protected property ${key} on ${this}. This property may be used internally by a subclass by calling "super.${key}"`);
        return void 0;
      },
      configurable: false,
      enumerable: false
    };
  });
  return Object.defineProperties(obj, attrs);
};


// To make obj fully immutable, freeze each object in obj.
// To do so, we use this function.
$.deepFreeze = function deepFreeze(obj) {

  if (typeof obj !== 'object') return obj;

  // Retrieve the property names defined on obj
  var propNames = Object.getOwnPropertyNames(obj);

  // Freeze properties before freezing self
  propNames.forEach(function(name) {
    var prop = obj[name];

    // Freeze prop if it is an object
    if (typeof prop == 'object' && prop !== null)
      deepFreeze(prop);
  });

  // Freeze self (no-op if already frozen)
  return Object.freeze(obj);
};

export { $, Path, Queue, REBOUND_SYMBOL, $ as default };
