// Rebound Utils
// ----------------

import Backbone from "backbone";
import url from "rebound-utils/urls";
import ajax from "rebound-utils/ajax";
import events from "rebound-utils/events";

var ID_COUNTERS = {};

export const REBOUND_SYMBOL = '__REBOUND_SYMBOL_PROPERTY_NAME__';

export var $ = function $(query){

  var i, selector = [];

  // Allow instantiation without the 'new' keyword
  if ( !(this instanceof $) ) { return new $(query); }

  // Ensure query is an array
  query = _.isArray(query) ? query : [query];

  // For each query in query array: If it is an element, push it to the selectors
  // array. If it is a string, push all elements that match to selectors array.
  _.each(query, function(item, index){
    if(_.isElement(item) || item === document || item === window){ selector.push(item); }
    else if(_.isString(item)){ Array.prototype.push.apply(selector, document.querySelectorAll(item)); }
  });

  // Cache the length of our matched elements
  this.length = selector.length;

  // Add selector to object for method chaining
  for (i=0; i < this.length; i++) { this[i] = selector[i]; }

};

// Add url utils
$.url = url;

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


// Given a valid data path, split it into an array of its parts.
// ex: foo.bar[0].baz --> ['foo', 'var', '0', 'baz']
$.splitPath = function splitPath(path){
  path = ('.'+path+'.').split(/(?:\.|\[|\])+/);
  path.pop();
  path.shift();
  return path;
};

// Searches each key in an object and tests if the property has a lookupGetter or
// lookupSetter. If either are preset convert the property into a computed property.
$.extractComputedProps = function extractComputedProps(obj){
  for(var key in obj){
    let get, set;
    if(!obj.hasOwnProperty(key)) continue;
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
  str = $.splitPath(str);
  test = $.splitPath(test);
  while(test[0] && str[0]){
    if(str[0] !== test[0] && str[0] !== '@each' && test[0] !== '@each') return false;
    test.shift();
    str.shift();
  }
  return true;
};

export default $;