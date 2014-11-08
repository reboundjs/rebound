"use strict";
var $ = function(query){
  return new utils(query);
};

var utils = function(query){
  var i, selector = _.isElement(query) && [query] || (query === document) && [document] || _.isString(query) && querySelectorAll(query) || [];
  this.length = selector.length;

  // Add selector to object for method chaining
  for (i=0; i < this.length; i++) {
      this[i] = selector[i];
  }

  return this;
};

function returnFalse(){return false;}
function returnTrue(){return true;}

$.Event = function( src, props ) {
	// Allow instantiation without the 'new' keyword
	if ( !(this instanceof $.Event) ) {
		return new $.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = src.defaultPrevented ||
				src.defaultPrevented === undefined &&
				// Support: Android<4.0
				src.returnValue === false ?
			returnTrue :
			returnFalse;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		_.extend( this, props );
	}

  // Copy over all original event properties
  _.extend(this, _.pick( this.originalEvent, [
      "altKey", "bubbles", "cancelable", "ctrlKey", "currentTarget", "eventPhase",
      "metaKey", "relatedTarget", "shiftKey", "target", "timeStamp", "view",
      "which", "char", "charCode", "key", "keyCode", "button", "buttons",
      "clientX", "clientY", "", "offsetX", "offsetY", "pageX", "pageY", "screenX",
      "screenY", "toElement"
    ]));

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || (new Date()).getTime();

	// Mark it as fixed
	this.isEvent = true;
};

$.Event.prototype = {
	constructor: $.Event,
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse,

	preventDefault: function() {
		var e = this.originalEvent;

		this.isDefaultPrevented = returnTrue;

		if ( e && e.preventDefault ) {
			e.preventDefault();
		}
	},
	stopPropagation: function() {
		var e = this.originalEvent;

		this.isPropagationStopped = returnTrue;

		if ( e && e.stopPropagation ) {
			e.stopPropagation();
		}
	},
	stopImmediatePropagation: function() {
		var e = this.originalEvent;

		this.isImmediatePropagationStopped = returnTrue;

		if ( e && e.stopImmediatePropagation ) {
			e.stopImmediatePropagation();
		}

		this.stopPropagation();
	}
};


