"use strict";
var utils = {};

// Applies function `func` depth first to every node in the subtree starting from `root`
utils.walkTheDOM = function(root, func) {
    func(root);
    root = root.firstChild;
    while (root) {
        utils.walkTheDOM(root, func);
        root = root.nextSibling;
    }
};

/*  Copyright (C) 2012-2014  Kurt Milam - http://xioup.com | Source: https://gist.github.com/1868955
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
**/

// Rolled my own deep extend in leu of having a hard dependancy on lodash.
utils.deepDefaults = function(obj) {
  var parentRE = /#{\s*?_\s*?}/,
      slice = Array.prototype.slice,
      hasOwnProperty = Object.prototype.hasOwnProperty;

  _.each(slice.call(arguments, 1), function(def) {

    var objArr, srcArr, objAttr, srcAttr;
    for (var prop in def) {
      if (hasOwnProperty.call(def, prop)) {
        if(_.isUndefined(obj[prop])){

          if(_.isObject(def[prop]) && !_.isFunction(def[prop])){
            if(def[prop].isCollection){
              obj[prop] = utils.deepDefaults([], def[prop].models);
            }
            else if(_.isArray(def[prop])){
              obj[prop] = utils.deepDefaults([], def[prop]);
            }
            else if((def[prop].isModel)){
              obj[prop] = utils.deepDefaults({}, def[prop].attributes);
            }
            else{
              obj[prop] = utils.deepDefaults({}, def[prop]);
            }
          }
          else{
            obj[prop] = def[prop];
          }
        }
        else if(_.isObject(obj[prop])){
          if(obj[prop].isCollection || _.isArray(obj[prop])){
            continue;
          }
          else if((obj[prop].isModel)){
            obj[prop] = utils.deepDefaults({}, obj[prop].attributes, def[prop]);
          }
          else{
            obj[prop] = utils.deepDefaults({}, obj[prop], def[prop]);
          }
        }
      }
    }
  });

  return obj;
};


// Triggers an event on a given dom node
utils.triggerEvent = function(eventName, el){
  if (document.createEvent) {
    var event = document.createEvent('HTMLEvents');
    event.initEvent(eventName, true, false);
    el.dispatchEvent(event);
  } else {
    el.fireEvent('on'+eventName);
  }
};

function getEventTarget(e) {
  e = e || window.event;
  return e.target || e.srcElement;
}

function isDelegate(target, delegate){
  if(delegate === true){
    return true;
  }
  if(_.isElement(delegate) && target === delegate){
    return true;
  }
  if(_.isString(delegate) && target.matchesSelector && target.matchesSelector(delegate)){
    return true;
  }
  return false;
}

utils.addEventListener = function (el, eventName, delegate, data, handler) {
  if(_.isFunction(delegate)){
    handler = delegate;
    delegate = el;
    data = {};
  }
  if(_.isFunction(data)){
    handler = data;
    data = {};
  }

  var callback = function(e){
    var target = getEventTarget(e);
    e.data = data;

    // Travel from target up to parent firing event when delegate matches
    while(target){
      if(isDelegate(target, delegate)) {
        handler.apply(el, arguments);
        if(_.isElement(delegate) && target === delegate){ break; }
      }
      target = target.parentNode;
    }
  };

  if (el.addEventListener) {
    el.addEventListener(eventName, callback);
  } else {
    el.attachEvent('on' + eventName, callback);
  }
};

// http://krasimirtsonev.com/blog/article/Cross-browser-handling-of-Ajax-requests-in-absurdjs
utils.ajax = function(ops) {
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
};



exports["default"] = utils;