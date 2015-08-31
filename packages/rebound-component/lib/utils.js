// Rebound Utils
// ----------------

var $ = function(query){
  return new utils(query);
};

var utils = function(query){
  var i, selector;
  if(_.isArray(query)){
    selector = [];
    _.each(query, function(item, index){
      if(_.isElement(item) || item === document || item === window)
        selector.push(item);
      else if(_.isString(item))
       Array.prototype.push.apply(selector, document.querySelectorAll(item));
    });
  }
  else if(_.isElement(query) || query === document || query === window) selector = [query];
  else if(_.isString(query)) selector = document.querySelectorAll(query);
  else selector = [];

  this.length = selector.length;

  // Add selector to object for method chaining
  for (i=0; i < this.length; i++) {
      this[i] = selector[i];
  }

  return this;
};

function returnFalse(){return false;}
function returnTrue(){return true;}

// Shim console for IE9
if(!(window.console && console.log)) {
  console = {
    log: function(){},
    debug: function(){},
    info: function(){},
    warn: function(){},
    error: function(){}
  };
}

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
    path = ('.'+path+'.').split(/(?:\.|\[|\])+/);
    path.pop();
    path.shift();
    return path;
  },

  // Applies function `func` depth first to every node in the subtree starting from `root`
  // If the callback returns `false`, short circuit that tree.
  walkTheDOM: function(func) {
    var el, root, len = this.length, result;
    while(len--){
      root = this[len];
      result = func(root);
      if(result === false) return;
      root = root.firstChild;
      while (root) {
          $(root).walkTheDOM(func);
          root = root.nextSibling;
      }
    }
  },

  // Searches each key in an object and tests if the property has a lookupGetter or
  // lookupSetter. If either are preset convert the property into a computed property.
  extractComputedProps: function(obj){
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
    };
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
              // Travel from target up to parent firing event on delegate when it exists
              while(target){

                // Get all specified callbacks (element specific and selector specified)
                callbacks = $._hasDelegate(this, target, event.type);

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
        // AddEventListener supports IE9+
        if(!events[delegateGroup][eventName]){
          // Because we're only attaching one callback per event type, this is okay.
          // This also allows jquery's trigger method to actually fire delegated events
          // el['on' + eventName] = callback;
          // If event is focus or blur, use capture to allow for event delegation.
          el.addEventListener(eventName, callback, (eventName === 'focus' || eventName === 'blur'));
        }


        // Add our listener
        events[delegateGroup][eventName] = events[delegateGroup][eventName] || {};
        events[delegateGroup][eventName][delegateId] = events[delegateGroup][eventName][delegateId] || [];
        events[delegateGroup][eventName][delegateId].push({callback: handler, data: data});

      }, this);
    }
  },

  flatten: function(data) {
    var result = {};
    function recurse (cur, prop) {
      if (Object(cur) !== cur) {
        result[prop] = cur;
      } else if (Array.isArray(cur)) {
        for(var i=0, l=cur.length; i<l; i++)
          recurse(cur[i], prop + "[" + i + "]");
          if (l === 0)
            result[prop] = [];
          } else {
            var isEmpty = true;
            for (var p in cur) {
              isEmpty = false;
              recurse(cur[p], prop ? prop+"."+p : p);
            }
            if (isEmpty && prop)
              result[prop] = {};
            }
          }
          recurse(data, "");
          return result;
        },

  unMarkLinks: function(){
    var len = this.length;
    while(len--){
      var links = this[len].querySelectorAll('a[href="/'+Backbone.history.fragment+'"]')
      for(var i=0;i<links.length;i++){
        links.item(i).classList.remove('active');
        links.item(i).active = false;
      }
    }
    return this;
  },
  markLinks: function(){
    var len = this.length;
    while(len--){
      var links = this[len].querySelectorAll('a[href="/'+Backbone.history.fragment+'"]');
      for(var i=0;i<links.length;i++){
        links.item(i).classList.add('active');
        links.item(i).active = true;
      }
    }
    return this;
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



export default $;