utils.prototype = {

  // Given a valid data path, split it into an array of its parts.
  // ex: foo.bar[0].baz --> ['foo', 'var', '0', 'baz']
  splitPath: function(path){
    return _.compact(path.split(/(?:\.|\[|\])+/));
  },

  // Applies function `func` depth first to every node in the subtree starting from `root`
  walkTheDOM: function(func) {
    var el, root, len = this.length;
    while(len--){
      root = this[len];
      func(root);
      root = root.firstChild;
      while (root) {
          $(root).walkTheDOM(func);
          root = root.nextSibling;
      }
    }
  },

  /*  Copyright (C) 2012-2014  Kurt Milam - http://xioup.com | Source: https://gist.github.com/1868955
   *
   *  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
   *  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
   *
   *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
  **/

  // Rolled my own deep extend in leu of having a hard dependancy on lodash.
  deepDefaults: function(dest) {
      var slice = Array.prototype.slice,
          hasOwnProperty = Object.prototype.hasOwnProperty;

      _.each(slice.call(arguments, 1), function(src){

        // For each property in this object
        for (var prop in src) {
          if (hasOwnProperty.call(src, prop)) {

            // If destination
            if(_.isUndefined(dest[prop])){
                dest[prop] = src[prop];
            }
            else if(_.isObject(dest[prop])){
              if(dest[prop].isCollection){
                // Collection -> Collection
                if(src[prop].isCollection){
                  // Preserve object defaults from the dest with the models from the data src
                  dest[prop] = $.deepDefaults([], dest[prop].models, src[prop].models);
                }
                // Array -> Collection
                else if(_.isArray(src[prop])){
                  dest[prop].set(src[prop]);
                  continue;
                }
                //
                else{
                  dest[prop] = $.deepDefaults([], dest[prop].models, src[prop]);
                }
              }
              else if(_.isArray(dest[prop])){
                dest[prop] = $.deepDefaults([], dest[prop], src[prop]);
              }
              else if((dest[prop].isModel)){
                dest[prop] = $.deepDefaults({}, dest[prop].attributes, src[prop]);
              }
              else{
                dest[prop] = $.deepDefaults({}, dest[prop], src[prop]);
              }
            }
          }
        }
      });

      return dest;
    },

  // Events registry. An object containing all events bound through this util shared among all instances.
  _events: {},

  // Takes the targed the event fired on and returns all callbacks for the delegated element
  _hasDelegate: function(target, delegate, eventType){
    var callbacks = [];

    // Get our callbacks
    if(target.delegateGroup && this._events[target.delegateGroup][eventType]){
      _.each(this._events[target.delegateGroup][eventType], function(callbacksList, delegateId){
        if(_.isArray(callbacksList) && (delegateId === delegate.delegateId || ( delegate.matchesSelector && delegate.matchesSelector(delegateId) )) ){
          callbacks = callbacks.concat(callbacksList);
        }
      });
    }

    return callbacks;
  },

  // Triggers an event on a given dom node
  trigger: function(eventName, options){
    var el, len = this.length;
    while(len--){
      el = this[len];
      if (document.createEvent) {
        var event = document.createEvent('HTMLEvents');
        event.initEvent(eventName, true, false);
        el.dispatchEvent(event);
      } else {
        el.fireEvent('on'+eventName);
      }
    }
  },

  off: function(eventType, handler){
    var el, len = this.length, eventCount;

    while(len--){

      el = this[len];
      eventCount = 0;

      if(el.delegateGroup){
        if(this._events[el.delegateGroup][eventType] && _.isArray(this._events[el.delegateGroup][eventType][el.delegateId])){
          _.each(this._events[el.delegateGroup][eventType], function(delegate, index, delegateList){
            _.each(delegateList, function(callback, index, callbackList){
              if(callback === handler){
                delete callbackList[index];
                return;
              }
              eventCount++;
            });
          });
        }
      }

      // If there are no more of this event type delegated for this group, remove the listener
      if (eventCount === 0 && el.removeEventListener){
        el.removeEventListener(eventType, handler, false);
      }
      if (eventCount === 0 && el.detachEvent){
        el.detachEvent('on'+eventType, handler);
      }

    }
  },

  on: function (eventName, delegate, data, handler) {
    var el,
        events = this._events,
        len = this.length,
        eventNames = eventName.split(' '),
        delegateId, delegateGroup;

    while(len--){
      el = this[len];

      // Normalize data input
      if(_.isFunction(delegate)){
        handler = delegate;
        delegate = el;
        data = {};
      }
      if(_.isFunction(data)){
        handler = data;
        data = {};
      }
      if(!_.isString(delegate) && !_.isElement(delegate)){
        console.error("Delegate value passed to Rebound's $.on is neither an element or css selector");
        return false;
      }

      delegateId = _.isString(delegate) ? delegate : (delegate.delegateId = delegate.delegateId || _.uniqueId('event'));
      delegateGroup = el.delegateGroup = (el.delegateGroup || _.uniqueId('delegateGroup'));

      _.each(eventNames, function(eventName){

        // Ensure event obj existance
        events[delegateGroup] = events[delegateGroup] || {};

        // TODO: take out of loop
        var callback = function(event){
              var target, i, len, eventList, callbacks, callback, falsy;
              event = new $.Event((event || window.event)); // Convert to mutable event
              target = event.target || event.srcElement;

              // Travel from target up to parent firing event on delegate when it exizts
              while(target){

                // Get all specified callbacks (element specific and selector specified)
                callbacks = $._hasDelegate(el, target, event.type);

                len = callbacks.length;
                for(i=0;i<len;i++){
                  event.target = event.srcElement = target;               // Attach this level's target
                  event.data = callbacks[i].data;                         // Attach our data to the event
                  event.result = callbacks[i].callback.call(el, event);   // Call the callback
                  falsy = ( event.result === false ) ? true : falsy;      // If any callback returns false, log it as falsy
                }

                // If any of the callbacks returned false, prevent default and stop propagation
                if(falsy){
                  event.preventDefault();
                  event.stopPropagation();
                  return false;
                }

                target = target.parentNode;
              }
            };

        // If this is the first event of its type, add the event handler
        if(!events[delegateGroup][eventName]){
          if (el.addEventListener) {
            el.addEventListener(eventName, callback);
          } else {
            el.attachEvent('on' + eventName, callback);
          }
        }


        // Add our listener
        events[delegateGroup][eventName] = events[delegateGroup][eventName] || {};
        events[delegateGroup][eventName][delegateId] = events[delegateGroup][eventName][delegateId] || [];
        events[delegateGroup][eventName][delegateId].push({callback: handler, data: data});

      }, this);
    }
  },

  // http://krasimirtsonev.com/blog/article/Cross-browser-handling-of-Ajax-requests-in-absurdjs
  ajax: function(ops) {
      if(typeof ops == 'string') ops = { url: ops };
      ops.url = ops.url || '';
      ops.json = ops.json || true;
      ops.method = ops.method || 'get';
      ops.data = ops.data || {};
      var getParams = function(data, url) {
          var arr = [], str;
          for(var name in data) {
              arr.push(name + '=' + encodeURIComponent(data[name]));
          }
          str = arr.join('&');
          if(str !== '') {
              return url ? (url.indexOf('?') < 0 ? '?' + str : '&' + str) : str;
          }
          return '';
      };
      var api = {
          host: {},
          process: function(ops) {
              var self = this;
              this.xhr = null;
              if(window.ActiveXObject) { this.xhr = new ActiveXObject('Microsoft.XMLHTTP'); }
              else if(window.XMLHttpRequest) { this.xhr = new XMLHttpRequest(); }
              if(this.xhr) {
                  this.xhr.onreadystatechange = function() {
                      if(self.xhr.readyState == 4 && self.xhr.status == 200) {
                          var result = self.xhr.responseText;
                          if(ops.json === true && typeof JSON != 'undefined') {
                              result = JSON.parse(result);
                          }
                          self.doneCallback && self.doneCallback.apply(self.host, [result, self.xhr]);
                          ops.success && ops.success.apply(self.host, [result, self.xhr]);
                      } else if(self.xhr.readyState == 4) {
                          self.failCallback && self.failCallback.apply(self.host, [self.xhr]);
                          ops.error && ops.error.apply(self.host, [self.xhr]);
                      }
                      self.alwaysCallback && self.alwaysCallback.apply(self.host, [self.xhr]);
                      ops.complete && ops.complete.apply(self.host, [self.xhr]);
                  };
              }
              if(ops.method == 'get') {
                  this.xhr.open("GET", ops.url + getParams(ops.data, ops.url), true);
                  this.setHeaders({
                    'X-Requested-With': 'XMLHttpRequest'
                  });
              } else {
                  this.xhr.open(ops.method, ops.url, true);
                  this.setHeaders({
                      'X-Requested-With': 'XMLHttpRequest',
                      'Content-type': 'application/x-www-form-urlencoded'
                  });
              }
              if(ops.headers && typeof ops.headers == 'object') {
                  this.setHeaders(ops.headers);
              }
              setTimeout(function() {
                  ops.method == 'get' ? self.xhr.send() : self.xhr.send(getParams(ops.data));
              }, 20);
              return this.xhr;
          },
          done: function(callback) {
              this.doneCallback = callback;
              return this;
          },
          fail: function(callback) {
              this.failCallback = callback;
              return this;
          },
          always: function(callback) {
              this.alwaysCallback = callback;
              return this;
          },
          setHeaders: function(headers) {
              for(var name in headers) {
                  this.xhr && this.xhr.setRequestHeader(name, headers[name]);
              }
          }
      };
      return api.process(ops);
  }
};

_.extend($, utils.prototype);



exports["default"] = $;