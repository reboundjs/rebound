/*
 * Copyright 2012 The Polymer Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

if (typeof WeakMap === 'undefined') {
  (function() {
    var defineProperty = Object.defineProperty;
    var counter = Date.now() % 1e9;

    var WeakMap = function() {
      this.name = '__st' + (Math.random() * 1e9 >>> 0) + (counter++ + '__');
    };

    WeakMap.prototype = {
      set: function(key, value) {
        var entry = key[this.name];
        if (entry && entry[0] === key)
          entry[1] = value;
        else
          defineProperty(key, this.name, {value: [key, value], writable: true});
      },
      get: function(key) {
        var entry;
        return (entry = key[this.name]) && entry[0] === key ?
            entry[1] : undefined;
      },
      delete: function(key) {
        var entry = key[this.name];
        if (!entry) return false;
        var hasValue = entry[0] === key;
        entry[0] = entry[1] = undefined;
        return hasValue;
      },
      has: function(key) {
        var entry = key[this.name];
        if (!entry) return false;
        return entry[0] === key;
      }
    };

    window.WeakMap = WeakMap;
  })();
}

/*
 * Copyright 2012 The Polymer Authors. All rights reserved.
 * Use of this source code is goverened by a BSD-style
 * license that can be found in the LICENSE file.
 */

(function(global) {

  var registrationsTable = new WeakMap();

  // We use setImmediate or postMessage for our future callback.
  var setImmediate = window.msSetImmediate;

  // Use post message to emulate setImmediate.
  if (!setImmediate) {
    var setImmediateQueue = [];
    var sentinel = String(Math.random());
    window.addEventListener('message', function(e) {
      if (e.data === sentinel) {
        var queue = setImmediateQueue;
        setImmediateQueue = [];
        queue.forEach(function(func) {
          func();
        });
      }
    });
    setImmediate = function(func) {
      setImmediateQueue.push(func);
      window.postMessage(sentinel, '*');
    };
  }

  // This is used to ensure that we never schedule 2 callas to setImmediate
  var isScheduled = false;

  // Keep track of observers that needs to be notified next time.
  var scheduledObservers = [];

  /**
   * Schedules |dispatchCallback| to be called in the future.
   * @param {MutationObserver} observer
   */
  function scheduleCallback(observer) {
    scheduledObservers.push(observer);
    if (!isScheduled) {
      isScheduled = true;
      setImmediate(dispatchCallbacks);
    }
  }

  function wrapIfNeeded(node) {
    return window.ShadowDOMPolyfill &&
        window.ShadowDOMPolyfill.wrapIfNeeded(node) ||
        node;
  }

  function dispatchCallbacks() {
    // http://dom.spec.whatwg.org/#mutation-observers

    isScheduled = false; // Used to allow a new setImmediate call above.

    var observers = scheduledObservers;
    scheduledObservers = [];
    // Sort observers based on their creation UID (incremental).
    observers.sort(function(o1, o2) {
      return o1.uid_ - o2.uid_;
    });

    var anyNonEmpty = false;
    observers.forEach(function(observer) {

      // 2.1, 2.2
      var queue = observer.takeRecords();
      // 2.3. Remove all transient registered observers whose observer is mo.
      removeTransientObserversFor(observer);

      // 2.4
      if (queue.length) {
        observer.callback_(queue, observer);
        anyNonEmpty = true;
      }
    });

    // 3.
    if (anyNonEmpty)
      dispatchCallbacks();
  }

  function removeTransientObserversFor(observer) {
    observer.nodes_.forEach(function(node) {
      var registrations = registrationsTable.get(node);
      if (!registrations)
        return;
      registrations.forEach(function(registration) {
        if (registration.observer === observer)
          registration.removeTransientObservers();
      });
    });
  }

  /**
   * This function is used for the "For each registered observer observer (with
   * observer's options as options) in target's list of registered observers,
   * run these substeps:" and the "For each ancestor ancestor of target, and for
   * each registered observer observer (with options options) in ancestor's list
   * of registered observers, run these substeps:" part of the algorithms. The
   * |options.subtree| is checked to ensure that the callback is called
   * correctly.
   *
   * @param {Node} target
   * @param {function(MutationObserverInit):MutationRecord} callback
   */
  function forEachAncestorAndObserverEnqueueRecord(target, callback) {
    for (var node = target; node; node = node.parentNode) {
      var registrations = registrationsTable.get(node);

      if (registrations) {
        for (var j = 0; j < registrations.length; j++) {
          var registration = registrations[j];
          var options = registration.options;

          // Only target ignores subtree.
          if (node !== target && !options.subtree)
            continue;

          var record = callback(options);
          if (record)
            registration.enqueue(record);
        }
      }
    }
  }

  var uidCounter = 0;

  /**
   * The class that maps to the DOM MutationObserver interface.
   * @param {Function} callback.
   * @constructor
   */
  function JsMutationObserver(callback) {
    this.callback_ = callback;
    this.nodes_ = [];
    this.records_ = [];
    this.uid_ = ++uidCounter;
  }

  JsMutationObserver.prototype = {
    observe: function(target, options) {
      target = wrapIfNeeded(target);

      // 1.1
      if (!options.childList && !options.attributes && !options.characterData ||

          // 1.2
          options.attributeOldValue && !options.attributes ||

          // 1.3
          options.attributeFilter && options.attributeFilter.length &&
              !options.attributes ||

          // 1.4
          options.characterDataOldValue && !options.characterData) {

        throw new SyntaxError();
      }

      var registrations = registrationsTable.get(target);
      if (!registrations)
        registrationsTable.set(target, registrations = []);

      // 2
      // If target's list of registered observers already includes a registered
      // observer associated with the context object, replace that registered
      // observer's options with options.
      var registration;
      for (var i = 0; i < registrations.length; i++) {
        if (registrations[i].observer === this) {
          registration = registrations[i];
          registration.removeListeners();
          registration.options = options;
          break;
        }
      }

      // 3.
      // Otherwise, add a new registered observer to target's list of registered
      // observers with the context object as the observer and options as the
      // options, and add target to context object's list of nodes on which it
      // is registered.
      if (!registration) {
        registration = new Registration(this, target, options);
        registrations.push(registration);
        this.nodes_.push(target);
      }

      registration.addListeners();
    },

    disconnect: function() {
      this.nodes_.forEach(function(node) {
        var registrations = registrationsTable.get(node);
        for (var i = 0; i < registrations.length; i++) {
          var registration = registrations[i];
          if (registration.observer === this) {
            registration.removeListeners();
            registrations.splice(i, 1);
            // Each node can only have one registered observer associated with
            // this observer.
            break;
          }
        }
      }, this);
      this.records_ = [];
    },

    takeRecords: function() {
      var copyOfRecords = this.records_;
      this.records_ = [];
      return copyOfRecords;
    }
  };

  /**
   * @param {string} type
   * @param {Node} target
   * @constructor
   */
  function MutationRecord(type, target) {
    this.type = type;
    this.target = target;
    this.addedNodes = [];
    this.removedNodes = [];
    this.previousSibling = null;
    this.nextSibling = null;
    this.attributeName = null;
    this.attributeNamespace = null;
    this.oldValue = null;
  }

  function copyMutationRecord(original) {
    var record = new MutationRecord(original.type, original.target);
    record.addedNodes = original.addedNodes.slice();
    record.removedNodes = original.removedNodes.slice();
    record.previousSibling = original.previousSibling;
    record.nextSibling = original.nextSibling;
    record.attributeName = original.attributeName;
    record.attributeNamespace = original.attributeNamespace;
    record.oldValue = original.oldValue;
    return record;
  };

  // We keep track of the two (possibly one) records used in a single mutation.
  var currentRecord, recordWithOldValue;

  /**
   * Creates a record without |oldValue| and caches it as |currentRecord| for
   * later use.
   * @param {string} oldValue
   * @return {MutationRecord}
   */
  function getRecord(type, target) {
    return currentRecord = new MutationRecord(type, target);
  }

  /**
   * Gets or creates a record with |oldValue| based in the |currentRecord|
   * @param {string} oldValue
   * @return {MutationRecord}
   */
  function getRecordWithOldValue(oldValue) {
    if (recordWithOldValue)
      return recordWithOldValue;
    recordWithOldValue = copyMutationRecord(currentRecord);
    recordWithOldValue.oldValue = oldValue;
    return recordWithOldValue;
  }

  function clearRecords() {
    currentRecord = recordWithOldValue = undefined;
  }

  /**
   * @param {MutationRecord} record
   * @return {boolean} Whether the record represents a record from the current
   * mutation event.
   */
  function recordRepresentsCurrentMutation(record) {
    return record === recordWithOldValue || record === currentRecord;
  }

  /**
   * Selects which record, if any, to replace the last record in the queue.
   * This returns |null| if no record should be replaced.
   *
   * @param {MutationRecord} lastRecord
   * @param {MutationRecord} newRecord
   * @param {MutationRecord}
   */
  function selectRecord(lastRecord, newRecord) {
    if (lastRecord === newRecord)
      return lastRecord;

    // Check if the the record we are adding represents the same record. If
    // so, we keep the one with the oldValue in it.
    if (recordWithOldValue && recordRepresentsCurrentMutation(lastRecord))
      return recordWithOldValue;

    return null;
  }

  /**
   * Class used to represent a registered observer.
   * @param {MutationObserver} observer
   * @param {Node} target
   * @param {MutationObserverInit} options
   * @constructor
   */
  function Registration(observer, target, options) {
    this.observer = observer;
    this.target = target;
    this.options = options;
    this.transientObservedNodes = [];
  }

  Registration.prototype = {
    enqueue: function(record) {
      var records = this.observer.records_;
      var length = records.length;

      // There are cases where we replace the last record with the new record.
      // For example if the record represents the same mutation we need to use
      // the one with the oldValue. If we get same record (this can happen as we
      // walk up the tree) we ignore the new record.
      if (records.length > 0) {
        var lastRecord = records[length - 1];
        var recordToReplaceLast = selectRecord(lastRecord, record);
        if (recordToReplaceLast) {
          records[length - 1] = recordToReplaceLast;
          return;
        }
      } else {
        scheduleCallback(this.observer);
      }

      records[length] = record;
    },

    addListeners: function() {
      this.addListeners_(this.target);
    },

    addListeners_: function(node) {
      var options = this.options;
      if (options.attributes)
        node.addEventListener('DOMAttrModified', this, true);

      if (options.characterData)
        node.addEventListener('DOMCharacterDataModified', this, true);

      if (options.childList)
        node.addEventListener('DOMNodeInserted', this, true);

      if (options.childList || options.subtree)
        node.addEventListener('DOMNodeRemoved', this, true);
    },

    removeListeners: function() {
      this.removeListeners_(this.target);
    },

    removeListeners_: function(node) {
      var options = this.options;
      if (options.attributes)
        node.removeEventListener('DOMAttrModified', this, true);

      if (options.characterData)
        node.removeEventListener('DOMCharacterDataModified', this, true);

      if (options.childList)
        node.removeEventListener('DOMNodeInserted', this, true);

      if (options.childList || options.subtree)
        node.removeEventListener('DOMNodeRemoved', this, true);
    },

    /**
     * Adds a transient observer on node. The transient observer gets removed
     * next time we deliver the change records.
     * @param {Node} node
     */
    addTransientObserver: function(node) {
      // Don't add transient observers on the target itself. We already have all
      // the required listeners set up on the target.
      if (node === this.target)
        return;

      this.addListeners_(node);
      this.transientObservedNodes.push(node);
      var registrations = registrationsTable.get(node);
      if (!registrations)
        registrationsTable.set(node, registrations = []);

      // We know that registrations does not contain this because we already
      // checked if node === this.target.
      registrations.push(this);
    },

    removeTransientObservers: function() {
      var transientObservedNodes = this.transientObservedNodes;
      this.transientObservedNodes = [];

      transientObservedNodes.forEach(function(node) {
        // Transient observers are never added to the target.
        this.removeListeners_(node);

        var registrations = registrationsTable.get(node);
        for (var i = 0; i < registrations.length; i++) {
          if (registrations[i] === this) {
            registrations.splice(i, 1);
            // Each node can only have one registered observer associated with
            // this observer.
            break;
          }
        }
      }, this);
    },

    handleEvent: function(e) {
      // Stop propagation since we are managing the propagation manually.
      // This means that other mutation events on the page will not work
      // correctly but that is by design.
      e.stopImmediatePropagation();

      switch (e.type) {
        case 'DOMAttrModified':
          // http://dom.spec.whatwg.org/#concept-mo-queue-attributes

          var name = e.attrName;
          var namespace = e.relatedNode.namespaceURI;
          var target = e.target;

          // 1.
          var record = new getRecord('attributes', target);
          record.attributeName = name;
          record.attributeNamespace = namespace;

          // 2.
          var oldValue =
              e.attrChange === MutationEvent.ADDITION ? null : e.prevValue;

          forEachAncestorAndObserverEnqueueRecord(target, function(options) {
            // 3.1, 4.2
            if (!options.attributes)
              return;

            // 3.2, 4.3
            if (options.attributeFilter && options.attributeFilter.length &&
                options.attributeFilter.indexOf(name) === -1 &&
                options.attributeFilter.indexOf(namespace) === -1) {
              return;
            }
            // 3.3, 4.4
            if (options.attributeOldValue)
              return getRecordWithOldValue(oldValue);

            // 3.4, 4.5
            return record;
          });

          break;

        case 'DOMCharacterDataModified':
          // http://dom.spec.whatwg.org/#concept-mo-queue-characterdata
          var target = e.target;

          // 1.
          var record = getRecord('characterData', target);

          // 2.
          var oldValue = e.prevValue;


          forEachAncestorAndObserverEnqueueRecord(target, function(options) {
            // 3.1, 4.2
            if (!options.characterData)
              return;

            // 3.2, 4.3
            if (options.characterDataOldValue)
              return getRecordWithOldValue(oldValue);

            // 3.3, 4.4
            return record;
          });

          break;

        case 'DOMNodeRemoved':
          this.addTransientObserver(e.target);
          // Fall through.
        case 'DOMNodeInserted':
          // http://dom.spec.whatwg.org/#concept-mo-queue-childlist
          var target = e.relatedNode;
          var changedNode = e.target;
          var addedNodes, removedNodes;
          if (e.type === 'DOMNodeInserted') {
            addedNodes = [changedNode];
            removedNodes = [];
          } else {

            addedNodes = [];
            removedNodes = [changedNode];
          }
          var previousSibling = changedNode.previousSibling;
          var nextSibling = changedNode.nextSibling;

          // 1.
          var record = getRecord('childList', target);
          record.addedNodes = addedNodes;
          record.removedNodes = removedNodes;
          record.previousSibling = previousSibling;
          record.nextSibling = nextSibling;

          forEachAncestorAndObserverEnqueueRecord(target, function(options) {
            // 2.1, 3.2
            if (!options.childList)
              return;

            // 2.2, 3.3
            return record;
          });

      }

      clearRecords();
    }
  };

  global.JsMutationObserver = JsMutationObserver;

  if (!global.MutationObserver)
    global.MutationObserver = JsMutationObserver;


})(this);

/*
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */
window.CustomElements = window.CustomElements || {flags:{}};
/*
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

(function(scope){

var logFlags = window.logFlags || {};
var IMPORT_LINK_TYPE = window.HTMLImports ? HTMLImports.IMPORT_LINK_TYPE : 'none';

// walk the subtree rooted at node, applying 'find(element, data)' function
// to each element
// if 'find' returns true for 'element', do not search element's subtree
function findAll(node, find, data) {
  var e = node.firstElementChild;
  if (!e) {
    e = node.firstChild;
    while (e && e.nodeType !== Node.ELEMENT_NODE) {
      e = e.nextSibling;
    }
  }
  while (e) {
    if (find(e, data) !== true) {
      findAll(e, find, data);
    }
    e = e.nextElementSibling;
  }
  return null;
}

// walk all shadowRoots on a given node.
function forRoots(node, cb) {
  var root = node.shadowRoot;
  while(root) {
    forSubtree(root, cb);
    root = root.olderShadowRoot;
  }
}

// walk the subtree rooted at node, including descent into shadow-roots,
// applying 'cb' to each element
function forSubtree(node, cb) {
  //logFlags.dom && node.childNodes && node.childNodes.length && console.group('subTree: ', node);
  findAll(node, function(e) {
    if (cb(e)) {
      return true;
    }
    forRoots(e, cb);
  });
  forRoots(node, cb);
  //logFlags.dom && node.childNodes && node.childNodes.length && console.groupEnd();
}

// manage lifecycle on added node
function added(node) {
  if (upgrade(node)) {
    insertedNode(node);
    return true;
  }
  inserted(node);
}

// manage lifecycle on added node's subtree only
function addedSubtree(node) {
  forSubtree(node, function(e) {
    if (added(e)) {
      return true;
    }
  });
}

// manage lifecycle on added node and it's subtree
function addedNode(node) {
  return added(node) || addedSubtree(node);
}

// upgrade custom elements at node, if applicable
function upgrade(node) {
  if (!node.__upgraded__ && node.nodeType === Node.ELEMENT_NODE) {
    var type = node.getAttribute('is') || node.localName;
    var definition = scope.registry[type];
    if (definition) {
      logFlags.dom && console.group('upgrade:', node.localName);
      scope.upgrade(node);
      logFlags.dom && console.groupEnd();
      return true;
    }
  }
}

function insertedNode(node) {
  inserted(node);
  if (inDocument(node)) {
    forSubtree(node, function(e) {
      inserted(e);
    });
  }
}

// TODO(sorvell): on platforms without MutationObserver, mutations may not be
// reliable and therefore attached/detached are not reliable.
// To make these callbacks less likely to fail, we defer all inserts and removes
// to give a chance for elements to be inserted into dom.
// This ensures attachedCallback fires for elements that are created and
// immediately added to dom.
var hasPolyfillMutations = (!window.MutationObserver ||
    (window.MutationObserver === window.JsMutationObserver));
scope.hasPolyfillMutations = hasPolyfillMutations;

var isPendingMutations = false;
var pendingMutations = [];
function deferMutation(fn) {
  pendingMutations.push(fn);
  if (!isPendingMutations) {
    isPendingMutations = true;
    var async = (window.Platform && window.Platform.endOfMicrotask) ||
        setTimeout;
    async(takeMutations);
  }
}

function takeMutations() {
  isPendingMutations = false;
  var $p = pendingMutations;
  for (var i=0, l=$p.length, p; (i<l) && (p=$p[i]); i++) {
    p();
  }
  pendingMutations = [];
}

function inserted(element) {
  if (hasPolyfillMutations) {
    deferMutation(function() {
      _inserted(element);
    });
  } else {
    _inserted(element);
  }
}

// TODO(sjmiles): if there are descents into trees that can never have inDocument(*) true, fix this
function _inserted(element) {
  // TODO(sjmiles): it's possible we were inserted and removed in the space
  // of one microtask, in which case we won't be 'inDocument' here
  // But there are other cases where we are testing for inserted without
  // specific knowledge of mutations, and must test 'inDocument' to determine
  // whether to call inserted
  // If we can factor these cases into separate code paths we can have
  // better diagnostics.
  // TODO(sjmiles): when logging, do work on all custom elements so we can
  // track behavior even when callbacks not defined
  //console.log('inserted: ', element.localName);
  if (element.attachedCallback || element.detachedCallback || (element.__upgraded__ && logFlags.dom)) {
    logFlags.dom && console.group('inserted:', element.localName);
    if (inDocument(element)) {
      element.__inserted = (element.__inserted || 0) + 1;
      // if we are in a 'removed' state, bluntly adjust to an 'inserted' state
      if (element.__inserted < 1) {
        element.__inserted = 1;
      }
      // if we are 'over inserted', squelch the callback
      if (element.__inserted > 1) {
        logFlags.dom && console.warn('inserted:', element.localName,
          'insert/remove count:', element.__inserted)
      } else if (element.attachedCallback) {
        logFlags.dom && console.log('inserted:', element.localName);
        element.attachedCallback();
      }
    }
    logFlags.dom && console.groupEnd();
  }
}

function removedNode(node) {
  removed(node);
  forSubtree(node, function(e) {
    removed(e);
  });
}

function removed(element) {
  if (hasPolyfillMutations) {
    deferMutation(function() {
      _removed(element);
    });
  } else {
    _removed(element);
  }
}

function _removed(element) {
  // TODO(sjmiles): temporary: do work on all custom elements so we can track
  // behavior even when callbacks not defined
  if (element.attachedCallback || element.detachedCallback || (element.__upgraded__ && logFlags.dom)) {
    logFlags.dom && console.group('removed:', element.localName);
    if (!inDocument(element)) {
      element.__inserted = (element.__inserted || 0) - 1;
      // if we are in a 'inserted' state, bluntly adjust to an 'removed' state
      if (element.__inserted > 0) {
        element.__inserted = 0;
      }
      // if we are 'over removed', squelch the callback
      if (element.__inserted < 0) {
        logFlags.dom && console.warn('removed:', element.localName,
            'insert/remove count:', element.__inserted)
      } else if (element.detachedCallback) {
        element.detachedCallback();
      }
    }
    logFlags.dom && console.groupEnd();
  }
}

// SD polyfill intrustion due mainly to the fact that 'document'
// is not entirely wrapped
function wrapIfNeeded(node) {
  return window.ShadowDOMPolyfill ? ShadowDOMPolyfill.wrapIfNeeded(node)
      : node;
}

function inDocument(element) {
  var p = element;
  var doc = wrapIfNeeded(document);
  while (p) {
    if (p == doc) {
      return true;
    }
    p = p.parentNode || p.host;
  }
}

function watchShadow(node) {
  if (node.shadowRoot && !node.shadowRoot.__watched) {
    logFlags.dom && console.log('watching shadow-root for: ', node.localName);
    // watch all unwatched roots...
    var root = node.shadowRoot;
    while (root) {
      watchRoot(root);
      root = root.olderShadowRoot;
    }
  }
}

function watchRoot(root) {
  if (!root.__watched) {
    observe(root);
    root.__watched = true;
  }
}

function handler(mutations) {
  //
  if (logFlags.dom) {
    var mx = mutations[0];
    if (mx && mx.type === 'childList' && mx.addedNodes) {
        if (mx.addedNodes) {
          var d = mx.addedNodes[0];
          while (d && d !== document && !d.host) {
            d = d.parentNode;
          }
          var u = d && (d.URL || d._URL || (d.host && d.host.localName)) || '';
          u = u.split('/?').shift().split('/').pop();
        }
    }
    console.group('mutations (%d) [%s]', mutations.length, u || '');
  }
  //
  mutations.forEach(function(mx) {
    //logFlags.dom && console.group('mutation');
    if (mx.type === 'childList') {
      forEach(mx.addedNodes, function(n) {
        //logFlags.dom && console.log(n.localName);
        if (!n.localName) {
          return;
        }
        // nodes added may need lifecycle management
        addedNode(n);
      });
      // removed nodes may need lifecycle management
      forEach(mx.removedNodes, function(n) {
        //logFlags.dom && console.log(n.localName);
        if (!n.localName) {
          return;
        }
        removedNode(n);
      });
    }
    //logFlags.dom && console.groupEnd();
  });
  logFlags.dom && console.groupEnd();
};

var observer = new MutationObserver(handler);

function takeRecords() {
  // TODO(sjmiles): ask Raf why we have to call handler ourselves
  handler(observer.takeRecords());
  takeMutations();
}

var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);

function observe(inRoot) {
  observer.observe(inRoot, {childList: true, subtree: true});
}

function observeDocument(doc) {
  observe(doc);
}

function upgradeDocument(doc) {
  logFlags.dom && console.group('upgradeDocument: ', (doc.baseURI).split('/').pop());
  addedNode(doc);
  logFlags.dom && console.groupEnd();
}

function upgradeDocumentTree(doc) {
  doc = wrapIfNeeded(doc);
  //console.log('upgradeDocumentTree: ', (doc.baseURI).split('/').pop());
  // upgrade contained imported documents
  var imports = doc.querySelectorAll('link[rel=' + IMPORT_LINK_TYPE + ']');
  for (var i=0, l=imports.length, n; (i<l) && (n=imports[i]); i++) {
    if (n.import && n.import.__parsed) {
      upgradeDocumentTree(n.import);
    }
  }
  upgradeDocument(doc);
}

// exports
scope.IMPORT_LINK_TYPE = IMPORT_LINK_TYPE;
scope.watchShadow = watchShadow;
scope.upgradeDocumentTree = upgradeDocumentTree;
scope.upgradeAll = addedNode;
scope.upgradeSubtree = addedSubtree;
scope.insertedNode = insertedNode;

scope.observeDocument = observeDocument;
scope.upgradeDocument = upgradeDocument;

scope.takeRecords = takeRecords;

})(window.CustomElements);

/*
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

/**
 * Implements `document.registerElement`
 * @module CustomElements
*/

/**
 * Polyfilled extensions to the `document` object.
 * @class Document
*/

(function(scope) {

// imports

if (!scope) {
  scope = window.CustomElements = {flags:{}};
}
var flags = scope.flags;

// native document.registerElement?

var hasNative = Boolean(document.registerElement);
// For consistent timing, use native custom elements only when not polyfilling
// other key related web components features.
var useNative = !flags.register && hasNative && !window.ShadowDOMPolyfill && (!window.HTMLImports || HTMLImports.useNative);

if (useNative) {

  // stub
  var nop = function() {};

  // exports
  scope.registry = {};
  scope.upgradeElement = nop;

  scope.watchShadow = nop;
  scope.upgrade = nop;
  scope.upgradeAll = nop;
  scope.upgradeSubtree = nop;
  scope.observeDocument = nop;
  scope.upgradeDocument = nop;
  scope.upgradeDocumentTree = nop;
  scope.takeRecords = nop;
  scope.reservedTagList = [];

} else {

  /**
   * Registers a custom tag name with the document.
   *
   * When a registered element is created, a `readyCallback` method is called
   * in the scope of the element. The `readyCallback` method can be specified on
   * either `options.prototype` or `options.lifecycle` with the latter taking
   * precedence.
   *
   * @method register
   * @param {String} name The tag name to register. Must include a dash ('-'),
   *    for example 'x-component'.
   * @param {Object} options
   *    @param {String} [options.extends]
   *      (_off spec_) Tag name of an element to extend (or blank for a new
   *      element). This parameter is not part of the specification, but instead
   *      is a hint for the polyfill because the extendee is difficult to infer.
   *      Remember that the input prototype must chain to the extended element's
   *      prototype (or HTMLElement.prototype) regardless of the value of
   *      `extends`.
   *    @param {Object} options.prototype The prototype to use for the new
   *      element. The prototype must inherit from HTMLElement.
   *    @param {Object} [options.lifecycle]
   *      Callbacks that fire at important phases in the life of the custom
   *      element.
   *
   * @example
   *      FancyButton = document.registerElement("fancy-button", {
   *        extends: 'button',
   *        prototype: Object.create(HTMLButtonElement.prototype, {
   *          readyCallback: {
   *            value: function() {
   *              console.log("a fancy-button was created",
   *            }
   *          }
   *        })
   *      });
   * @return {Function} Constructor for the newly registered type.
   */
  function register(name, options) {
    //console.warn('document.registerElement("' + name + '", ', options, ')');
    // construct a defintion out of options
    // TODO(sjmiles): probably should clone options instead of mutating it
    var definition = options || {};
    if (!name) {
      // TODO(sjmiles): replace with more appropriate error (EricB can probably
      // offer guidance)
      throw new Error('document.registerElement: first argument `name` must not be empty');
    }
    if (name.indexOf('-') < 0) {
      // TODO(sjmiles): replace with more appropriate error (EricB can probably
      // offer guidance)
      throw new Error('document.registerElement: first argument (\'name\') must contain a dash (\'-\'). Argument provided was \'' + String(name) + '\'.');
    }
    // prevent registering reserved names
    if (isReservedTag(name)) {
      throw new Error('Failed to execute \'registerElement\' on \'Document\': Registration failed for type \'' + String(name) + '\'. The type name is invalid.');
    }
    // elements may only be registered once
    if (getRegisteredDefinition(name)) {
      throw new Error('DuplicateDefinitionError: a type with name \'' + String(name) + '\' is already registered');
    }
    // must have a prototype, default to an extension of HTMLElement
    // TODO(sjmiles): probably should throw if no prototype, check spec
    if (!definition.prototype) {
      // TODO(sjmiles): replace with more appropriate error (EricB can probably
      // offer guidance)
      throw new Error('Options missing required prototype property');
    }
    // record name
    definition.__name = name.toLowerCase();
    // ensure a lifecycle object so we don't have to null test it
    definition.lifecycle = definition.lifecycle || {};
    // build a list of ancestral custom elements (for native base detection)
    // TODO(sjmiles): we used to need to store this, but current code only
    // uses it in 'resolveTagName': it should probably be inlined
    definition.ancestry = ancestry(definition.extends);
    // extensions of native specializations of HTMLElement require localName
    // to remain native, and use secondary 'is' specifier for extension type
    resolveTagName(definition);
    // some platforms require modifications to the user-supplied prototype
    // chain
    resolvePrototypeChain(definition);
    // overrides to implement attributeChanged callback
    overrideAttributeApi(definition.prototype);
    // 7.1.5: Register the DEFINITION with DOCUMENT
    registerDefinition(definition.__name, definition);
    // 7.1.7. Run custom element constructor generation algorithm with PROTOTYPE
    // 7.1.8. Return the output of the previous step.
    definition.ctor = generateConstructor(definition);
    definition.ctor.prototype = definition.prototype;
    // force our .constructor to be our actual constructor
    definition.prototype.constructor = definition.ctor;
    // if initial parsing is complete
    if (scope.ready) {
      // upgrade any pre-existing nodes of this type
      scope.upgradeDocumentTree(document);
    }
    return definition.ctor;
  }

  function isReservedTag(name) {
    for (var i = 0; i < reservedTagList.length; i++) {
      if (name === reservedTagList[i]) {
        return true;
      }
    }
  }

  var reservedTagList = [
    'annotation-xml', 'color-profile', 'font-face', 'font-face-src',
    'font-face-uri', 'font-face-format', 'font-face-name', 'missing-glyph'
  ];

  function ancestry(extnds) {
    var extendee = getRegisteredDefinition(extnds);
    if (extendee) {
      return ancestry(extendee.extends).concat([extendee]);
    }
    return [];
  }

  function resolveTagName(definition) {
    // if we are explicitly extending something, that thing is our
    // baseTag, unless it represents a custom component
    var baseTag = definition.extends;
    // if our ancestry includes custom components, we only have a
    // baseTag if one of them does
    for (var i=0, a; (a=definition.ancestry[i]); i++) {
      baseTag = a.is && a.tag;
    }
    // our tag is our baseTag, if it exists, and otherwise just our name
    definition.tag = baseTag || definition.__name;
    if (baseTag) {
      // if there is a base tag, use secondary 'is' specifier
      definition.is = definition.__name;
    }
  }

  function resolvePrototypeChain(definition) {
    // if we don't support __proto__ we need to locate the native level
    // prototype for precise mixing in
    if (!Object.__proto__) {
      // default prototype
      var nativePrototype = HTMLElement.prototype;
      // work out prototype when using type-extension
      if (definition.is) {
        var inst = document.createElement(definition.tag);
        var expectedPrototype = Object.getPrototypeOf(inst);
        // only set nativePrototype if it will actually appear in the definition's chain
        if (expectedPrototype === definition.prototype) {
          nativePrototype = expectedPrototype;
        }
      }
      // ensure __proto__ reference is installed at each point on the prototype
      // chain.
      // NOTE: On platforms without __proto__, a mixin strategy is used instead
      // of prototype swizzling. In this case, this generated __proto__ provides
      // limited support for prototype traversal.
      var proto = definition.prototype, ancestor;
      while (proto && (proto !== nativePrototype)) {
        ancestor = Object.getPrototypeOf(proto);
        proto.__proto__ = ancestor;
        proto = ancestor;
      }
      // cache this in case of mixin
      definition.native = nativePrototype;
    }
  }

  // SECTION 4

  function instantiate(definition) {
    // 4.a.1. Create a new object that implements PROTOTYPE
    // 4.a.2. Let ELEMENT by this new object
    //
    // the custom element instantiation algorithm must also ensure that the
    // output is a valid DOM element with the proper wrapper in place.
    //
    return upgrade(domCreateElement(definition.tag), definition);
  }

  function upgrade(element, definition) {
    // some definitions specify an 'is' attribute
    if (definition.is) {
      element.setAttribute('is', definition.is);
    }
    // make 'element' implement definition.prototype
    implement(element, definition);
    // flag as upgraded
    element.__upgraded__ = true;
    // lifecycle management
    created(element);
    // attachedCallback fires in tree order, call before recursing
    scope.insertedNode(element);
    // there should never be a shadow root on element at this point
    scope.upgradeSubtree(element);
    // OUTPUT
    return element;
  }

  function implement(element, definition) {
    // prototype swizzling is best
    if (Object.__proto__) {
      element.__proto__ = definition.prototype;
    } else {
      // where above we can re-acquire inPrototype via
      // getPrototypeOf(Element), we cannot do so when
      // we use mixin, so we install a magic reference
      customMixin(element, definition.prototype, definition.native);
      element.__proto__ = definition.prototype;
    }
  }

  function customMixin(inTarget, inSrc, inNative) {
    // TODO(sjmiles): 'used' allows us to only copy the 'youngest' version of
    // any property. This set should be precalculated. We also need to
    // consider this for supporting 'super'.
    var used = {};
    // start with inSrc
    var p = inSrc;
    // The default is HTMLElement.prototype, so we add a test to avoid mixing in
    // native prototypes
    while (p !== inNative && p !== HTMLElement.prototype) {
      var keys = Object.getOwnPropertyNames(p);
      for (var i=0, k; k=keys[i]; i++) {
        if (!used[k]) {
          Object.defineProperty(inTarget, k,
              Object.getOwnPropertyDescriptor(p, k));
          used[k] = 1;
        }
      }
      p = Object.getPrototypeOf(p);
    }
  }

  function created(element) {
    // invoke createdCallback
    if (element.createdCallback) {
      element.createdCallback();
    }
  }

  // attribute watching

  function overrideAttributeApi(prototype) {
    // overrides to implement callbacks
    // TODO(sjmiles): should support access via .attributes NamedNodeMap
    // TODO(sjmiles): preserves user defined overrides, if any
    if (prototype.setAttribute._polyfilled) {
      return;
    }
    var setAttribute = prototype.setAttribute;
    prototype.setAttribute = function(name, value) {
      changeAttribute.call(this, name, value, setAttribute);
    }
    var removeAttribute = prototype.removeAttribute;
    prototype.removeAttribute = function(name) {
      changeAttribute.call(this, name, null, removeAttribute);
    }
    prototype.setAttribute._polyfilled = true;
  }

  // https://dvcs.w3.org/hg/webcomponents/raw-file/tip/spec/custom/
  // index.html#dfn-attribute-changed-callback
  function changeAttribute(name, value, operation) {
    name = name.toLowerCase();
    var oldValue = this.getAttribute(name);
    operation.apply(this, arguments);
    var newValue = this.getAttribute(name);
    if (this.attributeChangedCallback
        && (newValue !== oldValue)) {
      this.attributeChangedCallback(name, oldValue, newValue);
    }
  }

  // element registry (maps tag names to definitions)

  var registry = {};

  function getRegisteredDefinition(name) {
    if (name) {
      return registry[name.toLowerCase()];
    }
  }

  function registerDefinition(name, definition) {
    registry[name] = definition;
  }

  function generateConstructor(definition) {
    return function() {
      return instantiate(definition);
    };
  }

  var HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
  function createElementNS(namespace, tag, typeExtension) {
    // NOTE: we do not support non-HTML elements,
    // just call createElementNS for non HTML Elements
    if (namespace === HTML_NAMESPACE) {
      return createElement(tag, typeExtension);
    } else {
      return domCreateElementNS(namespace, tag);
    }
  }

  function createElement(tag, typeExtension) {
    // TODO(sjmiles): ignore 'tag' when using 'typeExtension', we could
    // error check it, or perhaps there should only ever be one argument
    var definition = getRegisteredDefinition(typeExtension || tag);
    if (definition) {
      if (tag == definition.tag && typeExtension == definition.is) {
        return new definition.ctor();
      }
      // Handle empty string for type extension.
      if (!typeExtension && !definition.is) {
        return new definition.ctor();
      }
    }

    if (typeExtension) {
      var element = createElement(tag);
      element.setAttribute('is', typeExtension);
      return element;
    }
    var element = domCreateElement(tag);
    // Custom tags should be HTMLElements even if not upgraded.
    if (tag.indexOf('-') >= 0) {
      implement(element, HTMLElement);
    }
    return element;
  }

  function upgradeElement(element) {
    if (!element.__upgraded__ && (element.nodeType === Node.ELEMENT_NODE)) {
      var is = element.getAttribute('is');
      var definition = getRegisteredDefinition(is || element.localName);
      if (definition) {
        if (is && definition.tag == element.localName) {
          return upgrade(element, definition);
        } else if (!is && !definition.extends) {
          return upgrade(element, definition);
        }
      }
    }
  }

  function cloneNode(deep) {
    // call original clone
    var n = domCloneNode.call(this, deep);
    // upgrade the element and subtree
    scope.upgradeAll(n);
    // return the clone
    return n;
  }
  // capture native createElement before we override it

  var domCreateElement = document.createElement.bind(document);
  var domCreateElementNS = document.createElementNS.bind(document);

  // capture native cloneNode before we override it

  var domCloneNode = Node.prototype.cloneNode;

  // exports

  document.registerElement = register;
  document.createElement = createElement; // override
  document.createElementNS = createElementNS; // override
  Node.prototype.cloneNode = cloneNode; // override

  scope.registry = registry;

  /**
   * Upgrade an element to a custom element. Upgrading an element
   * causes the custom prototype to be applied, an `is` attribute
   * to be attached (as needed), and invocation of the `readyCallback`.
   * `upgrade` does nothing if the element is already upgraded, or
   * if it matches no registered custom tag name.
   *
   * @method ugprade
   * @param {Element} element The element to upgrade.
   * @return {Element} The upgraded element.
   */
  scope.upgrade = upgradeElement;
}

// Create a custom 'instanceof'. This is necessary when CustomElements
// are implemented via a mixin strategy, as for example on IE10.
var isInstance;
if (!Object.__proto__ && !useNative) {
  isInstance = function(obj, ctor) {
    var p = obj;
    while (p) {
      // NOTE: this is not technically correct since we're not checking if
      // an object is an instance of a constructor; however, this should
      // be good enough for the mixin strategy.
      if (p === ctor.prototype) {
        return true;
      }
      p = p.__proto__;
    }
    return false;
  }
} else {
  isInstance = function(obj, base) {
    return obj instanceof base;
  }
}

// exports
scope.instanceof = isInstance;
scope.reservedTagList = reservedTagList;

// bc
document.register = document.registerElement;

scope.hasNative = hasNative;
scope.useNative = useNative;

})(window.CustomElements);

//     Underscore.js 1.6.0
//     http://underscorejs.org
//     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.6.0';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return obj;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
    return obj;
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var result;
    any(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(predicate, context);
    each(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, function(value, index, list) {
      return !predicate.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(predicate, context);
    each(obj, function(value, index, list) {
      if (!(result = result && predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(predicate, context);
    each(obj, function(value, index, list) {
      if (result || (result = predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matches(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matches(attrs));
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    var result = -Infinity, lastComputed = -Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed > lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    var result = Infinity, lastComputed = Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed < lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Shuffle an array, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (obj.length !== +obj.length) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return value;
    return _.property(value);
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, iterator, context) {
    iterator = lookupIterator(iterator);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iterator, context) {
      var result = {};
      iterator = lookupIterator(iterator);
      each(obj, function(value, index) {
        var key = iterator.call(context, value, index, obj);
        behavior(result, key, value);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, key, value) {
    _.has(result, key) ? result[key].push(value) : result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[0];
    if (n < 0) return [];
    return slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[array.length - 1];
    return slice.call(array, Math.max(array.length - n, 0));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Split an array into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(array, predicate) {
    var pass = [], fail = [];
    each(array, function(elem) {
      (predicate(elem) ? pass : fail).push(elem);
    });
    return [pass, fail];
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.contains(other, item);
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, 'length').concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    return function() {
      var position = 0;
      var args = boundArgs.slice();
      for (var i = 0, length = args.length; i < length; i++) {
        if (args[i] === _) args[i] = arguments[position++];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return func.apply(this, args);
    };
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error('bindAll must be passed function names');
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
        context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;
      if (last < wait) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))
                        && ('constructor' in a && 'constructor' in b)) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  _.constant = function(value) {
    return function () {
      return value;
    };
  };

  _.property = function(key) {
    return function(obj) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of `key:value` pairs.
  _.matches = function(attrs) {
    return function(obj) {
      if (obj === attrs) return true; //avoid comparing an object to itself.
      for (var key in attrs) {
        if (attrs[key] !== obj[key])
          return false;
      }
      return true;
    }
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() { return new Date().getTime(); };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}).call(this);

/*!
 * jQuery JavaScript Library v2.1.1
 * http://jquery.com/
 *
 * Includes Sizzle.js
 * http://sizzlejs.com/
 *
 * Copyright 2005, 2014 jQuery Foundation, Inc. and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2014-05-01T17:11Z
 */

(function( global, factory ) {

	if ( typeof module === "object" && typeof module.exports === "object" ) {
		// For CommonJS and CommonJS-like environments where a proper window is present,
		// execute the factory and get jQuery
		// For environments that do not inherently posses a window with a document
		// (such as Node.js), expose a jQuery-making factory as module.exports
		// This accentuates the need for the creation of a real window
		// e.g. var jQuery = require("jquery")(window);
		// See ticket #14549 for more info
		module.exports = global.document ?
			factory( global, true ) :
			function( w ) {
				if ( !w.document ) {
					throw new Error( "jQuery requires a window with a document" );
				}
				return factory( w );
			};
	} else {
		factory( global );
	}

// Pass this if window is not defined yet
}(typeof window !== "undefined" ? window : this, function( window, noGlobal ) {

// Can't do this because several apps including ASP.NET trace
// the stack via arguments.caller.callee and Firefox dies if
// you try to trace through "use strict" call chains. (#13335)
// Support: Firefox 18+
//

var arr = [];

var slice = arr.slice;

var concat = arr.concat;

var push = arr.push;

var indexOf = arr.indexOf;

var class2type = {};

var toString = class2type.toString;

var hasOwn = class2type.hasOwnProperty;

var support = {};



var
	// Use the correct document accordingly with window argument (sandbox)
	document = window.document,

	version = "2.1.1",

	// Define a local copy of jQuery
	jQuery = function( selector, context ) {
		// The jQuery object is actually just the init constructor 'enhanced'
		// Need init if jQuery is called (just allow error to be thrown if not included)
		return new jQuery.fn.init( selector, context );
	},

	// Support: Android<4.1
	// Make sure we trim BOM and NBSP
	rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,

	// Matches dashed string for camelizing
	rmsPrefix = /^-ms-/,
	rdashAlpha = /-([\da-z])/gi,

	// Used by jQuery.camelCase as callback to replace()
	fcamelCase = function( all, letter ) {
		return letter.toUpperCase();
	};

jQuery.fn = jQuery.prototype = {
	// The current version of jQuery being used
	jquery: version,

	constructor: jQuery,

	// Start with an empty selector
	selector: "",

	// The default length of a jQuery object is 0
	length: 0,

	toArray: function() {
		return slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {
		return num != null ?

			// Return just the one element from the set
			( num < 0 ? this[ num + this.length ] : this[ num ] ) :

			// Return all the elements in a clean array
			slice.call( this );
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;
		ret.context = this.context;

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	// (You can seed the arguments with an array of args, but this is
	// only used internally.)
	each: function( callback, args ) {
		return jQuery.each( this, callback, args );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map(this, function( elem, i ) {
			return callback.call( elem, i, elem );
		}));
	},

	slice: function() {
		return this.pushStack( slice.apply( this, arguments ) );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	eq: function( i ) {
		var len = this.length,
			j = +i + ( i < 0 ? len : 0 );
		return this.pushStack( j >= 0 && j < len ? [ this[j] ] : [] );
	},

	end: function() {
		return this.prevObject || this.constructor(null);
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: push,
	sort: arr.sort,
	splice: arr.splice
};

jQuery.extend = jQuery.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;

		// skip the boolean and the target
		target = arguments[ i ] || {};
		i++;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
		target = {};
	}

	// extend jQuery itself if only one argument is passed
	if ( i === length ) {
		target = this;
		i--;
	}

	for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && jQuery.isArray(src) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend({
	// Unique for each copy of jQuery on the page
	expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),

	// Assume jQuery is ready without the ready module
	isReady: true,

	error: function( msg ) {
		throw new Error( msg );
	},

	noop: function() {},

	// See test/unit/core.js for details concerning isFunction.
	// Since version 1.3, DOM methods and functions like alert
	// aren't supported. They return false on IE (#2968).
	isFunction: function( obj ) {
		return jQuery.type(obj) === "function";
	},

	isArray: Array.isArray,

	isWindow: function( obj ) {
		return obj != null && obj === obj.window;
	},

	isNumeric: function( obj ) {
		// parseFloat NaNs numeric-cast false positives (null|true|false|"")
		// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
		// subtraction forces infinities to NaN
		return !jQuery.isArray( obj ) && obj - parseFloat( obj ) >= 0;
	},

	isPlainObject: function( obj ) {
		// Not plain objects:
		// - Any object or value whose internal [[Class]] property is not "[object Object]"
		// - DOM nodes
		// - window
		if ( jQuery.type( obj ) !== "object" || obj.nodeType || jQuery.isWindow( obj ) ) {
			return false;
		}

		if ( obj.constructor &&
				!hasOwn.call( obj.constructor.prototype, "isPrototypeOf" ) ) {
			return false;
		}

		// If the function hasn't returned already, we're confident that
		// |obj| is a plain object, created by {} or constructed with new Object
		return true;
	},

	isEmptyObject: function( obj ) {
		var name;
		for ( name in obj ) {
			return false;
		}
		return true;
	},

	type: function( obj ) {
		if ( obj == null ) {
			return obj + "";
		}
		// Support: Android < 4.0, iOS < 6 (functionish RegExp)
		return typeof obj === "object" || typeof obj === "function" ?
			class2type[ toString.call(obj) ] || "object" :
			typeof obj;
	},

	// Evaluates a script in a global context
	globalEval: function( code ) {
		var script,
			indirect = eval;

		code = jQuery.trim( code );

		if ( code ) {
			// If the code includes a valid, prologue position
			// strict mode pragma, execute code by injecting a
			// script tag into the document.
			if ( code.indexOf("use strict") === 1 ) {
				script = document.createElement("script");
				script.text = code;
				document.head.appendChild( script ).parentNode.removeChild( script );
			} else {
			// Otherwise, avoid the DOM node creation, insertion
			// and removal by using an indirect global eval
				indirect( code );
			}
		}
	},

	// Convert dashed to camelCase; used by the css and data modules
	// Microsoft forgot to hump their vendor prefix (#9572)
	camelCase: function( string ) {
		return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
	},

	nodeName: function( elem, name ) {
		return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
	},

	// args is for internal usage only
	each: function( obj, callback, args ) {
		var value,
			i = 0,
			length = obj.length,
			isArray = isArraylike( obj );

		if ( args ) {
			if ( isArray ) {
				for ( ; i < length; i++ ) {
					value = callback.apply( obj[ i ], args );

					if ( value === false ) {
						break;
					}
				}
			} else {
				for ( i in obj ) {
					value = callback.apply( obj[ i ], args );

					if ( value === false ) {
						break;
					}
				}
			}

		// A special, fast, case for the most common use of each
		} else {
			if ( isArray ) {
				for ( ; i < length; i++ ) {
					value = callback.call( obj[ i ], i, obj[ i ] );

					if ( value === false ) {
						break;
					}
				}
			} else {
				for ( i in obj ) {
					value = callback.call( obj[ i ], i, obj[ i ] );

					if ( value === false ) {
						break;
					}
				}
			}
		}

		return obj;
	},

	// Support: Android<4.1
	trim: function( text ) {
		return text == null ?
			"" :
			( text + "" ).replace( rtrim, "" );
	},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var ret = results || [];

		if ( arr != null ) {
			if ( isArraylike( Object(arr) ) ) {
				jQuery.merge( ret,
					typeof arr === "string" ?
					[ arr ] : arr
				);
			} else {
				push.call( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		return arr == null ? -1 : indexOf.call( arr, elem, i );
	},

	merge: function( first, second ) {
		var len = +second.length,
			j = 0,
			i = first.length;

		for ( ; j < len; j++ ) {
			first[ i++ ] = second[ j ];
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, invert ) {
		var callbackInverse,
			matches = [],
			i = 0,
			length = elems.length,
			callbackExpect = !invert;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			callbackInverse = !callback( elems[ i ], i );
			if ( callbackInverse !== callbackExpect ) {
				matches.push( elems[ i ] );
			}
		}

		return matches;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var value,
			i = 0,
			length = elems.length,
			isArray = isArraylike( elems ),
			ret = [];

		// Go through the array, translating each of the items to their new values
		if ( isArray ) {
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}

		// Go through every key on the object,
		} else {
			for ( i in elems ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}
		}

		// Flatten any nested arrays
		return concat.apply( [], ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// Bind a function to a context, optionally partially applying any
	// arguments.
	proxy: function( fn, context ) {
		var tmp, args, proxy;

		if ( typeof context === "string" ) {
			tmp = fn[ context ];
			context = fn;
			fn = tmp;
		}

		// Quick check to determine if target is callable, in the spec
		// this throws a TypeError, but we will just return undefined.
		if ( !jQuery.isFunction( fn ) ) {
			return undefined;
		}

		// Simulated bind
		args = slice.call( arguments, 2 );
		proxy = function() {
			return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
		};

		// Set the guid of unique handler to the same of original handler, so it can be removed
		proxy.guid = fn.guid = fn.guid || jQuery.guid++;

		return proxy;
	},

	now: Date.now,

	// jQuery.support is not used in Core but other projects attach their
	// properties to it so it needs to exist.
	support: support
});

// Populate the class2type map
jQuery.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
});

function isArraylike( obj ) {
	var length = obj.length,
		type = jQuery.type( obj );

	if ( type === "function" || jQuery.isWindow( obj ) ) {
		return false;
	}

	if ( obj.nodeType === 1 && length ) {
		return true;
	}

	return type === "array" || length === 0 ||
		typeof length === "number" && length > 0 && ( length - 1 ) in obj;
}
var Sizzle =
/*!
 * Sizzle CSS Selector Engine v1.10.19
 * http://sizzlejs.com/
 *
 * Copyright 2013 jQuery Foundation, Inc. and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2014-04-18
 */
(function( window ) {

var i,
	support,
	Expr,
	getText,
	isXML,
	tokenize,
	compile,
	select,
	outermostContext,
	sortInput,
	hasDuplicate,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + -(new Date()),
	preferredDoc = window.document,
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
		}
		return 0;
	},

	// General-purpose constants
	strundefined = typeof undefined,
	MAX_NEGATIVE = 1 << 31,

	// Instance methods
	hasOwn = ({}).hasOwnProperty,
	arr = [],
	pop = arr.pop,
	push_native = arr.push,
	push = arr.push,
	slice = arr.slice,
	// Use a stripped-down indexOf if we can't use a native one
	indexOf = arr.indexOf || function( elem ) {
		var i = 0,
			len = this.length;
		for ( ; i < len; i++ ) {
			if ( this[i] === elem ) {
				return i;
			}
		}
		return -1;
	},

	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",

	// Regular expressions

	// Whitespace characters http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",
	// http://www.w3.org/TR/css3-syntax/#characters
	characterEncoding = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",

	// Loosely modeled on CSS identifier characters
	// An unquoted value should be a CSS identifier http://www.w3.org/TR/css3-selectors/#attribute-selectors
	// Proper syntax: http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
	identifier = characterEncoding.replace( "w", "w#" ),

	// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
	attributes = "\\[" + whitespace + "*(" + characterEncoding + ")(?:" + whitespace +
		// Operator (capture 2)
		"*([*^$|!~]?=)" + whitespace +
		// "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"
		"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace +
		"*\\]",

	pseudos = ":(" + characterEncoding + ")(?:\\((" +
		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
		// 1. quoted (capture 3; capture 4 or capture 5)
		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +
		// 2. simple (capture 6)
		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +
		// 3. anything else (capture 2)
		".*" +
		")\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),

	rattributeQuotes = new RegExp( "=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g" ),

	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + characterEncoding + ")" ),
		"CLASS": new RegExp( "^\\.(" + characterEncoding + ")" ),
		"TAG": new RegExp( "^(" + characterEncoding.replace( "w", "w*" ) + ")" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),
		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
			whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rnative = /^[^{]+\{\s*\[native \w/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rsibling = /[+~]/,
	rescape = /'|\\/g,

	// CSS escapes http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),
	funescape = function( _, escaped, escapedWhitespace ) {
		var high = "0x" + escaped - 0x10000;
		// NaN means non-codepoint
		// Support: Firefox<24
		// Workaround erroneous numeric interpretation of +"0x"
		return high !== high || escapedWhitespace ?
			escaped :
			high < 0 ?
				// BMP codepoint
				String.fromCharCode( high + 0x10000 ) :
				// Supplemental Plane codepoint (surrogate pair)
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	};

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		(arr = slice.call( preferredDoc.childNodes )),
		preferredDoc.childNodes
	);
	// Support: Android<4.0
	// Detect silently failing push.apply
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			push_native.apply( target, slice.call(els) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;
			// Can't trust NodeList.length
			while ( (target[j++] = els[i++]) ) {}
			target.length = j - 1;
		}
	};
}

function Sizzle( selector, context, results, seed ) {
	var match, elem, m, nodeType,
		// QSA vars
		i, groups, old, nid, newContext, newSelector;

	if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
		setDocument( context );
	}

	context = context || document;
	results = results || [];

	if ( !selector || typeof selector !== "string" ) {
		return results;
	}

	if ( (nodeType = context.nodeType) !== 1 && nodeType !== 9 ) {
		return [];
	}

	if ( documentIsHTML && !seed ) {

		// Shortcuts
		if ( (match = rquickExpr.exec( selector )) ) {
			// Speed-up: Sizzle("#ID")
			if ( (m = match[1]) ) {
				if ( nodeType === 9 ) {
					elem = context.getElementById( m );
					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document (jQuery #6963)
					if ( elem && elem.parentNode ) {
						// Handle the case where IE, Opera, and Webkit return items
						// by name instead of ID
						if ( elem.id === m ) {
							results.push( elem );
							return results;
						}
					} else {
						return results;
					}
				} else {
					// Context is not a document
					if ( context.ownerDocument && (elem = context.ownerDocument.getElementById( m )) &&
						contains( context, elem ) && elem.id === m ) {
						results.push( elem );
						return results;
					}
				}

			// Speed-up: Sizzle("TAG")
			} else if ( match[2] ) {
				push.apply( results, context.getElementsByTagName( selector ) );
				return results;

			// Speed-up: Sizzle(".CLASS")
			} else if ( (m = match[3]) && support.getElementsByClassName && context.getElementsByClassName ) {
				push.apply( results, context.getElementsByClassName( m ) );
				return results;
			}
		}

		// QSA path
		if ( support.qsa && (!rbuggyQSA || !rbuggyQSA.test( selector )) ) {
			nid = old = expando;
			newContext = context;
			newSelector = nodeType === 9 && selector;

			// qSA works strangely on Element-rooted queries
			// We can work around this by specifying an extra ID on the root
			// and working up from there (Thanks to Andrew Dupont for the technique)
			// IE 8 doesn't work on object elements
			if ( nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {
				groups = tokenize( selector );

				if ( (old = context.getAttribute("id")) ) {
					nid = old.replace( rescape, "\\$&" );
				} else {
					context.setAttribute( "id", nid );
				}
				nid = "[id='" + nid + "'] ";

				i = groups.length;
				while ( i-- ) {
					groups[i] = nid + toSelector( groups[i] );
				}
				newContext = rsibling.test( selector ) && testContext( context.parentNode ) || context;
				newSelector = groups.join(",");
			}

			if ( newSelector ) {
				try {
					push.apply( results,
						newContext.querySelectorAll( newSelector )
					);
					return results;
				} catch(qsaError) {
				} finally {
					if ( !old ) {
						context.removeAttribute("id");
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Create key-value caches of limited size
 * @returns {Function(string, Object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];

	function cache( key, value ) {
		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key + " " ) > Expr.cacheLength ) {
			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return (cache[ key + " " ] = value);
	}
	return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created div and expects a boolean result
 */
function assert( fn ) {
	var div = document.createElement("div");

	try {
		return !!fn( div );
	} catch (e) {
		return false;
	} finally {
		// Remove from its parent by default
		if ( div.parentNode ) {
			div.parentNode.removeChild( div );
		}
		// release memory in IE
		div = null;
	}
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */
function addHandle( attrs, handler ) {
	var arr = attrs.split("|"),
		i = attrs.length;

	while ( i-- ) {
		Expr.attrHandle[ arr[i] ] = handler;
	}
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
			( ~b.sourceIndex || MAX_NEGATIVE ) -
			( ~a.sourceIndex || MAX_NEGATIVE );

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( (cur = cur.nextSibling) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return (name === "input" || name === "button") && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
	return markFunction(function( argument ) {
		argument = +argument;
		return markFunction(function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ (j = matchIndexes[i]) ] ) {
					seed[j] = !(matches[j] = seed[j]);
				}
			}
		});
	});
}

/**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */
function testContext( context ) {
	return context && typeof context.getElementsByTagName !== strundefined && context;
}

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */
isXML = Sizzle.isXML = function( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = elem && (elem.ownerDocument || elem).documentElement;
	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var hasCompare,
		doc = node ? node.ownerDocument || node : preferredDoc,
		parent = doc.defaultView;

	// If no document and documentElement is available, return
	if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Set our document
	document = doc;
	docElem = doc.documentElement;

	// Support tests
	documentIsHTML = !isXML( doc );

	// Support: IE>8
	// If iframe document is assigned to "document" variable and if iframe has been reloaded,
	// IE will throw "permission denied" error when accessing "document" variable, see jQuery #13936
	// IE6-8 do not support the defaultView property so parent will be undefined
	if ( parent && parent !== parent.top ) {
		// IE11 does not have attachEvent, so all must suffer
		if ( parent.addEventListener ) {
			parent.addEventListener( "unload", function() {
				setDocument();
			}, false );
		} else if ( parent.attachEvent ) {
			parent.attachEvent( "onunload", function() {
				setDocument();
			});
		}
	}

	/* Attributes
	---------------------------------------------------------------------- */

	// Support: IE<8
	// Verify that getAttribute really returns attributes and not properties (excepting IE8 booleans)
	support.attributes = assert(function( div ) {
		div.className = "i";
		return !div.getAttribute("className");
	});

	/* getElement(s)By*
	---------------------------------------------------------------------- */

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert(function( div ) {
		div.appendChild( doc.createComment("") );
		return !div.getElementsByTagName("*").length;
	});

	// Check if getElementsByClassName can be trusted
	support.getElementsByClassName = rnative.test( doc.getElementsByClassName ) && assert(function( div ) {
		div.innerHTML = "<div class='a'></div><div class='a i'></div>";

		// Support: Safari<4
		// Catch class over-caching
		div.firstChild.className = "i";
		// Support: Opera<10
		// Catch gEBCN failure to find non-leading classes
		return div.getElementsByClassName("i").length === 2;
	});

	// Support: IE<10
	// Check if getElementById returns elements by name
	// The broken getElementById methods don't pick up programatically-set names,
	// so use a roundabout getElementsByName test
	support.getById = assert(function( div ) {
		docElem.appendChild( div ).id = expando;
		return !doc.getElementsByName || !doc.getElementsByName( expando ).length;
	});

	// ID find and filter
	if ( support.getById ) {
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== strundefined && documentIsHTML ) {
				var m = context.getElementById( id );
				// Check parentNode to catch when Blackberry 4.6 returns
				// nodes that are no longer in the document #6963
				return m && m.parentNode ? [ m ] : [];
			}
		};
		Expr.filter["ID"] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute("id") === attrId;
			};
		};
	} else {
		// Support: IE6/7
		// getElementById is not reliable as a find shortcut
		delete Expr.find["ID"];

		Expr.filter["ID"] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== strundefined && elem.getAttributeNode("id");
				return node && node.value === attrId;
			};
		};
	}

	// Tag
	Expr.find["TAG"] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== strundefined ) {
				return context.getElementsByTagName( tag );
			}
		} :
		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( (elem = results[i++]) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Class
	Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
		if ( typeof context.getElementsByClassName !== strundefined && documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	/* QSA/matchesSelector
	---------------------------------------------------------------------- */

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21)
	// We allow this because of a bug in IE8/9 that throws an error
	// whenever `document.activeElement` is accessed on an iframe
	// So, we allow :focus to pass through QSA all the time to avoid the IE error
	// See http://bugs.jquery.com/ticket/13378
	rbuggyQSA = [];

	if ( (support.qsa = rnative.test( doc.querySelectorAll )) ) {
		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert(function( div ) {
			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// http://bugs.jquery.com/ticket/12359
			div.innerHTML = "<select msallowclip=''><option selected=''></option></select>";

			// Support: IE8, Opera 11-12.16
			// Nothing should be selected when empty strings follow ^= or $= or *=
			// The test attribute must be unknown in Opera but "safe" for WinRT
			// http://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
			if ( div.querySelectorAll("[msallowclip^='']").length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
			}

			// Support: IE8
			// Boolean attributes and "value" are not treated correctly
			if ( !div.querySelectorAll("[selected]").length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":checked").length ) {
				rbuggyQSA.push(":checked");
			}
		});

		assert(function( div ) {
			// Support: Windows 8 Native Apps
			// The type and name attributes are restricted during .innerHTML assignment
			var input = doc.createElement("input");
			input.setAttribute( "type", "hidden" );
			div.appendChild( input ).setAttribute( "name", "D" );

			// Support: IE8
			// Enforce case-sensitivity of name attribute
			if ( div.querySelectorAll("[name=d]").length ) {
				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":enabled").length ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Opera 10-11 does not throw on post-comma invalid pseudos
			div.querySelectorAll("*,:x");
			rbuggyQSA.push(",.*:");
		});
	}

	if ( (support.matchesSelector = rnative.test( (matches = docElem.matches ||
		docElem.webkitMatchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector) )) ) {

		assert(function( div ) {
			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( div, "div" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( div, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		});
	}

	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );

	/* Contains
	---------------------------------------------------------------------- */
	hasCompare = rnative.test( docElem.compareDocumentPosition );

	// Element contains another
	// Purposefully does not implement inclusive descendent
	// As in, an element does not contain itself
	contains = hasCompare || rnative.test( docElem.contains ) ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			));
		} :
		function( a, b ) {
			if ( b ) {
				while ( (b = b.parentNode) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	/* Sorting
	---------------------------------------------------------------------- */

	// Document order sorting
	sortOrder = hasCompare ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		// Sort on method existence if only one input has compareDocumentPosition
		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
		if ( compare ) {
			return compare;
		}

		// Calculate position if both inputs belong to the same document
		compare = ( a.ownerDocument || a ) === ( b.ownerDocument || b ) ?
			a.compareDocumentPosition( b ) :

			// Otherwise we know they are disconnected
			1;

		// Disconnected nodes
		if ( compare & 1 ||
			(!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {

			// Choose the first element that is related to our preferred document
			if ( a === doc || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ) {
				return -1;
			}
			if ( b === doc || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ) {
				return 1;
			}

			// Maintain original order
			return sortInput ?
				( indexOf.call( sortInput, a ) - indexOf.call( sortInput, b ) ) :
				0;
		}

		return compare & 4 ? -1 : 1;
	} :
	function( a, b ) {
		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Parentless nodes are either documents or disconnected
		if ( !aup || !bup ) {
			return a === doc ? -1 :
				b === doc ? 1 :
				aup ? -1 :
				bup ? 1 :
				sortInput ?
				( indexOf.call( sortInput, a ) - indexOf.call( sortInput, b ) ) :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( (cur = cur.parentNode) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( (cur = cur.parentNode) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[i] === bp[i] ) {
			i++;
		}

		return i ?
			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[i], bp[i] ) :

			// Otherwise nodes in our document sort first
			ap[i] === preferredDoc ? -1 :
			bp[i] === preferredDoc ? 1 :
			0;
	};

	return doc;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	// Make sure that attribute selectors are quoted
	expr = expr.replace( rattributeQuotes, "='$1']" );

	if ( support.matchesSelector && documentIsHTML &&
		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||
					// As well, disconnected nodes are said to be in a document
					// fragment in IE 9
					elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch(e) {}
	}

	return Sizzle( expr, document, null, [ elem ] ).length > 0;
};

Sizzle.contains = function( context, elem ) {
	// Set document vars if needed
	if ( ( context.ownerDocument || context ) !== document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	var fn = Expr.attrHandle[ name.toLowerCase() ],
		// Don't get fooled by Object.prototype properties (jQuery #13807)
		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
			fn( elem, name, !documentIsHTML ) :
			undefined;

	return val !== undefined ?
		val :
		support.attributes || !documentIsHTML ?
			elem.getAttribute( name ) :
			(val = elem.getAttributeNode(name)) && val.specified ?
				val.value :
				null;
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( (elem = results[i++]) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	// Clear input after sorting to release objects
	// See https://github.com/jquery/sizzle/pull/225
	sortInput = null;

	return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {
		// If no nodeType, this is expected to be an array
		while ( (node = elem[i++]) ) {
			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
		// Use textContent for elements
		// innerText usage removed for consistency of new lines (jQuery #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {
			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}
	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	attrHandle: {},

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[1] = match[1].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[3] = ( match[3] || match[4] || match[5] || "" ).replace( runescape, funescape );

			if ( match[2] === "~=" ) {
				match[3] = " " + match[3] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {
			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[1] = match[1].toLowerCase();

			if ( match[1].slice( 0, 3 ) === "nth" ) {
				// nth-* requires argument
				if ( !match[3] ) {
					Sizzle.error( match[0] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
				match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

			// other types prohibit arguments
			} else if ( match[3] ) {
				Sizzle.error( match[0] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[6] && match[2];

			if ( matchExpr["CHILD"].test( match[0] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[3] ) {
				match[2] = match[4] || match[5] || "";

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&
				// Get excess from tokenize (recursively)
				(excess = tokenize( unquoted, true )) &&
				// advance to the next closing parenthesis
				(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

				// excess is a negative index
				match[0] = match[0].slice( 0, excess );
				match[2] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeNameSelector ) {
			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
			return nodeNameSelector === "*" ?
				function() { return true; } :
				function( elem ) {
					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
				};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
				classCache( className, function( elem ) {
					return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== strundefined && elem.getAttribute("class") || "" );
				});
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
			};
		},

		"CHILD": function( type, what, argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, context, xml ) {
					var cache, outerCache, node, diff, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( (node = node[ dir ]) ) {
									if ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) {
										return false;
									}
								}
								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {
							// Seek `elem` from a previously-cached index
							outerCache = parent[ expando ] || (parent[ expando ] = {});
							cache = outerCache[ type ] || [];
							nodeIndex = cache[0] === dirruns && cache[1];
							diff = cache[0] === dirruns && cache[2];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( (node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								(diff = nodeIndex = 0) || start.pop()) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									outerCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						// Use previously-cached element index if available
						} else if ( useCache && (cache = (elem[ expando ] || (elem[ expando ] = {}))[ type ]) && cache[0] === dirruns ) {
							diff = cache[1];

						// xml :nth-child(...) or :nth-last-child(...) or :nth(-last)?-of-type(...)
						} else {
							// Use the same loop as above to seek `elem` from the start
							while ( (node = ++nodeIndex && node && node[ dir ] ||
								(diff = nodeIndex = 0) || start.pop()) ) {

								if ( ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) && ++diff ) {
									// Cache the index of each encountered element
									if ( useCache ) {
										(node[ expando ] || (node[ expando ] = {}))[ type ] = [ dirruns, diff ];
									}

									if ( node === elem ) {
										break;
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {
			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction(function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf.call( seed, matched[i] );
							seed[ idx ] = !( matches[ idx ] = matched[i] );
						}
					}) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {
		// Potentially complex pseudos
		"not": markFunction(function( selector ) {
			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction(function( seed, matches, context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( (elem = unmatched[i]) ) {
							seed[i] = !(matches[i] = elem);
						}
					}
				}) :
				function( elem, context, xml ) {
					input[0] = elem;
					matcher( input, null, xml, results );
					return !results.pop();
				};
		}),

		"has": markFunction(function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		}),

		"contains": markFunction(function( text ) {
			return function( elem ) {
				return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
			};
		}),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {
			// lang value must be a valid identifier
			if ( !ridentifier.test(lang || "") ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( (elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( (elem = elem.parentNode) && elem.nodeType === 1 );
				return false;
			};
		}),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
		},

		// Boolean properties
		"enabled": function( elem ) {
			return elem.disabled === false;
		},

		"disabled": function( elem ) {
			return elem.disabled === true;
		},

		"checked": function( elem ) {
			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
		},

		"selected": function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {
			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
			//   but not by others (comment: 8; processing instruction: 7; etc.)
			// nodeType < 6 works because attributes (2) do not appear as children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeType < 6 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos["empty"]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&

				// Support: IE<8
				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text" );
		},

		// Position-in-collection
		"first": createPositionalPseudo(function() {
			return [ 0 ];
		}),

		"last": createPositionalPseudo(function( matchIndexes, length ) {
			return [ length - 1 ];
		}),

		"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		}),

		"even": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"odd": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		})
	}
};

Expr.pseudos["nth"] = Expr.pseudos["eq"];

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || (match = rcomma.exec( soFar )) ) {
			if ( match ) {
				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[0].length ) || soFar;
			}
			groups.push( (tokens = []) );
		}

		matched = false;

		// Combinators
		if ( (match = rcombinators.exec( soFar )) ) {
			matched = match.shift();
			tokens.push({
				value: matched,
				// Cast descendant combinators to space
				type: match[0].replace( rtrim, " " )
			});
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
				(match = preFilters[ type ]( match ))) ) {
				matched = match.shift();
				tokens.push({
					value: matched,
					type: type,
					matches: match
				});
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :
			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
};

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[i].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		checkNonElements = base && dir === "parentNode",
		doneName = done++;

	return combinator.first ?
		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( (elem = elem[ dir ]) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var oldCache, outerCache,
				newCache = [ dirruns, doneName ];

			// We can't set arbitrary data on XML nodes, so they don't benefit from dir caching
			if ( xml ) {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || (elem[ expando ] = {});
						if ( (oldCache = outerCache[ dir ]) &&
							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

							// Assign to newCache so results back-propagate to previous elements
							return (newCache[ 2 ] = oldCache[ 2 ]);
						} else {
							// Reuse newcache so results back-propagate to previous elements
							outerCache[ dir ] = newCache;

							// A match means we're done; a fail means we have to keep checking
							if ( (newCache[ 2 ] = matcher( elem, context, xml )) ) {
								return true;
							}
						}
					}
				}
			}
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[i]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[0];
}

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[i], results );
	}
	return results;
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( (elem = unmatched[i]) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction(function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?
				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( (elem = temp[i]) ) {
					matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {
					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( (elem = matcherOut[i]) ) {
							// Restore matcherIn since elem is not yet a final match
							temp.push( (matcherIn[i] = elem) );
						}
					}
					postFinder( null, (matcherOut = []), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( (elem = matcherOut[i]) &&
						(temp = postFinder ? indexOf.call( seed, elem ) : preMap[i]) > -1 ) {

						seed[temp] = !(results[temp] = elem);
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	});
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[0].type ],
		implicitRelative = leadingRelative || Expr.relative[" "],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf.call( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			return ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				(checkContext = context).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );
		} ];

	for ( ; i < len; i++ ) {
		if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
			matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
		} else {
			matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {
				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[j].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector(
						// If the preceding token was a descendant combinator, insert an implicit any-element `*`
						tokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })
					).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	var bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, outermost ) {
			var elem, j, matcher,
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				setMatched = [],
				contextBackup = outermostContext,
				// We must always have either seed elements or outermost context
				elems = seed || byElement && Expr.find["TAG"]( "*", outermost ),
				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
				len = elems.length;

			if ( outermost ) {
				outermostContext = context !== document && context;
			}

			// Add elements passing elementMatchers directly to results
			// Keep `i` a string if there are no elements so `matchedCount` will be "00" below
			// Support: IE<9, Safari
			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
			for ( ; i !== len && (elem = elems[i]) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;
					while ( (matcher = elementMatchers[j++]) ) {
						if ( matcher( elem, context, xml ) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {
					// They will have gone through all possible matchers
					if ( (elem = !matcher && elem) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// Apply set filters to unmatched elements
			matchedCount += i;
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( (matcher = setMatchers[j++]) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {
					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !(unmatched[i] || setMatched[i]) ) {
								setMatched[i] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {
		// Generate a function of recursive functions that can be used to check each element
		if ( !match ) {
			match = tokenize( selector );
		}
		i = match.length;
		while ( i-- ) {
			cached = matcherFromTokens( match[i] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );

		// Save selector and tokenization
		cached.selector = selector;
	}
	return cached;
};

/**
 * A low-level selection function that works with Sizzle's compiled
 *  selector functions
 * @param {String|Function} selector A selector or a pre-compiled
 *  selector function built with Sizzle.compile
 * @param {Element} context
 * @param {Array} [results]
 * @param {Array} [seed] A set of elements to match against
 */
select = Sizzle.select = function( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		compiled = typeof selector === "function" && selector,
		match = !seed && tokenize( (selector = compiled.selector || selector) );

	results = results || [];

	// Try to minimize operations if there is no seed and only one group
	if ( match.length === 1 ) {

		// Take a shortcut and set the context if the root selector is an ID
		tokens = match[0] = match[0].slice( 0 );
		if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
				support.getById && context.nodeType === 9 && documentIsHTML &&
				Expr.relative[ tokens[1].type ] ) {

			context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
			if ( !context ) {
				return results;

			// Precompiled matchers will still verify ancestry, so step up a level
			} else if ( compiled ) {
				context = context.parentNode;
			}

			selector = selector.slice( tokens.shift().value.length );
		}

		// Fetch a seed set for right-to-left matching
		i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
		while ( i-- ) {
			token = tokens[i];

			// Abort if we hit a combinator
			if ( Expr.relative[ (type = token.type) ] ) {
				break;
			}
			if ( (find = Expr.find[ type ]) ) {
				// Search, expanding context for leading sibling combinators
				if ( (seed = find(
					token.matches[0].replace( runescape, funescape ),
					rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
				)) ) {

					// If seed is empty or no tokens remain, we can return early
					tokens.splice( i, 1 );
					selector = seed.length && toSelector( tokens );
					if ( !selector ) {
						push.apply( results, seed );
						return results;
					}

					break;
				}
			}
		}
	}

	// Compile and execute a filtering function if one is not provided
	// Provide `match` to avoid retokenization if we modified the selector above
	( compiled || compile( selector, match ) )(
		seed,
		context,
		!documentIsHTML,
		results,
		rsibling.test( selector ) && testContext( context.parentNode ) || context
	);
	return results;
};

// One-time assignments

// Sort stability
support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;

// Support: Chrome<14
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates = !!hasDuplicate;

// Initialize against the default document
setDocument();

// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached = assert(function( div1 ) {
	// Should return 1, but returns 4 (following)
	return div1.compareDocumentPosition( document.createElement("div") ) & 1;
});

// Support: IE<8
// Prevent attribute/property "interpolation"
// http://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !assert(function( div ) {
	div.innerHTML = "<a href='#'></a>";
	return div.firstChild.getAttribute("href") === "#" ;
}) ) {
	addHandle( "type|href|height|width", function( elem, name, isXML ) {
		if ( !isXML ) {
			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
		}
	});
}

// Support: IE<9
// Use defaultValue in place of getAttribute("value")
if ( !support.attributes || !assert(function( div ) {
	div.innerHTML = "<input/>";
	div.firstChild.setAttribute( "value", "" );
	return div.firstChild.getAttribute( "value" ) === "";
}) ) {
	addHandle( "value", function( elem, name, isXML ) {
		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
			return elem.defaultValue;
		}
	});
}

// Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if ( !assert(function( div ) {
	return div.getAttribute("disabled") == null;
}) ) {
	addHandle( booleans, function( elem, name, isXML ) {
		var val;
		if ( !isXML ) {
			return elem[ name ] === true ? name.toLowerCase() :
					(val = elem.getAttributeNode( name )) && val.specified ?
					val.value :
				null;
		}
	});
}

return Sizzle;

})( window );



jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;
jQuery.expr[":"] = jQuery.expr.pseudos;
jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;



var rneedsContext = jQuery.expr.match.needsContext;

var rsingleTag = (/^<(\w+)\s*\/?>(?:<\/\1>|)$/);



var risSimple = /^.[^:#\[\.,]*$/;

// Implement the identical functionality for filter and not
function winnow( elements, qualifier, not ) {
	if ( jQuery.isFunction( qualifier ) ) {
		return jQuery.grep( elements, function( elem, i ) {
			/* jshint -W018 */
			return !!qualifier.call( elem, i, elem ) !== not;
		});

	}

	if ( qualifier.nodeType ) {
		return jQuery.grep( elements, function( elem ) {
			return ( elem === qualifier ) !== not;
		});

	}

	if ( typeof qualifier === "string" ) {
		if ( risSimple.test( qualifier ) ) {
			return jQuery.filter( qualifier, elements, not );
		}

		qualifier = jQuery.filter( qualifier, elements );
	}

	return jQuery.grep( elements, function( elem ) {
		return ( indexOf.call( qualifier, elem ) >= 0 ) !== not;
	});
}

jQuery.filter = function( expr, elems, not ) {
	var elem = elems[ 0 ];

	if ( not ) {
		expr = ":not(" + expr + ")";
	}

	return elems.length === 1 && elem.nodeType === 1 ?
		jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [] :
		jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
			return elem.nodeType === 1;
		}));
};

jQuery.fn.extend({
	find: function( selector ) {
		var i,
			len = this.length,
			ret = [],
			self = this;

		if ( typeof selector !== "string" ) {
			return this.pushStack( jQuery( selector ).filter(function() {
				for ( i = 0; i < len; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			}) );
		}

		for ( i = 0; i < len; i++ ) {
			jQuery.find( selector, self[ i ], ret );
		}

		// Needed because $( selector, context ) becomes $( context ).find( selector )
		ret = this.pushStack( len > 1 ? jQuery.unique( ret ) : ret );
		ret.selector = this.selector ? this.selector + " " + selector : selector;
		return ret;
	},
	filter: function( selector ) {
		return this.pushStack( winnow(this, selector || [], false) );
	},
	not: function( selector ) {
		return this.pushStack( winnow(this, selector || [], true) );
	},
	is: function( selector ) {
		return !!winnow(
			this,

			// If this is a positional/relative selector, check membership in the returned set
			// so $("p:first").is("p:last") won't return true for a doc with two "p".
			typeof selector === "string" && rneedsContext.test( selector ) ?
				jQuery( selector ) :
				selector || [],
			false
		).length;
	}
});


// Initialize a jQuery object


// A central reference to the root jQuery(document)
var rootjQuery,

	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	// Strict HTML recognition (#11290: must start with <)
	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,

	init = jQuery.fn.init = function( selector, context ) {
		var match, elem;

		// HANDLE: $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			if ( selector[0] === "<" && selector[ selector.length - 1 ] === ">" && selector.length >= 3 ) {
				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = rquickExpr.exec( selector );
			}

			// Match html or make sure no context is specified for #id
			if ( match && (match[1] || !context) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[1] ) {
					context = context instanceof jQuery ? context[0] : context;

					// scripts is true for back-compat
					// Intentionally let the error be thrown if parseHTML is not present
					jQuery.merge( this, jQuery.parseHTML(
						match[1],
						context && context.nodeType ? context.ownerDocument || context : document,
						true
					) );

					// HANDLE: $(html, props)
					if ( rsingleTag.test( match[1] ) && jQuery.isPlainObject( context ) ) {
						for ( match in context ) {
							// Properties of context are called as methods if possible
							if ( jQuery.isFunction( this[ match ] ) ) {
								this[ match ]( context[ match ] );

							// ...and otherwise set as attributes
							} else {
								this.attr( match, context[ match ] );
							}
						}
					}

					return this;

				// HANDLE: $(#id)
				} else {
					elem = document.getElementById( match[2] );

					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document #6963
					if ( elem && elem.parentNode ) {
						// Inject the element directly into the jQuery object
						this.length = 1;
						this[0] = elem;
					}

					this.context = document;
					this.selector = selector;
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || rootjQuery ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(DOMElement)
		} else if ( selector.nodeType ) {
			this.context = this[0] = selector;
			this.length = 1;
			return this;

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( jQuery.isFunction( selector ) ) {
			return typeof rootjQuery.ready !== "undefined" ?
				rootjQuery.ready( selector ) :
				// Execute immediately if ready is not present
				selector( jQuery );
		}

		if ( selector.selector !== undefined ) {
			this.selector = selector.selector;
			this.context = selector.context;
		}

		return jQuery.makeArray( selector, this );
	};

// Give the init function the jQuery prototype for later instantiation
init.prototype = jQuery.fn;

// Initialize central reference
rootjQuery = jQuery( document );


var rparentsprev = /^(?:parents|prev(?:Until|All))/,
	// methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.extend({
	dir: function( elem, dir, until ) {
		var matched = [],
			truncate = until !== undefined;

		while ( (elem = elem[ dir ]) && elem.nodeType !== 9 ) {
			if ( elem.nodeType === 1 ) {
				if ( truncate && jQuery( elem ).is( until ) ) {
					break;
				}
				matched.push( elem );
			}
		}
		return matched;
	},

	sibling: function( n, elem ) {
		var matched = [];

		for ( ; n; n = n.nextSibling ) {
			if ( n.nodeType === 1 && n !== elem ) {
				matched.push( n );
			}
		}

		return matched;
	}
});

jQuery.fn.extend({
	has: function( target ) {
		var targets = jQuery( target, this ),
			l = targets.length;

		return this.filter(function() {
			var i = 0;
			for ( ; i < l; i++ ) {
				if ( jQuery.contains( this, targets[i] ) ) {
					return true;
				}
			}
		});
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			matched = [],
			pos = rneedsContext.test( selectors ) || typeof selectors !== "string" ?
				jQuery( selectors, context || this.context ) :
				0;

		for ( ; i < l; i++ ) {
			for ( cur = this[i]; cur && cur !== context; cur = cur.parentNode ) {
				// Always skip document fragments
				if ( cur.nodeType < 11 && (pos ?
					pos.index(cur) > -1 :

					// Don't pass non-elements to Sizzle
					cur.nodeType === 1 &&
						jQuery.find.matchesSelector(cur, selectors)) ) {

					matched.push( cur );
					break;
				}
			}
		}

		return this.pushStack( matched.length > 1 ? jQuery.unique( matched ) : matched );
	},

	// Determine the position of an element within
	// the matched set of elements
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[ 0 ] && this[ 0 ].parentNode ) ? this.first().prevAll().length : -1;
		}

		// index in selector
		if ( typeof elem === "string" ) {
			return indexOf.call( jQuery( elem ), this[ 0 ] );
		}

		// Locate the position of the desired element
		return indexOf.call( this,

			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[ 0 ] : elem
		);
	},

	add: function( selector, context ) {
		return this.pushStack(
			jQuery.unique(
				jQuery.merge( this.get(), jQuery( selector, context ) )
			)
		);
	},

	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter(selector)
		);
	}
});

function sibling( cur, dir ) {
	while ( (cur = cur[dir]) && cur.nodeType !== 1 ) {}
	return cur;
}

jQuery.each({
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return jQuery.dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return jQuery.dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return jQuery.dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return jQuery.sibling( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return jQuery.sibling( elem.firstChild );
	},
	contents: function( elem ) {
		return elem.contentDocument || jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var matched = jQuery.map( this, fn, until );

		if ( name.slice( -5 ) !== "Until" ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			matched = jQuery.filter( selector, matched );
		}

		if ( this.length > 1 ) {
			// Remove duplicates
			if ( !guaranteedUnique[ name ] ) {
				jQuery.unique( matched );
			}

			// Reverse order for parents* and prev-derivatives
			if ( rparentsprev.test( name ) ) {
				matched.reverse();
			}
		}

		return this.pushStack( matched );
	};
});
var rnotwhite = (/\S+/g);



// String to Object options format cache
var optionsCache = {};

// Convert String-formatted options into Object-formatted ones and store in cache
function createOptions( options ) {
	var object = optionsCache[ options ] = {};
	jQuery.each( options.match( rnotwhite ) || [], function( _, flag ) {
		object[ flag ] = true;
	});
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		( optionsCache[ options ] || createOptions( options ) ) :
		jQuery.extend( {}, options );

	var // Last fire value (for non-forgettable lists)
		memory,
		// Flag to know if list was already fired
		fired,
		// Flag to know if list is currently firing
		firing,
		// First callback to fire (used internally by add and fireWith)
		firingStart,
		// End of the loop when firing
		firingLength,
		// Index of currently firing callback (modified by remove if needed)
		firingIndex,
		// Actual callback list
		list = [],
		// Stack of fire calls for repeatable lists
		stack = !options.once && [],
		// Fire callbacks
		fire = function( data ) {
			memory = options.memory && data;
			fired = true;
			firingIndex = firingStart || 0;
			firingStart = 0;
			firingLength = list.length;
			firing = true;
			for ( ; list && firingIndex < firingLength; firingIndex++ ) {
				if ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false && options.stopOnFalse ) {
					memory = false; // To prevent further calls using add
					break;
				}
			}
			firing = false;
			if ( list ) {
				if ( stack ) {
					if ( stack.length ) {
						fire( stack.shift() );
					}
				} else if ( memory ) {
					list = [];
				} else {
					self.disable();
				}
			}
		},
		// Actual Callbacks object
		self = {
			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {
					// First, we save the current length
					var start = list.length;
					(function add( args ) {
						jQuery.each( args, function( _, arg ) {
							var type = jQuery.type( arg );
							if ( type === "function" ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && type !== "string" ) {
								// Inspect recursively
								add( arg );
							}
						});
					})( arguments );
					// Do we need to add the callbacks to the
					// current firing batch?
					if ( firing ) {
						firingLength = list.length;
					// With memory, if we're not firing then
					// we should call right away
					} else if ( memory ) {
						firingStart = start;
						fire( memory );
					}
				}
				return this;
			},
			// Remove a callback from the list
			remove: function() {
				if ( list ) {
					jQuery.each( arguments, function( _, arg ) {
						var index;
						while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
							list.splice( index, 1 );
							// Handle firing indexes
							if ( firing ) {
								if ( index <= firingLength ) {
									firingLength--;
								}
								if ( index <= firingIndex ) {
									firingIndex--;
								}
							}
						}
					});
				}
				return this;
			},
			// Check if a given callback is in the list.
			// If no argument is given, return whether or not list has callbacks attached.
			has: function( fn ) {
				return fn ? jQuery.inArray( fn, list ) > -1 : !!( list && list.length );
			},
			// Remove all callbacks from the list
			empty: function() {
				list = [];
				firingLength = 0;
				return this;
			},
			// Have the list do nothing anymore
			disable: function() {
				list = stack = memory = undefined;
				return this;
			},
			// Is it disabled?
			disabled: function() {
				return !list;
			},
			// Lock the list in its current state
			lock: function() {
				stack = undefined;
				if ( !memory ) {
					self.disable();
				}
				return this;
			},
			// Is it locked?
			locked: function() {
				return !stack;
			},
			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				if ( list && ( !fired || stack ) ) {
					args = args || [];
					args = [ context, args.slice ? args.slice() : args ];
					if ( firing ) {
						stack.push( args );
					} else {
						fire( args );
					}
				}
				return this;
			},
			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},
			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};


jQuery.extend({

	Deferred: function( func ) {
		var tuples = [
				// action, add listener, listener list, final state
				[ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ],
				[ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ],
				[ "notify", "progress", jQuery.Callbacks("memory") ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				then: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;
					return jQuery.Deferred(function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {
							var fn = jQuery.isFunction( fns[ i ] ) && fns[ i ];
							// deferred[ done | fail | progress ] for forwarding actions to newDefer
							deferred[ tuple[1] ](function() {
								var returned = fn && fn.apply( this, arguments );
								if ( returned && jQuery.isFunction( returned.promise ) ) {
									returned.promise()
										.done( newDefer.resolve )
										.fail( newDefer.reject )
										.progress( newDefer.notify );
								} else {
									newDefer[ tuple[ 0 ] + "With" ]( this === promise ? newDefer.promise() : this, fn ? [ returned ] : arguments );
								}
							});
						});
						fns = null;
					}).promise();
				},
				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Keep pipe for back-compat
		promise.pipe = promise.then;

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 3 ];

			// promise[ done | fail | progress ] = list.add
			promise[ tuple[1] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(function() {
					// state = [ resolved | rejected ]
					state = stateString;

				// [ reject_list | resolve_list ].disable; progress_list.lock
				}, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
			}

			// deferred[ resolve | reject | notify ]
			deferred[ tuple[0] ] = function() {
				deferred[ tuple[0] + "With" ]( this === deferred ? promise : this, arguments );
				return this;
			};
			deferred[ tuple[0] + "With" ] = list.fireWith;
		});

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( subordinate /* , ..., subordinateN */ ) {
		var i = 0,
			resolveValues = slice.call( arguments ),
			length = resolveValues.length,

			// the count of uncompleted subordinates
			remaining = length !== 1 || ( subordinate && jQuery.isFunction( subordinate.promise ) ) ? length : 0,

			// the master Deferred. If resolveValues consist of only a single Deferred, just use that.
			deferred = remaining === 1 ? subordinate : jQuery.Deferred(),

			// Update function for both resolve and progress values
			updateFunc = function( i, contexts, values ) {
				return function( value ) {
					contexts[ i ] = this;
					values[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
					if ( values === progressValues ) {
						deferred.notifyWith( contexts, values );
					} else if ( !( --remaining ) ) {
						deferred.resolveWith( contexts, values );
					}
				};
			},

			progressValues, progressContexts, resolveContexts;

		// add listeners to Deferred subordinates; treat others as resolved
		if ( length > 1 ) {
			progressValues = new Array( length );
			progressContexts = new Array( length );
			resolveContexts = new Array( length );
			for ( ; i < length; i++ ) {
				if ( resolveValues[ i ] && jQuery.isFunction( resolveValues[ i ].promise ) ) {
					resolveValues[ i ].promise()
						.done( updateFunc( i, resolveContexts, resolveValues ) )
						.fail( deferred.reject )
						.progress( updateFunc( i, progressContexts, progressValues ) );
				} else {
					--remaining;
				}
			}
		}

		// if we're not waiting on anything, resolve the master
		if ( !remaining ) {
			deferred.resolveWith( resolveContexts, resolveValues );
		}

		return deferred.promise();
	}
});


// The deferred used on DOM ready
var readyList;

jQuery.fn.ready = function( fn ) {
	// Add the callback
	jQuery.ready.promise().done( fn );

	return this;
};

jQuery.extend({
	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Hold (or release) the ready event
	holdReady: function( hold ) {
		if ( hold ) {
			jQuery.readyWait++;
		} else {
			jQuery.ready( true );
		}
	},

	// Handle when the DOM is ready
	ready: function( wait ) {

		// Abort if there are pending holds or we're already ready
		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
			return;
		}

		// Remember that the DOM is ready
		jQuery.isReady = true;

		// If a normal DOM Ready event fired, decrement, and wait if need be
		if ( wait !== true && --jQuery.readyWait > 0 ) {
			return;
		}

		// If there are functions bound, to execute
		readyList.resolveWith( document, [ jQuery ] );

		// Trigger any bound ready events
		if ( jQuery.fn.triggerHandler ) {
			jQuery( document ).triggerHandler( "ready" );
			jQuery( document ).off( "ready" );
		}
	}
});

/**
 * The ready event handler and self cleanup method
 */
function completed() {
	document.removeEventListener( "DOMContentLoaded", completed, false );
	window.removeEventListener( "load", completed, false );
	jQuery.ready();
}

jQuery.ready.promise = function( obj ) {
	if ( !readyList ) {

		readyList = jQuery.Deferred();

		// Catch cases where $(document).ready() is called after the browser event has already occurred.
		// we once tried to use readyState "interactive" here, but it caused issues like the one
		// discovered by ChrisS here: http://bugs.jquery.com/ticket/12282#comment:15
		if ( document.readyState === "complete" ) {
			// Handle it asynchronously to allow scripts the opportunity to delay ready
			setTimeout( jQuery.ready );

		} else {

			// Use the handy event callback
			document.addEventListener( "DOMContentLoaded", completed, false );

			// A fallback to window.onload, that will always work
			window.addEventListener( "load", completed, false );
		}
	}
	return readyList.promise( obj );
};

// Kick off the DOM ready check even if the user does not
jQuery.ready.promise();




// Multifunctional method to get and set values of a collection
// The value/s can optionally be executed if it's a function
var access = jQuery.access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
	var i = 0,
		len = elems.length,
		bulk = key == null;

	// Sets many values
	if ( jQuery.type( key ) === "object" ) {
		chainable = true;
		for ( i in key ) {
			jQuery.access( elems, fn, i, key[i], true, emptyGet, raw );
		}

	// Sets one value
	} else if ( value !== undefined ) {
		chainable = true;

		if ( !jQuery.isFunction( value ) ) {
			raw = true;
		}

		if ( bulk ) {
			// Bulk operations run against the entire set
			if ( raw ) {
				fn.call( elems, value );
				fn = null;

			// ...except when executing function values
			} else {
				bulk = fn;
				fn = function( elem, key, value ) {
					return bulk.call( jQuery( elem ), value );
				};
			}
		}

		if ( fn ) {
			for ( ; i < len; i++ ) {
				fn( elems[i], key, raw ? value : value.call( elems[i], i, fn( elems[i], key ) ) );
			}
		}
	}

	return chainable ?
		elems :

		// Gets
		bulk ?
			fn.call( elems ) :
			len ? fn( elems[0], key ) : emptyGet;
};


/**
 * Determines whether an object can have data
 */
jQuery.acceptData = function( owner ) {
	// Accepts only:
	//  - Node
	//    - Node.ELEMENT_NODE
	//    - Node.DOCUMENT_NODE
	//  - Object
	//    - Any
	/* jshint -W018 */
	return owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );
};


function Data() {
	// Support: Android < 4,
	// Old WebKit does not have Object.preventExtensions/freeze method,
	// return new empty object instead with no [[set]] accessor
	Object.defineProperty( this.cache = {}, 0, {
		get: function() {
			return {};
		}
	});

	this.expando = jQuery.expando + Math.random();
}

Data.uid = 1;
Data.accepts = jQuery.acceptData;

Data.prototype = {
	key: function( owner ) {
		// We can accept data for non-element nodes in modern browsers,
		// but we should not, see #8335.
		// Always return the key for a frozen object.
		if ( !Data.accepts( owner ) ) {
			return 0;
		}

		var descriptor = {},
			// Check if the owner object already has a cache key
			unlock = owner[ this.expando ];

		// If not, create one
		if ( !unlock ) {
			unlock = Data.uid++;

			// Secure it in a non-enumerable, non-writable property
			try {
				descriptor[ this.expando ] = { value: unlock };
				Object.defineProperties( owner, descriptor );

			// Support: Android < 4
			// Fallback to a less secure definition
			} catch ( e ) {
				descriptor[ this.expando ] = unlock;
				jQuery.extend( owner, descriptor );
			}
		}

		// Ensure the cache object
		if ( !this.cache[ unlock ] ) {
			this.cache[ unlock ] = {};
		}

		return unlock;
	},
	set: function( owner, data, value ) {
		var prop,
			// There may be an unlock assigned to this node,
			// if there is no entry for this "owner", create one inline
			// and set the unlock as though an owner entry had always existed
			unlock = this.key( owner ),
			cache = this.cache[ unlock ];

		// Handle: [ owner, key, value ] args
		if ( typeof data === "string" ) {
			cache[ data ] = value;

		// Handle: [ owner, { properties } ] args
		} else {
			// Fresh assignments by object are shallow copied
			if ( jQuery.isEmptyObject( cache ) ) {
				jQuery.extend( this.cache[ unlock ], data );
			// Otherwise, copy the properties one-by-one to the cache object
			} else {
				for ( prop in data ) {
					cache[ prop ] = data[ prop ];
				}
			}
		}
		return cache;
	},
	get: function( owner, key ) {
		// Either a valid cache is found, or will be created.
		// New caches will be created and the unlock returned,
		// allowing direct access to the newly created
		// empty data object. A valid owner object must be provided.
		var cache = this.cache[ this.key( owner ) ];

		return key === undefined ?
			cache : cache[ key ];
	},
	access: function( owner, key, value ) {
		var stored;
		// In cases where either:
		//
		//   1. No key was specified
		//   2. A string key was specified, but no value provided
		//
		// Take the "read" path and allow the get method to determine
		// which value to return, respectively either:
		//
		//   1. The entire cache object
		//   2. The data stored at the key
		//
		if ( key === undefined ||
				((key && typeof key === "string") && value === undefined) ) {

			stored = this.get( owner, key );

			return stored !== undefined ?
				stored : this.get( owner, jQuery.camelCase(key) );
		}

		// [*]When the key is not a string, or both a key and value
		// are specified, set or extend (existing objects) with either:
		//
		//   1. An object of properties
		//   2. A key and value
		//
		this.set( owner, key, value );

		// Since the "set" path can have two possible entry points
		// return the expected data based on which path was taken[*]
		return value !== undefined ? value : key;
	},
	remove: function( owner, key ) {
		var i, name, camel,
			unlock = this.key( owner ),
			cache = this.cache[ unlock ];

		if ( key === undefined ) {
			this.cache[ unlock ] = {};

		} else {
			// Support array or space separated string of keys
			if ( jQuery.isArray( key ) ) {
				// If "name" is an array of keys...
				// When data is initially created, via ("key", "val") signature,
				// keys will be converted to camelCase.
				// Since there is no way to tell _how_ a key was added, remove
				// both plain key and camelCase key. #12786
				// This will only penalize the array argument path.
				name = key.concat( key.map( jQuery.camelCase ) );
			} else {
				camel = jQuery.camelCase( key );
				// Try the string as a key before any manipulation
				if ( key in cache ) {
					name = [ key, camel ];
				} else {
					// If a key with the spaces exists, use it.
					// Otherwise, create an array by matching non-whitespace
					name = camel;
					name = name in cache ?
						[ name ] : ( name.match( rnotwhite ) || [] );
				}
			}

			i = name.length;
			while ( i-- ) {
				delete cache[ name[ i ] ];
			}
		}
	},
	hasData: function( owner ) {
		return !jQuery.isEmptyObject(
			this.cache[ owner[ this.expando ] ] || {}
		);
	},
	discard: function( owner ) {
		if ( owner[ this.expando ] ) {
			delete this.cache[ owner[ this.expando ] ];
		}
	}
};
var data_priv = new Data();

var data_user = new Data();



/*
	Implementation Summary

	1. Enforce API surface and semantic compatibility with 1.9.x branch
	2. Improve the module's maintainability by reducing the storage
		paths to a single mechanism.
	3. Use the same single mechanism to support "private" and "user" data.
	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
	5. Avoid exposing implementation details on user objects (eg. expando properties)
	6. Provide a clear path for implementation upgrade to WeakMap in 2014
*/
var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
	rmultiDash = /([A-Z])/g;

function dataAttr( elem, key, data ) {
	var name;

	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {
		name = "data-" + key.replace( rmultiDash, "-$1" ).toLowerCase();
		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = data === "true" ? true :
					data === "false" ? false :
					data === "null" ? null :
					// Only convert to a number if it doesn't change the string
					+data + "" === data ? +data :
					rbrace.test( data ) ? jQuery.parseJSON( data ) :
					data;
			} catch( e ) {}

			// Make sure we set the data so it isn't changed later
			data_user.set( elem, key, data );
		} else {
			data = undefined;
		}
	}
	return data;
}

jQuery.extend({
	hasData: function( elem ) {
		return data_user.hasData( elem ) || data_priv.hasData( elem );
	},

	data: function( elem, name, data ) {
		return data_user.access( elem, name, data );
	},

	removeData: function( elem, name ) {
		data_user.remove( elem, name );
	},

	// TODO: Now that all calls to _data and _removeData have been replaced
	// with direct calls to data_priv methods, these can be deprecated.
	_data: function( elem, name, data ) {
		return data_priv.access( elem, name, data );
	},

	_removeData: function( elem, name ) {
		data_priv.remove( elem, name );
	}
});

jQuery.fn.extend({
	data: function( key, value ) {
		var i, name, data,
			elem = this[ 0 ],
			attrs = elem && elem.attributes;

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = data_user.get( elem );

				if ( elem.nodeType === 1 && !data_priv.get( elem, "hasDataAttrs" ) ) {
					i = attrs.length;
					while ( i-- ) {

						// Support: IE11+
						// The attrs elements can be null (#14894)
						if ( attrs[ i ] ) {
							name = attrs[ i ].name;
							if ( name.indexOf( "data-" ) === 0 ) {
								name = jQuery.camelCase( name.slice(5) );
								dataAttr( elem, name, data[ name ] );
							}
						}
					}
					data_priv.set( elem, "hasDataAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each(function() {
				data_user.set( this, key );
			});
		}

		return access( this, function( value ) {
			var data,
				camelKey = jQuery.camelCase( key );

			// The calling jQuery object (element matches) is not empty
			// (and therefore has an element appears at this[ 0 ]) and the
			// `value` parameter was not undefined. An empty jQuery object
			// will result in `undefined` for elem = this[ 0 ] which will
			// throw an exception if an attempt to read a data cache is made.
			if ( elem && value === undefined ) {
				// Attempt to get data from the cache
				// with the key as-is
				data = data_user.get( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// Attempt to get data from the cache
				// with the key camelized
				data = data_user.get( elem, camelKey );
				if ( data !== undefined ) {
					return data;
				}

				// Attempt to "discover" the data in
				// HTML5 custom data-* attrs
				data = dataAttr( elem, camelKey, undefined );
				if ( data !== undefined ) {
					return data;
				}

				// We tried really hard, but the data doesn't exist.
				return;
			}

			// Set the data...
			this.each(function() {
				// First, attempt to store a copy or reference of any
				// data that might've been store with a camelCased key.
				var data = data_user.get( this, camelKey );

				// For HTML5 data-* attribute interop, we have to
				// store property names with dashes in a camelCase form.
				// This might not apply to all properties...*
				data_user.set( this, camelKey, value );

				// *... In the case of properties that might _actually_
				// have dashes, we need to also store a copy of that
				// unchanged property.
				if ( key.indexOf("-") !== -1 && data !== undefined ) {
					data_user.set( this, key, value );
				}
			});
		}, null, value, arguments.length > 1, null, true );
	},

	removeData: function( key ) {
		return this.each(function() {
			data_user.remove( this, key );
		});
	}
});


jQuery.extend({
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = data_priv.get( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || jQuery.isArray( data ) ) {
					queue = data_priv.access( elem, type, jQuery.makeArray(data) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = jQuery._queueHooks( elem, type ),
			next = function() {
				jQuery.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// not intended for public consumption - generates a queueHooks object, or returns the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return data_priv.get( elem, key ) || data_priv.access( elem, key, {
			empty: jQuery.Callbacks("once memory").add(function() {
				data_priv.remove( elem, [ type + "queue", key ] );
			})
		});
	}
});

jQuery.fn.extend({
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[0], type );
		}

		return data === undefined ?
			this :
			this.each(function() {
				var queue = jQuery.queue( this, type, data );

				// ensure a hooks for this queue
				jQuery._queueHooks( this, type );

				if ( type === "fx" && queue[0] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			});
	},
	dequeue: function( type ) {
		return this.each(function() {
			jQuery.dequeue( this, type );
		});
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},
	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = jQuery.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while ( i-- ) {
			tmp = data_priv.get( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
});
var pnum = (/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/).source;

var cssExpand = [ "Top", "Right", "Bottom", "Left" ];

var isHidden = function( elem, el ) {
		// isHidden might be called from jQuery#filter function;
		// in that case, element will be second argument
		elem = el || elem;
		return jQuery.css( elem, "display" ) === "none" || !jQuery.contains( elem.ownerDocument, elem );
	};

var rcheckableType = (/^(?:checkbox|radio)$/i);



(function() {
	var fragment = document.createDocumentFragment(),
		div = fragment.appendChild( document.createElement( "div" ) ),
		input = document.createElement( "input" );

	// #11217 - WebKit loses check when the name is after the checked attribute
	// Support: Windows Web Apps (WWA)
	// `name` and `type` need .setAttribute for WWA
	input.setAttribute( "type", "radio" );
	input.setAttribute( "checked", "checked" );
	input.setAttribute( "name", "t" );

	div.appendChild( input );

	// Support: Safari 5.1, iOS 5.1, Android 4.x, Android 2.3
	// old WebKit doesn't clone checked state correctly in fragments
	support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Make sure textarea (and checkbox) defaultValue is properly cloned
	// Support: IE9-IE11+
	div.innerHTML = "<textarea>x</textarea>";
	support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;
})();
var strundefined = typeof undefined;



support.focusinBubbles = "onfocusin" in window;


var
	rkeyEvent = /^key/,
	rmouseEvent = /^(?:mouse|pointer|contextmenu)|click/,
	rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
	rtypenamespace = /^([^.]*)(?:\.(.+)|)$/;

function returnTrue() {
	return true;
}

function returnFalse() {
	return false;
}

function safeActiveElement() {
	try {
		return document.activeElement;
	} catch ( err ) { }
}

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	global: {},

	add: function( elem, types, handler, data, selector ) {

		var handleObjIn, eventHandle, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = data_priv.get( elem );

		// Don't attach events to noData or text/comment nodes (but allow plain objects)
		if ( !elemData ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		if ( !(events = elemData.events) ) {
			events = elemData.events = {};
		}
		if ( !(eventHandle = elemData.handle) ) {
			eventHandle = elemData.handle = function( e ) {
				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== strundefined && jQuery.event.triggered !== e.type ?
					jQuery.event.dispatch.apply( elem, arguments ) : undefined;
			};
		}

		// Handle multiple events separated by a space
		types = ( types || "" ).match( rnotwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[t] ) || [];
			type = origType = tmp[1];
			namespaces = ( tmp[2] || "" ).split( "." ).sort();

			// There *must* be a type, no attaching namespace-only handlers
			if ( !type ) {
				continue;
			}

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend({
				type: type,
				origType: origType,
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
				namespace: namespaces.join(".")
			}, handleObjIn );

			// Init the event handler queue if we're the first
			if ( !(handlers = events[ type ]) ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener if the special events handler returns false
				if ( !special.setup || special.setup.call( elem, data, namespaces, eventHandle ) === false ) {
					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle, false );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

	},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {

		var j, origCount, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = data_priv.hasData( elem ) && data_priv.get( elem );

		if ( !elemData || !(events = elemData.events) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = ( types || "" ).match( rnotwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[t] ) || [];
			type = origType = tmp[1];
			namespaces = ( tmp[2] || "" ).split( "." ).sort();

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector ? special.delegateType : special.bindType ) || type;
			handlers = events[ type ] || [];
			tmp = tmp[2] && new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" );

			// Remove matching events
			origCount = j = handlers.length;
			while ( j-- ) {
				handleObj = handlers[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					( !handler || handler.guid === handleObj.guid ) &&
					( !tmp || tmp.test( handleObj.namespace ) ) &&
					( !selector || selector === handleObj.selector || selector === "**" && handleObj.selector ) ) {
					handlers.splice( j, 1 );

					if ( handleObj.selector ) {
						handlers.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( origCount && !handlers.length ) {
				if ( !special.teardown || special.teardown.call( elem, namespaces, elemData.handle ) === false ) {
					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			delete elemData.handle;
			data_priv.remove( elem, "events" );
		}
	},

	trigger: function( event, data, elem, onlyHandlers ) {

		var i, cur, tmp, bubbleType, ontype, handle, special,
			eventPath = [ elem || document ],
			type = hasOwn.call( event, "type" ) ? event.type : event,
			namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split(".") : [];

		cur = tmp = elem = elem || document;

		// Don't do events on text and comment nodes
		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
			return;
		}

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf(".") >= 0 ) {
			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split(".");
			type = namespaces.shift();
			namespaces.sort();
		}
		ontype = type.indexOf(":") < 0 && "on" + type;

		// Caller can pass in a jQuery.Event object, Object, or just an event type string
		event = event[ jQuery.expando ] ?
			event :
			new jQuery.Event( type, typeof event === "object" && event );

		// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
		event.isTrigger = onlyHandlers ? 2 : 3;
		event.namespace = namespaces.join(".");
		event.namespace_re = event.namespace ?
			new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" ) :
			null;

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data == null ?
			[ event ] :
			jQuery.makeArray( data, [ event ] );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			if ( !rfocusMorph.test( bubbleType + type ) ) {
				cur = cur.parentNode;
			}
			for ( ; cur; cur = cur.parentNode ) {
				eventPath.push( cur );
				tmp = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( tmp === (elem.ownerDocument || document) ) {
				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
			}
		}

		// Fire handlers on the event path
		i = 0;
		while ( (cur = eventPath[i++]) && !event.isPropagationStopped() ) {

			event.type = i > 1 ?
				bubbleType :
				special.bindType || type;

			// jQuery handler
			handle = ( data_priv.get( cur, "events" ) || {} )[ event.type ] && data_priv.get( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}

			// Native handler
			handle = ontype && cur[ ontype ];
			if ( handle && handle.apply && jQuery.acceptData( cur ) ) {
				event.result = handle.apply( cur, data );
				if ( event.result === false ) {
					event.preventDefault();
				}
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( (!special._default || special._default.apply( eventPath.pop(), data ) === false) &&
				jQuery.acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name name as the event.
				// Don't do default actions on window, that's where global variables be (#6170)
				if ( ontype && jQuery.isFunction( elem[ type ] ) && !jQuery.isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					tmp = elem[ ontype ];

					if ( tmp ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;
					elem[ type ]();
					jQuery.event.triggered = undefined;

					if ( tmp ) {
						elem[ ontype ] = tmp;
					}
				}
			}
		}

		return event.result;
	},

	dispatch: function( event ) {

		// Make a writable jQuery.Event from the native event object
		event = jQuery.event.fix( event );

		var i, j, ret, matched, handleObj,
			handlerQueue = [],
			args = slice.call( arguments ),
			handlers = ( data_priv.get( this, "events" ) || {} )[ event.type ] || [],
			special = jQuery.event.special[ event.type ] || {};

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[0] = event;
		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers
		handlerQueue = jQuery.event.handlers.call( this, event, handlers );

		// Run delegates first; they may want to stop propagation beneath us
		i = 0;
		while ( (matched = handlerQueue[ i++ ]) && !event.isPropagationStopped() ) {
			event.currentTarget = matched.elem;

			j = 0;
			while ( (handleObj = matched.handlers[ j++ ]) && !event.isImmediatePropagationStopped() ) {

				// Triggered event must either 1) have no namespace, or
				// 2) have namespace(s) a subset or equal to those in the bound event (both can have no namespace).
				if ( !event.namespace_re || event.namespace_re.test( handleObj.namespace ) ) {

					event.handleObj = handleObj;
					event.data = handleObj.data;

					ret = ( (jQuery.event.special[ handleObj.origType ] || {}).handle || handleObj.handler )
							.apply( matched.elem, args );

					if ( ret !== undefined ) {
						if ( (event.result = ret) === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	handlers: function( event, handlers ) {
		var i, matches, sel, handleObj,
			handlerQueue = [],
			delegateCount = handlers.delegateCount,
			cur = event.target;

		// Find delegate handlers
		// Black-hole SVG <use> instance trees (#13180)
		// Avoid non-left-click bubbling in Firefox (#3861)
		if ( delegateCount && cur.nodeType && (!event.button || event.type !== "click") ) {

			for ( ; cur !== this; cur = cur.parentNode || this ) {

				// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
				if ( cur.disabled !== true || event.type !== "click" ) {
					matches = [];
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];

						// Don't conflict with Object.prototype properties (#13203)
						sel = handleObj.selector + " ";

						if ( matches[ sel ] === undefined ) {
							matches[ sel ] = handleObj.needsContext ?
								jQuery( sel, this ).index( cur ) >= 0 :
								jQuery.find( sel, this, null, [ cur ] ).length;
						}
						if ( matches[ sel ] ) {
							matches.push( handleObj );
						}
					}
					if ( matches.length ) {
						handlerQueue.push({ elem: cur, handlers: matches });
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		if ( delegateCount < handlers.length ) {
			handlerQueue.push({ elem: this, handlers: handlers.slice( delegateCount ) });
		}

		return handlerQueue;
	},

	// Includes some event props shared by KeyEvent and MouseEvent
	props: "altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),

	fixHooks: {},

	keyHooks: {
		props: "char charCode key keyCode".split(" "),
		filter: function( event, original ) {

			// Add which for key events
			if ( event.which == null ) {
				event.which = original.charCode != null ? original.charCode : original.keyCode;
			}

			return event;
		}
	},

	mouseHooks: {
		props: "button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
		filter: function( event, original ) {
			var eventDoc, doc, body,
				button = original.button;

			// Calculate pageX/Y if missing and clientX/Y available
			if ( event.pageX == null && original.clientX != null ) {
				eventDoc = event.target.ownerDocument || document;
				doc = eventDoc.documentElement;
				body = eventDoc.body;

				event.pageX = original.clientX + ( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) - ( doc && doc.clientLeft || body && body.clientLeft || 0 );
				event.pageY = original.clientY + ( doc && doc.scrollTop  || body && body.scrollTop  || 0 ) - ( doc && doc.clientTop  || body && body.clientTop  || 0 );
			}

			// Add which for click: 1 === left; 2 === middle; 3 === right
			// Note: button is not normalized, so don't use it
			if ( !event.which && button !== undefined ) {
				event.which = ( button & 1 ? 1 : ( button & 2 ? 3 : ( button & 4 ? 2 : 0 ) ) );
			}

			return event;
		}
	},

	fix: function( event ) {
		if ( event[ jQuery.expando ] ) {
			return event;
		}

		// Create a writable copy of the event object and normalize some properties
		var i, prop, copy,
			type = event.type,
			originalEvent = event,
			fixHook = this.fixHooks[ type ];

		if ( !fixHook ) {
			this.fixHooks[ type ] = fixHook =
				rmouseEvent.test( type ) ? this.mouseHooks :
				rkeyEvent.test( type ) ? this.keyHooks :
				{};
		}
		copy = fixHook.props ? this.props.concat( fixHook.props ) : this.props;

		event = new jQuery.Event( originalEvent );

		i = copy.length;
		while ( i-- ) {
			prop = copy[ i ];
			event[ prop ] = originalEvent[ prop ];
		}

		// Support: Cordova 2.5 (WebKit) (#13255)
		// All events should have a target; Cordova deviceready doesn't
		if ( !event.target ) {
			event.target = document;
		}

		// Support: Safari 6.0+, Chrome < 28
		// Target should not be a text node (#504, #13143)
		if ( event.target.nodeType === 3 ) {
			event.target = event.target.parentNode;
		}

		return fixHook.filter ? fixHook.filter( event, originalEvent ) : event;
	},

	special: {
		load: {
			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},
		focus: {
			// Fire native event if possible so blur/focus sequence is correct
			trigger: function() {
				if ( this !== safeActiveElement() && this.focus ) {
					this.focus();
					return false;
				}
			},
			delegateType: "focusin"
		},
		blur: {
			trigger: function() {
				if ( this === safeActiveElement() && this.blur ) {
					this.blur();
					return false;
				}
			},
			delegateType: "focusout"
		},
		click: {
			// For checkbox, fire native event so checked state will be right
			trigger: function() {
				if ( this.type === "checkbox" && this.click && jQuery.nodeName( this, "input" ) ) {
					this.click();
					return false;
				}
			},

			// For cross-browser consistency, don't fire native .click() on links
			_default: function( event ) {
				return jQuery.nodeName( event.target, "a" );
			}
		},

		beforeunload: {
			postDispatch: function( event ) {

				// Support: Firefox 20+
				// Firefox doesn't alert if the returnValue field is not set.
				if ( event.result !== undefined && event.originalEvent ) {
					event.originalEvent.returnValue = event.result;
				}
			}
		}
	},

	simulate: function( type, elem, event, bubble ) {
		// Piggyback on a donor event to simulate a different one.
		// Fake originalEvent to avoid donor's stopPropagation, but if the
		// simulated event prevents default then we do the same on the donor.
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{
				type: type,
				isSimulated: true,
				originalEvent: {}
			}
		);
		if ( bubble ) {
			jQuery.event.trigger( e, null, elem );
		} else {
			jQuery.event.dispatch.call( elem, e );
		}
		if ( e.isDefaultPrevented() ) {
			event.preventDefault();
		}
	}
};

jQuery.removeEvent = function( elem, type, handle ) {
	if ( elem.removeEventListener ) {
		elem.removeEventListener( type, handle, false );
	}
};

jQuery.Event = function( src, props ) {
	// Allow instantiation without the 'new' keyword
	if ( !(this instanceof jQuery.Event) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = src.defaultPrevented ||
				src.defaultPrevented === undefined &&
				// Support: Android < 4.0
				src.returnValue === false ?
			returnTrue :
			returnFalse;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || jQuery.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
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

// Create mouseenter/leave events using mouseover/out and event-time checks
// Support: Chrome 15+
jQuery.each({
	mouseenter: "mouseover",
	mouseleave: "mouseout",
	pointerenter: "pointerover",
	pointerleave: "pointerout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var ret,
				target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj;

			// For mousenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || (related !== target && !jQuery.contains( target, related )) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
});

// Create "bubbling" focus and blur events
// Support: Firefox, Chrome, Safari
if ( !support.focusinBubbles ) {
	jQuery.each({ focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler on the document while someone wants focusin/focusout
		var handler = function( event ) {
				jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ), true );
			};

		jQuery.event.special[ fix ] = {
			setup: function() {
				var doc = this.ownerDocument || this,
					attaches = data_priv.access( doc, fix );

				if ( !attaches ) {
					doc.addEventListener( orig, handler, true );
				}
				data_priv.access( doc, fix, ( attaches || 0 ) + 1 );
			},
			teardown: function() {
				var doc = this.ownerDocument || this,
					attaches = data_priv.access( doc, fix ) - 1;

				if ( !attaches ) {
					doc.removeEventListener( orig, handler, true );
					data_priv.remove( doc, fix );

				} else {
					data_priv.access( doc, fix, attaches );
				}
			}
		};
	});
}

jQuery.fn.extend({

	on: function( types, selector, data, fn, /*INTERNAL*/ one ) {
		var origFn, type;

		// Types can be a map of types/handlers
		if ( typeof types === "object" ) {
			// ( types-Object, selector, data )
			if ( typeof selector !== "string" ) {
				// ( types-Object, data )
				data = data || selector;
				selector = undefined;
			}
			for ( type in types ) {
				this.on( type, selector, data, types[ type ], one );
			}
			return this;
		}

		if ( data == null && fn == null ) {
			// ( types, fn )
			fn = selector;
			data = selector = undefined;
		} else if ( fn == null ) {
			if ( typeof selector === "string" ) {
				// ( types, selector, fn )
				fn = data;
				data = undefined;
			} else {
				// ( types, data, fn )
				fn = data;
				data = selector;
				selector = undefined;
			}
		}
		if ( fn === false ) {
			fn = returnFalse;
		} else if ( !fn ) {
			return this;
		}

		if ( one === 1 ) {
			origFn = fn;
			fn = function( event ) {
				// Can use an empty set, since event contains the info
				jQuery().off( event );
				return origFn.apply( this, arguments );
			};
			// Use same guid so caller can remove using origFn
			fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
		}
		return this.each( function() {
			jQuery.event.add( this, types, fn, data, selector );
		});
	},
	one: function( types, selector, data, fn ) {
		return this.on( types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		var handleObj, type;
		if ( types && types.preventDefault && types.handleObj ) {
			// ( event )  dispatched jQuery.Event
			handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {
			// ( types-object [, selector] )
			for ( type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {
			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each(function() {
			jQuery.event.remove( this, types, fn, selector );
		});
	},

	trigger: function( type, data ) {
		return this.each(function() {
			jQuery.event.trigger( type, data, this );
		});
	},
	triggerHandler: function( type, data ) {
		var elem = this[0];
		if ( elem ) {
			return jQuery.event.trigger( type, data, elem, true );
		}
	}
});


var
	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,
	rtagName = /<([\w:]+)/,
	rhtml = /<|&#?\w+;/,
	rnoInnerhtml = /<(?:script|style|link)/i,
	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rscriptType = /^$|\/(?:java|ecma)script/i,
	rscriptTypeMasked = /^true\/(.*)/,
	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,

	// We have to close these tags to support XHTML (#13200)
	wrapMap = {

		// Support: IE 9
		option: [ 1, "<select multiple='multiple'>", "</select>" ],

		thead: [ 1, "<table>", "</table>" ],
		col: [ 2, "<table><colgroup>", "</colgroup></table>" ],
		tr: [ 2, "<table><tbody>", "</tbody></table>" ],
		td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],

		_default: [ 0, "", "" ]
	};

// Support: IE 9
wrapMap.optgroup = wrapMap.option;

wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;

// Support: 1.x compatibility
// Manipulating tables requires a tbody
function manipulationTarget( elem, content ) {
	return jQuery.nodeName( elem, "table" ) &&
		jQuery.nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ?

		elem.getElementsByTagName("tbody")[0] ||
			elem.appendChild( elem.ownerDocument.createElement("tbody") ) :
		elem;
}

// Replace/restore the type attribute of script elements for safe DOM manipulation
function disableScript( elem ) {
	elem.type = (elem.getAttribute("type") !== null) + "/" + elem.type;
	return elem;
}
function restoreScript( elem ) {
	var match = rscriptTypeMasked.exec( elem.type );

	if ( match ) {
		elem.type = match[ 1 ];
	} else {
		elem.removeAttribute("type");
	}

	return elem;
}

// Mark scripts as having already been evaluated
function setGlobalEval( elems, refElements ) {
	var i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		data_priv.set(
			elems[ i ], "globalEval", !refElements || data_priv.get( refElements[ i ], "globalEval" )
		);
	}
}

function cloneCopyEvent( src, dest ) {
	var i, l, type, pdataOld, pdataCur, udataOld, udataCur, events;

	if ( dest.nodeType !== 1 ) {
		return;
	}

	// 1. Copy private data: events, handlers, etc.
	if ( data_priv.hasData( src ) ) {
		pdataOld = data_priv.access( src );
		pdataCur = data_priv.set( dest, pdataOld );
		events = pdataOld.events;

		if ( events ) {
			delete pdataCur.handle;
			pdataCur.events = {};

			for ( type in events ) {
				for ( i = 0, l = events[ type ].length; i < l; i++ ) {
					jQuery.event.add( dest, type, events[ type ][ i ] );
				}
			}
		}
	}

	// 2. Copy user data
	if ( data_user.hasData( src ) ) {
		udataOld = data_user.access( src );
		udataCur = jQuery.extend( {}, udataOld );

		data_user.set( dest, udataCur );
	}
}

function getAll( context, tag ) {
	var ret = context.getElementsByTagName ? context.getElementsByTagName( tag || "*" ) :
			context.querySelectorAll ? context.querySelectorAll( tag || "*" ) :
			[];

	return tag === undefined || tag && jQuery.nodeName( context, tag ) ?
		jQuery.merge( [ context ], ret ) :
		ret;
}

// Support: IE >= 9
function fixInput( src, dest ) {
	var nodeName = dest.nodeName.toLowerCase();

	// Fails to persist the checked state of a cloned checkbox or radio button.
	if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
		dest.checked = src.checked;

	// Fails to return the selected option to the default selected state when cloning options
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;
	}
}

jQuery.extend({
	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var i, l, srcElements, destElements,
			clone = elem.cloneNode( true ),
			inPage = jQuery.contains( elem.ownerDocument, elem );

		// Support: IE >= 9
		// Fix Cloning issues
		if ( !support.noCloneChecked && ( elem.nodeType === 1 || elem.nodeType === 11 ) &&
				!jQuery.isXMLDoc( elem ) ) {

			// We eschew Sizzle here for performance reasons: http://jsperf.com/getall-vs-sizzle/2
			destElements = getAll( clone );
			srcElements = getAll( elem );

			for ( i = 0, l = srcElements.length; i < l; i++ ) {
				fixInput( srcElements[ i ], destElements[ i ] );
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			if ( deepDataAndEvents ) {
				srcElements = srcElements || getAll( elem );
				destElements = destElements || getAll( clone );

				for ( i = 0, l = srcElements.length; i < l; i++ ) {
					cloneCopyEvent( srcElements[ i ], destElements[ i ] );
				}
			} else {
				cloneCopyEvent( elem, clone );
			}
		}

		// Preserve script evaluation history
		destElements = getAll( clone, "script" );
		if ( destElements.length > 0 ) {
			setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
		}

		// Return the cloned set
		return clone;
	},

	buildFragment: function( elems, context, scripts, selection ) {
		var elem, tmp, tag, wrap, contains, j,
			fragment = context.createDocumentFragment(),
			nodes = [],
			i = 0,
			l = elems.length;

		for ( ; i < l; i++ ) {
			elem = elems[ i ];

			if ( elem || elem === 0 ) {

				// Add nodes directly
				if ( jQuery.type( elem ) === "object" ) {
					// Support: QtWebKit
					// jQuery.merge because push.apply(_, arraylike) throws
					jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

				// Convert non-html into a text node
				} else if ( !rhtml.test( elem ) ) {
					nodes.push( context.createTextNode( elem ) );

				// Convert html into DOM nodes
				} else {
					tmp = tmp || fragment.appendChild( context.createElement("div") );

					// Deserialize a standard representation
					tag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();
					wrap = wrapMap[ tag ] || wrapMap._default;
					tmp.innerHTML = wrap[ 1 ] + elem.replace( rxhtmlTag, "<$1></$2>" ) + wrap[ 2 ];

					// Descend through wrappers to the right content
					j = wrap[ 0 ];
					while ( j-- ) {
						tmp = tmp.lastChild;
					}

					// Support: QtWebKit
					// jQuery.merge because push.apply(_, arraylike) throws
					jQuery.merge( nodes, tmp.childNodes );

					// Remember the top-level container
					tmp = fragment.firstChild;

					// Fixes #12346
					// Support: Webkit, IE
					tmp.textContent = "";
				}
			}
		}

		// Remove wrapper from fragment
		fragment.textContent = "";

		i = 0;
		while ( (elem = nodes[ i++ ]) ) {

			// #4087 - If origin and destination elements are the same, and this is
			// that element, do not do anything
			if ( selection && jQuery.inArray( elem, selection ) !== -1 ) {
				continue;
			}

			contains = jQuery.contains( elem.ownerDocument, elem );

			// Append to fragment
			tmp = getAll( fragment.appendChild( elem ), "script" );

			// Preserve script evaluation history
			if ( contains ) {
				setGlobalEval( tmp );
			}

			// Capture executables
			if ( scripts ) {
				j = 0;
				while ( (elem = tmp[ j++ ]) ) {
					if ( rscriptType.test( elem.type || "" ) ) {
						scripts.push( elem );
					}
				}
			}
		}

		return fragment;
	},

	cleanData: function( elems ) {
		var data, elem, type, key,
			special = jQuery.event.special,
			i = 0;

		for ( ; (elem = elems[ i ]) !== undefined; i++ ) {
			if ( jQuery.acceptData( elem ) ) {
				key = elem[ data_priv.expando ];

				if ( key && (data = data_priv.cache[ key ]) ) {
					if ( data.events ) {
						for ( type in data.events ) {
							if ( special[ type ] ) {
								jQuery.event.remove( elem, type );

							// This is a shortcut to avoid jQuery.event.remove's overhead
							} else {
								jQuery.removeEvent( elem, type, data.handle );
							}
						}
					}
					if ( data_priv.cache[ key ] ) {
						// Discard any remaining `private` data
						delete data_priv.cache[ key ];
					}
				}
			}
			// Discard any remaining `user` data
			delete data_user.cache[ elem[ data_user.expando ] ];
		}
	}
});

jQuery.fn.extend({
	text: function( value ) {
		return access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().each(function() {
					if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
						this.textContent = value;
					}
				});
		}, null, value, arguments.length );
	},

	append: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.appendChild( elem );
			}
		});
	},

	prepend: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.insertBefore( elem, target.firstChild );
			}
		});
	},

	before: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this );
			}
		});
	},

	after: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			}
		});
	},

	remove: function( selector, keepData /* Internal Use Only */ ) {
		var elem,
			elems = selector ? jQuery.filter( selector, this ) : this,
			i = 0;

		for ( ; (elem = elems[i]) != null; i++ ) {
			if ( !keepData && elem.nodeType === 1 ) {
				jQuery.cleanData( getAll( elem ) );
			}

			if ( elem.parentNode ) {
				if ( keepData && jQuery.contains( elem.ownerDocument, elem ) ) {
					setGlobalEval( getAll( elem, "script" ) );
				}
				elem.parentNode.removeChild( elem );
			}
		}

		return this;
	},

	empty: function() {
		var elem,
			i = 0;

		for ( ; (elem = this[i]) != null; i++ ) {
			if ( elem.nodeType === 1 ) {

				// Prevent memory leaks
				jQuery.cleanData( getAll( elem, false ) );

				// Remove any remaining nodes
				elem.textContent = "";
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map(function() {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		});
	},

	html: function( value ) {
		return access( this, function( value ) {
			var elem = this[ 0 ] || {},
				i = 0,
				l = this.length;

			if ( value === undefined && elem.nodeType === 1 ) {
				return elem.innerHTML;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				!wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {

				value = value.replace( rxhtmlTag, "<$1></$2>" );

				try {
					for ( ; i < l; i++ ) {
						elem = this[ i ] || {};

						// Remove element nodes and prevent memory leaks
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( getAll( elem, false ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch( e ) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function() {
		var arg = arguments[ 0 ];

		// Make the changes, replacing each context element with the new content
		this.domManip( arguments, function( elem ) {
			arg = this.parentNode;

			jQuery.cleanData( getAll( this ) );

			if ( arg ) {
				arg.replaceChild( elem, this );
			}
		});

		// Force removal if there was no new content (e.g., from empty arguments)
		return arg && (arg.length || arg.nodeType) ? this : this.remove();
	},

	detach: function( selector ) {
		return this.remove( selector, true );
	},

	domManip: function( args, callback ) {

		// Flatten any nested arrays
		args = concat.apply( [], args );

		var fragment, first, scripts, hasScripts, node, doc,
			i = 0,
			l = this.length,
			set = this,
			iNoClone = l - 1,
			value = args[ 0 ],
			isFunction = jQuery.isFunction( value );

		// We can't cloneNode fragments that contain checked, in WebKit
		if ( isFunction ||
				( l > 1 && typeof value === "string" &&
					!support.checkClone && rchecked.test( value ) ) ) {
			return this.each(function( index ) {
				var self = set.eq( index );
				if ( isFunction ) {
					args[ 0 ] = value.call( this, index, self.html() );
				}
				self.domManip( args, callback );
			});
		}

		if ( l ) {
			fragment = jQuery.buildFragment( args, this[ 0 ].ownerDocument, false, this );
			first = fragment.firstChild;

			if ( fragment.childNodes.length === 1 ) {
				fragment = first;
			}

			if ( first ) {
				scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
				hasScripts = scripts.length;

				// Use the original fragment for the last item instead of the first because it can end up
				// being emptied incorrectly in certain situations (#8070).
				for ( ; i < l; i++ ) {
					node = fragment;

					if ( i !== iNoClone ) {
						node = jQuery.clone( node, true, true );

						// Keep references to cloned scripts for later restoration
						if ( hasScripts ) {
							// Support: QtWebKit
							// jQuery.merge because push.apply(_, arraylike) throws
							jQuery.merge( scripts, getAll( node, "script" ) );
						}
					}

					callback.call( this[ i ], node, i );
				}

				if ( hasScripts ) {
					doc = scripts[ scripts.length - 1 ].ownerDocument;

					// Reenable scripts
					jQuery.map( scripts, restoreScript );

					// Evaluate executable scripts on first document insertion
					for ( i = 0; i < hasScripts; i++ ) {
						node = scripts[ i ];
						if ( rscriptType.test( node.type || "" ) &&
							!data_priv.access( node, "globalEval" ) && jQuery.contains( doc, node ) ) {

							if ( node.src ) {
								// Optional AJAX dependency, but won't run scripts if not present
								if ( jQuery._evalUrl ) {
									jQuery._evalUrl( node.src );
								}
							} else {
								jQuery.globalEval( node.textContent.replace( rcleanScript, "" ) );
							}
						}
					}
				}
			}
		}

		return this;
	}
});

jQuery.each({
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var elems,
			ret = [],
			insert = jQuery( selector ),
			last = insert.length - 1,
			i = 0;

		for ( ; i <= last; i++ ) {
			elems = i === last ? this : this.clone( true );
			jQuery( insert[ i ] )[ original ]( elems );

			// Support: QtWebKit
			// .get() because push.apply(_, arraylike) throws
			push.apply( ret, elems.get() );
		}

		return this.pushStack( ret );
	};
});


var iframe,
	elemdisplay = {};

/**
 * Retrieve the actual display of a element
 * @param {String} name nodeName of the element
 * @param {Object} doc Document object
 */
// Called only from within defaultDisplay
function actualDisplay( name, doc ) {
	var style,
		elem = jQuery( doc.createElement( name ) ).appendTo( doc.body ),

		// getDefaultComputedStyle might be reliably used only on attached element
		display = window.getDefaultComputedStyle && ( style = window.getDefaultComputedStyle( elem[ 0 ] ) ) ?

			// Use of this method is a temporary fix (more like optmization) until something better comes along,
			// since it was removed from specification and supported only in FF
			style.display : jQuery.css( elem[ 0 ], "display" );

	// We don't have any data stored on the element,
	// so use "detach" method as fast way to get rid of the element
	elem.detach();

	return display;
}

/**
 * Try to determine the default display value of an element
 * @param {String} nodeName
 */
function defaultDisplay( nodeName ) {
	var doc = document,
		display = elemdisplay[ nodeName ];

	if ( !display ) {
		display = actualDisplay( nodeName, doc );

		// If the simple way fails, read from inside an iframe
		if ( display === "none" || !display ) {

			// Use the already-created iframe if possible
			iframe = (iframe || jQuery( "<iframe frameborder='0' width='0' height='0'/>" )).appendTo( doc.documentElement );

			// Always write a new HTML skeleton so Webkit and Firefox don't choke on reuse
			doc = iframe[ 0 ].contentDocument;

			// Support: IE
			doc.write();
			doc.close();

			display = actualDisplay( nodeName, doc );
			iframe.detach();
		}

		// Store the correct default display
		elemdisplay[ nodeName ] = display;
	}

	return display;
}
var rmargin = (/^margin/);

var rnumnonpx = new RegExp( "^(" + pnum + ")(?!px)[a-z%]+$", "i" );

var getStyles = function( elem ) {
		return elem.ownerDocument.defaultView.getComputedStyle( elem, null );
	};



function curCSS( elem, name, computed ) {
	var width, minWidth, maxWidth, ret,
		style = elem.style;

	computed = computed || getStyles( elem );

	// Support: IE9
	// getPropertyValue is only needed for .css('filter') in IE9, see #12537
	if ( computed ) {
		ret = computed.getPropertyValue( name ) || computed[ name ];
	}

	if ( computed ) {

		if ( ret === "" && !jQuery.contains( elem.ownerDocument, elem ) ) {
			ret = jQuery.style( elem, name );
		}

		// Support: iOS < 6
		// A tribute to the "awesome hack by Dean Edwards"
		// iOS < 6 (at least) returns percentage for a larger set of values, but width seems to be reliably pixels
		// this is against the CSSOM draft spec: http://dev.w3.org/csswg/cssom/#resolved-values
		if ( rnumnonpx.test( ret ) && rmargin.test( name ) ) {

			// Remember the original values
			width = style.width;
			minWidth = style.minWidth;
			maxWidth = style.maxWidth;

			// Put in the new values to get a computed value out
			style.minWidth = style.maxWidth = style.width = ret;
			ret = computed.width;

			// Revert the changed values
			style.width = width;
			style.minWidth = minWidth;
			style.maxWidth = maxWidth;
		}
	}

	return ret !== undefined ?
		// Support: IE
		// IE returns zIndex value as an integer.
		ret + "" :
		ret;
}


function addGetHookIf( conditionFn, hookFn ) {
	// Define the hook, we'll check on the first run if it's really needed.
	return {
		get: function() {
			if ( conditionFn() ) {
				// Hook not needed (or it's not possible to use it due to missing dependency),
				// remove it.
				// Since there are no other hooks for marginRight, remove the whole object.
				delete this.get;
				return;
			}

			// Hook needed; redefine it so that the support test is not executed again.

			return (this.get = hookFn).apply( this, arguments );
		}
	};
}


(function() {
	var pixelPositionVal, boxSizingReliableVal,
		docElem = document.documentElement,
		container = document.createElement( "div" ),
		div = document.createElement( "div" );

	if ( !div.style ) {
		return;
	}

	div.style.backgroundClip = "content-box";
	div.cloneNode( true ).style.backgroundClip = "";
	support.clearCloneStyle = div.style.backgroundClip === "content-box";

	container.style.cssText = "border:0;width:0;height:0;top:0;left:-9999px;margin-top:1px;" +
		"position:absolute";
	container.appendChild( div );

	// Executing both pixelPosition & boxSizingReliable tests require only one layout
	// so they're executed at the same time to save the second computation.
	function computePixelPositionAndBoxSizingReliable() {
		div.style.cssText =
			// Support: Firefox<29, Android 2.3
			// Vendor-prefix box-sizing
			"-webkit-box-sizing:border-box;-moz-box-sizing:border-box;" +
			"box-sizing:border-box;display:block;margin-top:1%;top:1%;" +
			"border:1px;padding:1px;width:4px;position:absolute";
		div.innerHTML = "";
		docElem.appendChild( container );

		var divStyle = window.getComputedStyle( div, null );
		pixelPositionVal = divStyle.top !== "1%";
		boxSizingReliableVal = divStyle.width === "4px";

		docElem.removeChild( container );
	}

	// Support: node.js jsdom
	// Don't assume that getComputedStyle is a property of the global object
	if ( window.getComputedStyle ) {
		jQuery.extend( support, {
			pixelPosition: function() {
				// This test is executed only once but we still do memoizing
				// since we can use the boxSizingReliable pre-computing.
				// No need to check if the test was already performed, though.
				computePixelPositionAndBoxSizingReliable();
				return pixelPositionVal;
			},
			boxSizingReliable: function() {
				if ( boxSizingReliableVal == null ) {
					computePixelPositionAndBoxSizingReliable();
				}
				return boxSizingReliableVal;
			},
			reliableMarginRight: function() {
				// Support: Android 2.3
				// Check if div with explicit width and no margin-right incorrectly
				// gets computed margin-right based on width of container. (#3333)
				// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
				// This support function is only executed once so no memoizing is needed.
				var ret,
					marginDiv = div.appendChild( document.createElement( "div" ) );

				// Reset CSS: box-sizing; display; margin; border; padding
				marginDiv.style.cssText = div.style.cssText =
					// Support: Firefox<29, Android 2.3
					// Vendor-prefix box-sizing
					"-webkit-box-sizing:content-box;-moz-box-sizing:content-box;" +
					"box-sizing:content-box;display:block;margin:0;border:0;padding:0";
				marginDiv.style.marginRight = marginDiv.style.width = "0";
				div.style.width = "1px";
				docElem.appendChild( container );

				ret = !parseFloat( window.getComputedStyle( marginDiv, null ).marginRight );

				docElem.removeChild( container );

				return ret;
			}
		});
	}
})();


// A method for quickly swapping in/out CSS properties to get correct calculations.
jQuery.swap = function( elem, options, callback, args ) {
	var ret, name,
		old = {};

	// Remember the old values, and insert the new ones
	for ( name in options ) {
		old[ name ] = elem.style[ name ];
		elem.style[ name ] = options[ name ];
	}

	ret = callback.apply( elem, args || [] );

	// Revert the old values
	for ( name in options ) {
		elem.style[ name ] = old[ name ];
	}

	return ret;
};


var
	// swappable if display is none or starts with table except "table", "table-cell", or "table-caption"
	// see here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
	rnumsplit = new RegExp( "^(" + pnum + ")(.*)$", "i" ),
	rrelNum = new RegExp( "^([+-])=(" + pnum + ")", "i" ),

	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
	cssNormalTransform = {
		letterSpacing: "0",
		fontWeight: "400"
	},

	cssPrefixes = [ "Webkit", "O", "Moz", "ms" ];

// return a css property mapped to a potentially vendor prefixed property
function vendorPropName( style, name ) {

	// shortcut for names that are not vendor prefixed
	if ( name in style ) {
		return name;
	}

	// check for vendor prefixed names
	var capName = name[0].toUpperCase() + name.slice(1),
		origName = name,
		i = cssPrefixes.length;

	while ( i-- ) {
		name = cssPrefixes[ i ] + capName;
		if ( name in style ) {
			return name;
		}
	}

	return origName;
}

function setPositiveNumber( elem, value, subtract ) {
	var matches = rnumsplit.exec( value );
	return matches ?
		// Guard against undefined "subtract", e.g., when used as in cssHooks
		Math.max( 0, matches[ 1 ] - ( subtract || 0 ) ) + ( matches[ 2 ] || "px" ) :
		value;
}

function augmentWidthOrHeight( elem, name, extra, isBorderBox, styles ) {
	var i = extra === ( isBorderBox ? "border" : "content" ) ?
		// If we already have the right measurement, avoid augmentation
		4 :
		// Otherwise initialize for horizontal or vertical properties
		name === "width" ? 1 : 0,

		val = 0;

	for ( ; i < 4; i += 2 ) {
		// both box models exclude margin, so add it if we want it
		if ( extra === "margin" ) {
			val += jQuery.css( elem, extra + cssExpand[ i ], true, styles );
		}

		if ( isBorderBox ) {
			// border-box includes padding, so remove it if we want content
			if ( extra === "content" ) {
				val -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
			}

			// at this point, extra isn't border nor margin, so remove border
			if ( extra !== "margin" ) {
				val -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		} else {
			// at this point, extra isn't content, so add padding
			val += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );

			// at this point, extra isn't content nor padding, so add border
			if ( extra !== "padding" ) {
				val += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		}
	}

	return val;
}

function getWidthOrHeight( elem, name, extra ) {

	// Start with offset property, which is equivalent to the border-box value
	var valueIsBorderBox = true,
		val = name === "width" ? elem.offsetWidth : elem.offsetHeight,
		styles = getStyles( elem ),
		isBorderBox = jQuery.css( elem, "boxSizing", false, styles ) === "border-box";

	// some non-html elements return undefined for offsetWidth, so check for null/undefined
	// svg - https://bugzilla.mozilla.org/show_bug.cgi?id=649285
	// MathML - https://bugzilla.mozilla.org/show_bug.cgi?id=491668
	if ( val <= 0 || val == null ) {
		// Fall back to computed then uncomputed css if necessary
		val = curCSS( elem, name, styles );
		if ( val < 0 || val == null ) {
			val = elem.style[ name ];
		}

		// Computed unit is not pixels. Stop here and return.
		if ( rnumnonpx.test(val) ) {
			return val;
		}

		// we need the check for style in case a browser which returns unreliable values
		// for getComputedStyle silently falls back to the reliable elem.style
		valueIsBorderBox = isBorderBox &&
			( support.boxSizingReliable() || val === elem.style[ name ] );

		// Normalize "", auto, and prepare for extra
		val = parseFloat( val ) || 0;
	}

	// use the active box-sizing model to add/subtract irrelevant styles
	return ( val +
		augmentWidthOrHeight(
			elem,
			name,
			extra || ( isBorderBox ? "border" : "content" ),
			valueIsBorderBox,
			styles
		)
	) + "px";
}

function showHide( elements, show ) {
	var display, elem, hidden,
		values = [],
		index = 0,
		length = elements.length;

	for ( ; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}

		values[ index ] = data_priv.get( elem, "olddisplay" );
		display = elem.style.display;
		if ( show ) {
			// Reset the inline display of this element to learn if it is
			// being hidden by cascaded rules or not
			if ( !values[ index ] && display === "none" ) {
				elem.style.display = "";
			}

			// Set elements which have been overridden with display: none
			// in a stylesheet to whatever the default browser style is
			// for such an element
			if ( elem.style.display === "" && isHidden( elem ) ) {
				values[ index ] = data_priv.access( elem, "olddisplay", defaultDisplay(elem.nodeName) );
			}
		} else {
			hidden = isHidden( elem );

			if ( display !== "none" || !hidden ) {
				data_priv.set( elem, "olddisplay", hidden ? display : jQuery.css( elem, "display" ) );
			}
		}
	}

	// Set the display of most of the elements in a second loop
	// to avoid the constant reflow
	for ( index = 0; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}
		if ( !show || elem.style.display === "none" || elem.style.display === "" ) {
			elem.style.display = show ? values[ index ] || "" : "none";
		}
	}

	return elements;
}

jQuery.extend({
	// Add in style property hooks for overriding the default
	// behavior of getting and setting a style property
	cssHooks: {
		opacity: {
			get: function( elem, computed ) {
				if ( computed ) {
					// We should always get a number back from opacity
					var ret = curCSS( elem, "opacity" );
					return ret === "" ? "1" : ret;
				}
			}
		}
	},

	// Don't automatically add "px" to these possibly-unitless properties
	cssNumber: {
		"columnCount": true,
		"fillOpacity": true,
		"flexGrow": true,
		"flexShrink": true,
		"fontWeight": true,
		"lineHeight": true,
		"opacity": true,
		"order": true,
		"orphans": true,
		"widows": true,
		"zIndex": true,
		"zoom": true
	},

	// Add in properties whose names you wish to fix before
	// setting or getting the value
	cssProps: {
		// normalize float css property
		"float": "cssFloat"
	},

	// Get and set the style property on a DOM Node
	style: function( elem, name, value, extra ) {
		// Don't set styles on text and comment nodes
		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
			return;
		}

		// Make sure that we're working with the right name
		var ret, type, hooks,
			origName = jQuery.camelCase( name ),
			style = elem.style;

		name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( style, origName ) );

		// gets hook for the prefixed version
		// followed by the unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// Check if we're setting a value
		if ( value !== undefined ) {
			type = typeof value;

			// convert relative number strings (+= or -=) to relative numbers. #7345
			if ( type === "string" && (ret = rrelNum.exec( value )) ) {
				value = ( ret[1] + 1 ) * ret[2] + parseFloat( jQuery.css( elem, name ) );
				// Fixes bug #9237
				type = "number";
			}

			// Make sure that null and NaN values aren't set. See: #7116
			if ( value == null || value !== value ) {
				return;
			}

			// If a number was passed in, add 'px' to the (except for certain CSS properties)
			if ( type === "number" && !jQuery.cssNumber[ origName ] ) {
				value += "px";
			}

			// Fixes #8908, it can be done more correctly by specifying setters in cssHooks,
			// but it would mean to define eight (for every problematic property) identical functions
			if ( !support.clearCloneStyle && value === "" && name.indexOf( "background" ) === 0 ) {
				style[ name ] = "inherit";
			}

			// If a hook was provided, use that value, otherwise just set the specified value
			if ( !hooks || !("set" in hooks) || (value = hooks.set( elem, value, extra )) !== undefined ) {
				style[ name ] = value;
			}

		} else {
			// If a hook was provided get the non-computed value from there
			if ( hooks && "get" in hooks && (ret = hooks.get( elem, false, extra )) !== undefined ) {
				return ret;
			}

			// Otherwise just get the value from the style object
			return style[ name ];
		}
	},

	css: function( elem, name, extra, styles ) {
		var val, num, hooks,
			origName = jQuery.camelCase( name );

		// Make sure that we're working with the right name
		name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( elem.style, origName ) );

		// gets hook for the prefixed version
		// followed by the unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// If a hook was provided get the computed value from there
		if ( hooks && "get" in hooks ) {
			val = hooks.get( elem, true, extra );
		}

		// Otherwise, if a way to get the computed value exists, use that
		if ( val === undefined ) {
			val = curCSS( elem, name, styles );
		}

		//convert "normal" to computed value
		if ( val === "normal" && name in cssNormalTransform ) {
			val = cssNormalTransform[ name ];
		}

		// Return, converting to number if forced or a qualifier was provided and val looks numeric
		if ( extra === "" || extra ) {
			num = parseFloat( val );
			return extra === true || jQuery.isNumeric( num ) ? num || 0 : val;
		}
		return val;
	}
});

jQuery.each([ "height", "width" ], function( i, name ) {
	jQuery.cssHooks[ name ] = {
		get: function( elem, computed, extra ) {
			if ( computed ) {
				// certain elements can have dimension info if we invisibly show them
				// however, it must have a current display style that would benefit from this
				return rdisplayswap.test( jQuery.css( elem, "display" ) ) && elem.offsetWidth === 0 ?
					jQuery.swap( elem, cssShow, function() {
						return getWidthOrHeight( elem, name, extra );
					}) :
					getWidthOrHeight( elem, name, extra );
			}
		},

		set: function( elem, value, extra ) {
			var styles = extra && getStyles( elem );
			return setPositiveNumber( elem, value, extra ?
				augmentWidthOrHeight(
					elem,
					name,
					extra,
					jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
					styles
				) : 0
			);
		}
	};
});

// Support: Android 2.3
jQuery.cssHooks.marginRight = addGetHookIf( support.reliableMarginRight,
	function( elem, computed ) {
		if ( computed ) {
			// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
			// Work around by temporarily setting element display to inline-block
			return jQuery.swap( elem, { "display": "inline-block" },
				curCSS, [ elem, "marginRight" ] );
		}
	}
);

// These hooks are used by animate to expand properties
jQuery.each({
	margin: "",
	padding: "",
	border: "Width"
}, function( prefix, suffix ) {
	jQuery.cssHooks[ prefix + suffix ] = {
		expand: function( value ) {
			var i = 0,
				expanded = {},

				// assumes a single number if not a string
				parts = typeof value === "string" ? value.split(" ") : [ value ];

			for ( ; i < 4; i++ ) {
				expanded[ prefix + cssExpand[ i ] + suffix ] =
					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
			}

			return expanded;
		}
	};

	if ( !rmargin.test( prefix ) ) {
		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
	}
});

jQuery.fn.extend({
	css: function( name, value ) {
		return access( this, function( elem, name, value ) {
			var styles, len,
				map = {},
				i = 0;

			if ( jQuery.isArray( name ) ) {
				styles = getStyles( elem );
				len = name.length;

				for ( ; i < len; i++ ) {
					map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
				}

				return map;
			}

			return value !== undefined ?
				jQuery.style( elem, name, value ) :
				jQuery.css( elem, name );
		}, name, value, arguments.length > 1 );
	},
	show: function() {
		return showHide( this, true );
	},
	hide: function() {
		return showHide( this );
	},
	toggle: function( state ) {
		if ( typeof state === "boolean" ) {
			return state ? this.show() : this.hide();
		}

		return this.each(function() {
			if ( isHidden( this ) ) {
				jQuery( this ).show();
			} else {
				jQuery( this ).hide();
			}
		});
	}
});


function Tween( elem, options, prop, end, easing ) {
	return new Tween.prototype.init( elem, options, prop, end, easing );
}
jQuery.Tween = Tween;

Tween.prototype = {
	constructor: Tween,
	init: function( elem, options, prop, end, easing, unit ) {
		this.elem = elem;
		this.prop = prop;
		this.easing = easing || "swing";
		this.options = options;
		this.start = this.now = this.cur();
		this.end = end;
		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
	},
	cur: function() {
		var hooks = Tween.propHooks[ this.prop ];

		return hooks && hooks.get ?
			hooks.get( this ) :
			Tween.propHooks._default.get( this );
	},
	run: function( percent ) {
		var eased,
			hooks = Tween.propHooks[ this.prop ];

		if ( this.options.duration ) {
			this.pos = eased = jQuery.easing[ this.easing ](
				percent, this.options.duration * percent, 0, 1, this.options.duration
			);
		} else {
			this.pos = eased = percent;
		}
		this.now = ( this.end - this.start ) * eased + this.start;

		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		if ( hooks && hooks.set ) {
			hooks.set( this );
		} else {
			Tween.propHooks._default.set( this );
		}
		return this;
	}
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
	_default: {
		get: function( tween ) {
			var result;

			if ( tween.elem[ tween.prop ] != null &&
				(!tween.elem.style || tween.elem.style[ tween.prop ] == null) ) {
				return tween.elem[ tween.prop ];
			}

			// passing an empty string as a 3rd parameter to .css will automatically
			// attempt a parseFloat and fallback to a string if the parse fails
			// so, simple values such as "10px" are parsed to Float.
			// complex values such as "rotate(1rad)" are returned as is.
			result = jQuery.css( tween.elem, tween.prop, "" );
			// Empty strings, null, undefined and "auto" are converted to 0.
			return !result || result === "auto" ? 0 : result;
		},
		set: function( tween ) {
			// use step hook for back compat - use cssHook if its there - use .style if its
			// available and use plain properties where available
			if ( jQuery.fx.step[ tween.prop ] ) {
				jQuery.fx.step[ tween.prop ]( tween );
			} else if ( tween.elem.style && ( tween.elem.style[ jQuery.cssProps[ tween.prop ] ] != null || jQuery.cssHooks[ tween.prop ] ) ) {
				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
			} else {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	}
};

// Support: IE9
// Panic based approach to setting things on disconnected nodes

Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
	set: function( tween ) {
		if ( tween.elem.nodeType && tween.elem.parentNode ) {
			tween.elem[ tween.prop ] = tween.now;
		}
	}
};

jQuery.easing = {
	linear: function( p ) {
		return p;
	},
	swing: function( p ) {
		return 0.5 - Math.cos( p * Math.PI ) / 2;
	}
};

jQuery.fx = Tween.prototype.init;

// Back Compat <1.8 extension point
jQuery.fx.step = {};




var
	fxNow, timerId,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rfxnum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" ),
	rrun = /queueHooks$/,
	animationPrefilters = [ defaultPrefilter ],
	tweeners = {
		"*": [ function( prop, value ) {
			var tween = this.createTween( prop, value ),
				target = tween.cur(),
				parts = rfxnum.exec( value ),
				unit = parts && parts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),

				// Starting value computation is required for potential unit mismatches
				start = ( jQuery.cssNumber[ prop ] || unit !== "px" && +target ) &&
					rfxnum.exec( jQuery.css( tween.elem, prop ) ),
				scale = 1,
				maxIterations = 20;

			if ( start && start[ 3 ] !== unit ) {
				// Trust units reported by jQuery.css
				unit = unit || start[ 3 ];

				// Make sure we update the tween properties later on
				parts = parts || [];

				// Iteratively approximate from a nonzero starting point
				start = +target || 1;

				do {
					// If previous iteration zeroed out, double until we get *something*
					// Use a string for doubling factor so we don't accidentally see scale as unchanged below
					scale = scale || ".5";

					// Adjust and apply
					start = start / scale;
					jQuery.style( tween.elem, prop, start + unit );

				// Update scale, tolerating zero or NaN from tween.cur()
				// And breaking the loop if scale is unchanged or perfect, or if we've just had enough
				} while ( scale !== (scale = tween.cur() / target) && scale !== 1 && --maxIterations );
			}

			// Update tween properties
			if ( parts ) {
				start = tween.start = +start || +target || 0;
				tween.unit = unit;
				// If a +=/-= token was provided, we're doing a relative animation
				tween.end = parts[ 1 ] ?
					start + ( parts[ 1 ] + 1 ) * parts[ 2 ] :
					+parts[ 2 ];
			}

			return tween;
		} ]
	};

// Animations created synchronously will run synchronously
function createFxNow() {
	setTimeout(function() {
		fxNow = undefined;
	});
	return ( fxNow = jQuery.now() );
}

// Generate parameters to create a standard animation
function genFx( type, includeWidth ) {
	var which,
		i = 0,
		attrs = { height: type };

	// if we include width, step value is 1 to do all cssExpand values,
	// if we don't include width, step value is 2 to skip over Left and Right
	includeWidth = includeWidth ? 1 : 0;
	for ( ; i < 4 ; i += 2 - includeWidth ) {
		which = cssExpand[ i ];
		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
	}

	if ( includeWidth ) {
		attrs.opacity = attrs.width = type;
	}

	return attrs;
}

function createTween( value, prop, animation ) {
	var tween,
		collection = ( tweeners[ prop ] || [] ).concat( tweeners[ "*" ] ),
		index = 0,
		length = collection.length;
	for ( ; index < length; index++ ) {
		if ( (tween = collection[ index ].call( animation, prop, value )) ) {

			// we're done with this property
			return tween;
		}
	}
}

function defaultPrefilter( elem, props, opts ) {
	/* jshint validthis: true */
	var prop, value, toggle, tween, hooks, oldfire, display, checkDisplay,
		anim = this,
		orig = {},
		style = elem.style,
		hidden = elem.nodeType && isHidden( elem ),
		dataShow = data_priv.get( elem, "fxshow" );

	// handle queue: false promises
	if ( !opts.queue ) {
		hooks = jQuery._queueHooks( elem, "fx" );
		if ( hooks.unqueued == null ) {
			hooks.unqueued = 0;
			oldfire = hooks.empty.fire;
			hooks.empty.fire = function() {
				if ( !hooks.unqueued ) {
					oldfire();
				}
			};
		}
		hooks.unqueued++;

		anim.always(function() {
			// doing this makes sure that the complete handler will be called
			// before this completes
			anim.always(function() {
				hooks.unqueued--;
				if ( !jQuery.queue( elem, "fx" ).length ) {
					hooks.empty.fire();
				}
			});
		});
	}

	// height/width overflow pass
	if ( elem.nodeType === 1 && ( "height" in props || "width" in props ) ) {
		// Make sure that nothing sneaks out
		// Record all 3 overflow attributes because IE9-10 do not
		// change the overflow attribute when overflowX and
		// overflowY are set to the same value
		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

		// Set display property to inline-block for height/width
		// animations on inline elements that are having width/height animated
		display = jQuery.css( elem, "display" );

		// Test default display if display is currently "none"
		checkDisplay = display === "none" ?
			data_priv.get( elem, "olddisplay" ) || defaultDisplay( elem.nodeName ) : display;

		if ( checkDisplay === "inline" && jQuery.css( elem, "float" ) === "none" ) {
			style.display = "inline-block";
		}
	}

	if ( opts.overflow ) {
		style.overflow = "hidden";
		anim.always(function() {
			style.overflow = opts.overflow[ 0 ];
			style.overflowX = opts.overflow[ 1 ];
			style.overflowY = opts.overflow[ 2 ];
		});
	}

	// show/hide pass
	for ( prop in props ) {
		value = props[ prop ];
		if ( rfxtypes.exec( value ) ) {
			delete props[ prop ];
			toggle = toggle || value === "toggle";
			if ( value === ( hidden ? "hide" : "show" ) ) {

				// If there is dataShow left over from a stopped hide or show and we are going to proceed with show, we should pretend to be hidden
				if ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {
					hidden = true;
				} else {
					continue;
				}
			}
			orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );

		// Any non-fx value stops us from restoring the original display value
		} else {
			display = undefined;
		}
	}

	if ( !jQuery.isEmptyObject( orig ) ) {
		if ( dataShow ) {
			if ( "hidden" in dataShow ) {
				hidden = dataShow.hidden;
			}
		} else {
			dataShow = data_priv.access( elem, "fxshow", {} );
		}

		// store state if its toggle - enables .stop().toggle() to "reverse"
		if ( toggle ) {
			dataShow.hidden = !hidden;
		}
		if ( hidden ) {
			jQuery( elem ).show();
		} else {
			anim.done(function() {
				jQuery( elem ).hide();
			});
		}
		anim.done(function() {
			var prop;

			data_priv.remove( elem, "fxshow" );
			for ( prop in orig ) {
				jQuery.style( elem, prop, orig[ prop ] );
			}
		});
		for ( prop in orig ) {
			tween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );

			if ( !( prop in dataShow ) ) {
				dataShow[ prop ] = tween.start;
				if ( hidden ) {
					tween.end = tween.start;
					tween.start = prop === "width" || prop === "height" ? 1 : 0;
				}
			}
		}

	// If this is a noop like .hide().hide(), restore an overwritten display value
	} else if ( (display === "none" ? defaultDisplay( elem.nodeName ) : display) === "inline" ) {
		style.display = display;
	}
}

function propFilter( props, specialEasing ) {
	var index, name, easing, value, hooks;

	// camelCase, specialEasing and expand cssHook pass
	for ( index in props ) {
		name = jQuery.camelCase( index );
		easing = specialEasing[ name ];
		value = props[ index ];
		if ( jQuery.isArray( value ) ) {
			easing = value[ 1 ];
			value = props[ index ] = value[ 0 ];
		}

		if ( index !== name ) {
			props[ name ] = value;
			delete props[ index ];
		}

		hooks = jQuery.cssHooks[ name ];
		if ( hooks && "expand" in hooks ) {
			value = hooks.expand( value );
			delete props[ name ];

			// not quite $.extend, this wont overwrite keys already present.
			// also - reusing 'index' from above because we have the correct "name"
			for ( index in value ) {
				if ( !( index in props ) ) {
					props[ index ] = value[ index ];
					specialEasing[ index ] = easing;
				}
			}
		} else {
			specialEasing[ name ] = easing;
		}
	}
}

function Animation( elem, properties, options ) {
	var result,
		stopped,
		index = 0,
		length = animationPrefilters.length,
		deferred = jQuery.Deferred().always( function() {
			// don't match elem in the :animated selector
			delete tick.elem;
		}),
		tick = function() {
			if ( stopped ) {
				return false;
			}
			var currentTime = fxNow || createFxNow(),
				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),
				// archaic crash bug won't allow us to use 1 - ( 0.5 || 0 ) (#12497)
				temp = remaining / animation.duration || 0,
				percent = 1 - temp,
				index = 0,
				length = animation.tweens.length;

			for ( ; index < length ; index++ ) {
				animation.tweens[ index ].run( percent );
			}

			deferred.notifyWith( elem, [ animation, percent, remaining ]);

			if ( percent < 1 && length ) {
				return remaining;
			} else {
				deferred.resolveWith( elem, [ animation ] );
				return false;
			}
		},
		animation = deferred.promise({
			elem: elem,
			props: jQuery.extend( {}, properties ),
			opts: jQuery.extend( true, { specialEasing: {} }, options ),
			originalProperties: properties,
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],
			createTween: function( prop, end ) {
				var tween = jQuery.Tween( elem, animation.opts, prop, end,
						animation.opts.specialEasing[ prop ] || animation.opts.easing );
				animation.tweens.push( tween );
				return tween;
			},
			stop: function( gotoEnd ) {
				var index = 0,
					// if we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					length = gotoEnd ? animation.tweens.length : 0;
				if ( stopped ) {
					return this;
				}
				stopped = true;
				for ( ; index < length ; index++ ) {
					animation.tweens[ index ].run( 1 );
				}

				// resolve when we played the last frame
				// otherwise, reject
				if ( gotoEnd ) {
					deferred.resolveWith( elem, [ animation, gotoEnd ] );
				} else {
					deferred.rejectWith( elem, [ animation, gotoEnd ] );
				}
				return this;
			}
		}),
		props = animation.props;

	propFilter( props, animation.opts.specialEasing );

	for ( ; index < length ; index++ ) {
		result = animationPrefilters[ index ].call( animation, elem, props, animation.opts );
		if ( result ) {
			return result;
		}
	}

	jQuery.map( props, createTween, animation );

	if ( jQuery.isFunction( animation.opts.start ) ) {
		animation.opts.start.call( elem, animation );
	}

	jQuery.fx.timer(
		jQuery.extend( tick, {
			elem: elem,
			anim: animation,
			queue: animation.opts.queue
		})
	);

	// attach callbacks from options
	return animation.progress( animation.opts.progress )
		.done( animation.opts.done, animation.opts.complete )
		.fail( animation.opts.fail )
		.always( animation.opts.always );
}

jQuery.Animation = jQuery.extend( Animation, {

	tweener: function( props, callback ) {
		if ( jQuery.isFunction( props ) ) {
			callback = props;
			props = [ "*" ];
		} else {
			props = props.split(" ");
		}

		var prop,
			index = 0,
			length = props.length;

		for ( ; index < length ; index++ ) {
			prop = props[ index ];
			tweeners[ prop ] = tweeners[ prop ] || [];
			tweeners[ prop ].unshift( callback );
		}
	},

	prefilter: function( callback, prepend ) {
		if ( prepend ) {
			animationPrefilters.unshift( callback );
		} else {
			animationPrefilters.push( callback );
		}
	}
});

jQuery.speed = function( speed, easing, fn ) {
	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
		complete: fn || !fn && easing ||
			jQuery.isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !jQuery.isFunction( easing ) && easing
	};

	opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration :
		opt.duration in jQuery.fx.speeds ? jQuery.fx.speeds[ opt.duration ] : jQuery.fx.speeds._default;

	// normalize opt.queue - true/undefined/null -> "fx"
	if ( opt.queue == null || opt.queue === true ) {
		opt.queue = "fx";
	}

	// Queueing
	opt.old = opt.complete;

	opt.complete = function() {
		if ( jQuery.isFunction( opt.old ) ) {
			opt.old.call( this );
		}

		if ( opt.queue ) {
			jQuery.dequeue( this, opt.queue );
		}
	};

	return opt;
};

jQuery.fn.extend({
	fadeTo: function( speed, to, easing, callback ) {

		// show any hidden elements after setting opacity to 0
		return this.filter( isHidden ).css( "opacity", 0 ).show()

			// animate to the value specified
			.end().animate({ opacity: to }, speed, easing, callback );
	},
	animate: function( prop, speed, easing, callback ) {
		var empty = jQuery.isEmptyObject( prop ),
			optall = jQuery.speed( speed, easing, callback ),
			doAnimation = function() {
				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

				// Empty animations, or finishing resolves immediately
				if ( empty || data_priv.get( this, "finish" ) ) {
					anim.stop( true );
				}
			};
			doAnimation.finish = doAnimation;

		return empty || optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},
	stop: function( type, clearQueue, gotoEnd ) {
		var stopQueue = function( hooks ) {
			var stop = hooks.stop;
			delete hooks.stop;
			stop( gotoEnd );
		};

		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue && type !== false ) {
			this.queue( type || "fx", [] );
		}

		return this.each(function() {
			var dequeue = true,
				index = type != null && type + "queueHooks",
				timers = jQuery.timers,
				data = data_priv.get( this );

			if ( index ) {
				if ( data[ index ] && data[ index ].stop ) {
					stopQueue( data[ index ] );
				}
			} else {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
						stopQueue( data[ index ] );
					}
				}
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && (type == null || timers[ index ].queue === type) ) {
					timers[ index ].anim.stop( gotoEnd );
					dequeue = false;
					timers.splice( index, 1 );
				}
			}

			// start the next in the queue if the last step wasn't forced
			// timers currently will call their complete callbacks, which will dequeue
			// but only if they were gotoEnd
			if ( dequeue || !gotoEnd ) {
				jQuery.dequeue( this, type );
			}
		});
	},
	finish: function( type ) {
		if ( type !== false ) {
			type = type || "fx";
		}
		return this.each(function() {
			var index,
				data = data_priv.get( this ),
				queue = data[ type + "queue" ],
				hooks = data[ type + "queueHooks" ],
				timers = jQuery.timers,
				length = queue ? queue.length : 0;

			// enable finishing flag on private data
			data.finish = true;

			// empty the queue first
			jQuery.queue( this, type, [] );

			if ( hooks && hooks.stop ) {
				hooks.stop.call( this, true );
			}

			// look for any active animations, and finish them
			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
					timers[ index ].anim.stop( true );
					timers.splice( index, 1 );
				}
			}

			// look for any animations in the old queue and finish them
			for ( index = 0; index < length; index++ ) {
				if ( queue[ index ] && queue[ index ].finish ) {
					queue[ index ].finish.call( this );
				}
			}

			// turn off finishing flag
			delete data.finish;
		});
	}
});

jQuery.each([ "toggle", "show", "hide" ], function( i, name ) {
	var cssFn = jQuery.fn[ name ];
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return speed == null || typeof speed === "boolean" ?
			cssFn.apply( this, arguments ) :
			this.animate( genFx( name, true ), speed, easing, callback );
	};
});

// Generate shortcuts for custom animations
jQuery.each({
	slideDown: genFx("show"),
	slideUp: genFx("hide"),
	slideToggle: genFx("toggle"),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
});

jQuery.timers = [];
jQuery.fx.tick = function() {
	var timer,
		i = 0,
		timers = jQuery.timers;

	fxNow = jQuery.now();

	for ( ; i < timers.length; i++ ) {
		timer = timers[ i ];
		// Checks the timer has not already been removed
		if ( !timer() && timers[ i ] === timer ) {
			timers.splice( i--, 1 );
		}
	}

	if ( !timers.length ) {
		jQuery.fx.stop();
	}
	fxNow = undefined;
};

jQuery.fx.timer = function( timer ) {
	jQuery.timers.push( timer );
	if ( timer() ) {
		jQuery.fx.start();
	} else {
		jQuery.timers.pop();
	}
};

jQuery.fx.interval = 13;

jQuery.fx.start = function() {
	if ( !timerId ) {
		timerId = setInterval( jQuery.fx.tick, jQuery.fx.interval );
	}
};

jQuery.fx.stop = function() {
	clearInterval( timerId );
	timerId = null;
};

jQuery.fx.speeds = {
	slow: 600,
	fast: 200,
	// Default speed
	_default: 400
};


// Based off of the plugin by Clint Helfers, with permission.
// http://blindsignals.com/index.php/2009/07/jquery-delay/
jQuery.fn.delay = function( time, type ) {
	time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
	type = type || "fx";

	return this.queue( type, function( next, hooks ) {
		var timeout = setTimeout( next, time );
		hooks.stop = function() {
			clearTimeout( timeout );
		};
	});
};


(function() {
	var input = document.createElement( "input" ),
		select = document.createElement( "select" ),
		opt = select.appendChild( document.createElement( "option" ) );

	input.type = "checkbox";

	// Support: iOS 5.1, Android 4.x, Android 2.3
	// Check the default checkbox/radio value ("" on old WebKit; "on" elsewhere)
	support.checkOn = input.value !== "";

	// Must access the parent to make an option select properly
	// Support: IE9, IE10
	support.optSelected = opt.selected;

	// Make sure that the options inside disabled selects aren't marked as disabled
	// (WebKit marks them as disabled)
	select.disabled = true;
	support.optDisabled = !opt.disabled;

	// Check if an input maintains its value after becoming a radio
	// Support: IE9, IE10
	input = document.createElement( "input" );
	input.value = "t";
	input.type = "radio";
	support.radioValue = input.value === "t";
})();


var nodeHook, boolHook,
	attrHandle = jQuery.expr.attrHandle;

jQuery.fn.extend({
	attr: function( name, value ) {
		return access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each(function() {
			jQuery.removeAttr( this, name );
		});
	}
});

jQuery.extend({
	attr: function( elem, name, value ) {
		var hooks, ret,
			nType = elem.nodeType;

		// don't get/set attributes on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === strundefined ) {
			return jQuery.prop( elem, name, value );
		}

		// All attributes are lowercase
		// Grab necessary hook if one is defined
		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
			name = name.toLowerCase();
			hooks = jQuery.attrHooks[ name ] ||
				( jQuery.expr.match.bool.test( name ) ? boolHook : nodeHook );
		}

		if ( value !== undefined ) {

			if ( value === null ) {
				jQuery.removeAttr( elem, name );

			} else if ( hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ) {
				return ret;

			} else {
				elem.setAttribute( name, value + "" );
				return value;
			}

		} else if ( hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ) {
			return ret;

		} else {
			ret = jQuery.find.attr( elem, name );

			// Non-existent attributes return null, we normalize to undefined
			return ret == null ?
				undefined :
				ret;
		}
	},

	removeAttr: function( elem, value ) {
		var name, propName,
			i = 0,
			attrNames = value && value.match( rnotwhite );

		if ( attrNames && elem.nodeType === 1 ) {
			while ( (name = attrNames[i++]) ) {
				propName = jQuery.propFix[ name ] || name;

				// Boolean attributes get special treatment (#10870)
				if ( jQuery.expr.match.bool.test( name ) ) {
					// Set corresponding property to false
					elem[ propName ] = false;
				}

				elem.removeAttribute( name );
			}
		}
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				if ( !support.radioValue && value === "radio" &&
					jQuery.nodeName( elem, "input" ) ) {
					// Setting the type on a radio button after the value resets the value in IE6-9
					// Reset value to default in case type is set after value during creation
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		}
	}
});

// Hooks for boolean attributes
boolHook = {
	set: function( elem, value, name ) {
		if ( value === false ) {
			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else {
			elem.setAttribute( name, name );
		}
		return name;
	}
};
jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( i, name ) {
	var getter = attrHandle[ name ] || jQuery.find.attr;

	attrHandle[ name ] = function( elem, name, isXML ) {
		var ret, handle;
		if ( !isXML ) {
			// Avoid an infinite loop by temporarily removing this function from the getter
			handle = attrHandle[ name ];
			attrHandle[ name ] = ret;
			ret = getter( elem, name, isXML ) != null ?
				name.toLowerCase() :
				null;
			attrHandle[ name ] = handle;
		}
		return ret;
	};
});




var rfocusable = /^(?:input|select|textarea|button)$/i;

jQuery.fn.extend({
	prop: function( name, value ) {
		return access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		return this.each(function() {
			delete this[ jQuery.propFix[ name ] || name ];
		});
	}
});

jQuery.extend({
	propFix: {
		"for": "htmlFor",
		"class": "className"
	},

	prop: function( elem, name, value ) {
		var ret, hooks, notxml,
			nType = elem.nodeType;

		// don't get/set properties on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		notxml = nType !== 1 || !jQuery.isXMLDoc( elem );

		if ( notxml ) {
			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			return hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ?
				ret :
				( elem[ name ] = value );

		} else {
			return hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ?
				ret :
				elem[ name ];
		}
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {
				return elem.hasAttribute( "tabindex" ) || rfocusable.test( elem.nodeName ) || elem.href ?
					elem.tabIndex :
					-1;
			}
		}
	}
});

// Support: IE9+
// Selectedness for an option in an optgroup can be inaccurate
if ( !support.optSelected ) {
	jQuery.propHooks.selected = {
		get: function( elem ) {
			var parent = elem.parentNode;
			if ( parent && parent.parentNode ) {
				parent.parentNode.selectedIndex;
			}
			return null;
		}
	};
}

jQuery.each([
	"tabIndex",
	"readOnly",
	"maxLength",
	"cellSpacing",
	"cellPadding",
	"rowSpan",
	"colSpan",
	"useMap",
	"frameBorder",
	"contentEditable"
], function() {
	jQuery.propFix[ this.toLowerCase() ] = this;
});




var rclass = /[\t\r\n\f]/g;

jQuery.fn.extend({
	addClass: function( value ) {
		var classes, elem, cur, clazz, j, finalValue,
			proceed = typeof value === "string" && value,
			i = 0,
			len = this.length;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).addClass( value.call( this, j, this.className ) );
			});
		}

		if ( proceed ) {
			// The disjunction here is for better compressibility (see removeClass)
			classes = ( value || "" ).match( rnotwhite ) || [];

			for ( ; i < len; i++ ) {
				elem = this[ i ];
				cur = elem.nodeType === 1 && ( elem.className ?
					( " " + elem.className + " " ).replace( rclass, " " ) :
					" "
				);

				if ( cur ) {
					j = 0;
					while ( (clazz = classes[j++]) ) {
						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
							cur += clazz + " ";
						}
					}

					// only assign if different to avoid unneeded rendering.
					finalValue = jQuery.trim( cur );
					if ( elem.className !== finalValue ) {
						elem.className = finalValue;
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var classes, elem, cur, clazz, j, finalValue,
			proceed = arguments.length === 0 || typeof value === "string" && value,
			i = 0,
			len = this.length;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).removeClass( value.call( this, j, this.className ) );
			});
		}
		if ( proceed ) {
			classes = ( value || "" ).match( rnotwhite ) || [];

			for ( ; i < len; i++ ) {
				elem = this[ i ];
				// This expression is here for better compressibility (see addClass)
				cur = elem.nodeType === 1 && ( elem.className ?
					( " " + elem.className + " " ).replace( rclass, " " ) :
					""
				);

				if ( cur ) {
					j = 0;
					while ( (clazz = classes[j++]) ) {
						// Remove *all* instances
						while ( cur.indexOf( " " + clazz + " " ) >= 0 ) {
							cur = cur.replace( " " + clazz + " ", " " );
						}
					}

					// only assign if different to avoid unneeded rendering.
					finalValue = value ? jQuery.trim( cur ) : "";
					if ( elem.className !== finalValue ) {
						elem.className = finalValue;
					}
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value;

		if ( typeof stateVal === "boolean" && type === "string" ) {
			return stateVal ? this.addClass( value ) : this.removeClass( value );
		}

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( i ) {
				jQuery( this ).toggleClass( value.call(this, i, this.className, stateVal), stateVal );
			});
		}

		return this.each(function() {
			if ( type === "string" ) {
				// toggle individual class names
				var className,
					i = 0,
					self = jQuery( this ),
					classNames = value.match( rnotwhite ) || [];

				while ( (className = classNames[ i++ ]) ) {
					// check each className given, space separated list
					if ( self.hasClass( className ) ) {
						self.removeClass( className );
					} else {
						self.addClass( className );
					}
				}

			// Toggle whole class name
			} else if ( type === strundefined || type === "boolean" ) {
				if ( this.className ) {
					// store className if set
					data_priv.set( this, "__className__", this.className );
				}

				// If the element has a class name or if we're passed "false",
				// then remove the whole classname (if there was one, the above saved it).
				// Otherwise bring back whatever was previously saved (if anything),
				// falling back to the empty string if nothing was stored.
				this.className = this.className || value === false ? "" : data_priv.get( this, "__className__" ) || "";
			}
		});
	},

	hasClass: function( selector ) {
		var className = " " + selector + " ",
			i = 0,
			l = this.length;
		for ( ; i < l; i++ ) {
			if ( this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf( className ) >= 0 ) {
				return true;
			}
		}

		return false;
	}
});




var rreturn = /\r/g;

jQuery.fn.extend({
	val: function( value ) {
		var hooks, ret, isFunction,
			elem = this[0];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] || jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks && "get" in hooks && (ret = hooks.get( elem, "value" )) !== undefined ) {
					return ret;
				}

				ret = elem.value;

				return typeof ret === "string" ?
					// handle most common string cases
					ret.replace(rreturn, "") :
					// handle cases where value is null/undef or number
					ret == null ? "" : ret;
			}

			return;
		}

		isFunction = jQuery.isFunction( value );

		return this.each(function( i ) {
			var val;

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( isFunction ) {
				val = value.call( this, i, jQuery( this ).val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";

			} else if ( typeof val === "number" ) {
				val += "";

			} else if ( jQuery.isArray( val ) ) {
				val = jQuery.map( val, function( value ) {
					return value == null ? "" : value + "";
				});
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !("set" in hooks) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		});
	}
});

jQuery.extend({
	valHooks: {
		option: {
			get: function( elem ) {
				var val = jQuery.find.attr( elem, "value" );
				return val != null ?
					val :
					// Support: IE10-11+
					// option.text throws exceptions (#14686, #14858)
					jQuery.trim( jQuery.text( elem ) );
			}
		},
		select: {
			get: function( elem ) {
				var value, option,
					options = elem.options,
					index = elem.selectedIndex,
					one = elem.type === "select-one" || index < 0,
					values = one ? null : [],
					max = one ? index + 1 : options.length,
					i = index < 0 ?
						max :
						one ? index : 0;

				// Loop through all the selected options
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// IE6-9 doesn't update selected after form reset (#2551)
					if ( ( option.selected || i === index ) &&
							// Don't return options that are disabled or in a disabled optgroup
							( support.optDisabled ? !option.disabled : option.getAttribute( "disabled" ) === null ) &&
							( !option.parentNode.disabled || !jQuery.nodeName( option.parentNode, "optgroup" ) ) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				return values;
			},

			set: function( elem, value ) {
				var optionSet, option,
					options = elem.options,
					values = jQuery.makeArray( value ),
					i = options.length;

				while ( i-- ) {
					option = options[ i ];
					if ( (option.selected = jQuery.inArray( option.value, values ) >= 0) ) {
						optionSet = true;
					}
				}

				// force browsers to behave consistently when non-matching value is set
				if ( !optionSet ) {
					elem.selectedIndex = -1;
				}
				return values;
			}
		}
	}
});

// Radios and checkboxes getter/setter
jQuery.each([ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = {
		set: function( elem, value ) {
			if ( jQuery.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery(elem).val(), value ) >= 0 );
			}
		}
	};
	if ( !support.checkOn ) {
		jQuery.valHooks[ this ].get = function( elem ) {
			// Support: Webkit
			// "" is returned instead of "on" if a value isn't specified
			return elem.getAttribute("value") === null ? "on" : elem.value;
		};
	}
});




// Return jQuery for attributes-only inclusion


jQuery.each( ("blur focus focusin focusout load resize scroll unload click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup error contextmenu").split(" "), function( i, name ) {

	// Handle event binding
	jQuery.fn[ name ] = function( data, fn ) {
		return arguments.length > 0 ?
			this.on( name, null, data, fn ) :
			this.trigger( name );
	};
});

jQuery.fn.extend({
	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	},

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {
		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length === 1 ? this.off( selector, "**" ) : this.off( types, selector || "**", fn );
	}
});


var nonce = jQuery.now();

var rquery = (/\?/);



// Support: Android 2.3
// Workaround failure to string-cast null input
jQuery.parseJSON = function( data ) {
	return JSON.parse( data + "" );
};


// Cross-browser xml parsing
jQuery.parseXML = function( data ) {
	var xml, tmp;
	if ( !data || typeof data !== "string" ) {
		return null;
	}

	// Support: IE9
	try {
		tmp = new DOMParser();
		xml = tmp.parseFromString( data, "text/xml" );
	} catch ( e ) {
		xml = undefined;
	}

	if ( !xml || xml.getElementsByTagName( "parsererror" ).length ) {
		jQuery.error( "Invalid XML: " + data );
	}
	return xml;
};


var
	// Document location
	ajaxLocParts,
	ajaxLocation,

	rhash = /#.*$/,
	rts = /([?&])_=[^&]*/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,
	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,
	rurl = /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = "*/".concat("*");

// #8138, IE may throw an exception when accessing
// a field from window.location if document.domain has been set
try {
	ajaxLocation = location.href;
} catch( e ) {
	// Use the href attribute of an A element
	// since IE will modify it given document.location
	ajaxLocation = document.createElement( "a" );
	ajaxLocation.href = "";
	ajaxLocation = ajaxLocation.href;
}

// Segment location into parts
ajaxLocParts = rurl.exec( ajaxLocation.toLowerCase() ) || [];

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		var dataType,
			i = 0,
			dataTypes = dataTypeExpression.toLowerCase().match( rnotwhite ) || [];

		if ( jQuery.isFunction( func ) ) {
			// For each dataType in the dataTypeExpression
			while ( (dataType = dataTypes[i++]) ) {
				// Prepend if requested
				if ( dataType[0] === "+" ) {
					dataType = dataType.slice( 1 ) || "*";
					(structure[ dataType ] = structure[ dataType ] || []).unshift( func );

				// Otherwise append
				} else {
					(structure[ dataType ] = structure[ dataType ] || []).push( func );
				}
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

	var inspected = {},
		seekingTransport = ( structure === transports );

	function inspect( dataType ) {
		var selected;
		inspected[ dataType ] = true;
		jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
			var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
			if ( typeof dataTypeOrTransport === "string" && !seekingTransport && !inspected[ dataTypeOrTransport ] ) {
				options.dataTypes.unshift( dataTypeOrTransport );
				inspect( dataTypeOrTransport );
				return false;
			} else if ( seekingTransport ) {
				return !( selected = dataTypeOrTransport );
			}
		});
		return selected;
	}

	return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var key, deep,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};

	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || (deep = {}) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}

	return target;
}

/* Handles responses to an ajax request:
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {

	var ct, type, finalDataType, firstDataType,
		contents = s.contents,
		dataTypes = s.dataTypes;

	// Remove auto dataType and get content-type in the process
	while ( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader("Content-Type");
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {
		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[0] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}
		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

/* Chain conversions given the request and the original response
 * Also sets the responseXXX fields on the jqXHR instance
 */
function ajaxConvert( s, response, jqXHR, isSuccess ) {
	var conv2, current, conv, tmp, prev,
		converters = {},
		// Work with a copy of dataTypes in case we need to modify it for conversion
		dataTypes = s.dataTypes.slice();

	// Create converters map with lowercased keys
	if ( dataTypes[ 1 ] ) {
		for ( conv in s.converters ) {
			converters[ conv.toLowerCase() ] = s.converters[ conv ];
		}
	}

	current = dataTypes.shift();

	// Convert to each sequential dataType
	while ( current ) {

		if ( s.responseFields[ current ] ) {
			jqXHR[ s.responseFields[ current ] ] = response;
		}

		// Apply the dataFilter if provided
		if ( !prev && isSuccess && s.dataFilter ) {
			response = s.dataFilter( response, s.dataType );
		}

		prev = current;
		current = dataTypes.shift();

		if ( current ) {

		// There's only work to do if current dataType is non-auto
			if ( current === "*" ) {

				current = prev;

			// Convert response if prev dataType is non-auto and differs from current
			} else if ( prev !== "*" && prev !== current ) {

				// Seek a direct converter
				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

				// If none found, seek a pair
				if ( !conv ) {
					for ( conv2 in converters ) {

						// If conv2 outputs current
						tmp = conv2.split( " " );
						if ( tmp[ 1 ] === current ) {

							// If prev can be converted to accepted input
							conv = converters[ prev + " " + tmp[ 0 ] ] ||
								converters[ "* " + tmp[ 0 ] ];
							if ( conv ) {
								// Condense equivalence converters
								if ( conv === true ) {
									conv = converters[ conv2 ];

								// Otherwise, insert the intermediate dataType
								} else if ( converters[ conv2 ] !== true ) {
									current = tmp[ 0 ];
									dataTypes.unshift( tmp[ 1 ] );
								}
								break;
							}
						}
					}
				}

				// Apply converter (if not an equivalence)
				if ( conv !== true ) {

					// Unless errors are allowed to bubble, catch and return them
					if ( conv && s[ "throws" ] ) {
						response = conv( response );
					} else {
						try {
							response = conv( response );
						} catch ( e ) {
							return { state: "parsererror", error: conv ? e : "No conversion from " + prev + " to " + current };
						}
					}
				}
			}
		}
	}

	return { state: "success", data: response };
}

jQuery.extend({

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {},

	ajaxSettings: {
		url: ajaxLocation,
		type: "GET",
		isLocal: rlocalProtocol.test( ajaxLocParts[ 1 ] ),
		global: true,
		processData: true,
		async: true,
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",
		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		throws: false,
		traditional: false,
		headers: {},
		*/

		accepts: {
			"*": allTypes,
			text: "text/plain",
			html: "text/html",
			xml: "application/xml, text/xml",
			json: "application/json, text/javascript"
		},

		contents: {
			xml: /xml/,
			html: /html/,
			json: /json/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText",
			json: "responseJSON"
		},

		// Data converters
		// Keys separate source (or catchall "*") and destination types with a single space
		converters: {

			// Convert anything to text
			"* text": String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": jQuery.parseJSON,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			url: true,
			context: true
		}
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		return settings ?

			// Building a settings object
			ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :

			// Extending ajaxSettings
			ajaxExtend( jQuery.ajaxSettings, target );
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var transport,
			// URL without anti-cache param
			cacheURL,
			// Response headers
			responseHeadersString,
			responseHeaders,
			// timeout handle
			timeoutTimer,
			// Cross-domain detection vars
			parts,
			// To know if global events are to be dispatched
			fireGlobals,
			// Loop variable
			i,
			// Create the final options object
			s = jQuery.ajaxSetup( {}, options ),
			// Callbacks context
			callbackContext = s.context || s,
			// Context for global events is callbackContext if it is a DOM node or jQuery collection
			globalEventContext = s.context && ( callbackContext.nodeType || callbackContext.jquery ) ?
				jQuery( callbackContext ) :
				jQuery.event,
			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks("once memory"),
			// Status-dependent callbacks
			statusCode = s.statusCode || {},
			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},
			// The jqXHR state
			state = 0,
			// Default abort message
			strAbort = "canceled",
			// Fake xhr
			jqXHR = {
				readyState: 0,

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( state === 2 ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while ( (match = rheaders.exec( responseHeadersString )) ) {
								responseHeaders[ match[1].toLowerCase() ] = match[ 2 ];
							}
						}
						match = responseHeaders[ key.toLowerCase() ];
					}
					return match == null ? null : match;
				},

				// Raw string
				getAllResponseHeaders: function() {
					return state === 2 ? responseHeadersString : null;
				},

				// Caches the header
				setRequestHeader: function( name, value ) {
					var lname = name.toLowerCase();
					if ( !state ) {
						name = requestHeadersNames[ lname ] = requestHeadersNames[ lname ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( !state ) {
						s.mimeType = type;
					}
					return this;
				},

				// Status-dependent callbacks
				statusCode: function( map ) {
					var code;
					if ( map ) {
						if ( state < 2 ) {
							for ( code in map ) {
								// Lazy-add the new callback in a way that preserves old ones
								statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
							}
						} else {
							// Execute the appropriate callbacks
							jqXHR.always( map[ jqXHR.status ] );
						}
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					var finalText = statusText || strAbort;
					if ( transport ) {
						transport.abort( finalText );
					}
					done( 0, finalText );
					return this;
				}
			};

		// Attach deferreds
		deferred.promise( jqXHR ).complete = completeDeferred.add;
		jqXHR.success = jqXHR.done;
		jqXHR.error = jqXHR.fail;

		// Remove hash character (#7531: and string promotion)
		// Add protocol if not provided (prefilters might expect it)
		// Handle falsy url in the settings object (#10093: consistency with old signature)
		// We also use the url parameter if available
		s.url = ( ( url || s.url || ajaxLocation ) + "" ).replace( rhash, "" )
			.replace( rprotocol, ajaxLocParts[ 1 ] + "//" );

		// Alias method option to type as per ticket #12004
		s.type = options.method || options.type || s.method || s.type;

		// Extract dataTypes list
		s.dataTypes = jQuery.trim( s.dataType || "*" ).toLowerCase().match( rnotwhite ) || [ "" ];

		// A cross-domain request is in order when we have a protocol:host:port mismatch
		if ( s.crossDomain == null ) {
			parts = rurl.exec( s.url.toLowerCase() );
			s.crossDomain = !!( parts &&
				( parts[ 1 ] !== ajaxLocParts[ 1 ] || parts[ 2 ] !== ajaxLocParts[ 2 ] ||
					( parts[ 3 ] || ( parts[ 1 ] === "http:" ? "80" : "443" ) ) !==
						( ajaxLocParts[ 3 ] || ( ajaxLocParts[ 1 ] === "http:" ? "80" : "443" ) ) )
			);
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( state === 2 ) {
			return jqXHR;
		}

		// We can fire global events as of now if asked to
		fireGlobals = s.global;

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger("ajaxStart");
		}

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Save the URL in case we're toying with the If-Modified-Since
		// and/or If-None-Match header later on
		cacheURL = s.url;

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// If data is available, append data to url
			if ( s.data ) {
				cacheURL = ( s.url += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data );
				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Add anti-cache in url if needed
			if ( s.cache === false ) {
				s.url = rts.test( cacheURL ) ?

					// If there is already a '_' parameter, set its value
					cacheURL.replace( rts, "$1_=" + nonce++ ) :

					// Otherwise add one to the end
					cacheURL + ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + nonce++;
			}
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			if ( jQuery.lastModified[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
			}
			if ( jQuery.etag[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[0] ] ?
				s.accepts[ s.dataTypes[0] ] + ( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend && ( s.beforeSend.call( callbackContext, jqXHR, s ) === false || state === 2 ) ) {
			// Abort if not done already and return
			return jqXHR.abort();
		}

		// aborting is no longer a cancellation
		strAbort = "abort";

		// Install callbacks on deferreds
		for ( i in { success: 1, error: 1, complete: 1 } ) {
			jqXHR[ i ]( s[ i ] );
		}

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;

			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}
			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = setTimeout(function() {
					jqXHR.abort("timeout");
				}, s.timeout );
			}

			try {
				state = 1;
				transport.send( requestHeaders, done );
			} catch ( e ) {
				// Propagate exception as error if not done
				if ( state < 2 ) {
					done( -1, e );
				// Simply rethrow otherwise
				} else {
					throw e;
				}
			}
		}

		// Callback for when everything is done
		function done( status, nativeStatusText, responses, headers ) {
			var isSuccess, success, error, response, modified,
				statusText = nativeStatusText;

			// Called once
			if ( state === 2 ) {
				return;
			}

			// State is "done" now
			state = 2;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			// Determine if successful
			isSuccess = status >= 200 && status < 300 || status === 304;

			// Get response data
			if ( responses ) {
				response = ajaxHandleResponses( s, jqXHR, responses );
			}

			// Convert no matter what (that way responseXXX fields are always set)
			response = ajaxConvert( s, response, jqXHR, isSuccess );

			// If successful, handle type chaining
			if ( isSuccess ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {
					modified = jqXHR.getResponseHeader("Last-Modified");
					if ( modified ) {
						jQuery.lastModified[ cacheURL ] = modified;
					}
					modified = jqXHR.getResponseHeader("etag");
					if ( modified ) {
						jQuery.etag[ cacheURL ] = modified;
					}
				}

				// if no content
				if ( status === 204 || s.type === "HEAD" ) {
					statusText = "nocontent";

				// if not modified
				} else if ( status === 304 ) {
					statusText = "notmodified";

				// If we have data, let's convert it
				} else {
					statusText = response.state;
					success = response.data;
					error = response.error;
					isSuccess = !error;
				}
			} else {
				// We extract error from statusText
				// then normalize statusText and status for non-aborts
				error = statusText;
				if ( status || !statusText ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = ( nativeStatusText || statusText ) + "";

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
					[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );
				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger("ajaxStop");
				}
			}
		}

		return jqXHR;
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	}
});

jQuery.each( [ "get", "post" ], function( i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {
		// shift arguments if data argument was omitted
		if ( jQuery.isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		return jQuery.ajax({
			url: url,
			type: method,
			dataType: type,
			data: data,
			success: callback
		});
	};
});

// Attach a bunch of functions for handling common AJAX events
jQuery.each( [ "ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend" ], function( i, type ) {
	jQuery.fn[ type ] = function( fn ) {
		return this.on( type, fn );
	};
});


jQuery._evalUrl = function( url ) {
	return jQuery.ajax({
		url: url,
		type: "GET",
		dataType: "script",
		async: false,
		global: false,
		"throws": true
	});
};


jQuery.fn.extend({
	wrapAll: function( html ) {
		var wrap;

		if ( jQuery.isFunction( html ) ) {
			return this.each(function( i ) {
				jQuery( this ).wrapAll( html.call(this, i) );
			});
		}

		if ( this[ 0 ] ) {

			// The elements to wrap the target around
			wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );

			if ( this[ 0 ].parentNode ) {
				wrap.insertBefore( this[ 0 ] );
			}

			wrap.map(function() {
				var elem = this;

				while ( elem.firstElementChild ) {
					elem = elem.firstElementChild;
				}

				return elem;
			}).append( this );
		}

		return this;
	},

	wrapInner: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each(function( i ) {
				jQuery( this ).wrapInner( html.call(this, i) );
			});
		}

		return this.each(function() {
			var self = jQuery( this ),
				contents = self.contents();

			if ( contents.length ) {
				contents.wrapAll( html );

			} else {
				self.append( html );
			}
		});
	},

	wrap: function( html ) {
		var isFunction = jQuery.isFunction( html );

		return this.each(function( i ) {
			jQuery( this ).wrapAll( isFunction ? html.call(this, i) : html );
		});
	},

	unwrap: function() {
		return this.parent().each(function() {
			if ( !jQuery.nodeName( this, "body" ) ) {
				jQuery( this ).replaceWith( this.childNodes );
			}
		}).end();
	}
});


jQuery.expr.filters.hidden = function( elem ) {
	// Support: Opera <= 12.12
	// Opera reports offsetWidths and offsetHeights less than zero on some elements
	return elem.offsetWidth <= 0 && elem.offsetHeight <= 0;
};
jQuery.expr.filters.visible = function( elem ) {
	return !jQuery.expr.filters.hidden( elem );
};




var r20 = /%20/g,
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	rsubmittable = /^(?:input|select|textarea|keygen)/i;

function buildParams( prefix, obj, traditional, add ) {
	var name;

	if ( jQuery.isArray( obj ) ) {
		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {
				// Treat each array item as a scalar.
				add( prefix, v );

			} else {
				// Item is non-scalar (array or object), encode its numeric index.
				buildParams( prefix + "[" + ( typeof v === "object" ? i : "" ) + "]", v, traditional, add );
			}
		});

	} else if ( !traditional && jQuery.type( obj ) === "object" ) {
		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {
		// Serialize scalar item.
		add( prefix, obj );
	}
}

// Serialize an array of form elements or a set of
// key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, value ) {
			// If value is a function, invoke it and return its value
			value = jQuery.isFunction( value ) ? value() : ( value == null ? "" : value );
			s[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
		};

	// Set traditional to true for jQuery <= 1.3.2 behavior.
	if ( traditional === undefined ) {
		traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;
	}

	// If an array was passed in, assume that it is an array of form elements.
	if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {
		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		});

	} else {
		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" ).replace( r20, "+" );
};

jQuery.fn.extend({
	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},
	serializeArray: function() {
		return this.map(function() {
			// Can add propHook for "elements" to filter or add form elements
			var elements = jQuery.prop( this, "elements" );
			return elements ? jQuery.makeArray( elements ) : this;
		})
		.filter(function() {
			var type = this.type;

			// Use .is( ":disabled" ) so that fieldset[disabled] works
			return this.name && !jQuery( this ).is( ":disabled" ) &&
				rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
				( this.checked || !rcheckableType.test( type ) );
		})
		.map(function( i, elem ) {
			var val = jQuery( this ).val();

			return val == null ?
				null :
				jQuery.isArray( val ) ?
					jQuery.map( val, function( val ) {
						return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
					}) :
					{ name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		}).get();
	}
});


jQuery.ajaxSettings.xhr = function() {
	try {
		return new XMLHttpRequest();
	} catch( e ) {}
};

var xhrId = 0,
	xhrCallbacks = {},
	xhrSuccessStatus = {
		// file protocol always yields status code 0, assume 200
		0: 200,
		// Support: IE9
		// #1450: sometimes IE returns 1223 when it should be 204
		1223: 204
	},
	xhrSupported = jQuery.ajaxSettings.xhr();

// Support: IE9
// Open requests must be manually aborted on unload (#5280)
if ( window.ActiveXObject ) {
	jQuery( window ).on( "unload", function() {
		for ( var key in xhrCallbacks ) {
			xhrCallbacks[ key ]();
		}
	});
}

support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
support.ajax = xhrSupported = !!xhrSupported;

jQuery.ajaxTransport(function( options ) {
	var callback;

	// Cross domain only allowed if supported through XMLHttpRequest
	if ( support.cors || xhrSupported && !options.crossDomain ) {
		return {
			send: function( headers, complete ) {
				var i,
					xhr = options.xhr(),
					id = ++xhrId;

				xhr.open( options.type, options.url, options.async, options.username, options.password );

				// Apply custom fields if provided
				if ( options.xhrFields ) {
					for ( i in options.xhrFields ) {
						xhr[ i ] = options.xhrFields[ i ];
					}
				}

				// Override mime type if needed
				if ( options.mimeType && xhr.overrideMimeType ) {
					xhr.overrideMimeType( options.mimeType );
				}

				// X-Requested-With header
				// For cross-domain requests, seeing as conditions for a preflight are
				// akin to a jigsaw puzzle, we simply never set it to be sure.
				// (it can always be set on a per-request basis or even using ajaxSetup)
				// For same-domain requests, won't change header if already provided.
				if ( !options.crossDomain && !headers["X-Requested-With"] ) {
					headers["X-Requested-With"] = "XMLHttpRequest";
				}

				// Set headers
				for ( i in headers ) {
					xhr.setRequestHeader( i, headers[ i ] );
				}

				// Callback
				callback = function( type ) {
					return function() {
						if ( callback ) {
							delete xhrCallbacks[ id ];
							callback = xhr.onload = xhr.onerror = null;

							if ( type === "abort" ) {
								xhr.abort();
							} else if ( type === "error" ) {
								complete(
									// file: protocol always yields status 0; see #8605, #14207
									xhr.status,
									xhr.statusText
								);
							} else {
								complete(
									xhrSuccessStatus[ xhr.status ] || xhr.status,
									xhr.statusText,
									// Support: IE9
									// Accessing binary-data responseText throws an exception
									// (#11426)
									typeof xhr.responseText === "string" ? {
										text: xhr.responseText
									} : undefined,
									xhr.getAllResponseHeaders()
								);
							}
						}
					};
				};

				// Listen to events
				xhr.onload = callback();
				xhr.onerror = callback("error");

				// Create the abort callback
				callback = xhrCallbacks[ id ] = callback("abort");

				try {
					// Do send the request (this may raise an exception)
					xhr.send( options.hasContent && options.data || null );
				} catch ( e ) {
					// #14683: Only rethrow if this hasn't been notified as an error yet
					if ( callback ) {
						throw e;
					}
				}
			},

			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
});




// Install script dataType
jQuery.ajaxSetup({
	accepts: {
		script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /(?:java|ecma)script/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
});

// Handle cache's special case and crossDomain
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
	}
});

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function( s ) {
	// This transport only deals with cross domain requests
	if ( s.crossDomain ) {
		var script, callback;
		return {
			send: function( _, complete ) {
				script = jQuery("<script>").prop({
					async: true,
					charset: s.scriptCharset,
					src: s.url
				}).on(
					"load error",
					callback = function( evt ) {
						script.remove();
						callback = null;
						if ( evt ) {
							complete( evt.type === "error" ? 404 : 200, evt.type );
						}
					}
				);
				document.head.appendChild( script[ 0 ] );
			},
			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
});




var oldCallbacks = [],
	rjsonp = /(=)\?(?=&|$)|\?\?/;

// Default jsonp settings
jQuery.ajaxSetup({
	jsonp: "callback",
	jsonpCallback: function() {
		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce++ ) );
		this[ callback ] = true;
		return callback;
	}
});

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var callbackName, overwritten, responseContainer,
		jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
			"url" :
			typeof s.data === "string" && !( s.contentType || "" ).indexOf("application/x-www-form-urlencoded") && rjsonp.test( s.data ) && "data"
		);

	// Handle iff the expected data type is "jsonp" or we have a parameter to set
	if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

		// Get callback name, remembering preexisting value associated with it
		callbackName = s.jsonpCallback = jQuery.isFunction( s.jsonpCallback ) ?
			s.jsonpCallback() :
			s.jsonpCallback;

		// Insert callback into url or form data
		if ( jsonProp ) {
			s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
		} else if ( s.jsonp !== false ) {
			s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
		}

		// Use data converter to retrieve json after script execution
		s.converters["script json"] = function() {
			if ( !responseContainer ) {
				jQuery.error( callbackName + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// force json dataType
		s.dataTypes[ 0 ] = "json";

		// Install callback
		overwritten = window[ callbackName ];
		window[ callbackName ] = function() {
			responseContainer = arguments;
		};

		// Clean-up function (fires after converters)
		jqXHR.always(function() {
			// Restore preexisting value
			window[ callbackName ] = overwritten;

			// Save back as free
			if ( s[ callbackName ] ) {
				// make sure that re-using the options doesn't screw things around
				s.jsonpCallback = originalSettings.jsonpCallback;

				// save the callback name for future use
				oldCallbacks.push( callbackName );
			}

			// Call if it was a function and we have a response
			if ( responseContainer && jQuery.isFunction( overwritten ) ) {
				overwritten( responseContainer[ 0 ] );
			}

			responseContainer = overwritten = undefined;
		});

		// Delegate to script
		return "script";
	}
});




// data: string of html
// context (optional): If specified, the fragment will be created in this context, defaults to document
// keepScripts (optional): If true, will include scripts passed in the html string
jQuery.parseHTML = function( data, context, keepScripts ) {
	if ( !data || typeof data !== "string" ) {
		return null;
	}
	if ( typeof context === "boolean" ) {
		keepScripts = context;
		context = false;
	}
	context = context || document;

	var parsed = rsingleTag.exec( data ),
		scripts = !keepScripts && [];

	// Single tag
	if ( parsed ) {
		return [ context.createElement( parsed[1] ) ];
	}

	parsed = jQuery.buildFragment( [ data ], context, scripts );

	if ( scripts && scripts.length ) {
		jQuery( scripts ).remove();
	}

	return jQuery.merge( [], parsed.childNodes );
};


// Keep a copy of the old load method
var _load = jQuery.fn.load;

/**
 * Load a url into a page
 */
jQuery.fn.load = function( url, params, callback ) {
	if ( typeof url !== "string" && _load ) {
		return _load.apply( this, arguments );
	}

	var selector, type, response,
		self = this,
		off = url.indexOf(" ");

	if ( off >= 0 ) {
		selector = jQuery.trim( url.slice( off ) );
		url = url.slice( 0, off );
	}

	// If it's a function
	if ( jQuery.isFunction( params ) ) {

		// We assume that it's the callback
		callback = params;
		params = undefined;

	// Otherwise, build a param string
	} else if ( params && typeof params === "object" ) {
		type = "POST";
	}

	// If we have elements to modify, make the request
	if ( self.length > 0 ) {
		jQuery.ajax({
			url: url,

			// if "type" variable is undefined, then "GET" method will be used
			type: type,
			dataType: "html",
			data: params
		}).done(function( responseText ) {

			// Save response for use in complete callback
			response = arguments;

			self.html( selector ?

				// If a selector was specified, locate the right elements in a dummy div
				// Exclude scripts to avoid IE 'Permission Denied' errors
				jQuery("<div>").append( jQuery.parseHTML( responseText ) ).find( selector ) :

				// Otherwise use the full result
				responseText );

		}).complete( callback && function( jqXHR, status ) {
			self.each( callback, response || [ jqXHR.responseText, status, jqXHR ] );
		});
	}

	return this;
};




jQuery.expr.filters.animated = function( elem ) {
	return jQuery.grep(jQuery.timers, function( fn ) {
		return elem === fn.elem;
	}).length;
};




var docElem = window.document.documentElement;

/**
 * Gets a window from an element
 */
function getWindow( elem ) {
	return jQuery.isWindow( elem ) ? elem : elem.nodeType === 9 && elem.defaultView;
}

jQuery.offset = {
	setOffset: function( elem, options, i ) {
		var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition,
			position = jQuery.css( elem, "position" ),
			curElem = jQuery( elem ),
			props = {};

		// Set position first, in-case top/left are set even on static elem
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		curOffset = curElem.offset();
		curCSSTop = jQuery.css( elem, "top" );
		curCSSLeft = jQuery.css( elem, "left" );
		calculatePosition = ( position === "absolute" || position === "fixed" ) &&
			( curCSSTop + curCSSLeft ).indexOf("auto") > -1;

		// Need to be able to calculate position if either top or left is auto and position is either absolute or fixed
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;

		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( jQuery.isFunction( options ) ) {
			options = options.call( elem, i, curOffset );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );

		} else {
			curElem.css( props );
		}
	}
};

jQuery.fn.extend({
	offset: function( options ) {
		if ( arguments.length ) {
			return options === undefined ?
				this :
				this.each(function( i ) {
					jQuery.offset.setOffset( this, options, i );
				});
		}

		var docElem, win,
			elem = this[ 0 ],
			box = { top: 0, left: 0 },
			doc = elem && elem.ownerDocument;

		if ( !doc ) {
			return;
		}

		docElem = doc.documentElement;

		// Make sure it's not a disconnected DOM node
		if ( !jQuery.contains( docElem, elem ) ) {
			return box;
		}

		// If we don't have gBCR, just use 0,0 rather than error
		// BlackBerry 5, iOS 3 (original iPhone)
		if ( typeof elem.getBoundingClientRect !== strundefined ) {
			box = elem.getBoundingClientRect();
		}
		win = getWindow( doc );
		return {
			top: box.top + win.pageYOffset - docElem.clientTop,
			left: box.left + win.pageXOffset - docElem.clientLeft
		};
	},

	position: function() {
		if ( !this[ 0 ] ) {
			return;
		}

		var offsetParent, offset,
			elem = this[ 0 ],
			parentOffset = { top: 0, left: 0 };

		// Fixed elements are offset from window (parentOffset = {top:0, left: 0}, because it is its only offset parent
		if ( jQuery.css( elem, "position" ) === "fixed" ) {
			// We assume that getBoundingClientRect is available when computed position is fixed
			offset = elem.getBoundingClientRect();

		} else {
			// Get *real* offsetParent
			offsetParent = this.offsetParent();

			// Get correct offsets
			offset = this.offset();
			if ( !jQuery.nodeName( offsetParent[ 0 ], "html" ) ) {
				parentOffset = offsetParent.offset();
			}

			// Add offsetParent borders
			parentOffset.top += jQuery.css( offsetParent[ 0 ], "borderTopWidth", true );
			parentOffset.left += jQuery.css( offsetParent[ 0 ], "borderLeftWidth", true );
		}

		// Subtract parent offsets and element margins
		return {
			top: offset.top - parentOffset.top - jQuery.css( elem, "marginTop", true ),
			left: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true )
		};
	},

	offsetParent: function() {
		return this.map(function() {
			var offsetParent = this.offsetParent || docElem;

			while ( offsetParent && ( !jQuery.nodeName( offsetParent, "html" ) && jQuery.css( offsetParent, "position" ) === "static" ) ) {
				offsetParent = offsetParent.offsetParent;
			}

			return offsetParent || docElem;
		});
	}
});

// Create scrollLeft and scrollTop methods
jQuery.each( { scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function( method, prop ) {
	var top = "pageYOffset" === prop;

	jQuery.fn[ method ] = function( val ) {
		return access( this, function( elem, method, val ) {
			var win = getWindow( elem );

			if ( val === undefined ) {
				return win ? win[ prop ] : elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : window.pageXOffset,
					top ? val : window.pageYOffset
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length, null );
	};
});

// Add the top/left cssHooks using jQuery.fn.position
// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
// getComputedStyle returns percent when specified for top/left/bottom/right
// rather than make the css module depend on the offset module, we just check for it here
jQuery.each( [ "top", "left" ], function( i, prop ) {
	jQuery.cssHooks[ prop ] = addGetHookIf( support.pixelPosition,
		function( elem, computed ) {
			if ( computed ) {
				computed = curCSS( elem, prop );
				// if curCSS returns percentage, fallback to offset
				return rnumnonpx.test( computed ) ?
					jQuery( elem ).position()[ prop ] + "px" :
					computed;
			}
		}
	);
});


// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
	jQuery.each( { padding: "inner" + name, content: type, "": "outer" + name }, function( defaultExtra, funcName ) {
		// margin is only for outerHeight, outerWidth
		jQuery.fn[ funcName ] = function( margin, value ) {
			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

			return access( this, function( elem, type, value ) {
				var doc;

				if ( jQuery.isWindow( elem ) ) {
					// As of 5/8/2012 this will yield incorrect results for Mobile Safari, but there
					// isn't a whole lot we can do. See pull request at this URL for discussion:
					// https://github.com/jquery/jquery/pull/764
					return elem.document.documentElement[ "client" + name ];
				}

				// Get document width or height
				if ( elem.nodeType === 9 ) {
					doc = elem.documentElement;

					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
					// whichever is greatest
					return Math.max(
						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
						elem.body[ "offset" + name ], doc[ "offset" + name ],
						doc[ "client" + name ]
					);
				}

				return value === undefined ?
					// Get width or height on the element, requesting but not forcing parseFloat
					jQuery.css( elem, type, extra ) :

					// Set width or height on the element
					jQuery.style( elem, type, value, extra );
			}, type, chainable ? margin : undefined, chainable, null );
		};
	});
});


// The number of elements contained in the matched element set
jQuery.fn.size = function() {
	return this.length;
};

jQuery.fn.andSelf = jQuery.fn.addBack;




// Register as a named AMD module, since jQuery can be concatenated with other
// files that may use define, but not via a proper concatenation script that
// understands anonymous AMD modules. A named AMD is safest and most robust
// way to register. Lowercase jquery is used because AMD module names are
// derived from file names, and jQuery is normally delivered in a lowercase
// file name. Do this after creating the global so that if an AMD module wants
// to call noConflict to hide this version of jQuery, it will work.

// Note that for maximum portability, libraries that are not jQuery should
// declare themselves as anonymous modules, and avoid setting a global if an
// AMD loader is present. jQuery is a special case. For more information, see
// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon

if ( typeof define === "function" && define.amd ) {
	define( "jquery", [], function() {
		return jQuery;
	});
}




var
	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$;

jQuery.noConflict = function( deep ) {
	if ( window.$ === jQuery ) {
		window.$ = _$;
	}

	if ( deep && window.jQuery === jQuery ) {
		window.jQuery = _jQuery;
	}

	return jQuery;
};

// Expose jQuery and $ identifiers, even in
// AMD (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
// and CommonJS for browser emulators (#13566)
if ( typeof noGlobal === strundefined ) {
	window.jQuery = window.$ = jQuery;
}




return jQuery;

}));

//     Backbone.js 1.1.2

//     (c) 2010-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(root, factory) {

  // Set up Backbone appropriately for the environment. Start with AMD.
  if (typeof define === 'function' && define.amd) {
    define(['underscore', 'jquery', 'exports'], function(_, $, exports) {
      // Export global even in AMD case in case this script is loaded with
      // others that may still expect a global Backbone.
      root.Backbone = factory(root, exports, _, $);
    });

  // Next for Node.js or CommonJS. jQuery may not be needed as a module.
  } else if (typeof exports !== 'undefined') {
    var _ = require('underscore');
    factory(root, exports, _);

  // Finally, as a browser global.
  } else {
    root.Backbone = factory(root, {}, root._, (root.jQuery || root.Zepto || root.ender || root.$));
  }

}(this, function(root, Backbone, _, $) {

  // Initial Setup
  // -------------

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create local references to array methods we'll want to use later.
  var array = [];
  var push = array.push;
  var slice = array.slice;
  var splice = array.splice;

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '1.1.2';

  // For Backbone's purposes, jQuery, Zepto, Ender, or My Library (kidding) owns
  // the `$` variable.
  Backbone.$ = $;

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PATCH"`, `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function(name, callback, context) {
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
      this._events || (this._events = {});
      var events = this._events[name] || (this._events[name] = []);
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
      var self = this;
      var once = _.once(function() {
        self.off(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      return this.on(name, once, context);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context) {
      var retain, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      if (!name && !callback && !context) {
        this._events = void 0;
        return this;
      }
      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (events = this._events[name]) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) delete this._events[name];
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(obj, name, callback) {
      var listeningTo = this._listeningTo;
      if (!listeningTo) return this;
      var remove = !name && !callback;
      if (!callback && typeof name === 'object') callback = this;
      if (obj) (listeningTo = {})[obj._listenId] = obj;
      for (var id in listeningTo) {
        obj = listeningTo[id];
        obj.off(name, callback, this);
        if (remove || _.isEmpty(obj._events)) delete this._listeningTo[id];
      }
      return this;
    }

  };

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;

    // Handle event maps.
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args); return;
    }
  };

  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  _.each(listenMethods, function(implementation, method) {
    Events[method] = function(obj, name, callback) {
      var listeningTo = this._listeningTo || (this._listeningTo = {});
      var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
      listeningTo[id] = obj;
      if (!callback && typeof name === 'object') callback = this;
      obj[implementation](name, callback, this);
      return this;
    };
  });

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Allow the `Backbone` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  _.extend(Backbone, Events);

  // Backbone.Model
  // --------------

  // Backbone **Models** are the basic data object in the framework --
  // frequently representing a row in a table in a database on your server.
  // A discrete chunk of data and a bunch of useful, related methods for
  // performing computations and transformations on that data.

  // Create a new model with the specified attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var attrs = attributes || {};
    options || (options = {});
    this.cid = _.uniqueId('c');
    this.attributes = {};
    if (options.collection) this.collection = options.collection;
    if (options.parse) attrs = this.parse(attrs, options) || {};
    attrs = _.defaults({}, attrs, _.result(this, 'defaults'));
    this.set(attrs, options);
    this.changed = {};
    this.initialize.apply(this, arguments);
  };

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // The value returned during the last failed validation.
    validationError: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Proxy `Backbone.sync` by default -- but override this if you need
    // custom syncing semantics for *this* particular model.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      return _.escape(this.get(attr));
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"`. This is
    // the core primitive operation of a model, updating the data and notifying
    // anyone who needs to know about the change in state. The heart of the beast.
    set: function(key, val, options) {
      var attr, attrs, unset, changes, silent, changing, prev, current;
      if (key == null) return this;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options || (options = {});

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Extract attributes and options.
      unset           = options.unset;
      silent          = options.silent;
      changes         = [];
      changing        = this._changing;
      this._changing  = true;

      if (!changing) {
        this._previousAttributes = _.clone(this.attributes);
        this.changed = {};
      }
      current = this.attributes, prev = this._previousAttributes;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      // For each `set` attribute, update or delete the current value.
      for (attr in attrs) {
        val = attrs[attr];
        if (!_.isEqual(current[attr], val)) changes.push(attr);
        if (!_.isEqual(prev[attr], val)) {
          this.changed[attr] = val;
        } else {
          delete this.changed[attr];
        }
        unset ? delete current[attr] : current[attr] = val;
      }

      // Trigger all relevant attribute changes.
      if (!silent) {
        if (changes.length) this._pending = options;
        for (var i = 0, l = changes.length; i < l; i++) {
          this.trigger('change:' + changes[i], this, current[changes[i]], options);
        }
      }

      // You might be wondering why there's a `while` loop here. Changes can
      // be recursively nested within `"change"` events.
      if (changing) return this;
      if (!silent) {
        while (this._pending) {
          options = this._pending;
          this._pending = false;
          this.trigger('change', this, options);
        }
      }
      this._pending = false;
      this._changing = false;
      return this;
    },

    // Remove an attribute from the model, firing `"change"`. `unset` is a noop
    // if the attribute doesn't exist.
    unset: function(attr, options) {
      return this.set(attr, void 0, _.extend({}, options, {unset: true}));
    },

    // Clear all attributes on the model, firing `"change"`.
    clear: function(options) {
      var attrs = {};
      for (var key in this.attributes) attrs[key] = void 0;
      return this.set(attrs, _.extend({}, options, {unset: true}));
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (attr == null) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false;
      var old = this._changing ? this._previousAttributes : this.attributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (attr == null || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overridden,
    // triggering a `"change"` event.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        if (!model.set(model.parse(resp, options), options)) return false;
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, val, options) {
      var attrs, method, xhr, attributes = this.attributes;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (key == null || typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options = _.extend({validate: true}, options);

      // If we're not waiting and attributes exist, save acts as
      // `set(attr).save(null, opts)` with validation. Otherwise, check if
      // the model will be valid when the attributes, if any, are set.
      if (attrs && !options.wait) {
        if (!this.set(attrs, options)) return false;
      } else {
        if (!this._validate(attrs, options)) return false;
      }

      // Set temporary attributes if `{wait: true}`.
      if (attrs && options.wait) {
        this.attributes = _.extend({}, attributes, attrs);
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        // Ensure attributes are restored during synchronous saves.
        model.attributes = attributes;
        var serverAttrs = model.parse(resp, options);
        if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
        if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
          return false;
        }
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);

      method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method === 'patch') options.attrs = attrs;
      xhr = this.sync(method, this, options);

      // Restore attributes.
      if (attrs && options.wait) this.attributes = attributes;

      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var destroy = function() {
        model.trigger('destroy', model, model.collection, options);
      };

      options.success = function(resp) {
        if (options.wait || model.isNew()) destroy();
        if (success) success(model, resp, options);
        if (!model.isNew()) model.trigger('sync', model, resp, options);
      };

      if (this.isNew()) {
        options.success();
        return false;
      }
      wrapError(this, options);

      var xhr = this.sync('delete', this, options);
      if (!options.wait) destroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base =
        _.result(this, 'urlRoot') ||
        _.result(this.collection, 'url') ||
        urlError();
      if (this.isNew()) return base;
      return base.replace(/([^\/])$/, '$1/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function() {
      return !this.has(this.idAttribute);
    },

    // Check if the model is currently in a valid state.
    isValid: function(options) {
      return this._validate({}, _.extend(options || {}, { validate: true }));
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
    _validate: function(attrs, options) {
      if (!options.validate || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validationError = this.validate(attrs, options) || null;
      if (!error) return true;
      this.trigger('invalid', this, error, _.extend(options, {validationError: error}));
      return false;
    }

  });

  // Underscore methods that we want to implement on the Model.
  var modelMethods = ['keys', 'values', 'pairs', 'invert', 'pick', 'omit'];

  // Mix in each Underscore method as a proxy to `Model#attributes`.
  _.each(modelMethods, function(method) {
    Model.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.attributes);
      return _[method].apply(_, args);
    };
  });

  // Backbone.Collection
  // -------------------

  // If models tend to represent a single row of data, a Backbone Collection is
  // more analagous to a table full of data ... or a small slice or page of that
  // table, or a collection of rows that belong together for a particular reason
  // -- all of the messages in this particular folder, all of the documents
  // belonging to this particular author, and so on. Collections maintain
  // indexes of their models, both in order, and for lookup by `id`.

  // Create a new **Collection**, perhaps to contain a specific type of `model`.
  // If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.model) this.model = options.model;
    if (options.comparator !== void 0) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, _.extend({silent: true}, options));
  };

  // Default options for `Collection#set`.
  var setOptions = {add: true, remove: true, merge: true};
  var addOptions = {add: true, remove: false};

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model){ return model.toJSON(options); });
    },

    // Proxy `Backbone.sync` by default.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Add a model, or list of models to the set.
    add: function(models, options) {
      return this.set(models, _.extend({merge: false}, options, addOptions));
    },

    // Remove a model, or a list of models from the set.
    remove: function(models, options) {
      var singular = !_.isArray(models);
      models = singular ? [models] : _.clone(models);
      options || (options = {});
      var i, l, index, model;
      for (i = 0, l = models.length; i < l; i++) {
        model = models[i] = this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byId[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model, options);
      }
      return singular ? models[0] : models;
    },

    // Update a collection by `set`-ing a new list of models, adding new ones,
    // removing models that are no longer present, and merging models that
    // already exist in the collection, as necessary. Similar to **Model#set**,
    // the core operation for updating the data contained by the collection.
    set: function(models, options) {
      options = _.defaults({}, options, setOptions);
      if (options.parse) models = this.parse(models, options);
      var singular = !_.isArray(models);
      models = singular ? (models ? [models] : []) : _.clone(models);
      var i, l, id, model, attrs, existing, sort;
      var at = options.at;
      var targetModel = this.model;
      var sortable = this.comparator && (at == null) && options.sort !== false;
      var sortAttr = _.isString(this.comparator) ? this.comparator : null;
      var toAdd = [], toRemove = [], modelMap = {};
      var add = options.add, merge = options.merge, remove = options.remove;
      var order = !sortable && add && remove ? [] : false;

      // Turn bare objects into model references, and prevent invalid models
      // from being added.
      for (i = 0, l = models.length; i < l; i++) {
        attrs = models[i] || {};
        if (attrs instanceof Model) {
          id = model = attrs;
        } else {
          id = attrs[targetModel.prototype.idAttribute || 'id'];
        }

        // If a duplicate is found, prevent it from being added and
        // optionally merge it into the existing model.
        if (existing = this.get(id)) {
          if (remove) modelMap[existing.cid] = true;
          if (merge) {
            attrs = attrs === model ? model.attributes : attrs;
            if (options.parse) attrs = existing.parse(attrs, options);
            existing.set(attrs, options);
            if (sortable && !sort && existing.hasChanged(sortAttr)) sort = true;
          }
          models[i] = existing;

        // If this is a new, valid model, push it to the `toAdd` list.
        } else if (add) {
          model = models[i] = this._prepareModel(attrs, options);
          if (!model) continue;
          toAdd.push(model);
          this._addReference(model, options);
        }

        // Do not add multiple models with the same `id`.
        model = existing || model;
        if (order && (model.isNew() || !modelMap[model.id])) order.push(model);
        modelMap[model.id] = true;
      }

      // Remove nonexistent models if appropriate.
      if (remove) {
        for (i = 0, l = this.length; i < l; ++i) {
          if (!modelMap[(model = this.models[i]).cid]) toRemove.push(model);
        }
        if (toRemove.length) this.remove(toRemove, options);
      }

      // See if sorting is needed, update `length` and splice in new models.
      if (toAdd.length || (order && order.length)) {
        if (sortable) sort = true;
        this.length += toAdd.length;
        if (at != null) {
          for (i = 0, l = toAdd.length; i < l; i++) {
            this.models.splice(at + i, 0, toAdd[i]);
          }
        } else {
          if (order) this.models.length = 0;
          var orderedModels = order || toAdd;
          for (i = 0, l = orderedModels.length; i < l; i++) {
            this.models.push(orderedModels[i]);
          }
        }
      }

      // Silently sort the collection if appropriate.
      if (sort) this.sort({silent: true});

      // Unless silenced, it's time to fire all appropriate add/sort events.
      if (!options.silent) {
        for (i = 0, l = toAdd.length; i < l; i++) {
          (model = toAdd[i]).trigger('add', model, this, options);
        }
        if (sort || (order && order.length)) this.trigger('sort', this, options);
      }

      // Return the added (or merged) model (or models).
      return singular ? models[0] : models;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any granular `add` or `remove` events. Fires `reset` when finished.
    // Useful for bulk operations and optimizations.
    reset: function(models, options) {
      options || (options = {});
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i], options);
      }
      options.previousModels = this.models;
      this._reset();
      models = this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return models;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      return this.add(model, _.extend({at: this.length}, options));
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      return this.add(model, _.extend({at: 0}, options));
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Slice out a sub-array of models from the collection.
    slice: function() {
      return slice.apply(this.models, arguments);
    },

    // Get a model from the set by id.
    get: function(obj) {
      if (obj == null) return void 0;
      return this._byId[obj] || this._byId[obj.id] || this._byId[obj.cid];
    },

    // Get the model at the given index.
    at: function(index) {
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of
    // `filter`.
    where: function(attrs, first) {
      if (_.isEmpty(attrs)) return first ? void 0 : [];
      return this[first ? 'find' : 'filter'](function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Return the first model with matching attributes. Useful for simple cases
    // of `find`.
    findWhere: function(attrs) {
      return this.where(attrs, true);
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
      options || (options = {});

      // Run sort based on type of `comparator`.
      if (_.isString(this.comparator) || this.comparator.length === 1) {
        this.models = this.sortBy(this.comparator, this);
      } else {
        this.models.sort(_.bind(this.comparator, this));
      }

      if (!options.silent) this.trigger('sort', this, options);
      return this;
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.invoke(this.models, 'get', attr);
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `reset: true` is passed, the response
    // data will be passed through the `reset` method instead of `set`.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var success = options.success;
      var collection = this;
      options.success = function(resp) {
        var method = options.reset ? 'reset' : 'set';
        collection[method](resp, options);
        if (success) success(collection, resp, options);
        collection.trigger('sync', collection, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      options = options ? _.clone(options) : {};
      if (!(model = this._prepareModel(model, options))) return false;
      if (!options.wait) this.add(model, options);
      var collection = this;
      var success = options.success;
      options.success = function(model, resp) {
        if (options.wait) collection.add(model, options);
        if (success) success(model, resp, options);
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new collection with an identical list of models as this one.
    clone: function() {
      return new this.constructor(this.models);
    },

    // Private method to reset all internal state. Called when the collection
    // is first initialized or reset.
    _reset: function() {
      this.length = 0;
      this.models = [];
      this._byId  = {};
    },

    // Prepare a hash of attributes (or other model) to be added to this
    // collection.
    _prepareModel: function(attrs, options) {
      if (attrs instanceof Model) return attrs;
      options = options ? _.clone(options) : {};
      options.collection = this;
      var model = new this.model(attrs, options);
      if (!model.validationError) return model;
      this.trigger('invalid', this, model.validationError, options);
      return false;
    },

    // Internal method to create a model's ties to a collection.
    _addReference: function(model, options) {
      this._byId[model.cid] = model;
      if (model.id != null) this._byId[model.id] = model;
      if (!model.collection) model.collection = this;
      model.on('all', this._onModelEvent, this);
    },

    // Internal method to sever a model's ties to a collection.
    _removeReference: function(model, options) {
      if (this === model.collection) delete model.collection;
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if ((event === 'add' || event === 'remove') && collection !== this) return;
      if (event === 'destroy') this.remove(model, options);
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        if (model.id != null) this._byId[model.id] = model;
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  // 90% of the core usefulness of Backbone Collections is actually implemented
  // right here:
  var methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
    'tail', 'drop', 'last', 'without', 'difference', 'indexOf', 'shuffle',
    'lastIndexOf', 'isEmpty', 'chain', 'sample'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    Collection.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.models);
      return _[method].apply(_, args);
    };
  });

  // Underscore methods that take a property name as an argument.
  var attributeMethods = ['groupBy', 'countBy', 'sortBy', 'indexBy'];

  // Use attributes instead of properties.
  _.each(attributeMethods, function(method) {
    Collection.prototype[method] = function(value, context) {
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _[method](this.models, iterator, context);
    };
  });

  // Backbone.View
  // -------------

  // Backbone Views are almost more convention than they are actual code. A View
  // is simply a JavaScript object that represents a logical chunk of UI in the
  // DOM. This might be a single item, an entire list, a sidebar or panel, or
  // even the surrounding frame which wraps your whole app. Defining a chunk of
  // UI as a **View** allows you to define your DOM events declaratively, without
  // having to worry about render order ... and makes it easy for the view to
  // react to specific changes in the state of your models.

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    options || (options = {});
    _.extend(this, _.pick(options, viewOptions));
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be merged as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be preferred to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable Backbone.Events listeners.
    remove: function() {
      this.$el.remove();
      this.stopListening();
      return this;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = element instanceof Backbone.$ ? element : Backbone.$(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save',
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function(events) {
      if (!(events || (events = _.result(this, 'events')))) return this;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) continue;

        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateEvents' + this.cid;
        if (selector === '') {
          this.$el.on(eventName, method);
        } else {
          this.$el.on(eventName, selector, method);
        }
      }
      return this;
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      this.$el.off('.delegateEvents' + this.cid);
      return this;
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = _.extend({}, _.result(this, 'attributes'));
        if (this.id) attrs.id = _.result(this, 'id');
        if (this.className) attrs['class'] = _.result(this, 'className');
        var $el = Backbone.$('<' + _.result(this, 'tagName') + '>').attr(attrs);
        this.setElement($el, false);
      } else {
        this.setElement(_.result(this, 'el'), false);
      }
    }

  });

  // Backbone.sync
  // -------------

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    _.defaults(options || (options = {}), {
      emulateHTTP: Backbone.emulateHTTP,
      emulateJSON: Backbone.emulateJSON
    });

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
      params.type = 'POST';
      if (options.emulateJSON) params.data._method = type;
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    // If we're sending a `PATCH` request, and we're in an old Internet Explorer
    // that still has ActiveX enabled by default, override jQuery to use that
    // for XHR instead. Remove this line when jQuery supports `PATCH` on IE8.
    if (params.type === 'PATCH' && noXhrPatch) {
      params.xhr = function() {
        return new ActiveXObject("Microsoft.XMLHTTP");
      };
    }

    // Make the request, allowing the user to override any Ajax options.
    var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
    model.trigger('request', model, xhr, options);
    return xhr;
  };

  var noXhrPatch =
    typeof window !== 'undefined' && !!window.ActiveXObject &&
      !(window.XMLHttpRequest && (new XMLHttpRequest).dispatchEvent);

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch':  'PATCH',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Set the default implementation of `Backbone.ajax` to proxy through to `$`.
  // Override this if you'd like to use a different library.
  Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
  };

  // Backbone.Router
  // ---------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /(\(\?)?:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (_.isFunction(name)) {
        callback = name;
        name = '';
      }
      if (!callback) callback = this[name];
      var router = this;
      Backbone.history.route(route, function(fragment) {
        var args = router._extractParameters(route, fragment);
        router.execute(callback, args);
        router.trigger.apply(router, ['route:' + name].concat(args));
        router.trigger('route', name, args);
        Backbone.history.trigger('route', router, name, args);
      });
      return this;
    },

    // Execute a route handler with the provided parameters.  This is an
    // excellent place to do pre-route setup or post-route cleanup.
    execute: function(callback, args) {
      if (callback) callback.apply(this, args);
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      this.routes = _.result(this, 'routes');
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, function(match, optional) {
                     return optional ? match : '([^/?]+)';
                   })
                   .replace(splatParam, '([^?]*?)');
      return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted decoded parameters. Empty or unmatched parameters will be
    // treated as `null` to normalize cross-browser behavior.
    _extractParameters: function(route, fragment) {
      var params = route.exec(fragment).slice(1);
      return _.map(params, function(param, i) {
        // Don't decode the search params.
        if (i === params.length - 1) return param || null;
        return param ? decodeURIComponent(param) : null;
      });
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on either
  // [pushState](http://diveintohtml5.info/history.html) and real URLs, or
  // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
  // and URL fragments. If the browser supports neither (old IE, natch),
  // falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');

    // Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  };

  // Cached regex for stripping a leading hash/slash and trailing space.
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Cached regex for removing a trailing slash.
  var trailingSlash = /\/$/;

  // Cached regex for stripping urls of hash.
  var pathStripper = /#.*$/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Are we at the app root?
    atRoot: function() {
      return this.location.pathname.replace(/[^\/]$/, '$&/') === this.root;
    },

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || !this._wantsHashChange || forcePushState) {
          fragment = decodeURI(this.location.pathname + this.location.search);
          var root = this.root.replace(trailingSlash, '');
          if (!fragment.indexOf(root)) fragment = fragment.slice(root.length);
        } else {
          fragment = this.getHash();
        }
      }
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({root: '/'}, this.options, options);
      this.root             = this.options.root;
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && this.history && this.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

      // Normalize root to always include a leading and trailing slash.
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      if (oldIE && this._wantsHashChange) {
        var frame = Backbone.$('<iframe src="javascript:0" tabindex="-1">');
        this.iframe = frame.hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        Backbone.$(window).on('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        Backbone.$(window).on('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      var loc = this.location;

      // Transition from hashChange to pushState or vice versa if both are
      // requested.
      if (this._wantsHashChange && this._wantsPushState) {

        // If we've started off with a route from a `pushState`-enabled
        // browser, but we're currently in a browser that doesn't support it...
        if (!this._hasPushState && !this.atRoot()) {
          this.fragment = this.getFragment(null, true);
          this.location.replace(this.root + '#' + this.fragment);
          // Return immediately as browser will do redirect to new url
          return true;

        // Or if we've started out with a hash-based route, but we're currently
        // in a browser where it could be `pushState`-based instead...
        } else if (this._hasPushState && this.atRoot() && loc.hash) {
          this.fragment = this.getHash().replace(routeStripper, '');
          this.history.replaceState({}, document.title, this.root + this.fragment);
        }

      }

      if (!this.options.silent) return this.loadUrl();
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      Backbone.$(window).off('popstate', this.checkUrl).off('hashchange', this.checkUrl);
      if (this._checkUrlInterval) clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current === this.fragment && this.iframe) {
        current = this.getFragment(this.getHash(this.iframe));
      }
      if (current === this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl();
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragment) {
      fragment = this.fragment = this.getFragment(fragment);
      return _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: !!options};

      var url = this.root + (fragment = this.getFragment(fragment || ''));

      // Strip the hash for matching.
      fragment = fragment.replace(pathStripper, '');

      if (this.fragment === fragment) return;
      this.fragment = fragment;

      // Don't include a trailing slash on the root.
      if (fragment === '' && url !== '/') url = url.slice(0, -1);

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a
          // history entry on hash-tag change.  When replace is true, we don't
          // want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, fragment, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        return this.location.assign(url);
      }
      if (options.trigger) return this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // Create the default Backbone.history.
  Backbone.history = new History;

  // Helpers
  // -------

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Set up inheritance for the model, collection, router, view and history.
  Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

  // Wrap an optional error callback with a fallback error event.
  var wrapError = function(model, options) {
    var error = options.error;
    options.error = function(resp) {
      if (error) error(model, resp, options);
      model.trigger('error', model, resp, options);
    };
  };

  return Backbone;

}));

/** vim: et:ts=4:sw=4:sts=4
 * @license RequireJS 2.1.14 Copyright (c) 2010-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */
//Not using strict: uneven strict support in browsers, #392, and causes
//problems with requirejs.exec()/transpiler plugins that may not be strict.
/*jslint regexp: true, nomen: true, sloppy: true */
/*global window, navigator, document, importScripts, setTimeout, opera */

var requirejs, require, define;
(function (global) {
    var req, s, head, baseElement, dataMain, src,
        interactiveScript, currentlyAddingScript, mainScript, subPath,
        version = '2.1.14',
        commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
        cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
        jsSuffixRegExp = /\.js$/,
        currDirRegExp = /^\.\//,
        op = Object.prototype,
        ostring = op.toString,
        hasOwn = op.hasOwnProperty,
        ap = Array.prototype,
        apsp = ap.splice,
        isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document),
        isWebWorker = !isBrowser && typeof importScripts !== 'undefined',
        //PS3 indicates loaded and complete, but need to wait for complete
        //specifically. Sequence is 'loading', 'loaded', execution,
        // then 'complete'. The UA check is unfortunate, but not sure how
        //to feature test w/o causing perf issues.
        readyRegExp = isBrowser && navigator.platform === 'PLAYSTATION 3' ?
                      /^complete$/ : /^(complete|loaded)$/,
        defContextName = '_',
        //Oh the tragedy, detecting opera. See the usage of isOpera for reason.
        isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]',
        contexts = {},
        cfg = {},
        globalDefQueue = [],
        useInteractive = false;

    function isFunction(it) {
        return ostring.call(it) === '[object Function]';
    }

    function isArray(it) {
        return ostring.call(it) === '[object Array]';
    }

    /**
     * Helper function for iterating over an array. If the func returns
     * a true value, it will break out of the loop.
     */
    function each(ary, func) {
        if (ary) {
            var i;
            for (i = 0; i < ary.length; i += 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    /**
     * Helper function for iterating over an array backwards. If the func
     * returns a true value, it will break out of the loop.
     */
    function eachReverse(ary, func) {
        if (ary) {
            var i;
            for (i = ary.length - 1; i > -1; i -= 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    function getOwn(obj, prop) {
        return hasProp(obj, prop) && obj[prop];
    }

    /**
     * Cycles over properties in an object and calls a function for each
     * property value. If the function returns a truthy value, then the
     * iteration is stopped.
     */
    function eachProp(obj, func) {
        var prop;
        for (prop in obj) {
            if (hasProp(obj, prop)) {
                if (func(obj[prop], prop)) {
                    break;
                }
            }
        }
    }

    /**
     * Simple function to mix in properties from source into target,
     * but only if target does not already have a property of the same name.
     */
    function mixin(target, source, force, deepStringMixin) {
        if (source) {
            eachProp(source, function (value, prop) {
                if (force || !hasProp(target, prop)) {
                    if (deepStringMixin && typeof value === 'object' && value &&
                        !isArray(value) && !isFunction(value) &&
                        !(value instanceof RegExp)) {

                        if (!target[prop]) {
                            target[prop] = {};
                        }
                        mixin(target[prop], value, force, deepStringMixin);
                    } else {
                        target[prop] = value;
                    }
                }
            });
        }
        return target;
    }

    //Similar to Function.prototype.bind, but the 'this' object is specified
    //first, since it is easier to read/figure out what 'this' will be.
    function bind(obj, fn) {
        return function () {
            return fn.apply(obj, arguments);
        };
    }

    function scripts() {
        return document.getElementsByTagName('script');
    }

    function defaultOnError(err) {
        throw err;
    }

    //Allow getting a global that is expressed in
    //dot notation, like 'a.b.c'.
    function getGlobal(value) {
        if (!value) {
            return value;
        }
        var g = global;
        each(value.split('.'), function (part) {
            g = g[part];
        });
        return g;
    }

    /**
     * Constructs an error with a pointer to an URL with more information.
     * @param {String} id the error ID that maps to an ID on a web page.
     * @param {String} message human readable error.
     * @param {Error} [err] the original error, if there is one.
     *
     * @returns {Error}
     */
    function makeError(id, msg, err, requireModules) {
        var e = new Error(msg + '\nhttp://requirejs.org/docs/errors.html#' + id);
        e.requireType = id;
        e.requireModules = requireModules;
        if (err) {
            e.originalError = err;
        }
        return e;
    }

    if (typeof define !== 'undefined') {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    if (typeof requirejs !== 'undefined') {
        if (isFunction(requirejs)) {
            //Do not overwrite an existing requirejs instance.
            return;
        }
        cfg = requirejs;
        requirejs = undefined;
    }

    //Allow for a require config object
    if (typeof require !== 'undefined' && !isFunction(require)) {
        //assume it is a config object.
        cfg = require;
        require = undefined;
    }

    function newContext(contextName) {
        var inCheckLoaded, Module, context, handlers,
            checkLoadedTimeoutId,
            config = {
                //Defaults. Do not set a default for map
                //config to speed up normalize(), which
                //will run faster if there is no default.
                waitSeconds: 7,
                baseUrl: './',
                paths: {},
                bundles: {},
                pkgs: {},
                shim: {},
                config: {}
            },
            registry = {},
            //registry of just enabled modules, to speed
            //cycle breaking code when lots of modules
            //are registered, but not activated.
            enabledRegistry = {},
            undefEvents = {},
            defQueue = [],
            defined = {},
            urlFetched = {},
            bundlesMap = {},
            requireCounter = 1,
            unnormalizedCounter = 1;

        /**
         * Trims the . and .. from an array of path segments.
         * It will keep a leading path segment if a .. will become
         * the first path segment, to help with module name lookups,
         * which act like paths, but can be remapped. But the end result,
         * all paths that use this function should look normalized.
         * NOTE: this method MODIFIES the input array.
         * @param {Array} ary the array of path segments.
         */
        function trimDots(ary) {
            var i, part;
            for (i = 0; i < ary.length; i++) {
                part = ary[i];
                if (part === '.') {
                    ary.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    // If at the start, or previous value is still ..,
                    // keep them so that when converted to a path it may
                    // still work when converted to a path, even though
                    // as an ID it is less than ideal. In larger point
                    // releases, may be better to just kick out an error.
                    if (i === 0 || (i == 1 && ary[2] === '..') || ary[i - 1] === '..') {
                        continue;
                    } else if (i > 0) {
                        ary.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
        }

        /**
         * Given a relative module name, like ./something, normalize it to
         * a real name that can be mapped to a path.
         * @param {String} name the relative name
         * @param {String} baseName a real name that the name arg is relative
         * to.
         * @param {Boolean} applyMap apply the map config to the value. Should
         * only be done if this normalization is for a dependency ID.
         * @returns {String} normalized name
         */
        function normalize(name, baseName, applyMap) {
            var pkgMain, mapValue, nameParts, i, j, nameSegment, lastIndex,
                foundMap, foundI, foundStarMap, starI, normalizedBaseParts,
                baseParts = (baseName && baseName.split('/')),
                map = config.map,
                starMap = map && map['*'];

            //Adjust any relative paths.
            if (name) {
                name = name.split('/');
                lastIndex = name.length - 1;

                // If wanting node ID compatibility, strip .js from end
                // of IDs. Have to do this here, and not in nameToUrl
                // because node allows either .js or non .js to map
                // to same file.
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                // Starts with a '.' so need the baseName
                if (name[0].charAt(0) === '.' && baseParts) {
                    //Convert baseName to array, and lop off the last part,
                    //so that . matches that 'directory' and not name of the baseName's
                    //module. For instance, baseName of 'one/two/three', maps to
                    //'one/two/three.js', but we want the directory, 'one/two' for
                    //this normalization.
                    normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                    name = normalizedBaseParts.concat(name);
                }

                trimDots(name);
                name = name.join('/');
            }

            //Apply map config if available.
            if (applyMap && map && (baseParts || starMap)) {
                nameParts = name.split('/');

                outerLoop: for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join('/');

                    if (baseParts) {
                        //Find the longest baseName segment match in the config.
                        //So, do joins on the biggest to smallest lengths of baseParts.
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = getOwn(map, baseParts.slice(0, j).join('/'));

                            //baseName segment has config, find if it has one for
                            //this name.
                            if (mapValue) {
                                mapValue = getOwn(mapValue, nameSegment);
                                if (mapValue) {
                                    //Match, update name to the new value.
                                    foundMap = mapValue;
                                    foundI = i;
                                    break outerLoop;
                                }
                            }
                        }
                    }

                    //Check for a star map match, but just hold on to it,
                    //if there is a shorter segment match later in a matching
                    //config, then favor over this star map.
                    if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
                        foundStarMap = getOwn(starMap, nameSegment);
                        starI = i;
                    }
                }

                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI;
                }

                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join('/');
                }
            }

            // If the name points to a package's name, use
            // the package main instead.
            pkgMain = getOwn(config.pkgs, name);

            return pkgMain ? pkgMain : name;
        }

        function removeScript(name) {
            if (isBrowser) {
                each(scripts(), function (scriptNode) {
                    if (scriptNode.getAttribute('data-requiremodule') === name &&
                            scriptNode.getAttribute('data-requirecontext') === context.contextName) {
                        scriptNode.parentNode.removeChild(scriptNode);
                        return true;
                    }
                });
            }
        }

        function hasPathFallback(id) {
            var pathConfig = getOwn(config.paths, id);
            if (pathConfig && isArray(pathConfig) && pathConfig.length > 1) {
                //Pop off the first array value, since it failed, and
                //retry
                pathConfig.shift();
                context.require.undef(id);

                //Custom require that does not do map translation, since
                //ID is "absolute", already mapped/resolved.
                context.makeRequire(null, {
                    skipMap: true
                })([id]);

                return true;
            }
        }

        //Turns a plugin!resource to [plugin, resource]
        //with the plugin being undefined if the name
        //did not have a plugin prefix.
        function splitPrefix(name) {
            var prefix,
                index = name ? name.indexOf('!') : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }
            return [prefix, name];
        }

        /**
         * Creates a module mapping that includes plugin prefix, module
         * name, and path. If parentModuleMap is provided it will
         * also normalize the name via require.normalize()
         *
         * @param {String} name the module name
         * @param {String} [parentModuleMap] parent module map
         * for the module name, used to resolve relative names.
         * @param {Boolean} isNormalized: is the ID already normalized.
         * This is true if this call is done for a define() module ID.
         * @param {Boolean} applyMap: apply the map config to the ID.
         * Should only be true if this map is for a dependency.
         *
         * @returns {Object}
         */
        function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
            var url, pluginModule, suffix, nameParts,
                prefix = null,
                parentName = parentModuleMap ? parentModuleMap.name : null,
                originalName = name,
                isDefine = true,
                normalizedName = '';

            //If no name, then it means it is a require call, generate an
            //internal name.
            if (!name) {
                isDefine = false;
                name = '_@r' + (requireCounter += 1);
            }

            nameParts = splitPrefix(name);
            prefix = nameParts[0];
            name = nameParts[1];

            if (prefix) {
                prefix = normalize(prefix, parentName, applyMap);
                pluginModule = getOwn(defined, prefix);
            }

            //Account for relative paths if there is a base name.
            if (name) {
                if (prefix) {
                    if (pluginModule && pluginModule.normalize) {
                        //Plugin is loaded, use its normalize method.
                        normalizedName = pluginModule.normalize(name, function (name) {
                            return normalize(name, parentName, applyMap);
                        });
                    } else {
                        // If nested plugin references, then do not try to
                        // normalize, as it will not normalize correctly. This
                        // places a restriction on resourceIds, and the longer
                        // term solution is not to normalize until plugins are
                        // loaded and all normalizations to allow for async
                        // loading of a loader plugin. But for now, fixes the
                        // common uses. Details in #1131
                        normalizedName = name.indexOf('!') === -1 ?
                                         normalize(name, parentName, applyMap) :
                                         name;
                    }
                } else {
                    //A regular module.
                    normalizedName = normalize(name, parentName, applyMap);

                    //Normalized name may be a plugin ID due to map config
                    //application in normalize. The map config values must
                    //already be normalized, so do not need to redo that part.
                    nameParts = splitPrefix(normalizedName);
                    prefix = nameParts[0];
                    normalizedName = nameParts[1];
                    isNormalized = true;

                    url = context.nameToUrl(normalizedName);
                }
            }

            //If the id is a plugin id that cannot be determined if it needs
            //normalization, stamp it with a unique ID so two matching relative
            //ids that may conflict can be separate.
            suffix = prefix && !pluginModule && !isNormalized ?
                     '_unnormalized' + (unnormalizedCounter += 1) :
                     '';

            return {
                prefix: prefix,
                name: normalizedName,
                parentMap: parentModuleMap,
                unnormalized: !!suffix,
                url: url,
                originalName: originalName,
                isDefine: isDefine,
                id: (prefix ?
                        prefix + '!' + normalizedName :
                        normalizedName) + suffix
            };
        }

        function getModule(depMap) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (!mod) {
                mod = registry[id] = new context.Module(depMap);
            }

            return mod;
        }

        function on(depMap, name, fn) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (hasProp(defined, id) &&
                    (!mod || mod.defineEmitComplete)) {
                if (name === 'defined') {
                    fn(defined[id]);
                }
            } else {
                mod = getModule(depMap);
                if (mod.error && name === 'error') {
                    fn(mod.error);
                } else {
                    mod.on(name, fn);
                }
            }
        }

        function onError(err, errback) {
            var ids = err.requireModules,
                notified = false;

            if (errback) {
                errback(err);
            } else {
                each(ids, function (id) {
                    var mod = getOwn(registry, id);
                    if (mod) {
                        //Set error on module, so it skips timeout checks.
                        mod.error = err;
                        if (mod.events.error) {
                            notified = true;
                            mod.emit('error', err);
                        }
                    }
                });

                if (!notified) {
                    req.onError(err);
                }
            }
        }

        /**
         * Internal method to transfer globalQueue items to this context's
         * defQueue.
         */
        function takeGlobalQueue() {
            //Push all the globalDefQueue items into the context's defQueue
            if (globalDefQueue.length) {
                //Array splice in the values since the context code has a
                //local var ref to defQueue, so cannot just reassign the one
                //on context.
                apsp.apply(defQueue,
                           [defQueue.length, 0].concat(globalDefQueue));
                globalDefQueue = [];
            }
        }

        handlers = {
            'require': function (mod) {
                if (mod.require) {
                    return mod.require;
                } else {
                    return (mod.require = context.makeRequire(mod.map));
                }
            },
            'exports': function (mod) {
                mod.usingExports = true;
                if (mod.map.isDefine) {
                    if (mod.exports) {
                        return (defined[mod.map.id] = mod.exports);
                    } else {
                        return (mod.exports = defined[mod.map.id] = {});
                    }
                }
            },
            'module': function (mod) {
                if (mod.module) {
                    return mod.module;
                } else {
                    return (mod.module = {
                        id: mod.map.id,
                        uri: mod.map.url,
                        config: function () {
                            return  getOwn(config.config, mod.map.id) || {};
                        },
                        exports: mod.exports || (mod.exports = {})
                    });
                }
            }
        };

        function cleanRegistry(id) {
            //Clean up machinery used for waiting modules.
            delete registry[id];
            delete enabledRegistry[id];
        }

        function breakCycle(mod, traced, processed) {
            var id = mod.map.id;

            if (mod.error) {
                mod.emit('error', mod.error);
            } else {
                traced[id] = true;
                each(mod.depMaps, function (depMap, i) {
                    var depId = depMap.id,
                        dep = getOwn(registry, depId);

                    //Only force things that have not completed
                    //being defined, so still in the registry,
                    //and only if it has not been matched up
                    //in the module already.
                    if (dep && !mod.depMatched[i] && !processed[depId]) {
                        if (getOwn(traced, depId)) {
                            mod.defineDep(i, defined[depId]);
                            mod.check(); //pass false?
                        } else {
                            breakCycle(dep, traced, processed);
                        }
                    }
                });
                processed[id] = true;
            }
        }

        function checkLoaded() {
            var err, usingPathFallback,
                waitInterval = config.waitSeconds * 1000,
                //It is possible to disable the wait interval by using waitSeconds of 0.
                expired = waitInterval && (context.startTime + waitInterval) < new Date().getTime(),
                noLoads = [],
                reqCalls = [],
                stillLoading = false,
                needCycleCheck = true;

            //Do not bother if this call was a result of a cycle break.
            if (inCheckLoaded) {
                return;
            }

            inCheckLoaded = true;

            //Figure out the state of all the modules.
            eachProp(enabledRegistry, function (mod) {
                var map = mod.map,
                    modId = map.id;

                //Skip things that are not enabled or in error state.
                if (!mod.enabled) {
                    return;
                }

                if (!map.isDefine) {
                    reqCalls.push(mod);
                }

                if (!mod.error) {
                    //If the module should be executed, and it has not
                    //been inited and time is up, remember it.
                    if (!mod.inited && expired) {
                        if (hasPathFallback(modId)) {
                            usingPathFallback = true;
                            stillLoading = true;
                        } else {
                            noLoads.push(modId);
                            removeScript(modId);
                        }
                    } else if (!mod.inited && mod.fetched && map.isDefine) {
                        stillLoading = true;
                        if (!map.prefix) {
                            //No reason to keep looking for unfinished
                            //loading. If the only stillLoading is a
                            //plugin resource though, keep going,
                            //because it may be that a plugin resource
                            //is waiting on a non-plugin cycle.
                            return (needCycleCheck = false);
                        }
                    }
                }
            });

            if (expired && noLoads.length) {
                //If wait time expired, throw error of unloaded modules.
                err = makeError('timeout', 'Load timeout for modules: ' + noLoads, null, noLoads);
                err.contextName = context.contextName;
                return onError(err);
            }

            //Not expired, check for a cycle.
            if (needCycleCheck) {
                each(reqCalls, function (mod) {
                    breakCycle(mod, {}, {});
                });
            }

            //If still waiting on loads, and the waiting load is something
            //other than a plugin resource, or there are still outstanding
            //scripts, then just try back later.
            if ((!expired || usingPathFallback) && stillLoading) {
                //Something is still waiting to load. Wait for it, but only
                //if a timeout is not already in effect.
                if ((isBrowser || isWebWorker) && !checkLoadedTimeoutId) {
                    checkLoadedTimeoutId = setTimeout(function () {
                        checkLoadedTimeoutId = 0;
                        checkLoaded();
                    }, 50);
                }
            }

            inCheckLoaded = false;
        }

        Module = function (map) {
            this.events = getOwn(undefEvents, map.id) || {};
            this.map = map;
            this.shim = getOwn(config.shim, map.id);
            this.depExports = [];
            this.depMaps = [];
            this.depMatched = [];
            this.pluginMaps = {};
            this.depCount = 0;

            /* this.exports this.factory
               this.depMaps = [],
               this.enabled, this.fetched
            */
        };

        Module.prototype = {
            init: function (depMaps, factory, errback, options) {
                options = options || {};

                //Do not do more inits if already done. Can happen if there
                //are multiple define calls for the same module. That is not
                //a normal, common case, but it is also not unexpected.
                if (this.inited) {
                    return;
                }

                this.factory = factory;

                if (errback) {
                    //Register for errors on this module.
                    this.on('error', errback);
                } else if (this.events.error) {
                    //If no errback already, but there are error listeners
                    //on this module, set up an errback to pass to the deps.
                    errback = bind(this, function (err) {
                        this.emit('error', err);
                    });
                }

                //Do a copy of the dependency array, so that
                //source inputs are not modified. For example
                //"shim" deps are passed in here directly, and
                //doing a direct modification of the depMaps array
                //would affect that config.
                this.depMaps = depMaps && depMaps.slice(0);

                this.errback = errback;

                //Indicate this module has be initialized
                this.inited = true;

                this.ignore = options.ignore;

                //Could have option to init this module in enabled mode,
                //or could have been previously marked as enabled. However,
                //the dependencies are not known until init is called. So
                //if enabled previously, now trigger dependencies as enabled.
                if (options.enabled || this.enabled) {
                    //Enable this module and dependencies.
                    //Will call this.check()
                    this.enable();
                } else {
                    this.check();
                }
            },

            defineDep: function (i, depExports) {
                //Because of cycles, defined callback for a given
                //export can be called more than once.
                if (!this.depMatched[i]) {
                    this.depMatched[i] = true;
                    this.depCount -= 1;
                    this.depExports[i] = depExports;
                }
            },

            fetch: function () {
                if (this.fetched) {
                    return;
                }
                this.fetched = true;

                context.startTime = (new Date()).getTime();

                var map = this.map;

                //If the manager is for a plugin managed resource,
                //ask the plugin to load it now.
                if (this.shim) {
                    context.makeRequire(this.map, {
                        enableBuildCallback: true
                    })(this.shim.deps || [], bind(this, function () {
                        return map.prefix ? this.callPlugin() : this.load();
                    }));
                } else {
                    //Regular dependency.
                    return map.prefix ? this.callPlugin() : this.load();
                }
            },

            load: function () {
                var url = this.map.url;

                //Regular dependency.
                if (!urlFetched[url]) {
                    urlFetched[url] = true;
                    context.load(this.map.id, url);
                }
            },

            /**
             * Checks if the module is ready to define itself, and if so,
             * define it.
             */
            check: function () {
                if (!this.enabled || this.enabling) {
                    return;
                }

                var err, cjsModule,
                    id = this.map.id,
                    depExports = this.depExports,
                    exports = this.exports,
                    factory = this.factory;

                if (!this.inited) {
                    this.fetch();
                } else if (this.error) {
                    this.emit('error', this.error);
                } else if (!this.defining) {
                    //The factory could trigger another require call
                    //that would result in checking this module to
                    //define itself again. If already in the process
                    //of doing that, skip this work.
                    this.defining = true;

                    if (this.depCount < 1 && !this.defined) {
                        if (isFunction(factory)) {
                            //If there is an error listener, favor passing
                            //to that instead of throwing an error. However,
                            //only do it for define()'d  modules. require
                            //errbacks should not be called for failures in
                            //their callbacks (#699). However if a global
                            //onError is set, use that.
                            if ((this.events.error && this.map.isDefine) ||
                                req.onError !== defaultOnError) {
                                try {
                                    exports = context.execCb(id, factory, depExports, exports);
                                } catch (e) {
                                    err = e;
                                }
                            } else {
                                exports = context.execCb(id, factory, depExports, exports);
                            }

                            // Favor return value over exports. If node/cjs in play,
                            // then will not have a return value anyway. Favor
                            // module.exports assignment over exports object.
                            if (this.map.isDefine && exports === undefined) {
                                cjsModule = this.module;
                                if (cjsModule) {
                                    exports = cjsModule.exports;
                                } else if (this.usingExports) {
                                    //exports already set the defined value.
                                    exports = this.exports;
                                }
                            }

                            if (err) {
                                err.requireMap = this.map;
                                err.requireModules = this.map.isDefine ? [this.map.id] : null;
                                err.requireType = this.map.isDefine ? 'define' : 'require';
                                return onError((this.error = err));
                            }

                        } else {
                            //Just a literal value
                            exports = factory;
                        }

                        this.exports = exports;

                        if (this.map.isDefine && !this.ignore) {
                            defined[id] = exports;

                            if (req.onResourceLoad) {
                                req.onResourceLoad(context, this.map, this.depMaps);
                            }
                        }

                        //Clean up
                        cleanRegistry(id);

                        this.defined = true;
                    }

                    //Finished the define stage. Allow calling check again
                    //to allow define notifications below in the case of a
                    //cycle.
                    this.defining = false;

                    if (this.defined && !this.defineEmitted) {
                        this.defineEmitted = true;
                        this.emit('defined', this.exports);
                        this.defineEmitComplete = true;
                    }

                }
            },

            callPlugin: function () {
                var map = this.map,
                    id = map.id,
                    //Map already normalized the prefix.
                    pluginMap = makeModuleMap(map.prefix);

                //Mark this as a dependency for this plugin, so it
                //can be traced for cycles.
                this.depMaps.push(pluginMap);

                on(pluginMap, 'defined', bind(this, function (plugin) {
                    var load, normalizedMap, normalizedMod,
                        bundleId = getOwn(bundlesMap, this.map.id),
                        name = this.map.name,
                        parentName = this.map.parentMap ? this.map.parentMap.name : null,
                        localRequire = context.makeRequire(map.parentMap, {
                            enableBuildCallback: true
                        });

                    //If current map is not normalized, wait for that
                    //normalized name to load instead of continuing.
                    if (this.map.unnormalized) {
                        //Normalize the ID if the plugin allows it.
                        if (plugin.normalize) {
                            name = plugin.normalize(name, function (name) {
                                return normalize(name, parentName, true);
                            }) || '';
                        }

                        //prefix and name should already be normalized, no need
                        //for applying map config again either.
                        normalizedMap = makeModuleMap(map.prefix + '!' + name,
                                                      this.map.parentMap);
                        on(normalizedMap,
                            'defined', bind(this, function (value) {
                                this.init([], function () { return value; }, null, {
                                    enabled: true,
                                    ignore: true
                                });
                            }));

                        normalizedMod = getOwn(registry, normalizedMap.id);
                        if (normalizedMod) {
                            //Mark this as a dependency for this plugin, so it
                            //can be traced for cycles.
                            this.depMaps.push(normalizedMap);

                            if (this.events.error) {
                                normalizedMod.on('error', bind(this, function (err) {
                                    this.emit('error', err);
                                }));
                            }
                            normalizedMod.enable();
                        }

                        return;
                    }

                    //If a paths config, then just load that file instead to
                    //resolve the plugin, as it is built into that paths layer.
                    if (bundleId) {
                        this.map.url = context.nameToUrl(bundleId);
                        this.load();
                        return;
                    }

                    load = bind(this, function (value) {
                        this.init([], function () { return value; }, null, {
                            enabled: true
                        });
                    });

                    load.error = bind(this, function (err) {
                        this.inited = true;
                        this.error = err;
                        err.requireModules = [id];

                        //Remove temp unnormalized modules for this module,
                        //since they will never be resolved otherwise now.
                        eachProp(registry, function (mod) {
                            if (mod.map.id.indexOf(id + '_unnormalized') === 0) {
                                cleanRegistry(mod.map.id);
                            }
                        });

                        onError(err);
                    });

                    //Allow plugins to load other code without having to know the
                    //context or how to 'complete' the load.
                    load.fromText = bind(this, function (text, textAlt) {
                        /*jslint evil: true */
                        var moduleName = map.name,
                            moduleMap = makeModuleMap(moduleName),
                            hasInteractive = useInteractive;

                        //As of 2.1.0, support just passing the text, to reinforce
                        //fromText only being called once per resource. Still
                        //support old style of passing moduleName but discard
                        //that moduleName in favor of the internal ref.
                        if (textAlt) {
                            text = textAlt;
                        }

                        //Turn off interactive script matching for IE for any define
                        //calls in the text, then turn it back on at the end.
                        if (hasInteractive) {
                            useInteractive = false;
                        }

                        //Prime the system by creating a module instance for
                        //it.
                        getModule(moduleMap);

                        //Transfer any config to this other module.
                        if (hasProp(config.config, id)) {
                            config.config[moduleName] = config.config[id];
                        }

                        try {
                            req.exec(text);
                        } catch (e) {
                            return onError(makeError('fromtexteval',
                                             'fromText eval for ' + id +
                                            ' failed: ' + e,
                                             e,
                                             [id]));
                        }

                        if (hasInteractive) {
                            useInteractive = true;
                        }

                        //Mark this as a dependency for the plugin
                        //resource
                        this.depMaps.push(moduleMap);

                        //Support anonymous modules.
                        context.completeLoad(moduleName);

                        //Bind the value of that module to the value for this
                        //resource ID.
                        localRequire([moduleName], load);
                    });

                    //Use parentName here since the plugin's name is not reliable,
                    //could be some weird string with no path that actually wants to
                    //reference the parentName's path.
                    plugin.load(map.name, localRequire, load, config);
                }));

                context.enable(pluginMap, this);
                this.pluginMaps[pluginMap.id] = pluginMap;
            },

            enable: function () {
                enabledRegistry[this.map.id] = this;
                this.enabled = true;

                //Set flag mentioning that the module is enabling,
                //so that immediate calls to the defined callbacks
                //for dependencies do not trigger inadvertent load
                //with the depCount still being zero.
                this.enabling = true;

                //Enable each dependency
                each(this.depMaps, bind(this, function (depMap, i) {
                    var id, mod, handler;

                    if (typeof depMap === 'string') {
                        //Dependency needs to be converted to a depMap
                        //and wired up to this module.
                        depMap = makeModuleMap(depMap,
                                               (this.map.isDefine ? this.map : this.map.parentMap),
                                               false,
                                               !this.skipMap);
                        this.depMaps[i] = depMap;

                        handler = getOwn(handlers, depMap.id);

                        if (handler) {
                            this.depExports[i] = handler(this);
                            return;
                        }

                        this.depCount += 1;

                        on(depMap, 'defined', bind(this, function (depExports) {
                            this.defineDep(i, depExports);
                            this.check();
                        }));

                        if (this.errback) {
                            on(depMap, 'error', bind(this, this.errback));
                        }
                    }

                    id = depMap.id;
                    mod = registry[id];

                    //Skip special modules like 'require', 'exports', 'module'
                    //Also, don't call enable if it is already enabled,
                    //important in circular dependency cases.
                    if (!hasProp(handlers, id) && mod && !mod.enabled) {
                        context.enable(depMap, this);
                    }
                }));

                //Enable each plugin that is used in
                //a dependency
                eachProp(this.pluginMaps, bind(this, function (pluginMap) {
                    var mod = getOwn(registry, pluginMap.id);
                    if (mod && !mod.enabled) {
                        context.enable(pluginMap, this);
                    }
                }));

                this.enabling = false;

                this.check();
            },

            on: function (name, cb) {
                var cbs = this.events[name];
                if (!cbs) {
                    cbs = this.events[name] = [];
                }
                cbs.push(cb);
            },

            emit: function (name, evt) {
                each(this.events[name], function (cb) {
                    cb(evt);
                });
                if (name === 'error') {
                    //Now that the error handler was triggered, remove
                    //the listeners, since this broken Module instance
                    //can stay around for a while in the registry.
                    delete this.events[name];
                }
            }
        };

        function callGetModule(args) {
            //Skip modules already defined.
            if (!hasProp(defined, args[0])) {
                getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
            }
        }

        function removeListener(node, func, name, ieName) {
            //Favor detachEvent because of IE9
            //issue, see attachEvent/addEventListener comment elsewhere
            //in this file.
            if (node.detachEvent && !isOpera) {
                //Probably IE. If not it will throw an error, which will be
                //useful to know.
                if (ieName) {
                    node.detachEvent(ieName, func);
                }
            } else {
                node.removeEventListener(name, func, false);
            }
        }

        /**
         * Given an event from a script node, get the requirejs info from it,
         * and then removes the event listeners on the node.
         * @param {Event} evt
         * @returns {Object}
         */
        function getScriptData(evt) {
            //Using currentTarget instead of target for Firefox 2.0's sake. Not
            //all old browsers will be supported, but this one was easy enough
            //to support and still makes sense.
            var node = evt.currentTarget || evt.srcElement;

            //Remove the listeners once here.
            removeListener(node, context.onScriptLoad, 'load', 'onreadystatechange');
            removeListener(node, context.onScriptError, 'error');

            return {
                node: node,
                id: node && node.getAttribute('data-requiremodule')
            };
        }

        function intakeDefines() {
            var args;

            //Any defined modules in the global queue, intake them now.
            takeGlobalQueue();

            //Make sure any remaining defQueue items get properly processed.
            while (defQueue.length) {
                args = defQueue.shift();
                if (args[0] === null) {
                    return onError(makeError('mismatch', 'Mismatched anonymous define() module: ' + args[args.length - 1]));
                } else {
                    //args are id, deps, factory. Should be normalized by the
                    //define() function.
                    callGetModule(args);
                }
            }
        }

        context = {
            config: config,
            contextName: contextName,
            registry: registry,
            defined: defined,
            urlFetched: urlFetched,
            defQueue: defQueue,
            Module: Module,
            makeModuleMap: makeModuleMap,
            nextTick: req.nextTick,
            onError: onError,

            /**
             * Set a configuration for the context.
             * @param {Object} cfg config object to integrate.
             */
            configure: function (cfg) {
                //Make sure the baseUrl ends in a slash.
                if (cfg.baseUrl) {
                    if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
                        cfg.baseUrl += '/';
                    }
                }

                //Save off the paths since they require special processing,
                //they are additive.
                var shim = config.shim,
                    objs = {
                        paths: true,
                        bundles: true,
                        config: true,
                        map: true
                    };

                eachProp(cfg, function (value, prop) {
                    if (objs[prop]) {
                        if (!config[prop]) {
                            config[prop] = {};
                        }
                        mixin(config[prop], value, true, true);
                    } else {
                        config[prop] = value;
                    }
                });

                //Reverse map the bundles
                if (cfg.bundles) {
                    eachProp(cfg.bundles, function (value, prop) {
                        each(value, function (v) {
                            if (v !== prop) {
                                bundlesMap[v] = prop;
                            }
                        });
                    });
                }

                //Merge shim
                if (cfg.shim) {
                    eachProp(cfg.shim, function (value, id) {
                        //Normalize the structure
                        if (isArray(value)) {
                            value = {
                                deps: value
                            };
                        }
                        if ((value.exports || value.init) && !value.exportsFn) {
                            value.exportsFn = context.makeShimExports(value);
                        }
                        shim[id] = value;
                    });
                    config.shim = shim;
                }

                //Adjust packages if necessary.
                if (cfg.packages) {
                    each(cfg.packages, function (pkgObj) {
                        var location, name;

                        pkgObj = typeof pkgObj === 'string' ? { name: pkgObj } : pkgObj;

                        name = pkgObj.name;
                        location = pkgObj.location;
                        if (location) {
                            config.paths[name] = pkgObj.location;
                        }

                        //Save pointer to main module ID for pkg name.
                        //Remove leading dot in main, so main paths are normalized,
                        //and remove any trailing .js, since different package
                        //envs have different conventions: some use a module name,
                        //some use a file name.
                        config.pkgs[name] = pkgObj.name + '/' + (pkgObj.main || 'main')
                                     .replace(currDirRegExp, '')
                                     .replace(jsSuffixRegExp, '');
                    });
                }

                //If there are any "waiting to execute" modules in the registry,
                //update the maps for them, since their info, like URLs to load,
                //may have changed.
                eachProp(registry, function (mod, id) {
                    //If module already has init called, since it is too
                    //late to modify them, and ignore unnormalized ones
                    //since they are transient.
                    if (!mod.inited && !mod.map.unnormalized) {
                        mod.map = makeModuleMap(id);
                    }
                });

                //If a deps array or a config callback is specified, then call
                //require with those args. This is useful when require is defined as a
                //config object before require.js is loaded.
                if (cfg.deps || cfg.callback) {
                    context.require(cfg.deps || [], cfg.callback);
                }
            },

            makeShimExports: function (value) {
                function fn() {
                    var ret;
                    if (value.init) {
                        ret = value.init.apply(global, arguments);
                    }
                    return ret || (value.exports && getGlobal(value.exports));
                }
                return fn;
            },

            makeRequire: function (relMap, options) {
                options = options || {};

                function localRequire(deps, callback, errback) {
                    var id, map, requireMod;

                    if (options.enableBuildCallback && callback && isFunction(callback)) {
                        callback.__requireJsBuild = true;
                    }

                    if (typeof deps === 'string') {
                        if (isFunction(callback)) {
                            //Invalid call
                            return onError(makeError('requireargs', 'Invalid require call'), errback);
                        }

                        //If require|exports|module are requested, get the
                        //value for them from the special handlers. Caveat:
                        //this only works while module is being defined.
                        if (relMap && hasProp(handlers, deps)) {
                            return handlers[deps](registry[relMap.id]);
                        }

                        //Synchronous access to one module. If require.get is
                        //available (as in the Node adapter), prefer that.
                        if (req.get) {
                            return req.get(context, deps, relMap, localRequire);
                        }

                        //Normalize module name, if it contains . or ..
                        map = makeModuleMap(deps, relMap, false, true);
                        id = map.id;

                        if (!hasProp(defined, id)) {
                            return onError(makeError('notloaded', 'Module name "' +
                                        id +
                                        '" has not been loaded yet for context: ' +
                                        contextName +
                                        (relMap ? '' : '. Use require([])')));
                        }
                        return defined[id];
                    }

                    //Grab defines waiting in the global queue.
                    intakeDefines();

                    //Mark all the dependencies as needing to be loaded.
                    context.nextTick(function () {
                        //Some defines could have been added since the
                        //require call, collect them.
                        intakeDefines();

                        requireMod = getModule(makeModuleMap(null, relMap));

                        //Store if map config should be applied to this require
                        //call for dependencies.
                        requireMod.skipMap = options.skipMap;

                        requireMod.init(deps, callback, errback, {
                            enabled: true
                        });

                        checkLoaded();
                    });

                    return localRequire;
                }

                mixin(localRequire, {
                    isBrowser: isBrowser,

                    /**
                     * Converts a module name + .extension into an URL path.
                     * *Requires* the use of a module name. It does not support using
                     * plain URLs like nameToUrl.
                     */
                    toUrl: function (moduleNamePlusExt) {
                        var ext,
                            index = moduleNamePlusExt.lastIndexOf('.'),
                            segment = moduleNamePlusExt.split('/')[0],
                            isRelative = segment === '.' || segment === '..';

                        //Have a file extension alias, and it is not the
                        //dots from a relative path.
                        if (index !== -1 && (!isRelative || index > 1)) {
                            ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                            moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                        }

                        return context.nameToUrl(normalize(moduleNamePlusExt,
                                                relMap && relMap.id, true), ext,  true);
                    },

                    defined: function (id) {
                        return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
                    },

                    specified: function (id) {
                        id = makeModuleMap(id, relMap, false, true).id;
                        return hasProp(defined, id) || hasProp(registry, id);
                    }
                });

                //Only allow undef on top level require calls
                if (!relMap) {
                    localRequire.undef = function (id) {
                        //Bind any waiting define() calls to this context,
                        //fix for #408
                        takeGlobalQueue();

                        var map = makeModuleMap(id, relMap, true),
                            mod = getOwn(registry, id);

                        removeScript(id);

                        delete defined[id];
                        delete urlFetched[map.url];
                        delete undefEvents[id];

                        //Clean queued defines too. Go backwards
                        //in array so that the splices do not
                        //mess up the iteration.
                        eachReverse(defQueue, function(args, i) {
                            if(args[0] === id) {
                                defQueue.splice(i, 1);
                            }
                        });

                        if (mod) {
                            //Hold on to listeners in case the
                            //module will be attempted to be reloaded
                            //using a different config.
                            if (mod.events.defined) {
                                undefEvents[id] = mod.events;
                            }

                            cleanRegistry(id);
                        }
                    };
                }

                return localRequire;
            },

            /**
             * Called to enable a module if it is still in the registry
             * awaiting enablement. A second arg, parent, the parent module,
             * is passed in for context, when this method is overridden by
             * the optimizer. Not shown here to keep code compact.
             */
            enable: function (depMap) {
                var mod = getOwn(registry, depMap.id);
                if (mod) {
                    getModule(depMap).enable();
                }
            },

            /**
             * Internal method used by environment adapters to complete a load event.
             * A load event could be a script load or just a load pass from a synchronous
             * load call.
             * @param {String} moduleName the name of the module to potentially complete.
             */
            completeLoad: function (moduleName) {
                var found, args, mod,
                    shim = getOwn(config.shim, moduleName) || {},
                    shExports = shim.exports;

                takeGlobalQueue();

                while (defQueue.length) {
                    args = defQueue.shift();
                    if (args[0] === null) {
                        args[0] = moduleName;
                        //If already found an anonymous module and bound it
                        //to this name, then this is some other anon module
                        //waiting for its completeLoad to fire.
                        if (found) {
                            break;
                        }
                        found = true;
                    } else if (args[0] === moduleName) {
                        //Found matching define call for this script!
                        found = true;
                    }

                    callGetModule(args);
                }

                //Do this after the cycle of callGetModule in case the result
                //of those calls/init calls changes the registry.
                mod = getOwn(registry, moduleName);

                if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
                    if (config.enforceDefine && (!shExports || !getGlobal(shExports))) {
                        if (hasPathFallback(moduleName)) {
                            return;
                        } else {
                            return onError(makeError('nodefine',
                                             'No define call for ' + moduleName,
                                             null,
                                             [moduleName]));
                        }
                    } else {
                        //A script that does not call define(), so just simulate
                        //the call for it.
                        callGetModule([moduleName, (shim.deps || []), shim.exportsFn]);
                    }
                }

                checkLoaded();
            },

            /**
             * Converts a module name to a file path. Supports cases where
             * moduleName may actually be just an URL.
             * Note that it **does not** call normalize on the moduleName,
             * it is assumed to have already been normalized. This is an
             * internal API, not a public one. Use toUrl for the public API.
             */
            nameToUrl: function (moduleName, ext, skipExt) {
                var paths, syms, i, parentModule, url,
                    parentPath, bundleId,
                    pkgMain = getOwn(config.pkgs, moduleName);

                if (pkgMain) {
                    moduleName = pkgMain;
                }

                bundleId = getOwn(bundlesMap, moduleName);

                if (bundleId) {
                    return context.nameToUrl(bundleId, ext, skipExt);
                }

                //If a colon is in the URL, it indicates a protocol is used and it is just
                //an URL to a file, or if it starts with a slash, contains a query arg (i.e. ?)
                //or ends with .js, then assume the user meant to use an url and not a module id.
                //The slash is important for protocol-less URLs as well as full paths.
                if (req.jsExtRegExp.test(moduleName)) {
                    //Just a plain path, not module name lookup, so just return it.
                    //Add extension if it is included. This is a bit wonky, only non-.js things pass
                    //an extension, this method probably needs to be reworked.
                    url = moduleName + (ext || '');
                } else {
                    //A module that needs to be converted to a path.
                    paths = config.paths;

                    syms = moduleName.split('/');
                    //For each module name segment, see if there is a path
                    //registered for it. Start with most specific name
                    //and work up from it.
                    for (i = syms.length; i > 0; i -= 1) {
                        parentModule = syms.slice(0, i).join('/');

                        parentPath = getOwn(paths, parentModule);
                        if (parentPath) {
                            //If an array, it means there are a few choices,
                            //Choose the one that is desired
                            if (isArray(parentPath)) {
                                parentPath = parentPath[0];
                            }
                            syms.splice(0, i, parentPath);
                            break;
                        }
                    }

                    //Join the path parts together, then figure out if baseUrl is needed.
                    url = syms.join('/');
                    url += (ext || (/^data\:|\?/.test(url) || skipExt ? '' : '.js'));
                    url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
                }

                return config.urlArgs ? url +
                                        ((url.indexOf('?') === -1 ? '?' : '&') +
                                         config.urlArgs) : url;
            },

            //Delegates to req.load. Broken out as a separate function to
            //allow overriding in the optimizer.
            load: function (id, url) {
                req.load(context, id, url);
            },

            /**
             * Executes a module callback function. Broken out as a separate function
             * solely to allow the build system to sequence the files in the built
             * layer in the right sequence.
             *
             * @private
             */
            execCb: function (name, callback, args, exports) {
                return callback.apply(exports, args);
            },

            /**
             * callback for script loads, used to check status of loading.
             *
             * @param {Event} evt the event from the browser for the script
             * that was loaded.
             */
            onScriptLoad: function (evt) {
                //Using currentTarget instead of target for Firefox 2.0's sake. Not
                //all old browsers will be supported, but this one was easy enough
                //to support and still makes sense.
                if (evt.type === 'load' ||
                        (readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
                    //Reset interactive script so a script node is not held onto for
                    //to long.
                    interactiveScript = null;

                    //Pull out the name of the module and the context.
                    var data = getScriptData(evt);
                    context.completeLoad(data.id);
                }
            },

            /**
             * Callback for script errors.
             */
            onScriptError: function (evt) {
                var data = getScriptData(evt);
                if (!hasPathFallback(data.id)) {
                    return onError(makeError('scripterror', 'Script error for: ' + data.id, evt, [data.id]));
                }
            }
        };

        context.require = context.makeRequire();
        return context;
    }

    /**
     * Main entry point.
     *
     * If the only argument to require is a string, then the module that
     * is represented by that string is fetched for the appropriate context.
     *
     * If the first argument is an array, then it will be treated as an array
     * of dependency string names to fetch. An optional function callback can
     * be specified to execute when all of those dependencies are available.
     *
     * Make a local req variable to help Caja compliance (it assumes things
     * on a require that are not standardized), and to give a short
     * name for minification/local scope use.
     */
    req = requirejs = function (deps, callback, errback, optional) {

        //Find the right context, use default
        var context, config,
            contextName = defContextName;

        // Determine if have config object in the call.
        if (!isArray(deps) && typeof deps !== 'string') {
            // deps is a config object
            config = deps;
            if (isArray(callback)) {
                // Adjust args if there are dependencies
                deps = callback;
                callback = errback;
                errback = optional;
            } else {
                deps = [];
            }
        }

        if (config && config.context) {
            contextName = config.context;
        }

        context = getOwn(contexts, contextName);
        if (!context) {
            context = contexts[contextName] = req.s.newContext(contextName);
        }

        if (config) {
            context.configure(config);
        }

        return context.require(deps, callback, errback);
    };

    /**
     * Support require.config() to make it easier to cooperate with other
     * AMD loaders on globally agreed names.
     */
    req.config = function (config) {
        return req(config);
    };

    /**
     * Execute something after the current tick
     * of the event loop. Override for other envs
     * that have a better solution than setTimeout.
     * @param  {Function} fn function to execute later.
     */
    req.nextTick = typeof setTimeout !== 'undefined' ? function (fn) {
        setTimeout(fn, 4);
    } : function (fn) { fn(); };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    req.version = version;

    //Used to filter out dependencies that are already paths.
    req.jsExtRegExp = /^\/|:|\?|\.js$/;
    req.isBrowser = isBrowser;
    s = req.s = {
        contexts: contexts,
        newContext: newContext
    };

    //Create default context.
    req({});

    //Exports some context-sensitive methods on global require.
    each([
        'toUrl',
        'undef',
        'defined',
        'specified'
    ], function (prop) {
        //Reference from contexts instead of early binding to default context,
        //so that during builds, the latest instance of the default context
        //with its config gets used.
        req[prop] = function () {
            var ctx = contexts[defContextName];
            return ctx.require[prop].apply(ctx, arguments);
        };
    });

    if (isBrowser) {
        head = s.head = document.getElementsByTagName('head')[0];
        //If BASE tag is in play, using appendChild is a problem for IE6.
        //When that browser dies, this can be removed. Details in this jQuery bug:
        //http://dev.jquery.com/ticket/2709
        baseElement = document.getElementsByTagName('base')[0];
        if (baseElement) {
            head = s.head = baseElement.parentNode;
        }
    }

    /**
     * Any errors that require explicitly generates will be passed to this
     * function. Intercept/override it if you want custom error handling.
     * @param {Error} err the error object.
     */
    req.onError = defaultOnError;

    /**
     * Creates the node for the load command. Only used in browser envs.
     */
    req.createNode = function (config, moduleName, url) {
        var node = config.xhtml ?
                document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') :
                document.createElement('script');
        node.type = config.scriptType || 'text/javascript';
        node.charset = 'utf-8';
        node.async = true;
        return node;
    };

    /**
     * Does the request to load a module for the browser case.
     * Make this a separate function to allow other environments
     * to override it.
     *
     * @param {Object} context the require context to find state.
     * @param {String} moduleName the name of the module.
     * @param {Object} url the URL to the module.
     */
    req.load = function (context, moduleName, url) {
        var config = (context && context.config) || {},
            node;
        if (isBrowser) {
            //In the browser so use a script tag
            node = req.createNode(config, moduleName, url);

            node.setAttribute('data-requirecontext', context.contextName);
            node.setAttribute('data-requiremodule', moduleName);

            //Set up load listener. Test attachEvent first because IE9 has
            //a subtle issue in its addEventListener and script onload firings
            //that do not match the behavior of all other browsers with
            //addEventListener support, which fire the onload event for a
            //script right after the script execution. See:
            //https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution
            //UNFORTUNATELY Opera implements attachEvent but does not follow the script
            //script execution mode.
            if (node.attachEvent &&
                    //Check if node.attachEvent is artificially added by custom script or
                    //natively supported by browser
                    //read https://github.com/jrburke/requirejs/issues/187
                    //if we can NOT find [native code] then it must NOT natively supported.
                    //in IE8, node.attachEvent does not have toString()
                    //Note the test for "[native code" with no closing brace, see:
                    //https://github.com/jrburke/requirejs/issues/273
                    !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) &&
                    !isOpera) {
                //Probably IE. IE (at least 6-8) do not fire
                //script onload right after executing the script, so
                //we cannot tie the anonymous define call to a name.
                //However, IE reports the script as being in 'interactive'
                //readyState at the time of the define call.
                useInteractive = true;

                node.attachEvent('onreadystatechange', context.onScriptLoad);
                //It would be great to add an error handler here to catch
                //404s in IE9+. However, onreadystatechange will fire before
                //the error handler, so that does not help. If addEventListener
                //is used, then IE will fire error before load, but we cannot
                //use that pathway given the connect.microsoft.com issue
                //mentioned above about not doing the 'script execute,
                //then fire the script load event listener before execute
                //next script' that other browsers do.
                //Best hope: IE10 fixes the issues,
                //and then destroys all installs of IE 6-9.
                //node.attachEvent('onerror', context.onScriptError);
            } else {
                node.addEventListener('load', context.onScriptLoad, false);
                node.addEventListener('error', context.onScriptError, false);
            }
            node.src = url;

            //For some cache cases in IE 6-8, the script executes before the end
            //of the appendChild execution, so to tie an anonymous define
            //call to the module name (which is stored on the node), hold on
            //to a reference to this node, but clear after the DOM insertion.
            currentlyAddingScript = node;
            if (baseElement) {
                head.insertBefore(node, baseElement);
            } else {
                head.appendChild(node);
            }
            currentlyAddingScript = null;

            return node;
        } else if (isWebWorker) {
            try {
                //In a web worker, use importScripts. This is not a very
                //efficient use of importScripts, importScripts will block until
                //its script is downloaded and evaluated. However, if web workers
                //are in play, the expectation that a build has been done so that
                //only one script needs to be loaded anyway. This may need to be
                //reevaluated if other use cases become common.
                importScripts(url);

                //Account for anonymous modules
                context.completeLoad(moduleName);
            } catch (e) {
                context.onError(makeError('importscripts',
                                'importScripts failed for ' +
                                    moduleName + ' at ' + url,
                                e,
                                [moduleName]));
            }
        }
    };

    function getInteractiveScript() {
        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript;
        }

        eachReverse(scripts(), function (script) {
            if (script.readyState === 'interactive') {
                return (interactiveScript = script);
            }
        });
        return interactiveScript;
    }

    //Look for a data-main script attribute, which could also adjust the baseUrl.
    if (isBrowser && !cfg.skipDataMain) {
        //Figure out baseUrl. Get it from the script tag with require.js in it.
        eachReverse(scripts(), function (script) {
            //Set the 'head' where we can append children by
            //using the script's parent.
            if (!head) {
                head = script.parentNode;
            }

            //Look for a data-main attribute to set main script for the page
            //to load. If it is there, the path to data main becomes the
            //baseUrl, if it is not already set.
            dataMain = script.getAttribute('data-main');
            if (dataMain) {
                //Preserve dataMain in case it is a path (i.e. contains '?')
                mainScript = dataMain;

                //Set final baseUrl if there is not already an explicit one.
                if (!cfg.baseUrl) {
                    //Pull off the directory of data-main for use as the
                    //baseUrl.
                    src = mainScript.split('/');
                    mainScript = src.pop();
                    subPath = src.length ? src.join('/')  + '/' : './';

                    cfg.baseUrl = subPath;
                }

                //Strip off any trailing .js since mainScript is now
                //like a module name.
                mainScript = mainScript.replace(jsSuffixRegExp, '');

                 //If mainScript is still a path, fall back to dataMain
                if (req.jsExtRegExp.test(mainScript)) {
                    mainScript = dataMain;
                }

                //Put the data-main script in the files to load.
                cfg.deps = cfg.deps ? cfg.deps.concat(mainScript) : [mainScript];

                return true;
            }
        });
    }

    /**
     * The function that handles definitions of modules. Differs from
     * require() in that a string for the module should be the first argument,
     * and the function to execute after dependencies are loaded should
     * return a value to define the module corresponding to the first argument's
     * name.
     */
    define = function (name, deps, callback) {
        var node, context;

        //Allow for anonymous modules
        if (typeof name !== 'string') {
            //Adjust args appropriately
            callback = deps;
            deps = name;
            name = null;
        }

        //This module may not have dependencies
        if (!isArray(deps)) {
            callback = deps;
            deps = null;
        }

        //If no name, and callback is a function, then figure out if it a
        //CommonJS thing with dependencies.
        if (!deps && isFunction(callback)) {
            deps = [];
            //Remove comments from the callback string,
            //look for require calls, and pull them into the dependencies,
            //but only if there are function args.
            if (callback.length) {
                callback
                    .toString()
                    .replace(commentRegExp, '')
                    .replace(cjsRequireRegExp, function (match, dep) {
                        deps.push(dep);
                    });

                //May be a CommonJS thing even without require calls, but still
                //could use exports, and module. Avoid doing exports and module
                //work though if it just needs require.
                //REQUIRES the function to expect the CommonJS variables in the
                //order listed below.
                deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
            }
        }

        //If in IE 6-8 and hit an anonymous define() call, do the interactive
        //work.
        if (useInteractive) {
            node = currentlyAddingScript || getInteractiveScript();
            if (node) {
                if (!name) {
                    name = node.getAttribute('data-requiremodule');
                }
                context = contexts[node.getAttribute('data-requirecontext')];
            }
        }

        //Always save off evaluating the def call until the script onload handler.
        //This allows multiple modules to be in a file without prematurely
        //tracing dependencies, and allows for anonymous module support,
        //where the module name is not known until the script onload event
        //occurs. If no context, use the global queue, and get it processed
        //in the onscript load callback.
        (context ? context.defQueue : globalDefQueue).push([name, deps, callback]);
    };

    define.amd = {
        jQuery: true
    };


    /**
     * Executes the text. Normally just uses eval, but can be modified
     * to use a better, environment-specific call. Only used for transpiling
     * loader plugins, not for plain JS modules.
     * @param {String} text the text to execute/evaluate.
     */
    req.exec = function (text) {
        /*jslint evil: true */
        return eval(text);
    };

    //Set up with config info.
    req(cfg);
}(this));

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        //Allow using this built library as an AMD module
        //in another project. That other project will only
        //see this AMD call, not the internal modules in
        //the closure below.
        define('Rebound', factory);
    } else {
        //Browser globals case. Just assign the
        //result to a property on the global.
        root.Rebound = factory();
    }
}(this, function () {

    // Start custom elements observer if using polyfill
    if(window.CustomElements)
      window.CustomElements.observeDocument(document)

    //almond, and your modules will be inlined here
define("htmlbars-runtime/utils", 
  ["exports"],
  function(__exports__) {
    
    function merge(options, defaults) {
      for (var prop in defaults) {
        if (options.hasOwnProperty(prop)) { continue; }
        options[prop] = defaults[prop];
      }
      return options;
    }

    __exports__.merge = merge;
  });
define("morph/morph", 
  ["exports"],
  function(__exports__) {
    
    var splice = Array.prototype.splice;

    function Morph(parent, start, end, domHelper, contextualElement) {
      // TODO: this is an internal API, this should be an assert
      if (parent.nodeType === 11) {
        if (start === null || end === null) {
          throw new Error('a fragment parent must have boundary nodes in order to detect insertion');
        }
        this.element = null;
      } else {
        this.element = parent;
      }
      this._parent = parent;
      this.start = start;
      this.end = end;
      this.domHelper = domHelper;
      if (!contextualElement || contextualElement.nodeType !== Node.ELEMENT_NODE) {
        throw new Error('An element node must be provided for a contextualElement, you provided '+(contextualElement ? 'nodeType '+contextualElement.nodeType : 'nothing'));
      }
      this.contextualElement = contextualElement;
      this.text = null;
      this.owner = null;
      this.morphs = null;
      this.before = null;
      this.after = null;
      this.escaped = true;
    }

    Morph.prototype.parent = function () {
      if (!this.element) {
        var parent = this.start.parentNode;
        if (this._parent !== parent) {
          this.element = this._parent = parent;
        }
      }
      return this._parent;
    };

    Morph.prototype.destroy = function () {
      if (this.owner) {
        this.owner.removeMorph(this);
      } else {
        clear(this.element || this.parent(), this.start, this.end);
      }
    };

    Morph.prototype.removeMorph = function (morph) {
      var morphs = this.morphs;
      for (var i=0, l=morphs.length; i<l; i++) {
        if (morphs[i] === morph) {
          this.replace(i, 1);
          break;
        }
      }
    };

    Morph.prototype.update = function (nodeOrString) {
      this._update(this.element || this.parent(), nodeOrString);
    };

    Morph.prototype.updateNode = function (node) {
      var parent = this.element || this.parent();
      if (!node) return this._updateText(parent, '');
      this._updateNode(parent, node);
    };

    Morph.prototype.updateText = function (text) {
      this._updateText(this.element || this.parent(), text);
    };

    Morph.prototype.updateHTML = function (html) {
      var parent = this.element || this.parent();
      if (!html) return this._updateText(parent, '');
      this._updateHTML(parent, html);
    };

    Morph.prototype._update = function (parent, nodeOrString) {
      if (nodeOrString === null || nodeOrString === undefined) {
        this._updateText(parent, '');
      } else if (typeof nodeOrString === 'string') {
        if (this.escaped) {
          this._updateText(parent, nodeOrString);
        } else {
          this._updateHTML(parent, nodeOrString);
        }
      } else if (nodeOrString.nodeType) {
        this._updateNode(parent, nodeOrString);
      } else if (nodeOrString.string) { // duck typed SafeString
        this._updateHTML(parent, nodeOrString.string);
      } else {
        this._updateText(parent, nodeOrString.toString());
      }
    };

    Morph.prototype._updateNode = function (parent, node) {
      if (this.text) {
        if (node.nodeType === 3) {
          this.text.nodeValue = node.nodeValue;
          return;
        } else {
          this.text = null;
        }
      }
      var start = this.start, end = this.end;
      clear(parent, start, end);
      parent.insertBefore(node, end);
      if (this.before !== null) {
        this.before.end = start.nextSibling;
      }
      if (this.after !== null) {
        this.after.start = end.previousSibling;
      }
    };

    Morph.prototype._updateText = function (parent, text) {
      if (this.text) {
        this.text.nodeValue = text;
        return;
      }
      var node = this.domHelper.createTextNode(text);
      this.text = node;
      clear(parent, this.start, this.end);
      parent.insertBefore(node, this.end);
      if (this.before !== null) {
        this.before.end = node;
      }
      if (this.after !== null) {
        this.after.start = node;
      }
    };

    Morph.prototype._updateHTML = function (parent, html) {
      var start = this.start, end = this.end;
      clear(parent, start, end);
      this.text = null;
      var childNodes = this.domHelper.parseHTML(html, this.contextualElement);
      appendChildren(parent, end, childNodes);
      if (this.before !== null) {
        this.before.end = start.nextSibling;
      }
      if (this.after !== null) {
        this.after.start = end.previousSibling;
      }
    };

    Morph.prototype.append = function (node) {
      if (this.morphs === null) this.morphs = [];
      var index = this.morphs.length;
      return this.insert(index, node);
    };

    Morph.prototype.insert = function (index, node) {
      if (this.morphs === null) this.morphs = [];
      var parent = this.element || this.parent(),
        morphs = this.morphs,
        before = index > 0 ? morphs[index-1] : null,
        after  = index < morphs.length ? morphs[index] : null,
        start  = before === null ? this.start : (before.end === null ? parent.lastChild : before.end.previousSibling),
        end    = after === null ? this.end : (after.start === null ? parent.firstChild : after.start.nextSibling),
        morph  = new Morph(parent, start, end, this.domHelper, this.contextualElement);
      morph.owner = this;
      morph._update(parent, node);
      if (before !== null) {
        morph.before = before;
        before.end = start.nextSibling;
        before.after = morph;
      }
      if (after !== null) {
        morph.after = after;
        after.before = morph;
        after.start = end.previousSibling;
      }
      this.morphs.splice(index, 0, morph);
      return morph;
    };

    Morph.prototype.replace = function (index, removedLength, addedNodes) {
      if (this.morphs === null) this.morphs = [];
      var parent = this.element || this.parent(),
        morphs = this.morphs,
        before = index > 0 ? morphs[index-1] : null,
        after = index+removedLength < morphs.length ? morphs[index+removedLength] : null,
        start = before === null ? this.start : (before.end === null ? parent.lastChild : before.end.previousSibling),
        end   = after === null ? this.end : (after.start === null ? parent.firstChild : after.start.nextSibling),
        addedLength = addedNodes === undefined ? 0 : addedNodes.length,
        args, i, current;

      if (removedLength > 0) {
        clear(parent, start, end);
      }

      if (addedLength === 0) {
        if (before !== null) {
          before.after = after;
          before.end = end;
        }
        if (after !== null) {
          after.before = before;
          after.start = start;
        }
        morphs.splice(index, removedLength);
        return;
      }

      args = new Array(addedLength+2);
      if (addedLength > 0) {
        for (i=0; i<addedLength; i++) {
          args[i+2] = current = new Morph(parent, start, end, this.domHelper, this.contextualElement);
          current._update(parent, addedNodes[i]);
          current.owner = this;
          if (before !== null) {
            current.before = before;
            before.end = start.nextSibling;
            before.after = current;
          }
          before = current;
          start = end === null ? parent.lastChild : end.previousSibling;
        }
        if (after !== null) {
          current.after = after;
          after.before = current;
          after.start = end.previousSibling;
        }
      }

      args[0] = index;
      args[1] = removedLength;

      splice.apply(morphs, args);
    };

    function appendChildren(parent, end, nodeList) {
      var ref = end,
          i = nodeList.length,
          node;
      while (i--) {
        node = nodeList[i];
        parent.insertBefore(node, ref);
        ref = node;
      }
    }

    function clear(parent, start, end) {
      var current, previous;
      if (end === null) {
        current = parent.lastChild;
      } else {
        current = end.previousSibling;
      }

      while (current !== null && current !== start) {
        previous = current.previousSibling;
        parent.removeChild(current);
        current = previous;
      }
    }

    __exports__["default"] = Morph;
  });
define("morph/dom-helper", 
  ["morph/morph","exports"],
  function(__dependency1__, __exports__) {
    
    var Morph = __dependency1__["default"];

    var emptyString = '';

    var deletesBlankTextNodes = (function(){
      var element = document.createElement('div');
      element.appendChild( document.createTextNode('') );
      var clonedElement = element.cloneNode(true);
      return clonedElement.childNodes.length === 0;
    })();

    var ignoresCheckedAttribute = (function(){
      var element = document.createElement('input');
      element.setAttribute('checked', 'checked');
      var clonedElement = element.cloneNode(false);
      return !clonedElement.checked;
    })();

    /*
     * A class wrapping DOM functions to address environment compatibility,
     * namespaces, contextual elements for morph un-escaped content
     * insertion.
     *
     * When entering a template, a DOMHelper should be passed:
     *
     *   template(context, { hooks: hooks, dom: new DOMHelper() });
     *
     * TODO: support foreignObject as a passed contextual element. It has
     * a namespace (svg) that does not match its internal namespace
     * (xhtml).
     *
     * @class DOMHelper
     * @constructor
     * @param {HTMLDocument} _document The document DOM methods are proxied to
     */
    function DOMHelper(_document){
      this.document = _document || window.document;
    }

    var prototype = DOMHelper.prototype;
    prototype.constructor = DOMHelper;

    prototype.appendChild = function(element, childElement) {
      element.appendChild(childElement);
    };

    prototype.appendText = function(element, text) {
      element.appendChild(this.document.createTextNode(text));
    };

    prototype.setAttribute = function(element, name, value) {
      element.setAttribute(name, value);
    };

    prototype.createElement = function(tagName) {
      if (this.namespaceURI) {
        return this.document.createElementNS(this.namespaceURI, tagName);
      } else {
        return this.document.createElement(tagName);
      }
    };

    prototype.createDocumentFragment = function(){
      return this.document.createDocumentFragment();
    };

    prototype.createTextNode = function(text){
      return this.document.createTextNode(text);
    };

    prototype.repairClonedNode = function(element, blankChildTextNodes, isChecked){
      if (deletesBlankTextNodes && blankChildTextNodes.length > 0) {
        for (var i=0, len=blankChildTextNodes.length;i<len;i++){
          var textNode = document.createTextNode(emptyString),
              offset = blankChildTextNodes[i],
              before = element.childNodes[offset];
          if (before) {
            element.insertBefore(textNode, before);
          } else {
            element.appendChild(textNode);
          }
        }
      }
      if (ignoresCheckedAttribute && isChecked) {
        element.setAttribute('checked', 'checked');
      }
    };

    prototype.cloneNode = function(element, deep){
      var clone = element.cloneNode(!!deep);
      return clone;
    };

    prototype.createMorph = function(parent, start, end, contextualElement){
      if (!contextualElement && parent.nodeType === Node.ELEMENT_NODE) {
        contextualElement = parent;
      }
      if (!contextualElement) {
        contextualElement = this.document.body;
      }
      return new Morph(parent, start, end, this, contextualElement);
    };

    // This helper is just to keep the templates good looking,
    // passing integers instead of element references.
    prototype.createMorphAt = function(parent, startIndex, endIndex, contextualElement){
      var childNodes = parent.childNodes,
          start = startIndex === -1 ? null : childNodes[startIndex],
          end = endIndex === -1 ? null : childNodes[endIndex];
      return this.createMorph(parent, start, end, contextualElement);
    };

    prototype.parseHTML = function(html, contextualElement){
      var element = this.cloneNode(contextualElement, false);
      element.innerHTML = html;
      return element.childNodes;
    };

    __exports__["default"] = DOMHelper;
  });
define("rebound/lazy-value", 
  ["exports"],
  function(__exports__) {
    
    var NIL = function NIL(){}, // TODO: microoptimize... object literal or fn? :P
        EMPTY_ARRAY = [];

    function LazyValue(fn) {
      this.valueFn = fn;
    }

    // TODO: Function.prototype.makeLazy helper?

    LazyValue.prototype = {
      isLazyValue: true,
      parent: null, // TODO: is parent even needed? could be modeled as a subscriber
      children: null,
      observers: null,
      cache: NIL,
      valueFn: null,
      subscribers: null, // TODO: do we need multiple subscribers?
      _childValues: null, // just for reusing the array, might not work well if children.length changes after computation

      value: function() {
        var cache = this.cache;
        if (cache !== NIL) { return cache; }

        var children = this.children;
        if (children) {
          var child,
              values = this._childValues || new Array(children.length);

          for (var i = 0, l = children.length; i < l; i++) {
            child = children[i];
            values[i] = (child && child.isLazyValue) ? child.value() : child;
          }

          return this.cache = this.valueFn(values);
        } else {
          return this.cache = this.valueFn(EMPTY_ARRAY);
        }
      },

      addDependentValue: function(value) {
        var children = this.children;
        if (!children) {
          children = this.children = [value];
        } else {
          children.push(value);
        }

        if (value && value.isLazyValue) { value.parent = this; }

        return this;
      },

      saveObserver: function(value) {
        var observers = this.observers;
        if (!observers) {
          observers = this.observers = [value];
        } else {
          observers.push(value);
        }

        return this;
      },

      notify: function(sender) {
        var cache = this.cache,
            parent,
            subscribers;

        if (cache !== NIL) {
          parent = this.parent;
          subscribers = this.subscribers;
          cache = this.cache = NIL;

          if (parent) { parent.notify(this); }
          if (!subscribers) { return; }
          for (var i = 0, l = subscribers.length; i < l; i++) {
            subscribers[i](this); // TODO: should we worry about exception handling?
          }
        }
      },

      onNotify: function(callback) {
        var subscribers = this.subscribers;
        if (!subscribers) {
          subscribers = this.subscribers = [callback];
        } else {
          subscribers.push(callback);
        }
        return this;
      },

      destroy: function() {
        _.each(this.children, function(child){
          if (child && child.isLazyValue){ child.destroy(); }
        });
        _.each(this.subscribers, function(subscriber){
          if (subscriber && subscriber.isLazyValue){ subscriber.destroy(); }
        });

        this.parent = this.children = this.cache = this.valueFn = this.subscribers = this._childValues = null;
        _.each(this.observers, function(observer){
          delete observer.context.__observers[observer.path][observer.index];
        });

        this.observers = null;
      }
    };

    __exports__["default"] = LazyValue;
  });
define("rebound/util", 
  ["exports"],
  function(__exports__) {
    
    var util = {};

    // Applies function `func` to every node in the tree starting from `node`
    util.walkTheDOM = function(node, func) {
        func(node);
        node = node.firstChild;
        while (node) {
            util.walkTheDOM(node, func);
            node = node.nextSibling;
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
    util.deepDefaults = function(obj) {
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
                  obj[prop] = util.deepDefaults([], def[prop].models);
                }
                else if(_.isArray(def[prop])){
                  obj[prop] = util.deepDefaults([], def[prop]);
                }
                else if((def[prop].isModel)){
                  obj[prop] = util.deepDefaults({}, def[prop].attributes);
                }
                else{
                  obj[prop] = util.deepDefaults({}, def[prop]);
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
                obj[prop] = util.deepDefaults({}, obj[prop].attributes, def[prop]);
              }
              else{
                obj[prop] = util.deepDefaults({}, obj[prop], def[prop]);
              }
            }
          }
        }
      });

      return obj;
    };

    __exports__["default"] = util;
  });
define("rebound/helpers", 
  ["rebound/lazy-value","exports"],
  function(__dependency1__, __exports__) {
    
    var LazyValue = __dependency1__["default"];

    var helpers = {},
        partials = {};

    helpers.registerPartial = function(name, func){
      if(_.isFunction(func) && typeof name === 'string'){
        partials[name] = func;
      }
    };

    /*******************************
            Default helpers
    ********************************/

    helpers.on = function(params, hash, options, env){
      var id = $(options.element).attr('data-event') || _.uniqueId('event'),
          i, callback,
          len = params.length,
          delegate = hash.selector || '[data-event='+id+']',
          data = hash.data && hash.data.isLazyValue && hash.data.value() || hash.data || options.context;

      // Set our element's data-event id
      $(options.element).attr('data-event', id);

      // Make sure we only attach once for each combination of delagate selector and callback
      for(i = 1; i<len; i++){
        callback = params[i];
        $(env.dom.document).on(params[0], delegate, data, function(event){
          return options.helpers.__callOnController(callback, event);
        });
        // this.outlet.off(eventName, delegate, this[params[i]]).on(eventName, delegate, data, this[params[i]]);
      }
    };

    helpers.action = function(params, hash, options, env){

    };

    helpers.length = function(params, hash, options, env){
        return params[0] && params[0].length || 0;
    };

    // Attribute helper handles binding data to dom attributes
    helpers.attribute = function(params, hash, options, env) {
      var checkboxChange,
          type = options.element.getAttribute("type"),
          inputTypes = {'text':true, 'email':true, 'password':true, 'search':true, 'url':true, 'tel':true,},
          attr;

      // If is a text input element's value prop with only one variable, wire default events
      if(options.element.tagName === 'INPUT' && inputTypes[type] && params[0] === 'value' && !options.params[1].children ){

        // If our special input events have not been bound yet, bind them and set flag
        if(!options.lazyValue.eventsBound){

          // If a submit action has been set
          attr = $(options.element).attr('rebound-action');
          $(options.element).on('input propertychange', options.context, function(event){
            options.context.set(options.params[1].path, this.value);
          });
          $(options.element).on('keyup', options.context, function(event){
            if(event.keyCode === 13 && attr){
              options.helpers.__callOnController(attr, event);
            }
          });

          options.lazyValue.eventsBound = true;
        }

        return options.context.get(options.params[1].path);
      }

      if(options.element.tagName === 'INPUT' && options.element.getAttribute("type") === 'checkbox' && params[0] === 'checked' && !options.params[1].children ){

        // If our special input events have not been bound yet, bind them and set flag
        if(!options.lazyValue.eventsBound){
          $(options.element).on('change', function(){
            options.context.set(options.params[1].path, this.checked);
          });

          options.lazyValue.eventsBound = true;
        }

        return options.element.checked = (params[1]) ? true : undefined;
      }

      return params[1];
    };

    helpers.concat = function(params, hash, options, env) {
      var value = "";
      for (var i = 0, l = params.length; i < l; i++) {
        value += params[i];
      }
      return value;
    };

    helpers.if = function(params, hash, options, env){
      var condition = params[0];

      if(condition === undefined){ return console.log("Condition passed to if helper is undefined!"); }

      if(condition.isModel){
        condition = true;
      }

      // If our condition is an array, handle properly
      if(_.isArray(condition) || Backbone && condition.isCollection){
        condition = condition.length ? true : false;
      }

      if(condition === 'true'){ condition = true; }
      if(condition === 'false'){ condition = false; }

      // If more than one param, this is not a block helper. Eval as such.
      if(params.length > 1){
        return (condition) ? params[1] : ( params[2] || '');
      }

      // Check our cache. If the value hasn't actually changed, don't evaluate. Important for re-rendering of #each helpers.
      if(options.placeholder.__ifCache === condition){
        return undefined;
      }

      options.placeholder.__ifCache = condition;

      // Render the apropreate block statement
      if(condition && typeof options.render === 'function'){
        return options.render(options.context, options);
      }
      else if(!condition && typeof options.inverse === 'function'){
        return options.inverse(options.context, options);
      }

      return '';
    };


    // TODO: Proxy to if helper with inverted params
    helpers.unless = function(params, hash, options, env){
      var condition = params[0];

      if(condition === undefined){ return console.log("Condition passed to unless helper is undefined!"); }

      if(condition.isModel){
        condition = true;
      }

      // If our condition is an array, handle properly
      if(_.isArray(condition) || Backbone && condition.isCollection){
        condition = condition.length ? true : false;
      }

      // If more than one param, this is not a block helper. Eval as such.
      if(params.length > 1){
        return (!condition) ? params[1] : ( params[2] || '');
      }

      // Check our cache. If the value hasn't actually changed, don't evaluate. Important for re-rendering of #each helpers.
      if(options.placeholder.__unlessCache === condition){ return undefined; }

      options.placeholder.__unlessCache = condition;

      // Render the apropreate block statement
      if(!condition && typeof options.render === 'function'){
        return options.render(options.context, options);
      }
      else if(condition && typeof options.inverse === 'function'){
        return options.inverse(options.context, options);
      }

      return '';
    };

    // Given an array, predicate and optional extra variable, finds the index in the array where predicate is true
    function findIndex(arr, predicate, cid) {
      if (arr == null) {
        throw new TypeError('findIndex called on null or undefined');
      }
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }
      var list = Object(arr);
      var length = list.length >>> 0;
      var thisArg = arguments[1];
      var value;

      for (var i = 0; i < length; i++) {
        value = list[i];
        if (predicate.call(thisArg, value, i, list, cid)) {
          return i;
        }
      }
      return -1;
    }

    helpers.each = function(params, hash, options, env){

      if(_.isNull(params[0]) || _.isUndefined(params[0])){ console.error('Undefined value passed to each helper. Provide a default value.'); return; }

      var value = (params[0].isCollection) ? params[0].models : params[0], // Accepts collections or arrays
          start, end, // used below to remove trailing junk morphs from the dom
          position, // Stores the iterated element's integer position in the dom list
          currentModel = function(element, index, array, cid){
            return element.cid === cid; // Returns true if currently observed element is the current model.
          };

      // Create our morph array if it doesnt exist
      options.placeholder.morphs = options.placeholder.morphs || [];

      _.each(value, function(obj, key, list){

        position = findIndex(options.placeholder.morphs, currentModel, obj.cid);

        // Even if rendered already, update each element's index, key, first and last in case of order changes or element removals
        if(_.isArray(value)){
          obj.set({'@index': key, '@first': (key === 0), '@last': (key === value.length-1)}, {silent: true});
        }

        if(!_.isArray(value) && _.isObject(value)){
          obj.set({'@key' : key}, {silent: true});
        }

        // If this model is not the morph element at this index
        if(position !== key){

          // If this model was added silently, but is now being rendered, removing it will need to update the dom.
          if(obj.__silent){ delete obj.__silent; }

          // Create a lazyvalue whos value is the content inside our block helper rendered in the context of this current list object. Returns the rendered dom for this list element.
          var lazyValue = new LazyValue(function(){
            return options.render(obj, options);
          });

          // If this model is rendered somewhere else in the list, destroy it
          if(position > -1){
            options.placeholder.morphs[position].destroy();
          }

          // Destroy the morph we're replacing
          if(options.placeholder.morphs[key]){
            options.placeholder.morphs[key].destroy();
          }

          // Insert our newly rendered value (a document tree) into our placeholder (the containing element) at its requested position (where we currently are in the object list)
          options.placeholder.insert(key, lazyValue.value());

          // Label the inserted morph element with this model's cid
          options.placeholder.morphs[key].cid = obj.cid;

        }

      }, this);

      // If any more morphs are left over, remove them. We've already gone through all the models.
      start = value.length;
      end = options.placeholder.morphs.length - 1;
      for(end; start <= end; end--){
        options.placeholder.morphs[end].destroy();
      }

      // No need for a return statement. Our placeholder (containing element) now has all the dom we need.

    };

    helpers.with = function(params, hash, options, env){

      // Render the content inside our block helper with the context of this object. Returns a dom tree.
      return options.render(params[0], options);

      // TODO: Needs data binding?...

    };

    helpers.partial = function(params, hash, options, env){

      if(typeof partials[params[0]] === 'function'){
        return partials[params[0]](options.context, env);
      }

    };

    __exports__["default"] = helpers;
  });
define("rebound/hooks", 
  ["rebound/lazy-value","rebound/util","rebound/helpers","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    
    var LazyValue = __dependency1__["default"];
    var util = __dependency2__["default"];
    var defaultHelpers = __dependency3__["default"];


    var hooks = {},
        helpers = {},
        components = {};

    /*******************************
            Hook Utils
    ********************************/

    // Given a model and a path return the raw value at that path
    function getRaw(context, path) {
      // Get function now checks for collection, model or vanillajs object. Accesses appropreately.
      var parts  = {},
          result = {};

      // Split the path at all '.', '[' and ']' and find the value referanced.
      parts = _.compact(path.split(/(?:\.|\[|\])+/));
      // If no path, return current object, otherwise get value of the path
      result = context;

      if (parts.length > 0) {
        for (var i = 0, l = parts.length; i < l; i++) {
          if(_.isFunction(result)){
            result = result();
          }
          else if(result.isCollection){
            result = result.models[parts[i]];
          }
          else if(result.isModel){
            result = result.attributes[parts[i]];
          }
          else if(result && result[parts[i]]){
            result = result[parts[i]];
          }
          else{
            result = '';
          }
        }
      }

      return result;

    }

    // Takes the raw value at that path and makes it pretty. Computed values are evaluated, undefineds are empty strings
    function get(context, path) {
      var val = getRaw(context, path);
      if( _.isFunction(val)){ return val.call(context); }
      return val;
    }

    // Returns the computed property's function if true, else false
    function isComputedProperty(model, path){
      return _.isFunction(getRaw(model, path));
    }

    // Add a callback to a given context to trigger when its value at 'path' changes.
    function addObserver(context, path, lazyValue, morph) {
      var length;

      // Ensure _observers exists and is an object
      context.__observers = context.__observers || {};
      // Ensure __obxervers[path] exists and is an array
      context.__observers[path] = context.__observers[path] || [];

      // Save the position this is being inserted into the observers array so we can garbage collect later
      length = context.__observers[path].length;

      // Add our callback
      context.__observers[path].push(function() {
        // TODO: Add a garbage collector that periodically walks over the data and cleans observers? May not be needed.
        try{
          return lazyValue.notify();
        } catch(err) {
          // If we run into an error running notify, that means we have a dead dependancy chain. Kill it.
          console.log('KILLING OBSERVER', context.__observers, path, length);
          console.log(err.stack);
          lazyValue.destroy();
          delete context.__observers[path][length];
        }
      });

      return {context: context, path: path, index: length};
    }

    function addComputedPropertyObservers(lazyValue, helper, context, morph){

      if(_.isArray(helper.__params)){
        var len = helper.__params.length;
        // For each extra paramater dependancy, computed or user provided
        for (var i = 0; i < len; i++) {

          if(_.isString(helper.__params[i])){

            // If it contains an @each statement in the path,
            if(helper.__params[i].indexOf('@each') > 0){

              // TODO: If the property is n levels deep in nested collections, handle that
              var collectionPath = helper.__params[i].split(/\.?@each\.?/);

              // Delagated on the collection, when the collection receives a change event for the specified child model attribute, notify our lazyvalue.
              lazyValue.saveObserver(addObserver(get(context, collectionPath[0]), '@each.' + collectionPath[1], lazyValue, morph));

              // Listen to collection changes (add, remove, reset, etc)
              lazyValue.saveObserver(addObserver(context, collectionPath[0], lazyValue, morph));

            }
            else{
              lazyValue.saveObserver(addObserver(context, helper.__params[i], lazyValue, morph));
            }
          }
        }
      }
    }

    function streamComputedProperty(context, path, morph, options ){

      // Our raw computed property function
      var helper = getRaw(context, path),

      // New lazy value calls each of this computed property's observers and returns its value
      lazyValue = new LazyValue(function() {

        // Notify all computed properties that depend on this computed property of its change
        if(_.isArray(context.__observers[path])){
          _.each(context.__observers[path], function(callback, index) {
            if(callback){
              callback();
            }
            else{
              delete context.__observers[path][index];
            }
          });
        }

        return get(context, path);
      });

      // Save our path so parent lazyvalues can know the data var or helper they are getting info from
      lazyValue.path = path;

      // If we have custom defined observers, bind to those vars.
      addComputedPropertyObservers(lazyValue, helper, context, morph);

      return lazyValue;
    }

    // Given an object (context) and a path, create a LazyValue object that returns the value of object at context and add it as an observer of the context.
    function streamStaticProperty(context, path, morph, options) {
      // Lazy value that returns the value of context.path
      var lazyValue = new LazyValue(function() {
        return get(context, path);
      });

      // Save our path so parent lazyvalues can know the data var or helper they are getting info from
      lazyValue.path = path;

      // Whenever context.path changes, have LazyValue notify its listeners.
      lazyValue.saveObserver(addObserver(context, path, lazyValue, morph));

      return lazyValue;
    }

    function streamifyArgs(context, params, options, helpers) {
      // Convert ID params to streams
      var morph = options.placeholder || options.element || true;

      for (var i = 0, l = params.length; i < l; i++) {
        if (options.types[i] === 'id') {
          if (isComputedProperty(context, params[i])){
            params[i] = streamComputedProperty(context, params[i], morph, options);
          }
          else {
            params[i] = streamStaticProperty(context, params[i], morph, options);
          }
        }
      }

      // Convert hash ID values to streams
      var hash = options.hash,
          hashTypes = options.hashTypes;
      for (var key in hash) {
        if (hashTypes[key] === 'id') {
          if (isComputedProperty(context, params[i])){
            hash[key] = streamComputedProperty(context, hash[key], morph, options);
          }
          else {
            hash[key] = streamStaticProperty(context, hash[key], morph, options);
          }
        }
      }
    }

    // lookupHelper returns the given function from the helpers object. Manual checks prevent user from overriding reserved words.
    function lookupHelper(name, env) {
      if(name === 'attribute') { return defaultHelpers.attribute; }
      if(name === 'if') { return defaultHelpers.if; }
      if(name === 'unless') { return defaultHelpers.unless; }
      if(name === 'each') { return defaultHelpers.each; }
      if(name === 'with') { return defaultHelpers.with; }
      if(name === 'partial') { return defaultHelpers.partial; }
      if(name === 'concat') { return defaultHelpers.concat; }
      if(name === 'on') { return defaultHelpers.on; }
      if(name === 'action') { return defaultHelpers.action; }
      return helpers[name];
    }

    function constructHelper(el, path, context, params, options, env, helper) {
      var lazyValue;

      // Extend options with the helper's containeing Morph element. Used by streamify to track data observers
      options.placeholder = el && !el.tagName && el || false; // FIXME: this kinda sucks
      options.element = el && el.tagName && el || false;      // FIXME: this kinda sucks

      // For each argument passed to our helper, turn them into LazyValues. Params array is now an array of lazy values that will trigger when their value changes.
      streamifyArgs(context, params, options, env.helpers);

      // Extend options with hooks and helpers for any subsequent calls from a lazyvalue
      options.params = params;                                 // FIXME: this kinda sucks
      options.hooks = env.hooks;                               // FIXME: this kinda sucks
      options.helpers = env.helpers;                           // FIXME: this kinda sucks
      options.context = context;                               // FIXME: this kinda sucks
      options.dom = env.dom;                                   // FIXME: this kinda sucks
      options.path = path;                                     // FIXME: this kinda sucks

      // Create a lazy value that returns the value of our evaluated helper.
      options.lazyValue = new LazyValue(function() {
        var len = params.length,
            i,
            plainParams = [],
            plainHash = [];

        // Assemble our args and hash variables. For each lazyvalue param, push the lazyValue's value so helpers with no concept of lazyvalues.
        for(i=0; i<len; i++){
          plainParams.push(( (params[i].isLazyValue) ? params[i].value() : params[i] ));
        }

        _.each(options.hash, function(hash, key){
          plainHash[key] = (hash.isLazyValue) ? hash.value() : hash;
        });

        // Call our helper functions with our assembled args.
        return helper.apply(context, [plainParams, plainHash, options, env]);
      });

      options.lazyValue.path = path;

      // For each param passed to our helper, add it to our helper's dependant list. Helper will re-evaluate when one changes.
      params.forEach(function(node) {
        if(node.isLazyValue){
          // Re-evaluate this expression when our condition changes
          node.onNotify(function(){
            options.lazyValue.value();
          });
        }

        if (node && typeof node === 'string' || node && node.isLazyValue) {
          options.lazyValue.addDependentValue(node);
        }
      });

      // If we have custom defined observers, bind to those vars.
      addComputedPropertyObservers(options.lazyValue, helper, context, (options.placeholder || options.element));

      return options.lazyValue;
    }

    // Given a root element, cleans all of the morph lazyValues for a given subtree
    // TODO: Theres probably a more efficient way to write this function.
    function cleanSubtree(mutations, observer){
      // For each mutation observed, if there are nodes removed, destroy all associated lazyValues
      mutations.forEach(function(mutation) {
        if(mutation.removedNodes){
          _.each(mutation.removedNodes, function(node, index){
            util.walkTheDOM(node, function(n){
              if(n.__lazyValue && n.__lazyValue.destroy()){
                n.__lazyValue.destroy();
              }
            });
          });
        }
      });

    }

    var subtreeObserver = new MutationObserver(cleanSubtree);

    /*******************************
            Default Hooks
    ********************************/

    hooks.content = function(placeholder, path, context, params, options, env) {

      var lazyValue,
          value,
          observer = subtreeObserver,
          helper = lookupHelper(path, env);

      // TODO: just set escaped on the placeholder in HTMLBars
      placeholder.escaped = options.escaped;

      // If we were passed a helper, and it was found in our registered helpers
      if (helper) {
        // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
        lazyValue = constructHelper(placeholder, path, context, params, options, env, helper);
      } else {
        // If not a helper, just subscribe to the value
        lazyValue = streamStaticProperty(context, path, placeholder, options);
      }

      // If we have our lazy value, update our dom.
      // Placeholder is a morph element representing our dom node
      if (lazyValue) {
        lazyValue.onNotify(function(lazyValue) {
          var val = lazyValue.value();
          if(val !== undefined){ placeholder.update(val); }
        });

        value = lazyValue.value();
        if(value !== undefined){ placeholder.append(value); }

        // Observe this content morph's parent's children.
        // When the morph element's containing element (placeholder) is removed, clean up the lazyvalue.
        // Timeout delay hack to give out dom a change to get their parent
        if(placeholder._parent){
          placeholder._parent.__lazyValue = lazyValue;
          setTimeout(function(){
            if(placeholder._parent.parentNode){
              observer.observe(placeholder._parent.parentNode, { attributes: false, childList: true, characterData: false, subtree: true });
            }
          }, 0);
        }

      }
    };

    // Handle placeholders in element tags
    hooks.element = function(element, path, context, params, options, env) {
      var helper = lookupHelper(path, env),
          lazyValue,
          value;

      if (helper) {
        // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
        lazyValue = constructHelper(element, path, context, params, options, env, helper);
      } else {
        lazyValue = streamStaticProperty(context, path, element, options);
      }

      // When we have our lazy value run it and start listening for updates.
      lazyValue.onNotify(function(lazyValue) {
        var val = lazyValue.value();
        // If an input element, set its new value if different
        if(params[0] === 'value' && val !== undefined && element.value !== val){
            element.value = val;
        }
        if(val !== undefined){ element.setAttribute(params[0], val); }
      });

      value = lazyValue.value();
      // If an input element, set its new value if different
      if(params[0] === 'value' && value !== undefined && element.value !== value){
          element.value = value;
      }
      if(value !== undefined){
        element.setAttribute(params[0], value);
      }
    };

    hooks.webComponent = function(placeholder, path, context, options, env) {

      var component,
          element,
          data = {},
          lazyData = {},
          lazyValue;

      // Create a plain data object from the lazyvalues/values passed to our component
      _.each(options.hash, function(value, key) {
        data[key] = (value.isLazyValue) ? value.value() : value;
      });

      // Create a lazy value that returns the value of our evaluated component.
      lazyValue = new LazyValue(function() {

        // For each param passed to our shared component, add it to our custom element
        // TODO: there has to be a better way to get seed data to element instances
        Rebound.seedData = data;
        element = document.createElement(path);
        Rebound.seedData = {};
        component = element.__template;

        // For each param passed to our shared component, create a new lazyValue
        _.each(data, function(value, key) {
          lazyData[key] = streamStaticProperty(component, key, placeholder, options);
        });

        // For each param passed to our helper, have it update the original context when changed.
        // For each new lazyValue, bind it to its original context's value and to its scoped context
        _.each( lazyData, function(value, key){

          // If this value was passed in from outside, set up our two way data binding
          if(options.hash[key]){
            value.onNotify(function(){
              // Update the context where we inherited this value from.
              options.context.set(options.hash[key].path, value.value());
            });

            // For each param passed to our component, if it exists, add it to our component's dependant list. Value will re-evaluate when its original changes.
            if(options.hash[key] && options.hash[key].isLazyValue){
              options.hash[key].onNotify(function(){
                component.set(key, options.hash[key].value());
                value.notify();
              });
            }
          }

          // Seed the cache
          value.value();

          // Notify the component's lazyvalue when our model updates
          value.saveObserver(addObserver(component, key, value, placeholder));
        });

      /*******************************************************

        Set up our data dependancy chains.

          Players:

            Context: The original context of the data passed into our component

            Component: The data stricture of our component that handles all syncronization and binding

            Element: The actual dom element associated with our component

          Chain structure:

            Context <---> Component <---> Element

      *******************************************************/

        // For each change on our component, update the states of the original context and the element's proeprties.
        context.listenTo(component, 'change', function(model){

          var componentPath = (model.__path()).slice( 1 ),
              contextPath = (context.__path()).slice( 1 ),
              json = model.toJSON(),
              componentAttrs = model.changedAttributes(),
              contextAttrs = {};

          // If changed model is our top level component object, then the value changed is a primitive
          // Only update the values that were passed in to our component
          // Variable names may change when passed into components (ex: user={{person}}).
          // When user changes on the component, be sure to update the person variable
          if(componentPath === ""){
            // For each attribute modified on our component, update the context's corrosponding key
            _.each(componentAttrs, function(value, componentKey){
              if(options.hash[componentKey] && options.hash[componentKey].path){
                contextAttrs[options.hash[componentKey].path] = value;
              }
            });
          }
          // If changed model is a sub object of the component, only update the values that were passed in to our component
          else{
            // If base model was renamed, create the actual path on the context we're updating
            contextPath = componentPath.split('.');
            if(options.hash.hasOwnProperty(contextPath[0])){
              contextPath[0] = options.hash[contextPath[0]].path;
            }
            contextPath = contextPath.join('.');

            // All values were passed in as is, use all of them
            contextAttrs = componentAttrs;
          }

          // Update our context at the right path with the right attrubutes
          context.get(contextPath).set(contextAttrs);

          // Set the properties on our element for visual referance if we are on a top level attribute
          if(componentPath === ""){
            _.each(json, function(value, key){
              // TODO: Currently, showing objects as properties on the custom element causes problems. Linked models between the context and component become the same exact model and all hell breaks loose. Find a way to remedy this. Until then, don't show objects.
              if((_.isObject(value))){ return; }
              value = (_.isObject(value)) ? JSON.stringify(value) : value;
              element.setAttribute(key, value);
            });
          }
        });

        // For each change to the original context, update our component
        component.listenTo(context, 'change', function(model){

          var path = model.__path(),
              split = path.split('.');

          if(!options.hash[split[1]]){
            return;
          }

          if(component.get(path)){
            component.get(path).set(model.changedAttributes());
          }
        });

        /** The attributeChangedCallback on our custom element updates the component's data. **/

      /*******************************************************

        End data dependancy chain

      *******************************************************/

        // Return the new element.
        return element;
      });



      // If we have our lazy value, update our dom.
      // Placeholder is a morph element representing our dom node
      if (lazyValue) {
        lazyValue.onNotify(function(lazyValue) {
          var val = lazyValue.value();
          if(val !== undefined){ placeholder.update(val); }
        });

        value = lazyValue.value();
        if(value !== undefined){ placeholder.append(value); }
      }
    };


    hooks.subexpr = function(path, context, params, options, env) {

      var helper = lookupHelper(path, env),
          lazyValue;
      if (helper) {
        // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
        lazyValue = constructHelper((options || true), path, context, params, options, env, helper);
      } else {
        lazyValue = streamStaticProperty(context, path, (options || true), options);
      }

      return lazyValue;
    };

    // registerHelper is a publically available function to register a helper with HTMLBars
    function registerHelper(key, callback, params){
      if(_.isArray(params)){
        callback.__params = params;
      }
      else if(_.isString(params)){
        callback.__params = [params];
      }
      helpers[key] = callback;
    }

    __exports__["default"] = {
      registerHelper: registerHelper,
      registerPartial: defaultHelpers.registerPartial,
      hooks: hooks,
      helpers: helpers,
      components: components
    };
  });
define("rebound/runtime", 
  ["htmlbars-runtime/utils","morph/dom-helper","morph/morph","rebound/lazy-value","rebound/hooks","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    
    var merge = __dependency1__.merge;
    var DOMHelper = __dependency2__["default"];
    var Morph = __dependency3__["default"];
    var LazyValue = __dependency4__["default"];
    var defaultEnv = __dependency5__["default"];

    Morph.prototype.__removeMorph = Morph.prototype.removeMorph;
    Morph.prototype.removeMorph = function(){
      this.__removeMorph.apply(this, arguments);
    };

    function hydrate(spec, options){
      // Return a wrapper function that will merge user provided helpers with our defaults
      return function(data, options){
        // Ensure we have a well-formed object as var options
        var env = options || {};
        env.helpers = env.helpers || {};
        env.hooks = env.hooks || {};
        env.dom = env.dom || new DOMHelper();

        // Merge our default helpers and hooks with user provided helpers
        env.helpers = merge(env.helpers, defaultEnv.helpers);
        env.hooks = merge(env.hooks, defaultEnv.hooks);

        // Call our func with merged helpers and hooks
        return spec.call(this, data, env);
      };
    }

    // Notify all of a object's observers of the change, execute the callback
    function notify(obj, path, controllerName) {
      defaultEnv.controller = controllerName;
      // If path is not an array of keys, wrap it in array
      path = (Object.prototype.toString.call(path) === '[object Array]') ? path : [path];

      // For each path, alert each observer and call its callback
      _.each(path, function(path){
        if(_.isArray(obj.__observers[path])){
          _.each(obj.__observers[path], function(callback, index) {
            if(callback){ callback(); }
            else{ delete obj.__observers[path][index]; }
          });
        }
      });
    }

    // TODO: This is silly. Fix it.
    var registerHelper = defaultEnv.registerHelper;
    var registerPartial = defaultEnv.registerPartial;

    __exports__.registerHelper = registerHelper;
    __exports__.registerPartial = registerPartial;
    __exports__.notify = notify;
    __exports__.hydrate = hydrate;
  });
define("rebound/tokenizer", 
  ["exports"],
  function(__exports__) {
    
    /*jshint -W054 */
    // jshint ignore: start

      // A second optional argument can be given to further configure
      // the parser process. These options are recognized:

      var exports = {};

      var defaultOptions = exports.defaultOptions = {
        // `ecmaVersion` indicates the ECMAScript version to parse. Must
        // be either 3, or 5, or 6. This influences support for strict
        // mode, the set of reserved words, support for getters and
        // setters and other features. ES6 support is only partial.
        ecmaVersion: 5,
        // Turn on `strictSemicolons` to prevent the parser from doing
        // automatic semicolon insertion.
        strictSemicolons: false,
        // When `allowTrailingCommas` is false, the parser will not allow
        // trailing commas in array and object literals.
        allowTrailingCommas: true,
        // By default, reserved words are not enforced. Enable
        // `forbidReserved` to enforce them. When this option has the
        // value "everywhere", reserved words and keywords can also not be
        // used as property names.
        forbidReserved: false,
        // When enabled, a return at the top level is not considered an
        // error.
        allowReturnOutsideFunction: false,
        // When `locations` is on, `loc` properties holding objects with
        // `start` and `end` properties in `{line, column}` form (with
        // line being 1-based and column 0-based) will be attached to the
        // nodes.
        locations: false,
        // A function can be passed as `onComment` option, which will
        // cause Acorn to call that function with `(block, text, start,
        // end)` parameters whenever a comment is skipped. `block` is a
        // boolean indicating whether this is a block (`/* */`) comment,
        // `text` is the content of the comment, and `start` and `end` are
        // character offsets that denote the start and end of the comment.
        // When the `locations` option is on, two more parameters are
        // passed, the full `{line, column}` locations of the start and
        // end of the comments. Note that you are not allowed to call the
        // parser from the callback—that will corrupt its internal state.
        onComment: null,
        // Nodes have their start and end characters offsets recorded in
        // `start` and `end` properties (directly on the node, rather than
        // the `loc` object, which holds line/column data. To also add a
        // [semi-standardized][range] `range` property holding a `[start,
        // end]` array with the same numbers, set the `ranges` option to
        // `true`.
        //
        // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
        ranges: false,
        // It is possible to parse multiple files into a single AST by
        // passing the tree produced by parsing the first file as
        // `program` option in subsequent parses. This will add the
        // toplevel forms of the parsed file to the `Program` (top) node
        // of an existing parse tree.
        program: null,
        // When `locations` is on, you can pass this to record the source
        // file in every node's `loc` object.
        sourceFile: null,
        // This value, if given, is stored in every node, whether
        // `locations` is on or off.
        directSourceFile: null
      };

      function setOptions(opts) {
        options = opts || {};
        for (var opt in defaultOptions) if (!Object.prototype.hasOwnProperty.call(options, opt))
          options[opt] = defaultOptions[opt];
        sourceFile = options.sourceFile || null;

        isKeyword = options.ecmaVersion >= 6 ? isEcma6Keyword : isEcma5AndLessKeyword;
      }

      // The `getLineInfo` function is mostly useful when the
      // `locations` option is off (for performance reasons) and you
      // want to find the line/column position for a given character
      // offset. `input` should be the code string that the offset refers
      // into.

      var getLineInfo = exports.getLineInfo = function(input, offset) {
        for (var line = 1, cur = 0;;) {
          lineBreak.lastIndex = cur;
          var match = lineBreak.exec(input);
          if (match && match.index < offset) {
            ++line;
            cur = match.index + match[0].length;
          } else break;
        }
        return {line: line, column: offset - cur};
      };

      // Acorn is organized as a tokenizer and a recursive-descent parser.
      // The `tokenize` export provides an interface to the tokenizer.
      // Because the tokenizer is optimized for being efficiently used by
      // the Acorn parser itself, this interface is somewhat crude and not
      // very modular. Performing another parse or call to `tokenize` will
      // reset the internal state, and invalidate existing tokenizers.

      exports.tokenize = function(inpt, opts) {
        input = String(inpt); inputLen = input.length;
        setOptions(opts);
        initTokenState();

        var t = {};
        function getToken(forceRegexp) {
          lastEnd = tokEnd;
          readToken(forceRegexp);
          t.start = tokStart; t.end = tokEnd;
          t.startLoc = tokStartLoc; t.endLoc = tokEndLoc;
          t.type = tokType; t.value = tokVal;
          return t;
        }
        getToken.jumpTo = function(pos, reAllowed) {
          tokPos = pos;
          if (options.locations) {
            tokCurLine = 1;
            tokLineStart = lineBreak.lastIndex = 0;
            var match;
            while ((match = lineBreak.exec(input)) && match.index < pos) {
              ++tokCurLine;
              tokLineStart = match.index + match[0].length;
            }
          }
          tokRegexpAllowed = reAllowed;
          skipSpace();
        };
        return getToken;
      };

      // State is kept in (closure-)global variables. We already saw the
      // `options`, `input`, and `inputLen` variables above.

      // The current position of the tokenizer in the input.

      var tokPos;

      // The start and end offsets of the current token.

      var tokStart, tokEnd;

      // When `options.locations` is true, these hold objects
      // containing the tokens start and end line/column pairs.

      var tokStartLoc, tokEndLoc;

      // The type and value of the current token. Token types are objects,
      // named by variables against which they can be compared, and
      // holding properties that describe them (indicating, for example,
      // the precedence of an infix operator, and the original name of a
      // keyword token). The kind of value that's held in `tokVal` depends
      // on the type of the token. For literals, it is the literal value,
      // for operators, the operator name, and so on.

      var tokType, tokVal;

      // Interal state for the tokenizer. To distinguish between division
      // operators and regular expressions, it remembers whether the last
      // token was one that is allowed to be followed by an expression.
      // (If it is, a slash is probably a regexp, if it isn't it's a
      // division operator. See the `parseStatement` function for a
      // caveat.)

      var tokRegexpAllowed;

      // When `options.locations` is true, these are used to keep
      // track of the current line, and know when a new line has been
      // entered.

      var tokCurLine, tokLineStart;

      // These store the position of the previous token, which is useful
      // when finishing a node and assigning its `end` position.

      var lastStart, lastEnd, lastEndLoc;

      // This is the parser's state. `inFunction` is used to reject
      // `return` statements outside of functions, `labels` to verify that
      // `break` and `continue` have somewhere to jump to, and `strict`
      // indicates whether strict mode is on.

      var inFunction, labels, strict;

      // This function is used to raise exceptions on parse errors. It
      // takes an offset integer (into the current `input`) to indicate
      // the location of the error, attaches the position to the end
      // of the error message, and then raises a `SyntaxError` with that
      // message.

      function raise(pos, message) {
        var loc = getLineInfo(input, pos);
        message += " (" + loc.line + ":" + loc.column + ")";
        var err = new SyntaxError(message);
        err.pos = pos; err.loc = loc; err.raisedAt = tokPos;
        throw err;
      }

      // Reused empty array added for node fields that are always empty.

      var empty = [];

      // ## Token types

      // The assignment of fine-grained, information-carrying type objects
      // allows the tokenizer to store the information it has about a
      // token in a way that is very cheap for the parser to look up.

      // All token type variables start with an underscore, to make them
      // easy to recognize.

      // These are the general types. The `type` property is only used to
      // make them recognizeable when debugging.

      var _num = {type: "num"}, _regexp = {type: "regexp"}, _string = {type: "string"};
      var _name = {type: "name"}, _eof = {type: "eof"};

      // Keyword tokens. The `keyword` property (also used in keyword-like
      // operators) indicates that the token originated from an
      // identifier-like word, which is used when parsing property names.
      //
      // The `beforeExpr` property is used to disambiguate between regular
      // expressions and divisions. It is set on all token types that can
      // be followed by an expression (thus, a slash after them would be a
      // regular expression).
      //
      // `isLoop` marks a keyword as starting a loop, which is important
      // to know when parsing a label, in order to allow or disallow
      // continue jumps to that label.

      var _break = {keyword: "break"}, _case = {keyword: "case", beforeExpr: true}, _catch = {keyword: "catch"};
      var _continue = {keyword: "continue"}, _debugger = {keyword: "debugger"}, _default = {keyword: "default"};
      var _do = {keyword: "do", isLoop: true}, _else = {keyword: "else", beforeExpr: true};
      var _finally = {keyword: "finally"}, _for = {keyword: "for", isLoop: true}, _function = {keyword: "function"};
      var _if = {keyword: "if"}, _return = {keyword: "return", beforeExpr: true}, _switch = {keyword: "switch"};
      var _throw = {keyword: "throw", beforeExpr: true}, _try = {keyword: "try"}, _var = {keyword: "var"};
      var _let = {keyword: "let"}, _const = {keyword: "const"};
      var _while = {keyword: "while", isLoop: true}, _with = {keyword: "with"}, _new = {keyword: "new", beforeExpr: true};
      var _this = {keyword: "this"};

      // The keywords that denote values.

      var _null = {keyword: "null", atomValue: null}, _true = {keyword: "true", atomValue: true};
      var _false = {keyword: "false", atomValue: false};

      // Some keywords are treated as regular operators. `in` sometimes
      // (when parsing `for`) needs to be tested against specifically, so
      // we assign a variable name to it for quick comparing.

      var _in = {keyword: "in", binop: 7, beforeExpr: true};

      // Map keyword names to token types.

      var keywordTypes = {"break": _break, "case": _case, "catch": _catch,
                          "continue": _continue, "debugger": _debugger, "default": _default,
                          "do": _do, "else": _else, "finally": _finally, "for": _for,
                          "function": _function, "if": _if, "return": _return, "switch": _switch,
                          "throw": _throw, "try": _try, "var": _var, "let": _let, "const": _const,
                          "while": _while, "with": _with,
                          "null": _null, "true": _true, "false": _false, "new": _new, "in": _in,
                          "instanceof": {keyword: "instanceof", binop: 7, beforeExpr: true}, "this": _this,
                          "typeof": {keyword: "typeof", prefix: true, beforeExpr: true},
                          "void": {keyword: "void", prefix: true, beforeExpr: true},
                          "delete": {keyword: "delete", prefix: true, beforeExpr: true}};

      // Punctuation token types. Again, the `type` property is purely for debugging.

      var _bracketL = {type: "[", beforeExpr: true}, _bracketR = {type: "]"}, _braceL = {type: "{", beforeExpr: true};
      var _braceR = {type: "}"}, _parenL = {type: "(", beforeExpr: true}, _parenR = {type: ")"};
      var _comma = {type: ",", beforeExpr: true}, _semi = {type: ";", beforeExpr: true};
      var _colon = {type: ":", beforeExpr: true}, _dot = {type: "."}, _ellipsis = {type: "..."}, _question = {type: "?", beforeExpr: true};

      // Operators. These carry several kinds of properties to help the
      // parser use them properly (the presence of these properties is
      // what categorizes them as operators).
      //
      // `binop`, when present, specifies that this operator is a binary
      // operator, and will refer to its precedence.
      //
      // `prefix` and `postfix` mark the operator as a prefix or postfix
      // unary operator. `isUpdate` specifies that the node produced by
      // the operator should be of type UpdateExpression rather than
      // simply UnaryExpression (`++` and `--`).
      //
      // `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
      // binary operators with a very low precedence, that should result
      // in AssignmentExpression nodes.

      var _slash = {binop: 10, beforeExpr: true}, _eq = {isAssign: true, beforeExpr: true};
      var _assign = {isAssign: true, beforeExpr: true};
      var _incDec = {postfix: true, prefix: true, isUpdate: true}, _prefix = {prefix: true, beforeExpr: true};
      var _logicalOR = {binop: 1, beforeExpr: true};
      var _logicalAND = {binop: 2, beforeExpr: true};
      var _bitwiseOR = {binop: 3, beforeExpr: true};
      var _bitwiseXOR = {binop: 4, beforeExpr: true};
      var _bitwiseAND = {binop: 5, beforeExpr: true};
      var _equality = {binop: 6, beforeExpr: true};
      var _relational = {binop: 7, beforeExpr: true};
      var _bitShift = {binop: 8, beforeExpr: true};
      var _plusMin = {binop: 9, prefix: true, beforeExpr: true};
      var _multiplyModulo = {binop: 10, beforeExpr: true};

      // Provide access to the token types for external users of the
      // tokenizer.

      exports.tokTypes = {bracketL: _bracketL, bracketR: _bracketR, braceL: _braceL, braceR: _braceR,
                          parenL: _parenL, parenR: _parenR, comma: _comma, semi: _semi, colon: _colon,
                          dot: _dot, ellipsis: _ellipsis, question: _question, slash: _slash, eq: _eq,
                          name: _name, eof: _eof, num: _num, regexp: _regexp, string: _string};
      for (var kw in keywordTypes) exports.tokTypes["_" + kw] = keywordTypes[kw];

      // This is a trick taken from Esprima. It turns out that, on
      // non-Chrome browsers, to check whether a string is in a set, a
      // predicate containing a big ugly `switch` statement is faster than
      // a regular expression, and on Chrome the two are about on par.
      // This function uses `eval` (non-lexical) to produce such a
      // predicate from a space-separated string of words.
      //
      // It starts by sorting the words by length.

      function makePredicate(words) {
        words = words.split(" ");
        var f = "", cats = [];
        out: for (var i = 0; i < words.length; ++i) {
          for (var j = 0; j < cats.length; ++j)
            if (cats[j][0].length == words[i].length) {
              cats[j].push(words[i]);
              continue out;
            }
          cats.push([words[i]]);
        }
        function compareTo(arr) {
          if (arr.length == 1) return f += "return str === " + JSON.stringify(arr[0]) + ";";
          f += "switch(str){";
          for (var i = 0; i < arr.length; ++i) f += "case " + JSON.stringify(arr[i]) + ":";
          f += "return true}return false;";
        }

        // When there are more than three length categories, an outer
        // switch first dispatches on the lengths, to save on comparisons.

        if (cats.length > 3) {
          cats.sort(function(a, b) {return b.length - a.length;});
          f += "switch(str.length){";
          for (var i = 0; i < cats.length; ++i) {
            var cat = cats[i];
            f += "case " + cat[0].length + ":";
            compareTo(cat);
          }
          f += "}";

        // Otherwise, simply generate a flat `switch` statement.

        } else {
          compareTo(words);
        }
        return new Function("str", f);
      }

      // The ECMAScript 3 reserved word list.

      var isReservedWord3 = makePredicate("abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile");

      // ECMAScript 5 reserved words.

      var isReservedWord5 = makePredicate("class enum extends super const export import");

      // The additional reserved words in strict mode.

      var isStrictReservedWord = makePredicate("implements interface let package private protected public static yield");

      // The forbidden variable names in strict mode.

      var isStrictBadIdWord = makePredicate("eval arguments");

      // And the keywords.

      var ecma5AndLessKeywords = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this";

      var isEcma5AndLessKeyword = makePredicate(ecma5AndLessKeywords);

      var isEcma6Keyword = makePredicate(ecma5AndLessKeywords + " let const");

      var isKeyword = isEcma5AndLessKeyword;

      // ## Character categories

      // Big ugly regular expressions that match characters in the
      // whitespace, identifier, and identifier-start categories. These
      // are only applied when a character is found to actually have a
      // code point above 128.

      var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;
      var nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
      var nonASCIIidentifierChars = "\u0300-\u036f\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u0620-\u0649\u0672-\u06d3\u06e7-\u06e8\u06fb-\u06fc\u0730-\u074a\u0800-\u0814\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0840-\u0857\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962-\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09d7\u09df-\u09e0\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5f-\u0b60\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2-\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d46-\u0d48\u0d57\u0d62-\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e34-\u0e3a\u0e40-\u0e45\u0e50-\u0e59\u0eb4-\u0eb9\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f41-\u0f47\u0f71-\u0f84\u0f86-\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1029\u1040-\u1049\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u170e-\u1710\u1720-\u1730\u1740-\u1750\u1772\u1773\u1780-\u17b2\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1920-\u192b\u1930-\u193b\u1951-\u196d\u19b0-\u19c0\u19c8-\u19c9\u19d0-\u19d9\u1a00-\u1a15\u1a20-\u1a53\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b46-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1bb0-\u1bb9\u1be6-\u1bf3\u1c00-\u1c22\u1c40-\u1c49\u1c5b-\u1c7d\u1cd0-\u1cd2\u1d00-\u1dbe\u1e01-\u1f15\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2d81-\u2d96\u2de0-\u2dff\u3021-\u3028\u3099\u309a\ua640-\ua66d\ua674-\ua67d\ua69f\ua6f0-\ua6f1\ua7f8-\ua800\ua806\ua80b\ua823-\ua827\ua880-\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8f3-\ua8f7\ua900-\ua909\ua926-\ua92d\ua930-\ua945\ua980-\ua983\ua9b3-\ua9c0\uaa00-\uaa27\uaa40-\uaa41\uaa4c-\uaa4d\uaa50-\uaa59\uaa7b\uaae0-\uaae9\uaaf2-\uaaf3\uabc0-\uabe1\uabec\uabed\uabf0-\uabf9\ufb20-\ufb28\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";
      var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
      var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

      // Whether a single character denotes a newline.

      var newline = /[\n\r\u2028\u2029]/;

      // Matches a whole line break (where CRLF is considered a single
      // line break). Used to count lines.

      var lineBreak = /\r\n|[\n\r\u2028\u2029]/g;

      // Test whether a given character code starts an identifier.

      var isIdentifierStart = exports.isIdentifierStart = function(code) {
        if (code < 65) return code === 36;
        if (code < 91) return true;
        if (code < 97) return code === 95;
        if (code < 123)return true;
        return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code));
      };

      // Test whether a given character is part of an identifier.

      var isIdentifierChar = exports.isIdentifierChar = function(code) {
        if (code < 48) return code === 36;
        if (code < 58) return true;
        if (code < 65) return false;
        if (code < 91) return true;
        if (code < 97) return code === 95;
        if (code < 123)return true;
        return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code));
      };

      // ## Tokenizer

      // These are used when `options.locations` is on, for the
      // `tokStartLoc` and `tokEndLoc` properties.

      function Position() {
        this.line = tokCurLine;
        this.column = tokPos - tokLineStart;
      }

      // Reset the token state. Used at the start of a parse.

      function initTokenState() {
        tokCurLine = 1;
        tokPos = tokLineStart = 0;
        tokRegexpAllowed = true;
        skipSpace();
      }

      // Called at the end of every token. Sets `tokEnd`, `tokVal`, and
      // `tokRegexpAllowed`, and skips the space after the token, so that
      // the next one's `tokStart` will point at the right position.

      function finishToken(type, val) {
        tokEnd = tokPos;
        if (options.locations) tokEndLoc = new Position;
        tokType = type;
        skipSpace();
        tokVal = val;
        tokRegexpAllowed = type.beforeExpr;
      }

      function skipBlockComment() {
        var startLoc = options.onComment && options.locations && new Position;
        var start = tokPos, end = input.indexOf("*/", tokPos += 2);
        if (end === -1) raise(tokPos - 2, "Unterminated comment");
        tokPos = end + 2;
        if (options.locations) {
          lineBreak.lastIndex = start;
          var match;
          while ((match = lineBreak.exec(input)) && match.index < tokPos) {
            ++tokCurLine;
            tokLineStart = match.index + match[0].length;
          }
        }
        if (options.onComment)
          options.onComment(true, input.slice(start + 2, end), start, tokPos,
                            startLoc, options.locations && new Position);
      }

      function skipLineComment() {
        var start = tokPos;
        var startLoc = options.onComment && options.locations && new Position;
        var ch = input.charCodeAt(tokPos+=2);
        while (tokPos < inputLen && ch !== 10 && ch !== 13 && ch !== 8232 && ch !== 8233) {
          ++tokPos;
          ch = input.charCodeAt(tokPos);
        }
        if (options.onComment)
          options.onComment(false, input.slice(start + 2, tokPos), start, tokPos,
                            startLoc, options.locations && new Position);
      }

      // Called at the start of the parse and after every token. Skips
      // whitespace and comments, and.

      function skipSpace() {
        while (tokPos < inputLen) {
          var ch = input.charCodeAt(tokPos);
          if (ch === 32) { // ' '
            ++tokPos;
          } else if (ch === 13) {
            ++tokPos;
            var next = input.charCodeAt(tokPos);
            if (next === 10) {
              ++tokPos;
            }
            if (options.locations) {
              ++tokCurLine;
              tokLineStart = tokPos;
            }
          } else if (ch === 10 || ch === 8232 || ch === 8233) {
            ++tokPos;
            if (options.locations) {
              ++tokCurLine;
              tokLineStart = tokPos;
            }
          } else if (ch > 8 && ch < 14) {
            ++tokPos;
          } else if (ch === 47) { // '/'
            var next = input.charCodeAt(tokPos + 1);
            if (next === 42) { // '*'
              skipBlockComment();
            } else if (next === 47) { // '/'
              skipLineComment();
            } else break;
          } else if (ch === 160) { // '\xa0'
            ++tokPos;
          } else if (ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
            ++tokPos;
          } else {
            break;
          }
        }
      }

      // ### Token reading

      // This is the function that is called to fetch the next token. It
      // is somewhat obscure, because it works in character codes rather
      // than characters, and because operator parsing has been inlined
      // into it.
      //
      // All in the name of speed.
      //
      // The `forceRegexp` parameter is used in the one case where the
      // `tokRegexpAllowed` trick does not work. See `parseStatement`.

      function readToken_dot() {
        var next = input.charCodeAt(tokPos + 1);
        if (next >= 48 && next <= 57) return readNumber(true);
        var next2 = input.charCodeAt(tokPos + 2);
        if (options.ecmaVersion >= 6 && next === 46 && next2 === 46) { // 46 = dot '.'
          tokPos += 3;
          return finishToken(_ellipsis);
        } else {
          ++tokPos;
          return finishToken(_dot);
        }
      }

      function readToken_slash() { // '/'
        var next = input.charCodeAt(tokPos + 1);
        if (tokRegexpAllowed) {++tokPos; return readRegexp();}
        if (next === 61) return finishOp(_assign, 2);
        return finishOp(_slash, 1);
      }

      function readToken_mult_modulo() { // '%*'
        var next = input.charCodeAt(tokPos + 1);
        if (next === 61) return finishOp(_assign, 2);
        return finishOp(_multiplyModulo, 1);
      }

      function readToken_pipe_amp(code) { // '|&'
        var next = input.charCodeAt(tokPos + 1);
        if (next === code) return finishOp(code === 124 ? _logicalOR : _logicalAND, 2);
        if (next === 61) return finishOp(_assign, 2);
        return finishOp(code === 124 ? _bitwiseOR : _bitwiseAND, 1);
      }

      function readToken_caret() { // '^'
        var next = input.charCodeAt(tokPos + 1);
        if (next === 61) return finishOp(_assign, 2);
        return finishOp(_bitwiseXOR, 1);
      }

      function readToken_plus_min(code) { // '+-'
        var next = input.charCodeAt(tokPos + 1);
        if (next === code) {
          if (next == 45 && input.charCodeAt(tokPos + 2) == 62 &&
              newline.test(input.slice(lastEnd, tokPos))) {
            // A `-->` line comment
            tokPos += 3;
            skipLineComment();
            skipSpace();
            return readToken();
          }
          return finishOp(_incDec, 2);
        }
        if (next === 61) return finishOp(_assign, 2);
        return finishOp(_plusMin, 1);
      }

      function readToken_lt_gt(code) { // '<>'
        var next = input.charCodeAt(tokPos + 1);
        var size = 1;
        if (next === code) {
          size = code === 62 && input.charCodeAt(tokPos + 2) === 62 ? 3 : 2;
          if (input.charCodeAt(tokPos + size) === 61) return finishOp(_assign, size + 1);
          return finishOp(_bitShift, size);
        }
        if (next == 33 && code == 60 && input.charCodeAt(tokPos + 2) == 45 &&
            input.charCodeAt(tokPos + 3) == 45) {
          // `<!--`, an XML-style comment that should be interpreted as a line comment
          tokPos += 4;
          skipLineComment();
          skipSpace();
          return readToken();
        }
        if (next === 61)
          size = input.charCodeAt(tokPos + 2) === 61 ? 3 : 2;
        return finishOp(_relational, size);
      }

      function readToken_eq_excl(code) { // '=!'
        var next = input.charCodeAt(tokPos + 1);
        if (next === 61) return finishOp(_equality, input.charCodeAt(tokPos + 2) === 61 ? 3 : 2);
        return finishOp(code === 61 ? _eq : _prefix, 1);
      }

      function getTokenFromCode(code) {
        switch(code) {
          // The interpretation of a dot depends on whether it is followed
          // by a digit or another two dots.
        case 46: // '.'
          return readToken_dot();

          // Punctuation tokens.
        case 40: ++tokPos; return finishToken(_parenL);
        case 41: ++tokPos; return finishToken(_parenR);
        case 59: ++tokPos; return finishToken(_semi);
        case 44: ++tokPos; return finishToken(_comma);
        case 91: ++tokPos; return finishToken(_bracketL);
        case 93: ++tokPos; return finishToken(_bracketR);
        case 123: ++tokPos; return finishToken(_braceL);
        case 125: ++tokPos; return finishToken(_braceR);
        case 58: ++tokPos; return finishToken(_colon);
        case 63: ++tokPos; return finishToken(_question);

          // '0x' is a hexadecimal number.
        case 48: // '0'
          var next = input.charCodeAt(tokPos + 1);
          if (next === 120 || next === 88) return readHexNumber();
          // Anything else beginning with a digit is an integer, octal
          // number, or float.
        /* falls through */
        case 49: case 50: case 51: case 52: case 53: case 54: case 55: case 56: case 57: // 1-9
          return readNumber(false);

          // Quotes produce strings.
        case 34: case 39: // '"', "'"
          return readString(code);

        // Operators are parsed inline in tiny state machines. '=' (61) is
        // often referred to. `finishOp` simply skips the amount of
        // characters it is given as second argument, and returns a token
        // of the type given by its first argument.

        case 47: // '/'
          return readToken_slash();

        case 37: case 42: // '%*'
          return readToken_mult_modulo();

        case 124: case 38: // '|&'
          return readToken_pipe_amp(code);

        case 94: // '^'
          return readToken_caret();

        case 43: case 45: // '+-'
          return readToken_plus_min(code);

        case 60: case 62: // '<>'
          return readToken_lt_gt(code);

        case 61: case 33: // '=!'
          return readToken_eq_excl(code);

        case 126: // '~'
          return finishOp(_prefix, 1);
        }

        return false;
      }

      function readToken(forceRegexp) {
        if (!forceRegexp) tokStart = tokPos;
        else tokPos = tokStart + 1;
        if (options.locations) tokStartLoc = new Position;
        if (forceRegexp) return readRegexp();
        if (tokPos >= inputLen) return finishToken(_eof);

        var code = input.charCodeAt(tokPos);
        // Identifier or keyword. '\uXXXX' sequences are allowed in
        // identifiers, so '\' also dispatches to that.
        if (isIdentifierStart(code) || code === 92 /* '\' */) return readWord();

        var tok = getTokenFromCode(code);

        if (tok === false) {
          // If we are here, we either found a non-ASCII identifier
          // character, or something that's entirely disallowed.
          var ch = String.fromCharCode(code);
          if (ch === "\\" || nonASCIIidentifierStart.test(ch)) return readWord();
          raise(tokPos, "Unexpected character '" + ch + "'");
        }
        return tok;
      }

      function finishOp(type, size) {
        var str = input.slice(tokPos, tokPos + size);
        tokPos += size;
        finishToken(type, str);
      }

      // Parse a regular expression. Some context-awareness is necessary,
      // since a '/' inside a '[]' set does not end the expression.

      function readRegexp() {
        var content = "", escaped, inClass, start = tokPos;
        for (;;) {
          if (tokPos >= inputLen) raise(start, "Unterminated regular expression");
          var ch = input.charAt(tokPos);
          if (newline.test(ch)) raise(start, "Unterminated regular expression");
          if (!escaped) {
            if (ch === "[") inClass = true;
            else if (ch === "]" && inClass) inClass = false;
            else if (ch === "/" && !inClass) break;
            escaped = ch === "\\";
          } else escaped = false;
          ++tokPos;
        }
        var content = input.slice(start, tokPos);
        ++tokPos;
        // Need to use `readWord1` because '\uXXXX' sequences are allowed
        // here (don't ask).
        var mods = readWord1();
        if (mods && !/^[gmsiy]*$/.test(mods)) raise(start, "Invalid regular expression flag");
        try {
          var value = new RegExp(content, mods);
        } catch (e) {
          if (e instanceof SyntaxError) raise(start, "Error parsing regular expression: " + e.message);
          raise(e);
        }
        return finishToken(_regexp, value);
      }

      // Read an integer in the given radix. Return null if zero digits
      // were read, the integer value otherwise. When `len` is given, this
      // will return `null` unless the integer has exactly `len` digits.

      function readInt(radix, len) {
        var start = tokPos, total = 0;
        for (var i = 0, e = len == null ? Infinity : len; i < e; ++i) {
          var code = input.charCodeAt(tokPos), val;
          if (code >= 97) val = code - 97 + 10; // a
          else if (code >= 65) val = code - 65 + 10; // A
          else if (code >= 48 && code <= 57) val = code - 48; // 0-9
          else val = Infinity;
          if (val >= radix) break;
          ++tokPos;
          total = total * radix + val;
        }
        if (tokPos === start || len != null && tokPos - start !== len) return null;

        return total;
      }

      function readHexNumber() {
        tokPos += 2; // 0x
        var val = readInt(16);
        if (val == null) raise(tokStart + 2, "Expected hexadecimal number");
        if (isIdentifierStart(input.charCodeAt(tokPos))) raise(tokPos, "Identifier directly after number");
        return finishToken(_num, val);
      }

      // Read an integer, octal integer, or floating-point number.

      function readNumber(startsWithDot) {
        var start = tokPos, isFloat = false, octal = input.charCodeAt(tokPos) === 48;
        if (!startsWithDot && readInt(10) === null) raise(start, "Invalid number");
        if (input.charCodeAt(tokPos) === 46) {
          ++tokPos;
          readInt(10);
          isFloat = true;
        }
        var next = input.charCodeAt(tokPos);
        if (next === 69 || next === 101) { // 'eE'
          next = input.charCodeAt(++tokPos);
          if (next === 43 || next === 45) ++tokPos; // '+-'
          if (readInt(10) === null) raise(start, "Invalid number");
          isFloat = true;
        }
        if (isIdentifierStart(input.charCodeAt(tokPos))) raise(tokPos, "Identifier directly after number");

        var str = input.slice(start, tokPos), val;
        if (isFloat) val = parseFloat(str);
        else if (!octal || str.length === 1) val = parseInt(str, 10);
        else if (/[89]/.test(str) || strict) raise(start, "Invalid number");
        else val = parseInt(str, 8);
        return finishToken(_num, val);
      }

      // Read a string value, interpreting backslash-escapes.

      function readString(quote) {
        tokPos++;
        var out = "";
        for (;;) {
          if (tokPos >= inputLen) raise(tokStart, "Unterminated string constant");
          var ch = input.charCodeAt(tokPos);
          if (ch === quote) {
            ++tokPos;
            return finishToken(_string, out);
          }
          if (ch === 92) { // '\'
            ch = input.charCodeAt(++tokPos);
            var octal = /^[0-7]+/.exec(input.slice(tokPos, tokPos + 3));
            if (octal) octal = octal[0];
            while (octal && parseInt(octal, 8) > 255) octal = octal.slice(0, -1);
            if (octal === "0") octal = null;
            ++tokPos;
            if (octal) {
              if (strict) raise(tokPos - 2, "Octal literal in strict mode");
              out += String.fromCharCode(parseInt(octal, 8));
              tokPos += octal.length - 1;
            } else {
              switch (ch) {
              case 110: out += "\n"; break; // 'n' -> '\n'
              case 114: out += "\r"; break; // 'r' -> '\r'
              case 120: out += String.fromCharCode(readHexChar(2)); break; // 'x'
              case 117: out += String.fromCharCode(readHexChar(4)); break; // 'u'
              case 85: out += String.fromCharCode(readHexChar(8)); break; // 'U'
              case 116: out += "\t"; break; // 't' -> '\t'
              case 98: out += "\b"; break; // 'b' -> '\b'
              case 118: out += "\u000b"; break; // 'v' -> '\u000b'
              case 102: out += "\f"; break; // 'f' -> '\f'
              case 48: out += "\0"; break; // 0 -> '\0'
              case 13: if (input.charCodeAt(tokPos) === 10) ++tokPos; // '\r\n'
              /* falls through */
              case 10: // ' \n'
                if (options.locations) { tokLineStart = tokPos; ++tokCurLine; }
                break;
              default: out += String.fromCharCode(ch); break;
              }
            }
          } else {
            if (ch === 13 || ch === 10 || ch === 8232 || ch === 8233) raise(tokStart, "Unterminated string constant");
            out += String.fromCharCode(ch); // '\'
            ++tokPos;
          }
        }
      }

      // Used to read character escape sequences ('\x', '\u', '\U').

      function readHexChar(len) {
        var n = readInt(16, len);
        if (n === null) raise(tokStart, "Bad character escape sequence");
        return n;
      }

      // Used to signal to callers of `readWord1` whether the word
      // contained any escape sequences. This is needed because words with
      // escape sequences must not be interpreted as keywords.

      var containsEsc;

      // Read an identifier, and return it as a string. Sets `containsEsc`
      // to whether the word contained a '\u' escape.
      //
      // Only builds up the word character-by-character when it actually
      // containeds an escape, as a micro-optimization.

      function readWord1() {
        containsEsc = false;
        var word, first = true, start = tokPos;
        for (;;) {
          var ch = input.charCodeAt(tokPos);
          if (isIdentifierChar(ch)) {
            if (containsEsc) word += input.charAt(tokPos);
            ++tokPos;
          } else if (ch === 92) { // "\"
            if (!containsEsc) word = input.slice(start, tokPos);
            containsEsc = true;
            if (input.charCodeAt(++tokPos) != 117) // "u"
              raise(tokPos, "Expecting Unicode escape sequence \\uXXXX");
            ++tokPos;
            var esc = readHexChar(4);
            var escStr = String.fromCharCode(esc);
            if (!escStr) raise(tokPos - 1, "Invalid Unicode escape");
            if (!(first ? isIdentifierStart(esc) : isIdentifierChar(esc)))
              raise(tokPos - 4, "Invalid Unicode escape");
            word += escStr;
          } else {
            break;
          }
          first = false;
        }
        return containsEsc ? word : input.slice(start, tokPos);
      }

      // Read an identifier or keyword token. Will check for reserved
      // words when necessary.

      function readWord() {
        var word = readWord1();
        var type = _name;
        if (!containsEsc && isKeyword(word))
          type = keywordTypes[word];
        return finishToken(type, word);
      }


    __exports__["default"] = { tokenize: exports.tokenize };
  });
define("rebound/property-processor", 
  ["rebound/tokenizer","exports"],
  function(__dependency1__, __exports__) {
    
    var tokenizer = __dependency1__["default"];

    var computedProperties = [];

    // TODO: Make this farrrrrr more robust...very minimal right now

    function compile(data){

      _.each(computedProperties, function(prop){
        var str = prop.val.toString().replace(/(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s;])+\/\/(?:.*)$)/gm, '$1'), // String representation of function sans comments
            nextToken = tokenizer.tokenize(str),
            tokens = [],
            token,
            finishedPaths = [],
            namedPaths = {},
            opcodes = [],
            named = false,
            listening = 0,
            inSubComponent = 0,
            subComponent = [],
            root,
            paths = [],
            path,
            attrs = [],
            workingpath = [],
            terminators = [';',',','==','>','<','>=','<=','>==','<==','!=','!==', '&&', '||'];

        do{

          token = nextToken();

          if(token.value === 'this'){
            listening++;
            workingpath = [];
          }

          // TODO: handle gets on collections
          if(token.value === 'get'){
            path = nextToken();
            while(!path.value){
              path = nextToken();
            }
            workingpath.push(path.value);
          }

          if(token.value === 'pluck'){
            path = nextToken();
            while(!path.value){
              path = nextToken();
            }
            workingpath.push('@each.' + path.value);
          }

          if(token.value === 'at'){
            workingpath.push('@each');
            path = nextToken();
            while(!path.value){
              path = nextToken();
            }
            workingpath.push('[' + path.value + ']');
          }

          if(token.value === 'where' || token.value === 'findWhere'){
            workingpath.push('@each');
            path = nextToken();
            attrs = [];
            var itr = 0;
            while(path.type.type !== ')'){
              if(path.value){
                if(itr%2 === 0){
                  attrs.push(path.value);
                }
                itr++;
              }
              path = nextToken();
            }
            workingpath.push(attrs);
          }

          if(listening && _.indexOf(terminators, token.type.type) > -1 || _.indexOf(terminators, token.value) > -1){
            workingpath = _.reduce(workingpath, function(memo, paths){
              var newMemo = [];
              paths = (!_.isArray(paths)) ? [paths] : paths;
              _.each(paths, function(path){
                _.each(memo, function(mem){
                  newMemo.push(_.compact([mem, path]).join('.'));
                });
              });
              return newMemo;
            }, ['']);
            finishedPaths = _.compact(_.union(finishedPaths, workingpath));
            workingpath = [];
            listening--;
          }

        } while(token.start !== token.end);

        console.log('COMPUTED PROPERTY', prop.key, 'registered with these dependancy paths:', finishedPaths);

        Rebound.registerHelper(prop.key, prop.val, finishedPaths);

      });
      computedProperties = [];
    }

    function register(context, key, func){
      computedProperties.push({obj: context, key: key, val: func});
    }

    __exports__["default"] = { register: register, compile: compile };
  });
define("rebound/components/model", 
  ["rebound/property-processor","exports"],
  function(__dependency1__, __exports__) {
    
    var propertyCompiler = __dependency1__["default"];

    // If Rebound Runtime has already been run, throw error
    if(Backbone.Model.rebound){ throw 'Rebound Model is already loaded on the page!'; }
    // If Backbone hasn't been started yet, throw error
    if(!window.Backbone){ throw "Backbone must be on the page for Rebound to load."; }

    var Model = Backbone.Model;

    Backbone.Model.prototype.rebound = true;
    Backbone.Model.prototype.isModel = true;

    // By default, __path returns the root object unless overridden
    Backbone.Model.prototype.__path = function(){return '';};
    // Override get to return value of computed parameters
    Backbone.Model.prototype.__get = Backbone.Model.prototype.get;
    Backbone.Model.prototype.get = function(key, val, options){

      // Get function now checks for collection, model or vanillajs object. Accesses appropreately.
      var parts  = {},
          result = {},
          value,
          model,
          i=0, l=0;

      // Split the path at all '.', '[' and ']' and find the value referanced.
      parts = _.compact(key.split(/(?:\.|\[|\])+/));
      result = this;
      l = parts.length;

      if(key === undefined){ return; }

      if(key === '' || parts.length === 0){ return result; }

      if (parts.length > 0) {
        for ( i = 0; i < l-1; i++) {
          if( _.isFunction(result )){
            result = result();
          }
          else if( result.isCollection ){
            result = result.models[parts[i]];
          }
          else if( result.isModel ){
            result = result.attributes[parts[i]];
          }
          else if( result && result[parts[i]] ){
            result = result[parts[i]];
          }
          else{
            result = '';
          }
        }
      }

      // Call original backbone get/at function
      if(result.isCollection){
        value = result.at(parts[i]);
      }
      else if(result.isModel){
       value = this.__get.call(result, parts[i], val, options);
     }

      // If value is a computed proeprty, evaluate
      if(_.isFunction(value)){
        return value.call(this);
      }
      return value;
    };
    // Modify the Backbone.Model.set() function to have models' eventable attributes propagate their events to their parent and keep a referance to their name.
    Backbone.Model.prototype.__set = Backbone.Model.prototype.set;
    Backbone.Model.prototype.set = function(key, val, options){
      var attrs, newKey;

      // Set is able to take a object or a key value pair. Normalize this input.
      if (typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      // For each key and value, call original set and propagate its events up to parent if it is eventable.
      for (key in attrs) {
        val = attrs[key];

        if(val === null){ val = undefined; }

        // If any value is a function, turn it into a computed property
        if(_.isFunction(val)){
          propertyCompiler.register(this, key, val);
        }
        // If any value is an object, turn it into a model
        else if(_.isObject(val) && !_.isArray(val) && !_.isFunction(val) && !(val.isModel || val.isCollection)){
          val = attrs[key] = new Backbone.Model(val);
        }
        // If any value is an array, turn it into a collection
        else if(_.isArray(val)){
          val = attrs[key] = new Backbone.Collection(val);
        }

        // Set this element's path variable. Returns the fully formed json path of this element
        if(val !== undefined){
          val.__path = (function(model, key){ return function(){ return model.__path() + '.' + key ; }; })(this, key);

          // If this new key is an eventable object, and it doesn't yet have its ancestry set, propagate its event to our parent
          if(!val.__parent && val.isModel || val.isCollection){
            // When requesting the name value of our value, return the its key appended to the computed name value of our parent
            // Closure is needed to preserve values in the instance so they dont get set to the prototype
            val.__parent = this;
            val.on('all', this.trigger, this);
          }
        }

        // Get function now checks for collection, model or vanillajs object. Accesses appropreately.
        var parts  = {},
            result = {},
            model,
            i=0, l=0;

        // Split the path at all '.', '[' and ']' and find the value referanced.
        parts = _.compact(key.split(/(?:\.|\[|\])+/));
        result = this;
        l = parts.length;

        if (parts.length > 0) {
          for ( i = 0; i < l-1; i++) {
            if(_.isFunction(result)){
              result = result();
            }
            else if(result.isCollection){
              result = result.models[parts[i]];
            }
            else if(result.isModel){
              result = result.attributes[parts[i]];
            }
            else if(result && result[parts[i]]){
              result = result[parts[i]];
            }
            else{
              result = '';
            }
          }
        }

        // Call original backbone set function
        this.__set.call(result, parts[i], val, options);

      }
    };

    // Recursive implementation of toJSON with fix for circular dependancies
    Backbone.Model.prototype.toJSON = function() {
        if (this._isSerializing) {
            return this.id || this.cid;
        }
        this._isSerializing = true;
        var json = _.clone(this.attributes);
        _.each(json, function(value, name) {
            if( _.isNull(value) || _.isUndefined(value) ){ return; }
            _.isFunction(value.toJSON) && (json[name] = value.toJSON());
        });
        this._isSerializing = false;
        return json;
    };

    __exports__.Model = Model;
  });
define("rebound/components/collection", 
  ["exports"],
  function(__exports__) {
    
    // If Rebound Runtime has already been run, throw error
    if(Backbone.Collection.rebound){
      throw 'Rebound Collection is already loaded on the page!';
    }
    // If Backbone hasn't been started yet, throw error
    if(!window.Backbone){
      throw "Backbone must be on the page for Rebound to load.";
    }

    var Collection = Backbone.Collection;

    Backbone.Collection.prototype.rebound = true;
    Backbone.Collection.prototype.isCollection = true;

    function pathGenerator(collection, model){
      return function(){
        return collection.__path() + '.[' + collection.indexOf(model) + ']';
      };
    }

    // By default, __path returns the root object unless overridden
    Backbone.Collection.prototype.__path = function(){return '';};

    // Have collections set its model's names.
    Backbone.Collection.prototype.__set = Backbone.Collection.prototype.set;
    Backbone.Collection.prototype.set = function(models, options){
      var id,
          model,
          i, l;
      models = (!_.isArray(models)) ? (models ? [models] : []) : _.clone(models);

      // If a silent remove and this is the first silent remove since the last dom update, save our initial indicies
      if( options && options.silent && !this.models.__indexed ){
        _.each(this.models, function(model, index){
          model.__originalIndex = index;
        }, this);
        this.models.__indexed = true;
      }

      for (i = 0, l = models.length; i < l; i++) {
        model = models[i] || {};
        // If model is a backbone model, awesome. If not, make it one.
        if (model.isModel) {
          id = model;
        } else {
          id = model[this.model.prototype.idAttribute || 'id'];
          options = options ? _.clone(options) : {};
          options.collection = this;
          model = new this.model(model, options);
        }

        // If model does not already exist in the collection, set its name.
        if (!this.get(id)){
          // When requesting the name value of our value, return the its index appended to the computed name value of our parent
          // Closure is needed to preserve values in the instance so they dont get set to the prototype
          model.__path = (pathGenerator(this, model));
          model.__parent = this;
        }

        // If added silently, make note. If removed later, before it is rendered in the dom, we can remove it without alerting the dom.
        if (options.silent){
          model.__silent = true;
        }

        models[i] = model;
      }

      // Call original set function
      this.__set.call(this, models, options);

    };

    __exports__.Collection = Collection;
  });
define("rebound/components/controller", 
  ["rebound/property-processor","rebound/runtime","rebound/util","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    
    var propertyCompiler = __dependency1__["default"];
    var registerHelper = __dependency2__.registerHelper;
    var registerPartial = __dependency2__.registerPartial;
    var registerTemplate = __dependency2__.registerTemplate;
    var notify = __dependency2__.notify;
    var hydrate = __dependency2__.hydrate;
    var templates = __dependency2__.templates;
    var util = __dependency3__["default"];

    // If Rebound Runtime has already been run, throw error
    if(Backbone.Controller){
      throw 'Rebound is already loaded on the page!';
    }
    // If Backbone hasn't been started yet, throw error
    if(!window.Backbone){
      throw "Backbone must be on the page for Rebound to load.";
    }

    var controllerOptions = ['template', 'routes', 'immortal', 'data'];

    // New Backbone Controller
    var Controller = Backbone.Controller = function(options){

      options = options || (options = {});
      this.dom = '';
      this.cid = _.uniqueId('controller');
      this.attributes = {};
      this.changed = {};

      _.bindAll(this, '_onModelChange', '_onCollectionChange', '__callOnController');

      // Take our parsed data and add it to our backbone data structure. Does a deep defaults set.
      // In the model, primatives (arrays, objects, etc) are converted to Backbone Objects
      // Functions are compiled to find their dependancies and registerd as compiled properties
        // Legacy lodash only version of deepDefaults:
          // this.set(_.merge((options.data || {}), (this.defaults || {}), function(obj, defaults){
          //   if(obj === undefined) return defaults;
          //   if(obj.isModel)
          //    return _.defaults(obj.attributes, defaults);
          //   return _.defaults(obj, defaults);
          //  }));
      this.set(util.deepDefaults({}, (options.data || {}), (this.defaults || {})));
      propertyCompiler.compile(this);

      // Get any additional routes passed in from options
      this.routes =  _.defaults((options.routes || {}), this.routes);
      // Ensure that all route functions exist
      _.each(this.routes, function(value, key, routes){
          // TODO: Better error output
          if(typeof value !== 'string'){ throw('Function name passed to routes must be a string!'); }
          if(!this[value]){ throw('Callback function '+value+' does not exist on the controller!'); }
      }, this);

      // Set our outlet and template if we have one
      this.el = options.outlet || undefined;
      this.template = options.template || this.template || undefined;

      // Save our dom elements on our controller
      this.$el = $(this.el);

      // Take our precompiled template and hydrates it. When Rebound Compiler is included, can be a handlebars template string.
      this.template = this._setTemplate();

      // Listen to relevent data change events
      this._startListening();

      // Render our dom
      this.dom = this.template(this, {helpers: {'__callOnController': this.__callOnController}});

      // Place the dom in our custom element
      this.el.appendChild(this.dom);

    };

    Controller.prototype.__trigger = Backbone.Model.prototype.trigger;

    _.extend(Controller.prototype, Backbone.Model.prototype, {

      // Initialize is an empty function by default. Override it with your own initialization logic.
      initialize: function(){},

      isController: true,

      $: function(selector) {
        return this.$el.find(selector);
      },

      // Trigger all events on both the component and the element
      trigger: function(){
        if(this.$el){
          this.$el.triggerHandler.apply(this, arguments);
        }
        this.__trigger.apply(this, arguments);
      },

      __callOnController: function(name, event){
          this[name].call(this, event);
      },

      // Hydrate our template
      // Rebound Compiler overrides and gives the option for out template variable to be a handlebars template string
      _setTemplate: function(){
        // TODO: Better error output
        if (typeof this.template === 'string'){ this.template = Rebound.templates[this.template]; }
        if (typeof this.template !== 'function'){ throw "Template is required"; }
        return hydrate(this.template);
      },

      _startListening: function(){
        this.listenTo(this, 'change', this._onModelChange);
        this.listenTo(this, 'add remove reset', this._onCollectionChange);
      },

      _getValue: function(key){

      },

      _onModelChange: function(model, options){
        this._notify(model, model.changedAttributes());
      },

      _onCollectionChange: function(model, collection, options){
        var changed = {};
        if(model.isCollection){
          options = collection;
          collection = model;
        }
        changed[collection.__path()] = collection;

        this._notify(this, changed);
      },

      _notify: function(obj, changed){
        var path = obj.__path(),
            newPath,
            paths,
            queue = [], i, len;

        // Call notify on every object down the data tree starting at the root and all the way down element that triggered the change
        while(obj){
          // Constructs paths variable relative to current data element
          paths = _.map((_.keys(changed)), function(attr){
                    var str = obj.__path().replace(/([.\[\]])/g, '\\$1')+'\\.',
                        regex = new RegExp('^'+ (str || ''), '');
                    return ((path && path + '.') + attr).replace(regex, '');
                  });
          // TODO: Clean this up
          if(obj.__observers && paths.length){
            _.each(paths, function(path){
              // For elements in array syntax for a specific element, also notify of a change on the collection for any element changing
              // ex: test.[1].whatever -> test.@each.whatever
              if(path.match(/\[.+\]/g)){
                newPath = path.replace(/\[.+\]/g, "@each");
                paths.push(newPath);
                // Also listen to collection changes. Adds, removes, etc, if applicible.
                if(newPath.match(/\.@each\.?/)){
                  newPath = newPath.split(/\.@each\.?/);
                  paths.push(newPath[0]);
                }
              }
            });

            queue.push({obj: obj, paths: paths});
          }
          obj = obj.__parent;
        }
        len = queue.length;

        for(i=len-1; i>=0; i--){
          notify(queue[i].obj, queue[i].paths);
        }
      }

    });

    Controller.extend = function(protoProps, staticProps) {
        var parent = this,
            child,
            reservedMethods = {'trigger':1, 'constructor':1, 'get':1, 'set':1, 'has':1, 'extend':1, 'escape':1, 'unset':1, 'clear':1, 'cid':1, 'attributes':1, 'changed':1, 'toJSON':1, 'validationError':1, 'isValid':1, 'isNew':1, 'hasChanged':1, 'changedAttributes':1, 'previous':1, 'previousAttributes':1},
            configProperties = {'routes':1, 'template':1, 'defaults':1, 'outlet':1, 'url':1, 'urlRoot':1, 'idAttribute':1, 'id':1, 'createdCallback':1, 'attachedCallback':1, 'detachedCallback':1};

        protoProps.defaults = {};

        // For each primative value, or computed property (functions with that take no arguments and have a return value), add it to our data object
        _.each(protoProps, function(value, key, protoProps){
          var str = value.toString();
          // If a configuration property, return
          if(configProperties[key]){ return; }
          // Primative or backbone type equivalent, or computed property which takes no arguments and returns a value
          if(    !_.isFunction(value) || value.isModel || value.isController || (value && value.length === 0 && str.indexOf('return') > -1)){
            protoProps.defaults[key] = value;
            delete protoProps[key];
          }

          // All other values are controller methods, leave them be unless already defined.
          // TODO: better error output.
          if(reservedMethods[key]){ throw "ERROR: " + key + " is a reserved method name!"; }

        }, this);

        if (protoProps && _.has(protoProps, 'constructor')) {
          child = protoProps.constructor;
        } else {
          child = function(){ return parent.apply(this, arguments); };
        }

        _.extend(child, parent, staticProps);

        var Surrogate = function(){ this.constructor = child; };
        Surrogate.prototype = parent.prototype;
        child.prototype = new Surrogate();

        if (protoProps){ _.extend(child.prototype, protoProps); }

        child.__super__ = parent.prototype;

        return child;
      };

    __exports__.Controller = Controller;
  });
define("rebound/components/router", 
  ["exports"],
  function(__exports__) {
    

    // ROUTER

    /**
     * AppRoller is a micro framework designed to address some of the pain points associated of a large single page app
     * It manages life cycle of apps (an app is equivalent to a page in traditional multi-page app) without causing page refresh
     *
     * This gets loaded on every non-ajax requests along with basePage (base html page with navigation and chrome).
     * upon booting up; depending on the current route, it loads dependencies to execute given route
     *
     * for more detailed explanation go/realbean
     *
     * It is responsible for 3 main tasks
     *
     * 1. lazy loads app dependencies
     *    - loads js, tl, css dependencies needed to render a page
     *    - uses prefixes as supplied in config to construct dependency urls
     *
     * 2. dynamic routing
     *    - The router begins with a wild-card route and augments itself with new app routes when new app gets loaded
     *    - see TestApp for how to specify app routes
     *
     * 3. de-initializes old app
     *    - recursively deinitializes all associated components of the old app
     *    - relies on BaseView, BasePage, BaseController for deinitialization of any derived module
     *    - when transitioning from one app to another (SearchPage to ProfilePage),
     *      there is a need to clean up event handlers associated with old app.
     *    - this is essential to prevent any memory leaks or unexpected views rendering
     *
     * @author apandya
     */

    // If Rebound Runtime has already been run, throw error
    if(Backbone.AppLoader){ throw 'Rebound is already loaded on the page!'; }
    // If Backbone hasn't been started yet, throw error
    if(!window.Backbone){ throw "Backbone must be on the page for Rebound to load."; }

    var AppLoader = Backbone.AppLoader = (function (Backbone) {
      

      var AppLoader,
          appRouter,

      // map to check if particular route dependency is resolved or not
        routeDependencyTracker = {},

      // points to currently loaded pageApp
        pageApp,

      // AppLoader config
        config = {};

      /**
       * Destroys previously installed app and augments the Router with routes from newly loaded app
       *
       * @param primaryRoute
       */
      function installPageResources(PageApp, primaryRoute, isGlobal) {
        var oldPageName, pageInstance;

        // De-initialize the previous app before rendering a new app
        // This way we can ensure that every new page starts with a clean slate
        // This is crucial for scalability of a single page app.
        if(!isGlobal && pageApp){

          oldPageName = pageApp.__name;
          // Unset Previous Application's Routes. For each route in the page app:
          _.each(pageApp.__template.routes, function (value, key) {

            var regExp = appRouter._routeToRegExp(key).toString();

            // Remove the handler from our route object
            Backbone.history.handlers = _.filter(Backbone.history.handlers, function(obj){return obj.route.toString() !== regExp;});

            // Delete our referance to the route's callback
            delete appRouter[ '_function_' + key ];

          });

          // Un-hook Event Bindings, Delete Objects
          pageApp.__template.deinitialize();

          // Disable old css if it exists
          setTimeout(function(){
            $('#' + oldPageName + '-css').attr('disabled', true);
          }, 500);

        }

        // Load New PageApp, give it it's name so we know what css to remove when it deinitializes
        pageInstance = new PageApp();
        pageInstance.__name = primaryRoute;

        // Add to our page
        ((isGlobal) ? $(isGlobal) : $('content')).html(pageInstance);

        // Augment ApplicationRouter with new routes from PageApp
        _.each(pageInstance.__template.routes, function (value, key) {
          // Generate our route callback's new name
          var routeFunctionName = '_function_' + key,
              functionName;
          // Add the new callback referance on to our router
          appRouter[routeFunctionName] =  function () { pageInstance.__template[value].apply(pageInstance.__template, arguments); };
          // Add the route handler
          appRouter.route(key, value, appRouter[routeFunctionName]);
        });

        // Mark The App Dependancies As Resolved,
        routeDependencyTracker[primaryRoute] = pageInstance.name = primaryRoute;

        // Return our newly installed app
        return (!isGlobal) ? pageInstance : pageApp;
      }

      /**
       * Loads Page dependencies (JS, CSS) based on given primaryRoute
       * Note: .tls are bunched with the js concat groups to save additional call for template
       *
       * @param primaryRoute
       */
      function loadPageResources(primaryRoute, isGlobal) {

        // Expecting Module Definition as 'SearchApp' Where 'Search' a Primary Route
        var jsPrefix = config.jsPrefix.replace(/:route/g, primaryRoute),
            jsUrl = jsPrefix + primaryRoute + config.jsSuffix,
            cssUrl = config.cssPrefix + primaryRoute + config.cssSuffix + '.css',
            cssLoaded = false,
            jsLoaded = false,
            pageInstance = false,
            PageApp;

          // Only Load CSS If Not Loaded Before
          if(!$("#" + primaryRoute + '-css').length){
            $('<link>')
              .appendTo($('head'))
              .attr({type : 'text/css', rel : 'stylesheet'})
              .attr('href', cssUrl)
              .attr('id', primaryRoute + '-css')
              .on('load', function(event){
                if((cssLoaded = true) && jsLoaded){
                  // Install The Loaded Resources
                  pageApp = installPageResources(PageApp, primaryRoute, isGlobal);
                  Rebound.pageApp = pageApp;

                  // Re-trigger route so the newly added route may execute if there's a route match.
                  // If no routes are matched, app will hit wildCard route which will then trigger 404
                  if(!isGlobal && config.triggerOnFirstLoad){
                    Backbone.history.loadUrl(Backbone.history.fragment);
                  }
                  if(!isGlobal){
                    config.triggerOnFirstLoad = true;
                  }
                  $('body').removeClass('loading');
                }
              });
          }
          // If it has been loaded bevore, enable it
          else {
            $('#'+primaryRoute + '-css').attr('disabled', false);
            cssLoaded = true;
          }

          // If require library is almond, load script manualy
          if(require._defined){
            $('<script>')
              .appendTo($('head'))
              .attr({type : 'text/javascript'})
              .attr('src', '/'+jsUrl+'.js')
              .attr('id', primaryRoute + '-js')
              .on('load', function(event){
                // AMD Will Manage Dependancies For Us. Load The App.
                require([jsUrl], function(PageClass){

                  if((jsLoaded = true) && (PageApp = PageClass) && cssLoaded){

                    // Install The Loaded Resources
                    pageApp = installPageResources(PageApp, primaryRoute, isGlobal);
                    // Re-trigger route so the newly added route may execute if there's a route match.
                    // If no routes are matched, app will hit wildCard route which will then trigger 404
                    if(!isGlobal && config.triggerOnFirstLoad){
                      Backbone.history.loadUrl(Backbone.history.fragment);
                    }
                    Rebound.pageApp = pageApp;
                    if(!isGlobal){
                      config.triggerOnFirstLoad = true;
                    }
                    $('body').removeClass('loading');
                  }
                });
              });
          }
          else{
            // AMD Will Manage Dependancies For Us. Load The App.
            require([jsUrl], function(PageClass){

              if((jsLoaded = true) && (PageApp = PageClass) && cssLoaded){

                // Install The Loaded Resources
                pageApp = installPageResources(PageApp, primaryRoute, isGlobal);
                // Re-trigger route so the newly added route may execute if there's a route match.
                // If no routes are matched, app will hit wildCard route which will then trigger 404
                if(!isGlobal && config.triggerOnFirstLoad){
                  Backbone.history.loadUrl(Backbone.history.fragment);
                }
                Rebound.pageApp = pageApp;
                if(!isGlobal){
                  config.triggerOnFirstLoad = true;
                }
                $('body').removeClass('loading');
              }
            });
          }

      }

      /**
       *  wild-card route handler
       *  it is the last route in routing tree hierarchy
       *  gets called when no matching routes are found..
       *
       *  based on primaryRoute (for ex: given this url "appContext/search/searchId/SomeAction" the primaryRoute is search)
       *  it loads the app dependencies (js, tl, css) if it has not already loaded
       *
       *  if route dependency is already resolved that means there were no matching routes found in router
       *  and we have a route, which application can not handle..
       *  emits 404 RouteEvent which can be handled accordingly
       *
       */
      function onUnknownRoute(route) {

        // Handle null route
        route = route || '';

        // Get Root of Route
        var primaryRoute = (route) ? route.split('/')[0] : '';

        // Apply Any Special Mappings
        _.any(config.handlers, function(handler) {
          if (handler.route.test(route)) {
            primaryRoute = handler.primaryRoute;
            return true;
          }
        });

        // If Page Is Already Loaded, The Route Does Not Exist. 404 and Exit.
        if (pageApp && pageApp.name === primaryRoute) {
          return Backbone.history.loadUrl('404');
        }

        // Load Page Resources
        $('body').addClass('loading');
        loadPageResources(primaryRoute);
      }

      /**
       * Construct for AppLoader
       */

      AppLoader = function() {
        this.initialize.apply(this, arguments);
      };

      _.extend(AppLoader.prototype, Backbone.Events, {

        // On startup, save our config object and start the router
        initialize: function(options) {
          // Save our config referance
          config = options.config;
          config.handlers = [];
          this.start();
        },

        // Proxy function for Backbone's navigate function
        navigate: function(path, options){
          return this.router.navigate(path, options);
        },

        /**
         * app startup code
         * - at this point router contains one wildcard route
         */
        start: function() {

          // Backbone router options
          var options = {
            pushState: true,
            root: config.appContext
          },
          absoluteUrl = new RegExp('^(?:[a-z]+:)?//', 'i');

          // Create our page router
          appRouter =  this.router = new Backbone.Router();

          // Convert our routeMappings to regexps and push to our handlers
          _.each(config.routeMapping, function(value, route){
            if (!_.isRegExp(route)) route = appRouter._routeToRegExp(route);
            config.handlers.unshift({ route: route, primaryRoute: value });
          }, this);

          // Navigate to route for any link with a relative href
          $(document).on('click', 'a', function(event){
            var path = event.currentTarget.getAttribute('href');

            // If path is not an absolute url, or blank, try and navigate to that route.
            if(path !== '#' && path !== '' && !absoluteUrl.test(path)){
              event.preventDefault();
              appRouter.navigate(path, {trigger: true});
            }
          });

          // Add wildcard route
          this.router.onUnknownRoute = onUnknownRoute;
          this.router.route('*route', 'onUnknownRoute');

          // Install our global controllers
          _.each(config.globalControllers, function(selector, route){
            loadPageResources(route, selector);
          });

          // Start the history
          Backbone.history.start(options);

          // Let all of our controllers always have referance to our appRouter
          Backbone.Controller.prototype.router = this.router;
        }
      });

      return AppLoader;
    })(Backbone);

    __exports__["default"] = AppLoader;
  });
define("rebound/components/base", 
  [],
  function() {
    

    /**
     * Deinitializes the current class and subclasses associated with it
     * Note: this functionality is common for all Backbone derived class
     *
     */
    Backbone.Model.prototype.deinitialize =
    Backbone.Collection.prototype.deinitialize =
    Backbone.View.prototype.deinitialize =
    Backbone.Controller.prototype.deinitialize = function () {

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
  });
define("rebound.runtime", 
  ["rebound/runtime","rebound/components/model","rebound/components/collection","rebound/components/controller","rebound/components/router","rebound/components/base","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __exports__) {
    
    var registerHelper = __dependency1__.registerHelper;
    var registerPartial = __dependency1__.registerPartial;

    // If Backbone hasn't been started yet, throw error
    if(!window.Backbone){
      throw "Backbone must be on the page for Rebound to load.";
    }

    // Load our modified backbone objects
    var Model = __dependency2__["default"];
    var Collection = __dependency3__["default"];
    var Controller = __dependency4__["default"];
    var Router = __dependency5__["default"];

    var ReboundConfig = jQuery.parseJSON($('#Rebound').html()),
        router = (new Router({config: ReboundConfig})).router;

    var seedData = {};

    __exports__.registerHelper = registerHelper;
    __exports__.registerPartial = registerPartial;
    __exports__.router = router;
    __exports__.seedData = seedData;
  });
define("handlebars/safe-string", 
  ["exports"],
  function(__exports__) {
    
    // Build out our basic SafeString type
    function SafeString(string) {
      this.string = string;
    }

    SafeString.prototype.toString = function() {
      return "" + this.string;
    };

    __exports__["default"] = SafeString;
  });
define("handlebars/utils", 
  ["./safe-string","exports"],
  function(__dependency1__, __exports__) {
    
    /*jshint -W004 */
    var SafeString = __dependency1__["default"];

    var escape = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      "`": "&#x60;"
    };

    var badChars = /[&<>"'`]/g;
    var possible = /[&<>"'`]/;

    function escapeChar(chr) {
      return escape[chr] || "&amp;";
    }

    function extend(obj /* , ...source */) {
      for (var i = 1; i < arguments.length; i++) {
        for (var key in arguments[i]) {
          if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
            obj[key] = arguments[i][key];
          }
        }
      }

      return obj;
    }

    __exports__.extend = extend;var toString = Object.prototype.toString;
    __exports__.toString = toString;
    // Sourced from lodash
    // https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
    var isFunction = function(value) {
      return typeof value === 'function';
    };
    // fallback for older versions of Chrome and Safari
    if (isFunction(/x/)) {
      isFunction = function(value) {
        return typeof value === 'function' && toString.call(value) === '[object Function]';
      };
    }
    var isFunction;
    __exports__.isFunction = isFunction;
    var isArray = Array.isArray || function(value) {
      return (value && typeof value === 'object') ? toString.call(value) === '[object Array]' : false;
    };
    __exports__.isArray = isArray;

    function escapeExpression(string) {
      // don't escape SafeStrings, since they're already safe
      if (string instanceof SafeString) {
        return string.toString();
      } else if (!string && string !== 0) {
        return "";
      }

      // Force a string conversion as this will be done by the append regardless and
      // the regex test will do this transparently behind the scenes, causing issues if
      // an object's to string has escaped characters in it.
      string = "" + string;

      if(!possible.test(string)) { return string; }
      return string.replace(badChars, escapeChar);
    }

    __exports__.escapeExpression = escapeExpression;function isEmpty(value) {
      if (!value && value !== 0) {
        return true;
      } else if (isArray(value) && value.length === 0) {
        return true;
      } else {
        return false;
      }
    }

    __exports__.isEmpty = isEmpty;function appendContextPath(contextPath, id) {
      return (contextPath ? contextPath + '.' : '') + id;
    }

    __exports__.appendContextPath = appendContextPath;
  });
define("handlebars/exception", 
  ["exports"],
  function(__exports__) {
    

    var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

    function Exception(message, node) {
      var line;
      if (node && node.firstLine) {
        line = node.firstLine;

        message += ' - ' + line + ':' + node.firstColumn;
      }

      var tmp = Error.prototype.constructor.call(this, message);

      // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
      for (var idx = 0; idx < errorProps.length; idx++) {
        this[errorProps[idx]] = tmp[errorProps[idx]];
      }

      if (line) {
        this.lineNumber = line;
        this.column = node.firstColumn;
      }
    }

    Exception.prototype = new Error();

    __exports__["default"] = Exception;
  });
define("handlebars/base", 
  ["./utils","./exception","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    var Utils = __dependency1__;
    var Exception = __dependency2__["default"];

    var VERSION = "2.0.0-alpha.4";
    __exports__.VERSION = VERSION;var COMPILER_REVISION = 5;
    __exports__.COMPILER_REVISION = COMPILER_REVISION;
    var REVISION_CHANGES = {
      1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
      2: '== 1.0.0-rc.3',
      3: '== 1.0.0-rc.4',
      4: '== 1.x.x',
      5: '>= 2.0.0'
    };
    __exports__.REVISION_CHANGES = REVISION_CHANGES;
    var isArray = Utils.isArray,
        isFunction = Utils.isFunction,
        toString = Utils.toString,
        objectType = '[object Object]';

    function HandlebarsEnvironment(helpers, partials) {
      this.helpers = helpers || {};
      this.partials = partials || {};

      registerDefaultHelpers(this);
    }

    __exports__.HandlebarsEnvironment = HandlebarsEnvironment;HandlebarsEnvironment.prototype = {
      constructor: HandlebarsEnvironment,

      logger: logger,
      log: log,

      registerHelper: function(name, fn, inverse) {
        if (toString.call(name) === objectType) {
          if (inverse || fn) { throw new Exception('Arg not supported with multiple helpers'); }
          Utils.extend(this.helpers, name);
        } else {
          if (inverse) { fn.not = inverse; }
          this.helpers[name] = fn;
        }
      },
      unregisterHelper: function(name) {
        delete this.helpers[name];
      },

      registerPartial: function(name, str) {
        if (toString.call(name) === objectType) {
          Utils.extend(this.partials,  name);
        } else {
          this.partials[name] = str;
        }
      },
      unregisterPartial: function(name) {
        delete this.partials[name];
      }
    };

    function registerDefaultHelpers(instance) {
      instance.registerHelper('helperMissing', function(/* [args, ]options */) {
        if(arguments.length === 1) {
          // A missing field in a {{foo}} constuct.
          return undefined;
        } else {
          // Someone is actually trying to call something, blow up.
          throw new Exception("Missing helper: '" + arguments[arguments.length-1].name + "'");
        }
      });

      instance.registerHelper('blockHelperMissing', function(context, options) {
        var inverse = options.inverse || function() {}, fn = options.fn;

        if (isFunction(context)) { context = context.call(this); }

        if(context === true) {
          return fn(this);
        } else if(context === false || context == null) {
          return inverse(this);
        } else if (isArray(context)) {
          if(context.length > 0) {
            if (options.ids) {
              options.ids = [options.name];
            }

            return instance.helpers.each(context, options);
          } else {
            return inverse(this);
          }
        } else {
          if (options.data && options.ids) {
            var data = createFrame(options.data);
            data.contextPath = Utils.appendContextPath(options.data.contextPath, options.name);
            options = {data: data};
          }

          return fn(context, options);
        }
      });

      instance.registerHelper('each', function(context, options) {
        if (!options) {
          throw new Exception('Must pass iterator to #each');
        }

        var fn = options.fn, inverse = options.inverse;
        var i = 0, ret = "", data;

        var contextPath;
        if (options.data && options.ids) {
          contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]) + '.';
        }

        if (isFunction(context)) { context = context.call(this); }

        if (options.data) {
          data = createFrame(options.data);
        }

        if(context && typeof context === 'object') {
          if (isArray(context)) {
            for(var j = context.length; i<j; i++) {
              if (data) {
                data.index = i;
                data.first = (i === 0);
                data.last  = (i === (context.length-1));

                if (contextPath) {
                  data.contextPath = contextPath + i;
                }
              }
              ret = ret + fn(context[i], { data: data });
            }
          } else {
            for(var key in context) {
              if(context.hasOwnProperty(key)) {
                if(data) {
                  data.key = key;
                  data.index = i;
                  data.first = (i === 0);

                  if (contextPath) {
                    data.contextPath = contextPath + key;
                  }
                }
                ret = ret + fn(context[key], {data: data});
                i++;
              }
            }
          }
        }

        if(i === 0){
          ret = inverse(this);
        }

        return ret;
      });

      instance.registerHelper('if', function(conditional, options) {
        if (isFunction(conditional)) { conditional = conditional.call(this); }

        // Default behavior is to render the positive path if the value is truthy and not empty.
        // The `includeZero` option may be set to treat the condtional as purely not empty based on the
        // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
        if ((!options.hash.includeZero && !conditional) || Utils.isEmpty(conditional)) {
          return options.inverse(this);
        } else {
          return options.fn(this);
        }
      });

      instance.registerHelper('unless', function(conditional, options) {
        return instance.helpers['if'].call(this, conditional, {fn: options.inverse, inverse: options.fn, hash: options.hash});
      });

      instance.registerHelper('with', function(context, options) {
        if (isFunction(context)) { context = context.call(this); }

        var fn = options.fn;

        if (!Utils.isEmpty(context)) {
          if (options.data && options.ids) {
            var data = createFrame(options.data);
            data.contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]);
            options = {data:data};
          }

          return fn(context, options);
        }
      });

      instance.registerHelper('log', function(context, options) {
        var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
        instance.log(level, context);
      });

      instance.registerHelper('lookup', function(obj, field, options) {
        return obj && obj[field];
      });
    }

    var logger = {
      methodMap: { 0: 'debug', 1: 'info', 2: 'warn', 3: 'error' },

      // State enum
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
      level: 3,

      // can be overridden in the host environment
      log: function(level, obj) {
        if (logger.level <= level) {
          var method = logger.methodMap[level];
          if (typeof console !== 'undefined' && console[method]) {
            console[method].call(console, obj);
          }
        }
      }
    };
    __exports__.logger = logger;
    function log(level, obj) { logger.log(level, obj); }

    __exports__.log = log;var createFrame = function(object) {
      var frame = Utils.extend({}, object);
      frame._parent = object;
      return frame;
    };
    __exports__.createFrame = createFrame;
  });
define("handlebars/runtime", 
  ["./utils","./exception","./base","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    
    var Utils = __dependency1__;
    var Exception = __dependency2__["default"];
    var COMPILER_REVISION = __dependency3__.COMPILER_REVISION;
    var REVISION_CHANGES = __dependency3__.REVISION_CHANGES;
    var createFrame = __dependency3__.createFrame;

    function checkRevision(compilerInfo) {
      var compilerRevision = compilerInfo && compilerInfo[0] || 1,
          currentRevision = COMPILER_REVISION;

      if (compilerRevision !== currentRevision) {
        if (compilerRevision < currentRevision) {
          var runtimeVersions = REVISION_CHANGES[currentRevision],
              compilerVersions = REVISION_CHANGES[compilerRevision];
          throw new Exception("Template was precompiled with an older version of Handlebars than the current runtime. "+
                "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").");
        } else {
          // Use the embedded version info since the runtime doesn't know about this revision yet
          throw new Exception("Template was precompiled with a newer version of Handlebars than the current runtime. "+
                "Please update your runtime to a newer version ("+compilerInfo[1]+").");
        }
      }
    }

    __exports__.checkRevision = checkRevision;// TODO: Remove this line and break up compilePartial

    function template(templateSpec, env) {
      if (!env) {
        throw new Exception("No environment passed to template");
      }

      // Note: Using env.VM references rather than local var references throughout this section to allow
      // for external users to override these as psuedo-supported APIs.
      env.VM.checkRevision(templateSpec.compiler);

      var invokePartialWrapper = function(partial, name, context, hash, helpers, partials, data) {
        if (hash) {
          context = Utils.extend({}, context, hash);
        }

        var result = env.VM.invokePartial.call(this, partial, name, context, helpers, partials, data);
        if (result != null) { return result; }

        if (env.compile) {
          var options = { helpers: helpers, partials: partials, data: data };
          partials[name] = env.compile(partial, { data: data !== undefined }, env);
          return partials[name](context, options);
        } else {
          throw new Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
        }
      };

      // Just add water
      var container = {
        escapeExpression: Utils.escapeExpression,
        invokePartial: invokePartialWrapper,

        fn: function(i) {
          return templateSpec[i];
        },

        programs: [],
        program: function(i, data) {
          var programWrapper = this.programs[i],
              fn = this.fn(i);
          if(data) {
            programWrapper = program(this, i, fn, data);
          } else if (!programWrapper) {
            programWrapper = this.programs[i] = program(this, i, fn);
          }
          return programWrapper;
        },
        programWithDepth: env.VM.programWithDepth,

        data: function(data, depth) {
          while (data && depth--) {
            data = data._parent;
          }
          return data;
        },
        merge: function(param, common) {
          var ret = param || common;

          if (param && common && (param !== common)) {
            ret = Utils.extend({}, common, param);
          }

          return ret;
        },

        noop: env.VM.noop,
        compilerInfo: templateSpec.compiler
      };

      var ret = function(context, options) {
        options = options || {};
        var helpers,
            partials,
            data = options.data;

        ret._setup(options);
        if (!options.partial && templateSpec.useData) {
          data = initData(context, data);
        }
        return templateSpec.main.call(container, context, container.helpers, container.partials, data);
      };

      ret._setup = function(options) {
        if (!options.partial) {
          container.helpers = container.merge(options.helpers, env.helpers);

          if (templateSpec.usePartial) {
            container.partials = container.merge(options.partials, env.partials);
          }
        } else {
          container.helpers = options.helpers;
          container.partials = options.partials;
        }
      };

      ret._child = function(i) {
        return container.programWithDepth(i);
      };
      return ret;
    }

    __exports__.template = template;function programWithDepth(i, data /*, $depth */) {
      /*jshint -W040 */
      var args = Array.prototype.slice.call(arguments, 2),
          container = this,
          fn = container.fn(i);

      var prog = function(context, options) {
        options = options || {};

        return fn.apply(container, [context, container.helpers, container.partials, options.data || data].concat(args));
      };
      prog.program = i;
      prog.depth = args.length;
      return prog;
    }

    __exports__.programWithDepth = programWithDepth;function program(container, i, fn, data) {
      var prog = function(context, options) {
        options = options || {};

        return fn.call(container, context, container.helpers, container.partials, options.data || data);
      };
      prog.program = i;
      prog.depth = 0;
      return prog;
    }

    __exports__.program = program;function invokePartial(partial, name, context, helpers, partials, data) {
      var options = { partial: true, helpers: helpers, partials: partials, data: data };

      if(partial === undefined) {
        throw new Exception("The partial " + name + " could not be found");
      } else if(partial instanceof Function) {
        return partial(context, options);
      }
    }

    __exports__.invokePartial = invokePartial;function noop() { return ""; }

    __exports__.noop = noop;function initData(context, data) {
      if (!data || !('root' in data)) {
        data = data ? createFrame(data) : {};
        data.root = context;
      }
      return data;
    }
  });
define("handlebars.runtime", 
  ["./handlebars/base","./handlebars/safe-string","./handlebars/exception","./handlebars/utils","./handlebars/runtime","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    
    /*globals Handlebars: true */
    var base = __dependency1__;

    // Each of these augment the Handlebars object. No need to setup here.
    // (This is done to easily share code between commonjs and browse envs)
    var SafeString = __dependency2__["default"];
    var Exception = __dependency3__["default"];
    var Utils = __dependency4__;
    var runtime = __dependency5__;

    // For compatibility and usage outside of module systems, make the Handlebars object a namespace
    var create = function() {
      var hb = new base.HandlebarsEnvironment();

      Utils.extend(hb, base);
      hb.SafeString = SafeString;
      hb.Exception = Exception;
      hb.Utils = Utils;

      hb.VM = runtime;
      hb.template = function(spec) {
        return runtime.template(spec, hb);
      };

      return hb;
    };

    var Handlebars = create();
    Handlebars.create = create;

    __exports__["default"] = Handlebars;
  });
define("handlebars/compiler/ast", 
  ["../exception","exports"],
  function(__dependency1__, __exports__) {
    
    var Exception = __dependency1__["default"];

    function LocationInfo(locInfo){
      locInfo = locInfo || {};
      this.firstLine   = locInfo.first_line;
      this.firstColumn = locInfo.first_column;
      this.lastColumn  = locInfo.last_column;
      this.lastLine    = locInfo.last_line;
    }

    var AST = {
      ProgramNode: function(statements, inverseStrip, inverse, locInfo) {
        var inverseLocationInfo, firstInverseNode;
        if (arguments.length === 3) {
          locInfo = inverse;
          inverse = null;
        } else if (arguments.length === 2) {
          locInfo = inverseStrip;
          inverseStrip = null;
        }

        LocationInfo.call(this, locInfo);
        this.type = "program";
        this.statements = statements;
        this.strip = {};

        if(inverse) {
          firstInverseNode = inverse[0];
          if (firstInverseNode) {
            inverseLocationInfo = {
              first_line: firstInverseNode.firstLine,
              last_line: firstInverseNode.lastLine,
              last_column: firstInverseNode.lastColumn,
              first_column: firstInverseNode.firstColumn
            };
            this.inverse = new AST.ProgramNode(inverse, inverseStrip, inverseLocationInfo);
          } else {
            this.inverse = new AST.ProgramNode(inverse, inverseStrip);
          }
          this.strip.right = inverseStrip.left;
        } else if (inverseStrip) {
          this.strip.left = inverseStrip.right;
        }
      },

      MustacheNode: function(rawParams, hash, open, strip, locInfo) {
        LocationInfo.call(this, locInfo);
        this.type = "mustache";
        this.strip = strip;

        // Open may be a string parsed from the parser or a passed boolean flag
        if (open != null && open.charAt) {
          // Must use charAt to support IE pre-10
          var escapeFlag = open.charAt(3) || open.charAt(2);
          this.escaped = escapeFlag !== '{' && escapeFlag !== '&';
        } else {
          this.escaped = !!open;
        }

        if (rawParams instanceof AST.SexprNode) {
          this.sexpr = rawParams;
        } else {
          // Support old AST API
          this.sexpr = new AST.SexprNode(rawParams, hash);
        }

        this.sexpr.isRoot = true;

        // Support old AST API that stored this info in MustacheNode
        this.id = this.sexpr.id;
        this.params = this.sexpr.params;
        this.hash = this.sexpr.hash;
        this.eligibleHelper = this.sexpr.eligibleHelper;
        this.isHelper = this.sexpr.isHelper;
      },

      SexprNode: function(rawParams, hash, locInfo) {
        LocationInfo.call(this, locInfo);

        this.type = "sexpr";
        this.hash = hash;

        var id = this.id = rawParams[0];
        var params = this.params = rawParams.slice(1);

        // a mustache is definitely a helper if:
        // * it is an eligible helper, and
        // * it has at least one parameter or hash segment
        this.isHelper = !!(params.length || hash);

        // a mustache is an eligible helper if:
        // * its id is simple (a single part, not `this` or `..`)
        this.eligibleHelper = this.isHelper || id.isSimple;

        // if a mustache is an eligible helper but not a definite
        // helper, it is ambiguous, and will be resolved in a later
        // pass or at runtime.
      },

      PartialNode: function(partialName, context, hash, strip, locInfo) {
        LocationInfo.call(this, locInfo);
        this.type         = "partial";
        this.partialName  = partialName;
        this.context      = context;
        this.hash = hash;
        this.strip = strip;
      },

      BlockNode: function(mustache, program, inverse, close, locInfo) {
        LocationInfo.call(this, locInfo);

        if(mustache.sexpr.id.original !== close.path.original) {
          throw new Exception(mustache.sexpr.id.original + " doesn't match " + close.path.original, this);
        }

        this.type = 'block';
        this.mustache = mustache;
        this.program  = program;
        this.inverse  = inverse;

        this.strip = {
          left: mustache.strip.left,
          right: close.strip.right
        };

        (program || inverse).strip.left = mustache.strip.right;
        (inverse || program).strip.right = close.strip.left;

        if (inverse && !program) {
          this.isInverse = true;
        }
      },

      RawBlockNode: function(mustache, content, close, locInfo) {
        LocationInfo.call(this, locInfo);

        if (mustache.sexpr.id.original !== close) {
          throw new Exception(mustache.sexpr.id.original + " doesn't match " + close, this);
        }

        content = new AST.ContentNode(content, locInfo);

        this.type = 'block';
        this.mustache = mustache;
        this.program = new AST.ProgramNode([content], locInfo);
      },

      ContentNode: function(string, locInfo) {
        LocationInfo.call(this, locInfo);
        this.type = "content";
        this.string = string;
      },

      HashNode: function(pairs, locInfo) {
        LocationInfo.call(this, locInfo);
        this.type = "hash";
        this.pairs = pairs;
      },

      IdNode: function(parts, locInfo) {
        LocationInfo.call(this, locInfo);
        this.type = "ID";

        var original = "",
            dig = [],
            depth = 0,
            depthString = '';

        for(var i=0,l=parts.length; i<l; i++) {
          var part = parts[i].part;
          original += (parts[i].separator || '') + part;

          if (part === ".." || part === "." || part === "this") {
            if (dig.length > 0) {
              throw new Exception("Invalid path: " + original, this);
            } else if (part === "..") {
              depth++;
              depthString += '../';
            } else {
              this.isScoped = true;
            }
          } else {
            dig.push(part);
          }
        }

        this.original = original;
        this.parts    = dig;
        this.string   = dig.join('.');
        this.depth    = depth;
        this.idName   = depthString + this.string;

        // an ID is simple if it only has one part, and that part is not
        // `..` or `this`.
        this.isSimple = parts.length === 1 && !this.isScoped && depth === 0;

        this.stringModeValue = this.string;
      },

      PartialNameNode: function(name, locInfo) {
        LocationInfo.call(this, locInfo);
        this.type = "PARTIAL_NAME";
        this.name = name.original;
      },

      DataNode: function(id, locInfo) {
        LocationInfo.call(this, locInfo);
        this.type = "DATA";
        this.id = id;
        this.stringModeValue = id.stringModeValue;
        this.idName = '@' + id.stringModeValue;
      },

      StringNode: function(string, locInfo) {
        LocationInfo.call(this, locInfo);
        this.type = "STRING";
        this.original =
          this.string =
          this.stringModeValue = string;
      },

      NumberNode: function(number, locInfo) {
        LocationInfo.call(this, locInfo);
        this.type = "NUMBER";
        this.original =
          this.number = number;
        this.stringModeValue = Number(number);
      },

      BooleanNode: function(bool, locInfo) {
        LocationInfo.call(this, locInfo);
        this.type = "BOOLEAN";
        this.bool = bool;
        this.stringModeValue = bool === "true";
      },

      CommentNode: function(comment, locInfo) {
        LocationInfo.call(this, locInfo);
        this.type = "comment";
        this.comment = comment;
      }
    };

    // Must be exported as an object rather than the root of the module as the jison lexer
    // most modify the object to operate properly.
    __exports__["default"] = AST;
  });
define("handlebars/compiler/parser", 
  ["exports"],
  function(__exports__) {
    
    /* jshint ignore:start */
    /* Jison generated parser */
    var handlebars = (function(){
    var parser = {trace: function trace() { },
    yy: {},
    symbols_: {"error":2,"root":3,"statements":4,"EOF":5,"program":6,"simpleInverse":7,"statement":8,"openRawBlock":9,"CONTENT":10,"END_RAW_BLOCK":11,"openInverse":12,"closeBlock":13,"openBlock":14,"mustache":15,"partial":16,"COMMENT":17,"OPEN_RAW_BLOCK":18,"sexpr":19,"CLOSE_RAW_BLOCK":20,"OPEN_BLOCK":21,"CLOSE":22,"OPEN_INVERSE":23,"OPEN_ENDBLOCK":24,"path":25,"OPEN":26,"OPEN_UNESCAPED":27,"CLOSE_UNESCAPED":28,"OPEN_PARTIAL":29,"partialName":30,"param":31,"partial_option0":32,"partial_option1":33,"sexpr_repetition0":34,"sexpr_option0":35,"dataName":36,"STRING":37,"NUMBER":38,"BOOLEAN":39,"OPEN_SEXPR":40,"CLOSE_SEXPR":41,"hash":42,"hash_repetition_plus0":43,"hashSegment":44,"ID":45,"EQUALS":46,"DATA":47,"pathSegments":48,"SEP":49,"$accept":0,"$end":1},
    terminals_: {2:"error",5:"EOF",10:"CONTENT",11:"END_RAW_BLOCK",17:"COMMENT",18:"OPEN_RAW_BLOCK",20:"CLOSE_RAW_BLOCK",21:"OPEN_BLOCK",22:"CLOSE",23:"OPEN_INVERSE",24:"OPEN_ENDBLOCK",26:"OPEN",27:"OPEN_UNESCAPED",28:"CLOSE_UNESCAPED",29:"OPEN_PARTIAL",37:"STRING",38:"NUMBER",39:"BOOLEAN",40:"OPEN_SEXPR",41:"CLOSE_SEXPR",45:"ID",46:"EQUALS",47:"DATA",49:"SEP"},
    productions_: [0,[3,2],[3,1],[6,2],[6,3],[6,2],[6,1],[6,1],[6,0],[4,1],[4,2],[8,3],[8,3],[8,3],[8,1],[8,1],[8,1],[8,1],[9,3],[14,3],[12,3],[13,3],[15,3],[15,3],[16,5],[16,4],[7,2],[19,3],[19,1],[31,1],[31,1],[31,1],[31,1],[31,1],[31,3],[42,1],[44,3],[30,1],[30,1],[30,1],[36,2],[25,1],[48,3],[48,1],[32,0],[32,1],[33,0],[33,1],[34,0],[34,2],[35,0],[35,1],[43,1],[43,2]],
    performAction: function anonymous(yytext,yyleng,yylineno,yy,yystate,$$,_$) {

    var $0 = $$.length - 1;
    switch (yystate) {
    case 1: return new yy.ProgramNode($$[$0-1], this._$); 
    break;
    case 2: return new yy.ProgramNode([], this._$); 
    break;
    case 3:this.$ = new yy.ProgramNode([], $$[$0-1], $$[$0], this._$);
    break;
    case 4:this.$ = new yy.ProgramNode($$[$0-2], $$[$0-1], $$[$0], this._$);
    break;
    case 5:this.$ = new yy.ProgramNode($$[$0-1], $$[$0], [], this._$);
    break;
    case 6:this.$ = new yy.ProgramNode($$[$0], this._$);
    break;
    case 7:this.$ = new yy.ProgramNode([], this._$);
    break;
    case 8:this.$ = new yy.ProgramNode([], this._$);
    break;
    case 9:this.$ = [$$[$0]];
    break;
    case 10: $$[$0-1].push($$[$0]); this.$ = $$[$0-1]; 
    break;
    case 11:this.$ = new yy.RawBlockNode($$[$0-2], $$[$0-1], $$[$0], this._$);
    break;
    case 12:this.$ = new yy.BlockNode($$[$0-2], $$[$0-1].inverse, $$[$0-1], $$[$0], this._$);
    break;
    case 13:this.$ = new yy.BlockNode($$[$0-2], $$[$0-1], $$[$0-1].inverse, $$[$0], this._$);
    break;
    case 14:this.$ = $$[$0];
    break;
    case 15:this.$ = $$[$0];
    break;
    case 16:this.$ = new yy.ContentNode($$[$0], this._$);
    break;
    case 17:this.$ = new yy.CommentNode($$[$0], this._$);
    break;
    case 18:this.$ = new yy.MustacheNode($$[$0-1], null, '', '', this._$);
    break;
    case 19:this.$ = new yy.MustacheNode($$[$0-1], null, $$[$0-2], stripFlags($$[$0-2], $$[$0]), this._$);
    break;
    case 20:this.$ = new yy.MustacheNode($$[$0-1], null, $$[$0-2], stripFlags($$[$0-2], $$[$0]), this._$);
    break;
    case 21:this.$ = {path: $$[$0-1], strip: stripFlags($$[$0-2], $$[$0])};
    break;
    case 22:this.$ = new yy.MustacheNode($$[$0-1], null, $$[$0-2], stripFlags($$[$0-2], $$[$0]), this._$);
    break;
    case 23:this.$ = new yy.MustacheNode($$[$0-1], null, $$[$0-2], stripFlags($$[$0-2], $$[$0]), this._$);
    break;
    case 24:this.$ = new yy.PartialNode($$[$0-3], $$[$0-2], $$[$0-1], stripFlags($$[$0-4], $$[$0]), this._$);
    break;
    case 25:this.$ = new yy.PartialNode($$[$0-2], undefined, $$[$0-1], stripFlags($$[$0-3], $$[$0]), this._$);
    break;
    case 26:this.$ = stripFlags($$[$0-1], $$[$0]);
    break;
    case 27:this.$ = new yy.SexprNode([$$[$0-2]].concat($$[$0-1]), $$[$0], this._$);
    break;
    case 28:this.$ = new yy.SexprNode([$$[$0]], null, this._$);
    break;
    case 29:this.$ = $$[$0];
    break;
    case 30:this.$ = new yy.StringNode($$[$0], this._$);
    break;
    case 31:this.$ = new yy.NumberNode($$[$0], this._$);
    break;
    case 32:this.$ = new yy.BooleanNode($$[$0], this._$);
    break;
    case 33:this.$ = $$[$0];
    break;
    case 34:$$[$0-1].isHelper = true; this.$ = $$[$0-1];
    break;
    case 35:this.$ = new yy.HashNode($$[$0], this._$);
    break;
    case 36:this.$ = [$$[$0-2], $$[$0]];
    break;
    case 37:this.$ = new yy.PartialNameNode($$[$0], this._$);
    break;
    case 38:this.$ = new yy.PartialNameNode(new yy.StringNode($$[$0], this._$), this._$);
    break;
    case 39:this.$ = new yy.PartialNameNode(new yy.NumberNode($$[$0], this._$));
    break;
    case 40:this.$ = new yy.DataNode($$[$0], this._$);
    break;
    case 41:this.$ = new yy.IdNode($$[$0], this._$);
    break;
    case 42: $$[$0-2].push({part: $$[$0], separator: $$[$0-1]}); this.$ = $$[$0-2]; 
    break;
    case 43:this.$ = [{part: $$[$0]}];
    break;
    case 48:this.$ = [];
    break;
    case 49:$$[$0-1].push($$[$0]);
    break;
    case 52:this.$ = [$$[$0]];
    break;
    case 53:$$[$0-1].push($$[$0]);
    break;
    }
    },
    table: [{3:1,4:2,5:[1,3],8:4,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,13],26:[1,15],27:[1,16],29:[1,17]},{1:[3]},{5:[1,18],8:19,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,13],26:[1,15],27:[1,16],29:[1,17]},{1:[2,2]},{5:[2,9],10:[2,9],17:[2,9],18:[2,9],21:[2,9],23:[2,9],24:[2,9],26:[2,9],27:[2,9],29:[2,9]},{10:[1,20]},{4:23,6:21,7:22,8:4,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,24],24:[2,8],26:[1,15],27:[1,16],29:[1,17]},{4:23,6:25,7:22,8:4,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,24],24:[2,8],26:[1,15],27:[1,16],29:[1,17]},{5:[2,14],10:[2,14],17:[2,14],18:[2,14],21:[2,14],23:[2,14],24:[2,14],26:[2,14],27:[2,14],29:[2,14]},{5:[2,15],10:[2,15],17:[2,15],18:[2,15],21:[2,15],23:[2,15],24:[2,15],26:[2,15],27:[2,15],29:[2,15]},{5:[2,16],10:[2,16],17:[2,16],18:[2,16],21:[2,16],23:[2,16],24:[2,16],26:[2,16],27:[2,16],29:[2,16]},{5:[2,17],10:[2,17],17:[2,17],18:[2,17],21:[2,17],23:[2,17],24:[2,17],26:[2,17],27:[2,17],29:[2,17]},{19:26,25:27,36:28,45:[1,31],47:[1,30],48:29},{19:32,25:27,36:28,45:[1,31],47:[1,30],48:29},{19:33,25:27,36:28,45:[1,31],47:[1,30],48:29},{19:34,25:27,36:28,45:[1,31],47:[1,30],48:29},{19:35,25:27,36:28,45:[1,31],47:[1,30],48:29},{25:37,30:36,37:[1,38],38:[1,39],45:[1,31],48:29},{1:[2,1]},{5:[2,10],10:[2,10],17:[2,10],18:[2,10],21:[2,10],23:[2,10],24:[2,10],26:[2,10],27:[2,10],29:[2,10]},{11:[1,40]},{13:41,24:[1,42]},{4:43,8:4,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,13],24:[2,7],26:[1,15],27:[1,16],29:[1,17]},{7:44,8:19,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,24],24:[2,6],26:[1,15],27:[1,16],29:[1,17]},{19:32,22:[1,45],25:27,36:28,45:[1,31],47:[1,30],48:29},{13:46,24:[1,42]},{20:[1,47]},{20:[2,48],22:[2,48],28:[2,48],34:48,37:[2,48],38:[2,48],39:[2,48],40:[2,48],41:[2,48],45:[2,48],47:[2,48]},{20:[2,28],22:[2,28],28:[2,28],41:[2,28]},{20:[2,41],22:[2,41],28:[2,41],37:[2,41],38:[2,41],39:[2,41],40:[2,41],41:[2,41],45:[2,41],47:[2,41],49:[1,49]},{25:50,45:[1,31],48:29},{20:[2,43],22:[2,43],28:[2,43],37:[2,43],38:[2,43],39:[2,43],40:[2,43],41:[2,43],45:[2,43],47:[2,43],49:[2,43]},{22:[1,51]},{22:[1,52]},{22:[1,53]},{28:[1,54]},{22:[2,46],25:57,31:55,33:56,36:61,37:[1,58],38:[1,59],39:[1,60],40:[1,62],42:63,43:64,44:66,45:[1,65],47:[1,30],48:29},{22:[2,37],37:[2,37],38:[2,37],39:[2,37],40:[2,37],45:[2,37],47:[2,37]},{22:[2,38],37:[2,38],38:[2,38],39:[2,38],40:[2,38],45:[2,38],47:[2,38]},{22:[2,39],37:[2,39],38:[2,39],39:[2,39],40:[2,39],45:[2,39],47:[2,39]},{5:[2,11],10:[2,11],17:[2,11],18:[2,11],21:[2,11],23:[2,11],24:[2,11],26:[2,11],27:[2,11],29:[2,11]},{5:[2,12],10:[2,12],17:[2,12],18:[2,12],21:[2,12],23:[2,12],24:[2,12],26:[2,12],27:[2,12],29:[2,12]},{25:67,45:[1,31],48:29},{8:19,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,13],24:[2,3],26:[1,15],27:[1,16],29:[1,17]},{4:68,8:4,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,13],24:[2,5],26:[1,15],27:[1,16],29:[1,17]},{10:[2,26],17:[2,26],18:[2,26],21:[2,26],23:[2,26],24:[2,26],26:[2,26],27:[2,26],29:[2,26]},{5:[2,13],10:[2,13],17:[2,13],18:[2,13],21:[2,13],23:[2,13],24:[2,13],26:[2,13],27:[2,13],29:[2,13]},{10:[2,18]},{20:[2,50],22:[2,50],25:57,28:[2,50],31:70,35:69,36:61,37:[1,58],38:[1,59],39:[1,60],40:[1,62],41:[2,50],42:71,43:64,44:66,45:[1,65],47:[1,30],48:29},{45:[1,72]},{20:[2,40],22:[2,40],28:[2,40],37:[2,40],38:[2,40],39:[2,40],40:[2,40],41:[2,40],45:[2,40],47:[2,40]},{10:[2,20],17:[2,20],18:[2,20],21:[2,20],23:[2,20],24:[2,20],26:[2,20],27:[2,20],29:[2,20]},{10:[2,19],17:[2,19],18:[2,19],21:[2,19],23:[2,19],24:[2,19],26:[2,19],27:[2,19],29:[2,19]},{5:[2,22],10:[2,22],17:[2,22],18:[2,22],21:[2,22],23:[2,22],24:[2,22],26:[2,22],27:[2,22],29:[2,22]},{5:[2,23],10:[2,23],17:[2,23],18:[2,23],21:[2,23],23:[2,23],24:[2,23],26:[2,23],27:[2,23],29:[2,23]},{22:[2,44],32:73,42:74,43:64,44:66,45:[1,75]},{22:[1,76]},{20:[2,29],22:[2,29],28:[2,29],37:[2,29],38:[2,29],39:[2,29],40:[2,29],41:[2,29],45:[2,29],47:[2,29]},{20:[2,30],22:[2,30],28:[2,30],37:[2,30],38:[2,30],39:[2,30],40:[2,30],41:[2,30],45:[2,30],47:[2,30]},{20:[2,31],22:[2,31],28:[2,31],37:[2,31],38:[2,31],39:[2,31],40:[2,31],41:[2,31],45:[2,31],47:[2,31]},{20:[2,32],22:[2,32],28:[2,32],37:[2,32],38:[2,32],39:[2,32],40:[2,32],41:[2,32],45:[2,32],47:[2,32]},{20:[2,33],22:[2,33],28:[2,33],37:[2,33],38:[2,33],39:[2,33],40:[2,33],41:[2,33],45:[2,33],47:[2,33]},{19:77,25:27,36:28,45:[1,31],47:[1,30],48:29},{22:[2,47]},{20:[2,35],22:[2,35],28:[2,35],41:[2,35],44:78,45:[1,75]},{20:[2,43],22:[2,43],28:[2,43],37:[2,43],38:[2,43],39:[2,43],40:[2,43],41:[2,43],45:[2,43],46:[1,79],47:[2,43],49:[2,43]},{20:[2,52],22:[2,52],28:[2,52],41:[2,52],45:[2,52]},{22:[1,80]},{8:19,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,13],24:[2,4],26:[1,15],27:[1,16],29:[1,17]},{20:[2,27],22:[2,27],28:[2,27],41:[2,27]},{20:[2,49],22:[2,49],28:[2,49],37:[2,49],38:[2,49],39:[2,49],40:[2,49],41:[2,49],45:[2,49],47:[2,49]},{20:[2,51],22:[2,51],28:[2,51],41:[2,51]},{20:[2,42],22:[2,42],28:[2,42],37:[2,42],38:[2,42],39:[2,42],40:[2,42],41:[2,42],45:[2,42],47:[2,42],49:[2,42]},{22:[1,81]},{22:[2,45]},{46:[1,79]},{5:[2,25],10:[2,25],17:[2,25],18:[2,25],21:[2,25],23:[2,25],24:[2,25],26:[2,25],27:[2,25],29:[2,25]},{41:[1,82]},{20:[2,53],22:[2,53],28:[2,53],41:[2,53],45:[2,53]},{25:57,31:83,36:61,37:[1,58],38:[1,59],39:[1,60],40:[1,62],45:[1,31],47:[1,30],48:29},{5:[2,21],10:[2,21],17:[2,21],18:[2,21],21:[2,21],23:[2,21],24:[2,21],26:[2,21],27:[2,21],29:[2,21]},{5:[2,24],10:[2,24],17:[2,24],18:[2,24],21:[2,24],23:[2,24],24:[2,24],26:[2,24],27:[2,24],29:[2,24]},{20:[2,34],22:[2,34],28:[2,34],37:[2,34],38:[2,34],39:[2,34],40:[2,34],41:[2,34],45:[2,34],47:[2,34]},{20:[2,36],22:[2,36],28:[2,36],41:[2,36],45:[2,36]}],
    defaultActions: {3:[2,2],18:[2,1],47:[2,18],63:[2,47],74:[2,45]},
    parseError: function parseError(str, hash) {
        throw new Error(str);
    },
    parse: function parse(input) {
        var self = this, stack = [0], vstack = [null], lstack = [], table = this.table, yytext = "", yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
        this.lexer.setInput(input);
        this.lexer.yy = this.yy;
        this.yy.lexer = this.lexer;
        this.yy.parser = this;
        if (typeof this.lexer.yylloc == "undefined")
            this.lexer.yylloc = {};
        var yyloc = this.lexer.yylloc;
        lstack.push(yyloc);
        var ranges = this.lexer.options && this.lexer.options.ranges;
        if (typeof this.yy.parseError === "function")
            this.parseError = this.yy.parseError;
        function popStack(n) {
            stack.length = stack.length - 2 * n;
            vstack.length = vstack.length - n;
            lstack.length = lstack.length - n;
        }
        function lex() {
            var token;
            token = self.lexer.lex() || 1;
            if (typeof token !== "number") {
                token = self.symbols_[token] || token;
            }
            return token;
        }
        var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
        while (true) {
            state = stack[stack.length - 1];
            if (this.defaultActions[state]) {
                action = this.defaultActions[state];
            } else {
                if (symbol === null || typeof symbol == "undefined") {
                    symbol = lex();
                }
                action = table[state] && table[state][symbol];
            }
            if (typeof action === "undefined" || !action.length || !action[0]) {
                var errStr = "";
                if (!recovering) {
                    expected = [];
                    for (p in table[state])
                        if (this.terminals_[p] && p > 2) {
                            expected.push("'" + this.terminals_[p] + "'");
                        }
                    if (this.lexer.showPosition) {
                        errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                    } else {
                        errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == 1?"end of input":"'" + (this.terminals_[symbol] || symbol) + "'");
                    }
                    this.parseError(errStr, {text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected});
                }
            }
            if (action[0] instanceof Array && action.length > 1) {
                throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
            }
            switch (action[0]) {
            case 1:
                stack.push(symbol);
                vstack.push(this.lexer.yytext);
                lstack.push(this.lexer.yylloc);
                stack.push(action[1]);
                symbol = null;
                if (!preErrorSymbol) {
                    yyleng = this.lexer.yyleng;
                    yytext = this.lexer.yytext;
                    yylineno = this.lexer.yylineno;
                    yyloc = this.lexer.yylloc;
                    if (recovering > 0)
                        recovering--;
                } else {
                    symbol = preErrorSymbol;
                    preErrorSymbol = null;
                }
                break;
            case 2:
                len = this.productions_[action[1]][1];
                yyval.$ = vstack[vstack.length - len];
                yyval._$ = {first_line: lstack[lstack.length - (len || 1)].first_line, last_line: lstack[lstack.length - 1].last_line, first_column: lstack[lstack.length - (len || 1)].first_column, last_column: lstack[lstack.length - 1].last_column};
                if (ranges) {
                    yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
                }
                r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
                if (typeof r !== "undefined") {
                    return r;
                }
                if (len) {
                    stack = stack.slice(0, -1 * len * 2);
                    vstack = vstack.slice(0, -1 * len);
                    lstack = lstack.slice(0, -1 * len);
                }
                stack.push(this.productions_[action[1]][0]);
                vstack.push(yyval.$);
                lstack.push(yyval._$);
                newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
                stack.push(newState);
                break;
            case 3:
                return true;
            }
        }
        return true;
    }
    };


    function stripFlags(open, close) {
      return {
        left: open.charAt(2) === '~',
        right: close.charAt(0) === '~' || close.charAt(1) === '~'
      };
    }

    /* Jison generated lexer */
    var lexer = (function(){
    var lexer = ({EOF:1,
    parseError:function parseError(str, hash) {
            if (this.yy.parser) {
                this.yy.parser.parseError(str, hash);
            } else {
                throw new Error(str);
            }
        },
    setInput:function (input) {
            this._input = input;
            this._more = this._less = this.done = false;
            this.yylineno = this.yyleng = 0;
            this.yytext = this.matched = this.match = '';
            this.conditionStack = ['INITIAL'];
            this.yylloc = {first_line:1,first_column:0,last_line:1,last_column:0};
            if (this.options.ranges) this.yylloc.range = [0,0];
            this.offset = 0;
            return this;
        },
    input:function () {
            var ch = this._input[0];
            this.yytext += ch;
            this.yyleng++;
            this.offset++;
            this.match += ch;
            this.matched += ch;
            var lines = ch.match(/(?:\r\n?|\n).*/g);
            if (lines) {
                this.yylineno++;
                this.yylloc.last_line++;
            } else {
                this.yylloc.last_column++;
            }
            if (this.options.ranges) this.yylloc.range[1]++;

            this._input = this._input.slice(1);
            return ch;
        },
    unput:function (ch) {
            var len = ch.length;
            var lines = ch.split(/(?:\r\n?|\n)/g);

            this._input = ch + this._input;
            this.yytext = this.yytext.substr(0, this.yytext.length-len-1);
            //this.yyleng -= len;
            this.offset -= len;
            var oldLines = this.match.split(/(?:\r\n?|\n)/g);
            this.match = this.match.substr(0, this.match.length-1);
            this.matched = this.matched.substr(0, this.matched.length-1);

            if (lines.length-1) this.yylineno -= lines.length-1;
            var r = this.yylloc.range;

            this.yylloc = {first_line: this.yylloc.first_line,
              last_line: this.yylineno+1,
              first_column: this.yylloc.first_column,
              last_column: lines ?
                  (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length:
                  this.yylloc.first_column - len
              };

            if (this.options.ranges) {
                this.yylloc.range = [r[0], r[0] + this.yyleng - len];
            }
            return this;
        },
    more:function () {
            this._more = true;
            return this;
        },
    less:function (n) {
            this.unput(this.match.slice(n));
        },
    pastInput:function () {
            var past = this.matched.substr(0, this.matched.length - this.match.length);
            return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
        },
    upcomingInput:function () {
            var next = this.match;
            if (next.length < 20) {
                next += this._input.substr(0, 20-next.length);
            }
            return (next.substr(0,20)+(next.length > 20 ? '...':'')).replace(/\n/g, "");
        },
    showPosition:function () {
            var pre = this.pastInput();
            var c = new Array(pre.length + 1).join("-");
            return pre + this.upcomingInput() + "\n" + c+"^";
        },
    next:function () {
            if (this.done) {
                return this.EOF;
            }
            if (!this._input) this.done = true;

            var token,
                match,
                tempMatch,
                index,
                col,
                lines;
            if (!this._more) {
                this.yytext = '';
                this.match = '';
            }
            var rules = this._currentRules();
            for (var i=0;i < rules.length; i++) {
                tempMatch = this._input.match(this.rules[rules[i]]);
                if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                    match = tempMatch;
                    index = i;
                    if (!this.options.flex) break;
                }
            }
            if (match) {
                lines = match[0].match(/(?:\r\n?|\n).*/g);
                if (lines) this.yylineno += lines.length;
                this.yylloc = {first_line: this.yylloc.last_line,
                               last_line: this.yylineno+1,
                               first_column: this.yylloc.last_column,
                               last_column: lines ? lines[lines.length-1].length-lines[lines.length-1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length};
                this.yytext += match[0];
                this.match += match[0];
                this.matches = match;
                this.yyleng = this.yytext.length;
                if (this.options.ranges) {
                    this.yylloc.range = [this.offset, this.offset += this.yyleng];
                }
                this._more = false;
                this._input = this._input.slice(match[0].length);
                this.matched += match[0];
                token = this.performAction.call(this, this.yy, this, rules[index],this.conditionStack[this.conditionStack.length-1]);
                if (this.done && this._input) this.done = false;
                if (token) return token;
                else return;
            }
            if (this._input === "") {
                return this.EOF;
            } else {
                return this.parseError('Lexical error on line '+(this.yylineno+1)+'. Unrecognized text.\n'+this.showPosition(),
                        {text: "", token: null, line: this.yylineno});
            }
        },
    lex:function lex() {
            var r = this.next();
            if (typeof r !== 'undefined') {
                return r;
            } else {
                return this.lex();
            }
        },
    begin:function begin(condition) {
            this.conditionStack.push(condition);
        },
    popState:function popState() {
            return this.conditionStack.pop();
        },
    _currentRules:function _currentRules() {
            return this.conditions[this.conditionStack[this.conditionStack.length-1]].rules;
        },
    topState:function () {
            return this.conditionStack[this.conditionStack.length-2];
        },
    pushState:function begin(condition) {
            this.begin(condition);
        }});
    lexer.options = {};
    lexer.performAction = function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {


    function strip(start, end) {
      return yy_.yytext = yy_.yytext.substr(start, yy_.yyleng-end);
    }


    var YYSTATE=YY_START
    switch($avoiding_name_collisions) {
    case 0:
                                       if(yy_.yytext.slice(-2) === "\\\\") {
                                         strip(0,1);
                                         this.begin("mu");
                                       } else if(yy_.yytext.slice(-1) === "\\") {
                                         strip(0,1);
                                         this.begin("emu");
                                       } else {
                                         this.begin("mu");
                                       }
                                       if(yy_.yytext) return 10;
                                     
    break;
    case 1:return 10;
    break;
    case 2:
                                       this.popState();
                                       return 10;
                                     
    break;
    case 3:
                                      yy_.yytext = yy_.yytext.substr(5, yy_.yyleng-9);
                                      this.popState();
                                      return 11;
                                     
    break;
    case 4: return 10; 
    break;
    case 5:strip(0,4); this.popState(); return 17;
    break;
    case 6:return 40;
    break;
    case 7:return 41;
    break;
    case 8: return 18; 
    break;
    case 9:
                                      this.popState();
                                      this.begin('raw');
                                      return 20;
                                     
    break;
    case 10:
                                      yy_.yytext = yy_.yytext.substr(4, yy_.yyleng-8);
                                      this.popState();
                                      return 'RAW_BLOCK';
                                     
    break;
    case 11:return 29;
    break;
    case 12:return 21;
    break;
    case 13:return 24;
    break;
    case 14:return 23;
    break;
    case 15:return 23;
    break;
    case 16:return 27;
    break;
    case 17:return 26;
    break;
    case 18:this.popState(); this.begin('com');
    break;
    case 19:strip(3,5); this.popState(); return 17;
    break;
    case 20:return 26;
    break;
    case 21:return 46;
    break;
    case 22:return 45;
    break;
    case 23:return 45;
    break;
    case 24:return 49;
    break;
    case 25:// ignore whitespace
    break;
    case 26:this.popState(); return 28;
    break;
    case 27:this.popState(); return 22;
    break;
    case 28:yy_.yytext = strip(1,2).replace(/\\"/g,'"'); return 37;
    break;
    case 29:yy_.yytext = strip(1,2).replace(/\\'/g,"'"); return 37;
    break;
    case 30:return 47;
    break;
    case 31:return 39;
    break;
    case 32:return 39;
    break;
    case 33:return 38;
    break;
    case 34:return 45;
    break;
    case 35:yy_.yytext = strip(1,2); return 45;
    break;
    case 36:return 'INVALID';
    break;
    case 37:return 5;
    break;
    }
    };
    lexer.rules = [/^(?:[^\x00]*?(?=(\{\{)))/,/^(?:[^\x00]+)/,/^(?:[^\x00]{2,}?(?=(\{\{|\\\{\{|\\\\\{\{|$)))/,/^(?:\{\{\{\{\/[^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=[=}\s\/.])\}\}\}\})/,/^(?:[^\x00]*?(?=(\{\{\{\{\/)))/,/^(?:[\s\S]*?--\}\})/,/^(?:\()/,/^(?:\))/,/^(?:\{\{\{\{)/,/^(?:\}\}\}\})/,/^(?:\{\{\{\{[^\x00]*\}\}\}\})/,/^(?:\{\{(~)?>)/,/^(?:\{\{(~)?#)/,/^(?:\{\{(~)?\/)/,/^(?:\{\{(~)?\^)/,/^(?:\{\{(~)?\s*else\b)/,/^(?:\{\{(~)?\{)/,/^(?:\{\{(~)?&)/,/^(?:\{\{!--)/,/^(?:\{\{![\s\S]*?\}\})/,/^(?:\{\{(~)?)/,/^(?:=)/,/^(?:\.\.)/,/^(?:\.(?=([=~}\s\/.)])))/,/^(?:[\/.])/,/^(?:\s+)/,/^(?:\}(~)?\}\})/,/^(?:(~)?\}\})/,/^(?:"(\\["]|[^"])*")/,/^(?:'(\\[']|[^'])*')/,/^(?:@)/,/^(?:true(?=([~}\s)])))/,/^(?:false(?=([~}\s)])))/,/^(?:-?[0-9]+(?:\.[0-9]+)?(?=([~}\s)])))/,/^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=([=~}\s\/.)]))))/,/^(?:\[[^\]]*\])/,/^(?:.)/,/^(?:$)/];
    lexer.conditions = {"mu":{"rules":[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37],"inclusive":false},"emu":{"rules":[2],"inclusive":false},"com":{"rules":[5],"inclusive":false},"raw":{"rules":[3,4],"inclusive":false},"INITIAL":{"rules":[0,1,37],"inclusive":true}};
    return lexer;})()
    parser.lexer = lexer;
    function Parser () { this.yy = {}; }Parser.prototype = parser;parser.Parser = Parser;
    return new Parser;
    })();__exports__["default"] = handlebars;
    /* jshint ignore:end */
  });
define("handlebars/compiler/base", 
  ["./parser","./ast","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    var parser = __dependency1__["default"];
    var AST = __dependency2__["default"];

    __exports__.parser = parser;

    function parse(input) {
      // Just return if an already-compile AST was passed in.
      if(input.constructor === AST.ProgramNode) { return input; }

      parser.yy = AST;
      return parser.parse(input);
    }

    __exports__.parse = parse;
  });
define("handlebars/compiler/compiler", 
  ["../exception","exports"],
  function(__dependency1__, __exports__) {
    
    var Exception = __dependency1__["default"];

    function Compiler() {}

    __exports__.Compiler = Compiler;// the foundHelper register will disambiguate helper lookup from finding a
    // function in a context. This is necessary for mustache compatibility, which
    // requires that context functions in blocks are evaluated by blockHelperMissing,
    // and then proceed as if the resulting value was provided to blockHelperMissing.

    Compiler.prototype = {
      compiler: Compiler,

      disassemble: function() {
        var opcodes = this.opcodes, opcode, out = [], params, param;

        for (var i=0, l=opcodes.length; i<l; i++) {
          opcode = opcodes[i];

          if (opcode.opcode === 'DECLARE') {
            out.push("DECLARE " + opcode.name + "=" + opcode.value);
          } else {
            params = [];
            for (var j=0; j<opcode.args.length; j++) {
              param = opcode.args[j];
              if (typeof param === "string") {
                param = "\"" + param.replace("\n", "\\n") + "\"";
              }
              params.push(param);
            }
            out.push(opcode.opcode + " " + params.join(" "));
          }
        }

        return out.join("\n");
      },

      equals: function(other) {
        var len = this.opcodes.length;
        if (other.opcodes.length !== len) {
          return false;
        }

        for (var i = 0; i < len; i++) {
          var opcode = this.opcodes[i],
              otherOpcode = other.opcodes[i];
          if (opcode.opcode !== otherOpcode.opcode || opcode.args.length !== otherOpcode.args.length) {
            return false;
          }
          for (var j = 0; j < opcode.args.length; j++) {
            if (opcode.args[j] !== otherOpcode.args[j]) {
              return false;
            }
          }
        }

        len = this.children.length;
        if (other.children.length !== len) {
          return false;
        }
        for (i = 0; i < len; i++) {
          if (!this.children[i].equals(other.children[i])) {
            return false;
          }
        }

        return true;
      },

      guid: 0,

      compile: function(program, options) {
        this.opcodes = [];
        this.children = [];
        this.depths = {list: []};
        this.options = options;
        this.stringParams = options.stringParams;
        this.trackIds = options.trackIds;

        // These changes will propagate to the other compiler components
        var knownHelpers = this.options.knownHelpers;
        this.options.knownHelpers = {
          'helperMissing': true,
          'blockHelperMissing': true,
          'each': true,
          'if': true,
          'unless': true,
          'with': true,
          'log': true,
          'lookup': true
        };
        if (knownHelpers) {
          for (var name in knownHelpers) {
            this.options.knownHelpers[name] = knownHelpers[name];
          }
        }

        return this.accept(program);
      },

      accept: function(node) {
        var strip = node.strip || {},
            ret;
        if (strip.left) {
          this.opcode('strip');
        }

        ret = this[node.type](node);

        if (strip.right) {
          this.opcode('strip');
        }

        return ret;
      },

      program: function(program) {
        var statements = program.statements;

        for(var i=0, l=statements.length; i<l; i++) {
          this.accept(statements[i]);
        }
        this.isSimple = l === 1;

        this.depths.list = this.depths.list.sort(function(a, b) {
          return a - b;
        });

        return this;
      },

      compileProgram: function(program) {
        var result = new this.compiler().compile(program, this.options);
        var guid = this.guid++, depth;

        this.usePartial = this.usePartial || result.usePartial;

        this.children[guid] = result;

        for(var i=0, l=result.depths.list.length; i<l; i++) {
          depth = result.depths.list[i];

          if(depth < 2) { continue; }
          else { this.addDepth(depth - 1); }
        }

        return guid;
      },

      block: function(block) {
        var mustache = block.mustache,
            program = block.program,
            inverse = block.inverse;

        if (program) {
          program = this.compileProgram(program);
        }

        if (inverse) {
          inverse = this.compileProgram(inverse);
        }

        var sexpr = mustache.sexpr;
        var type = this.classifySexpr(sexpr);

        if (type === "helper") {
          this.helperSexpr(sexpr, program, inverse);
        } else if (type === "simple") {
          this.simpleSexpr(sexpr);

          // now that the simple mustache is resolved, we need to
          // evaluate it by executing `blockHelperMissing`
          this.opcode('pushProgram', program);
          this.opcode('pushProgram', inverse);
          this.opcode('emptyHash');
          this.opcode('blockValue', sexpr.id.original);
        } else {
          this.ambiguousSexpr(sexpr, program, inverse);

          // now that the simple mustache is resolved, we need to
          // evaluate it by executing `blockHelperMissing`
          this.opcode('pushProgram', program);
          this.opcode('pushProgram', inverse);
          this.opcode('emptyHash');
          this.opcode('ambiguousBlockValue');
        }

        this.opcode('append');
      },

      hash: function(hash) {
        var pairs = hash.pairs, i, l;

        this.opcode('pushHash');

        for(i=0, l=pairs.length; i<l; i++) {
          this.pushParam(pairs[i][1]);
        }
        while(i--) {
          this.opcode('assignToHash', pairs[i][0]);
        }
        this.opcode('popHash');
      },

      partial: function(partial) {
        var partialName = partial.partialName;
        this.usePartial = true;

        if (partial.hash) {
          this.accept(partial.hash);
        } else {
          this.opcode('push', 'undefined');
        }

        if (partial.context) {
          this.accept(partial.context);
        } else {
          this.opcode('push', 'depth0');
        }

        this.opcode('invokePartial', partialName.name);
        this.opcode('append');
      },

      content: function(content) {
        this.opcode('appendContent', content.string);
      },

      mustache: function(mustache) {
        this.sexpr(mustache.sexpr);

        if(mustache.escaped && !this.options.noEscape) {
          this.opcode('appendEscaped');
        } else {
          this.opcode('append');
        }
      },

      ambiguousSexpr: function(sexpr, program, inverse) {
        var id = sexpr.id,
            name = id.parts[0],
            isBlock = program != null || inverse != null;

        this.opcode('getContext', id.depth);

        this.opcode('pushProgram', program);
        this.opcode('pushProgram', inverse);

        this.opcode('invokeAmbiguous', name, isBlock);
      },

      simpleSexpr: function(sexpr) {
        var id = sexpr.id;

        if (id.type === 'DATA') {
          this.DATA(id);
        } else if (id.parts.length) {
          this.ID(id);
        } else {
          // Simplified ID for `this`
          this.addDepth(id.depth);
          this.opcode('getContext', id.depth);
          this.opcode('pushContext');
        }

        this.opcode('resolvePossibleLambda');
      },

      helperSexpr: function(sexpr, program, inverse) {
        var params = this.setupFullMustacheParams(sexpr, program, inverse),
            id = sexpr.id,
            name = id.parts[0];

        if (this.options.knownHelpers[name]) {
          this.opcode('invokeKnownHelper', params.length, name);
        } else if (this.options.knownHelpersOnly) {
          throw new Exception("You specified knownHelpersOnly, but used the unknown helper " + name, sexpr);
        } else {
          this.ID(id);
          this.opcode('invokeHelper', params.length, id.original, sexpr.isRoot);
        }
      },

      sexpr: function(sexpr) {
        var type = this.classifySexpr(sexpr);

        if (type === "simple") {
          this.simpleSexpr(sexpr);
        } else if (type === "helper") {
          this.helperSexpr(sexpr);
        } else {
          this.ambiguousSexpr(sexpr);
        }
      },

      ID: function(id) {
        this.addDepth(id.depth);
        this.opcode('getContext', id.depth);

        var name = id.parts[0];
        if (!name) {
          this.opcode('pushContext');
        } else {
          this.opcode('lookupOnContext', id.parts[0]);
        }

        for(var i=1, l=id.parts.length; i<l; i++) {
          this.opcode('lookup', id.parts[i]);
        }
      },

      DATA: function(data) {
        this.options.data = true;
        this.opcode('lookupData', data.id.depth);
        var parts = data.id.parts;
        for(var i=0, l=parts.length; i<l; i++) {
          this.opcode('lookup', parts[i]);
        }
      },

      STRING: function(string) {
        this.opcode('pushString', string.string);
      },

      NUMBER: function(number) {
        this.opcode('pushLiteral', number.number);
      },

      BOOLEAN: function(bool) {
        this.opcode('pushLiteral', bool.bool);
      },

      comment: function() {},

      // HELPERS
      opcode: function(name) {
        this.opcodes.push({ opcode: name, args: [].slice.call(arguments, 1) });
      },

      declare: function(name, value) {
        this.opcodes.push({ opcode: 'DECLARE', name: name, value: value });
      },

      addDepth: function(depth) {
        if(depth === 0) { return; }

        if(!this.depths[depth]) {
          this.depths[depth] = true;
          this.depths.list.push(depth);
        }
      },

      classifySexpr: function(sexpr) {
        var isHelper   = sexpr.isHelper;
        var isEligible = sexpr.eligibleHelper;
        var options    = this.options;

        // if ambiguous, we can possibly resolve the ambiguity now
        // An eligible helper is one that does not have a complex path, i.e. `this.foo`, `../foo` etc.
        if (isEligible && !isHelper) {
          var name = sexpr.id.parts[0];

          if (options.knownHelpers[name]) {
            isHelper = true;
          } else if (options.knownHelpersOnly) {
            isEligible = false;
          }
        }

        if (isHelper) { return "helper"; }
        else if (isEligible) { return "ambiguous"; }
        else { return "simple"; }
      },

      pushParams: function(params) {
        for(var i=0, l=params.length; i<l; i++) {
          this.pushParam(params[i]);
        }
      },

      pushParam: function(val) {
        if (this.stringParams) {
          if(val.depth) {
            this.addDepth(val.depth);
          }
          this.opcode('getContext', val.depth || 0);
          this.opcode('pushStringParam', val.stringModeValue, val.type);

          if (val.type === 'sexpr') {
            // Subexpressions get evaluated and passed in
            // in string params mode.
            this.sexpr(val);
          }
        } else {
          if (this.trackIds) {
            this.opcode('pushId', val.type, val.idName || val.stringModeValue);
          }
          this.accept(val);
        }
      },

      setupFullMustacheParams: function(sexpr, program, inverse) {
        var params = sexpr.params;
        this.pushParams(params);

        this.opcode('pushProgram', program);
        this.opcode('pushProgram', inverse);

        if (sexpr.hash) {
          this.hash(sexpr.hash);
        } else {
          this.opcode('emptyHash');
        }

        return params;
      }
    };

    function precompile(input, options, env) {
      if (input == null || (typeof input !== 'string' && input.constructor !== env.AST.ProgramNode)) {
        throw new Exception("You must pass a string or Handlebars AST to Handlebars.precompile. You passed " + input);
      }

      options = options || {};
      if (!('data' in options)) {
        options.data = true;
      }

      var ast = env.parse(input);
      var environment = new env.Compiler().compile(ast, options);
      return new env.JavaScriptCompiler().compile(environment, options);
    }

    __exports__.precompile = precompile;function compile(input, options, env) {
      if (input == null || (typeof input !== 'string' && input.constructor !== env.AST.ProgramNode)) {
        throw new Exception("You must pass a string or Handlebars AST to Handlebars.compile. You passed " + input);
      }

      options = options || {};

      if (!('data' in options)) {
        options.data = true;
      }

      var compiled;

      function compileInput() {
        var ast = env.parse(input);
        var environment = new env.Compiler().compile(ast, options);
        var templateSpec = new env.JavaScriptCompiler().compile(environment, options, undefined, true);
        return env.template(templateSpec);
      }

      // Template is only compiled on first use and cached after that point.
      var ret = function(context, options) {
        if (!compiled) {
          compiled = compileInput();
        }
        return compiled.call(this, context, options);
      };
      ret._setup = function(options) {
        if (!compiled) {
          compiled = compileInput();
        }
        return compiled._setup(options);
      };
      ret._child = function(i) {
        if (!compiled) {
          compiled = compileInput();
        }
        return compiled._child(i);
      };
      return ret;
    }

    __exports__.compile = compile;
  });
define("handlebars/compiler/javascript-compiler", 
  ["../base","../exception","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    var COMPILER_REVISION = __dependency1__.COMPILER_REVISION;
    var REVISION_CHANGES = __dependency1__.REVISION_CHANGES;
    var log = __dependency1__.log;
    var Exception = __dependency2__["default"];

    function Literal(value) {
      this.value = value;
    }

    function JavaScriptCompiler() {}

    JavaScriptCompiler.prototype = {
      // PUBLIC API: You can override these methods in a subclass to provide
      // alternative compiled forms for name lookup and buffering semantics
      nameLookup: function(parent, name /* , type*/) {
        var wrap,
            ret;
        if (parent.indexOf('depth') === 0) {
          wrap = true;
        }

        if (JavaScriptCompiler.isValidJavaScriptVariableName(name)) {
          ret = parent + "." + name;
        } else {
          ret = parent + "['" + name + "']";
        }

        if (wrap) {
          return '(' + parent + ' && ' + ret + ')';
        } else {
          return ret;
        }
      },

      compilerInfo: function() {
        var revision = COMPILER_REVISION,
            versions = REVISION_CHANGES[revision];
        return [revision, versions];
      },

      appendToBuffer: function(string) {
        if (this.environment.isSimple) {
          return "return " + string + ";";
        } else {
          return {
            appendToBuffer: true,
            content: string,
            toString: function() { return "buffer += " + string + ";"; }
          };
        }
      },

      initializeBuffer: function() {
        return this.quotedString("");
      },

      namespace: "Handlebars",
      // END PUBLIC API

      compile: function(environment, options, context, asObject) {
        this.environment = environment;
        this.options = options || {};
        this.stringParams = this.options.stringParams;
        this.trackIds = this.options.trackIds;
        this.precompile = !asObject;

        log('debug', this.environment.disassemble() + "\n\n");

        this.name = this.environment.name;
        this.isChild = !!context;
        this.context = context || {
          programs: [],
          environments: []
        };

        this.preamble();

        this.stackSlot = 0;
        this.stackVars = [];
        this.aliases = {};
        this.registers = { list: [] };
        this.hashes = [];
        this.compileStack = [];
        this.inlineStack = [];

        this.compileChildren(environment, options);

        var opcodes = environment.opcodes,
            opcode,
            i,
            l;

        for (i = 0, l = opcodes.length; i < l; i++) {
          opcode = opcodes[i];

          if(opcode.opcode === 'DECLARE') {
            this[opcode.name] = opcode.value;
          } else {
            this[opcode.opcode].apply(this, opcode.args);
          }

          // Reset the stripNext flag if it was not set by this operation.
          if (opcode.opcode !== this.stripNext) {
            this.stripNext = false;
          }
        }

        // Flush any trailing content that might be pending.
        this.pushSource('');

        if (this.stackSlot || this.inlineStack.length || this.compileStack.length) {
          throw new Exception('Compile completed with content left on stack');
        }

        var fn = this.createFunctionContext(asObject);
        if (!this.isChild) {
          var ret = {
            compiler: this.compilerInfo(),
            main: fn
          };
          var programs = this.context.programs;
          for (i = 0, l = programs.length; i < l; i++) {
            if (programs[i]) {
              ret[i] = programs[i];
            }
          }

          if (this.environment.usePartial) {
            ret.usePartial = true;
          }
          if (this.options.data) {
            ret.useData = true;
          }

          if (!asObject) {
            ret.compiler = JSON.stringify(ret.compiler);
            ret = this.objectLiteral(ret);
          }

          return ret;
        } else {
          return fn;
        }
      },

      preamble: function() {
        // track the last context pushed into place to allow skipping the
        // getContext opcode when it would be a noop
        this.lastContext = 0;
        this.source = [];
      },

      createFunctionContext: function(asObject) {
        var varDeclarations = '';

        var locals = this.stackVars.concat(this.registers.list);
        if(locals.length > 0) {
          varDeclarations += ", " + locals.join(", ");
        }

        // Generate minimizer alias mappings
        for (var alias in this.aliases) {
          if (this.aliases.hasOwnProperty(alias)) {
            varDeclarations += ', ' + alias + '=' + this.aliases[alias];
          }
        }

        var params = ["depth0", "helpers", "partials", "data"];

        for(var i=0, l=this.environment.depths.list.length; i<l; i++) {
          params.push("depth" + this.environment.depths.list[i]);
        }

        // Perform a second pass over the output to merge content when possible
        var source = this.mergeSource(varDeclarations);

        if (asObject) {
          params.push(source);

          return Function.apply(this, params);
        } else {
          return 'function(' + params.join(',') + ') {\n  ' + source + '}';
        }
      },
      mergeSource: function(varDeclarations) {
        var source = '',
            buffer,
            appendOnly = !this.forceBuffer,
            appendFirst;

        for (var i = 0, len = this.source.length; i < len; i++) {
          var line = this.source[i];
          if (line.appendToBuffer) {
            if (buffer) {
              buffer = buffer + '\n    + ' + line.content;
            } else {
              buffer = line.content;
            }
          } else {
            if (buffer) {
              if (!source) {
                appendFirst = true;
                source = buffer + ';\n  ';
              } else {
                source += 'buffer += ' + buffer + ';\n  ';
              }
              buffer = undefined;
            }
            source += line + '\n  ';

            if (!this.environment.isSimple) {
              appendOnly = false;
            }
          }
        }

        if (appendOnly) {
          if (buffer || !source) {
            source += 'return ' + (buffer || '""') + ';\n';
          }
        } else {
          varDeclarations += ", buffer = " + (appendFirst ? '' : this.initializeBuffer());
          if (buffer) {
            source += 'return buffer + ' + buffer + ';\n';
          } else {
            source += 'return buffer;\n';
          }
        }

        if (varDeclarations) {
          source = 'var ' + varDeclarations.substring(2) + (appendFirst ? '' : ';\n  ') + source;
        }

        return source;
      },

      // [blockValue]
      //
      // On stack, before: hash, inverse, program, value
      // On stack, after: return value of blockHelperMissing
      //
      // The purpose of this opcode is to take a block of the form
      // `{{#this.foo}}...{{/this.foo}}`, resolve the value of `foo`, and
      // replace it on the stack with the result of properly
      // invoking blockHelperMissing.
      blockValue: function(name) {
        this.aliases.blockHelperMissing = 'helpers.blockHelperMissing';

        var params = ["depth0"];
        this.setupParams(name, 0, params);

        this.replaceStack(function(current) {
          params.splice(1, 0, current);
          return "blockHelperMissing.call(" + params.join(", ") + ")";
        });
      },

      // [ambiguousBlockValue]
      //
      // On stack, before: hash, inverse, program, value
      // Compiler value, before: lastHelper=value of last found helper, if any
      // On stack, after, if no lastHelper: same as [blockValue]
      // On stack, after, if lastHelper: value
      ambiguousBlockValue: function() {
        this.aliases.blockHelperMissing = 'helpers.blockHelperMissing';

        // We're being a bit cheeky and reusing the options value from the prior exec
        var params = ["depth0"];
        this.setupParams('', 0, params, true);

        this.flushInline();

        var current = this.topStack();
        params.splice(1, 0, current);

        this.pushSource("if (!" + this.lastHelper + ") { " + current + " = blockHelperMissing.call(" + params.join(", ") + "); }");
      },

      // [appendContent]
      //
      // On stack, before: ...
      // On stack, after: ...
      //
      // Appends the string value of `content` to the current buffer
      appendContent: function(content) {
        if (this.pendingContent) {
          content = this.pendingContent + content;
        }
        if (this.stripNext) {
          content = content.replace(/^\s+/, '');
        }

        this.pendingContent = content;
      },

      // [strip]
      //
      // On stack, before: ...
      // On stack, after: ...
      //
      // Removes any trailing whitespace from the prior content node and flags
      // the next operation for stripping if it is a content node.
      strip: function() {
        if (this.pendingContent) {
          this.pendingContent = this.pendingContent.replace(/\s+$/, '');
        }
        this.stripNext = 'strip';
      },

      // [append]
      //
      // On stack, before: value, ...
      // On stack, after: ...
      //
      // Coerces `value` to a String and appends it to the current buffer.
      //
      // If `value` is truthy, or 0, it is coerced into a string and appended
      // Otherwise, the empty string is appended
      append: function() {
        // Force anything that is inlined onto the stack so we don't have duplication
        // when we examine local
        this.flushInline();
        var local = this.popStack();
        this.pushSource("if(" + local + " || " + local + " === 0) { " + this.appendToBuffer(local) + " }");
        if (this.environment.isSimple) {
          this.pushSource("else { " + this.appendToBuffer("''") + " }");
        }
      },

      // [appendEscaped]
      //
      // On stack, before: value, ...
      // On stack, after: ...
      //
      // Escape `value` and append it to the buffer
      appendEscaped: function() {
        this.aliases.escapeExpression = 'this.escapeExpression';

        this.pushSource(this.appendToBuffer("escapeExpression(" + this.popStack() + ")"));
      },

      // [getContext]
      //
      // On stack, before: ...
      // On stack, after: ...
      // Compiler value, after: lastContext=depth
      //
      // Set the value of the `lastContext` compiler value to the depth
      getContext: function(depth) {
        if(this.lastContext !== depth) {
          this.lastContext = depth;
        }
      },

      // [lookupOnContext]
      //
      // On stack, before: ...
      // On stack, after: currentContext[name], ...
      //
      // Looks up the value of `name` on the current context and pushes
      // it onto the stack.
      lookupOnContext: function(name) {
        this.push(this.nameLookup('depth' + this.lastContext, name, 'context'));
      },

      // [pushContext]
      //
      // On stack, before: ...
      // On stack, after: currentContext, ...
      //
      // Pushes the value of the current context onto the stack.
      pushContext: function() {
        this.pushStackLiteral('depth' + this.lastContext);
      },

      // [resolvePossibleLambda]
      //
      // On stack, before: value, ...
      // On stack, after: resolved value, ...
      //
      // If the `value` is a lambda, replace it on the stack by
      // the return value of the lambda
      resolvePossibleLambda: function() {
        this.aliases.functionType = '"function"';

        this.replaceStack(function(current) {
          return "typeof " + current + " === functionType ? " + current + ".apply(depth0) : " + current;
        });
      },

      // [lookup]
      //
      // On stack, before: value, ...
      // On stack, after: value[name], ...
      //
      // Replace the value on the stack with the result of looking
      // up `name` on `value`
      lookup: function(name) {
        this.replaceStack(function(current) {
          return current + " == null || " + current + " === false ? " + current + " : " + this.nameLookup(current, name, 'context');
        });
      },

      // [lookupData]
      //
      // On stack, before: ...
      // On stack, after: data, ...
      //
      // Push the data lookup operator
      lookupData: function(depth) {
        if (!depth) {
          this.pushStackLiteral('data');
        } else {
          this.pushStackLiteral('this.data(data, ' + depth + ')');
        }
      },

      // [pushStringParam]
      //
      // On stack, before: ...
      // On stack, after: string, currentContext, ...
      //
      // This opcode is designed for use in string mode, which
      // provides the string value of a parameter along with its
      // depth rather than resolving it immediately.
      pushStringParam: function(string, type) {
        this.pushStackLiteral('depth' + this.lastContext);

        this.pushString(type);

        // If it's a subexpression, the string result
        // will be pushed after this opcode.
        if (type !== 'sexpr') {
          if (typeof string === 'string') {
            this.pushString(string);
          } else {
            this.pushStackLiteral(string);
          }
        }
      },

      emptyHash: function() {
        this.pushStackLiteral('{}');

        if (this.trackIds) {
          this.push('{}'); // hashIds
        }
        if (this.stringParams) {
          this.push('{}'); // hashContexts
          this.push('{}'); // hashTypes
        }
      },
      pushHash: function() {
        if (this.hash) {
          this.hashes.push(this.hash);
        }
        this.hash = {values: [], types: [], contexts: [], ids: []};
      },
      popHash: function() {
        var hash = this.hash;
        this.hash = this.hashes.pop();

        if (this.trackIds) {
          this.push('{' + hash.ids.join(',') + '}');
        }
        if (this.stringParams) {
          this.push('{' + hash.contexts.join(',') + '}');
          this.push('{' + hash.types.join(',') + '}');
        }

        this.push('{\n    ' + hash.values.join(',\n    ') + '\n  }');
      },

      // [pushString]
      //
      // On stack, before: ...
      // On stack, after: quotedString(string), ...
      //
      // Push a quoted version of `string` onto the stack
      pushString: function(string) {
        this.pushStackLiteral(this.quotedString(string));
      },

      // [push]
      //
      // On stack, before: ...
      // On stack, after: expr, ...
      //
      // Push an expression onto the stack
      push: function(expr) {
        this.inlineStack.push(expr);
        return expr;
      },

      // [pushLiteral]
      //
      // On stack, before: ...
      // On stack, after: value, ...
      //
      // Pushes a value onto the stack. This operation prevents
      // the compiler from creating a temporary variable to hold
      // it.
      pushLiteral: function(value) {
        this.pushStackLiteral(value);
      },

      // [pushProgram]
      //
      // On stack, before: ...
      // On stack, after: program(guid), ...
      //
      // Push a program expression onto the stack. This takes
      // a compile-time guid and converts it into a runtime-accessible
      // expression.
      pushProgram: function(guid) {
        if (guid != null) {
          this.pushStackLiteral(this.programExpression(guid));
        } else {
          this.pushStackLiteral(null);
        }
      },

      // [invokeHelper]
      //
      // On stack, before: hash, inverse, program, params..., ...
      // On stack, after: result of helper invocation
      //
      // Pops off the helper's parameters, invokes the helper,
      // and pushes the helper's return value onto the stack.
      //
      // If the helper is not found, `helperMissing` is called.
      invokeHelper: function(paramSize, name, isRoot) {
        this.aliases.helperMissing = 'helpers.helperMissing';
        this.useRegister('helper');

        var nonHelper = this.popStack();
        var helper = this.setupHelper(paramSize, name);

        var lookup = 'helper = ' + helper.name + ' || ' + nonHelper + ' || helperMissing';
        if (helper.paramsInit) {
          lookup += ',' + helper.paramsInit;
        }

        this.push('(' + lookup + ',helper.call(' + helper.callParams + '))');

        // Always flush subexpressions. This is both to prevent the compounding size issue that
        // occurs when the code has to be duplicated for inlining and also to prevent errors
        // due to the incorrect options object being passed due to the shared register.
        if (!isRoot) {
          this.flushInline();
        }
      },

      // [invokeKnownHelper]
      //
      // On stack, before: hash, inverse, program, params..., ...
      // On stack, after: result of helper invocation
      //
      // This operation is used when the helper is known to exist,
      // so a `helperMissing` fallback is not required.
      invokeKnownHelper: function(paramSize, name) {
        var helper = this.setupHelper(paramSize, name);
        this.push(helper.name + ".call(" + helper.callParams + ")");
      },

      // [invokeAmbiguous]
      //
      // On stack, before: hash, inverse, program, params..., ...
      // On stack, after: result of disambiguation
      //
      // This operation is used when an expression like `{{foo}}`
      // is provided, but we don't know at compile-time whether it
      // is a helper or a path.
      //
      // This operation emits more code than the other options,
      // and can be avoided by passing the `knownHelpers` and
      // `knownHelpersOnly` flags at compile-time.
      invokeAmbiguous: function(name, helperCall) {
        this.aliases.functionType = '"function"';
        this.useRegister('helper');

        this.emptyHash();
        var helper = this.setupHelper(0, name, helperCall);

        var helperName = this.lastHelper = this.nameLookup('helpers', name, 'helper');
        var nonHelper = this.nameLookup('depth' + this.lastContext, name, 'context');

        this.push(
          '((helper = ' + helperName + ' || ' + nonHelper
            + (helper.paramsInit ? '),(' + helper.paramsInit : '') + '),'
          + '(typeof helper === functionType ? helper.call(' + helper.callParams + ') : helper))');
      },

      // [invokePartial]
      //
      // On stack, before: context, ...
      // On stack after: result of partial invocation
      //
      // This operation pops off a context, invokes a partial with that context,
      // and pushes the result of the invocation back.
      invokePartial: function(name) {
        var params = [this.nameLookup('partials', name, 'partial'), "'" + name + "'", this.popStack(), this.popStack(), "helpers", "partials"];

        if (this.options.data) {
          params.push("data");
        }

        this.push("this.invokePartial(" + params.join(", ") + ")");
      },

      // [assignToHash]
      //
      // On stack, before: value, ..., hash, ...
      // On stack, after: ..., hash, ...
      //
      // Pops a value off the stack and assigns it to the current hash
      assignToHash: function(key) {
        var value = this.popStack(),
            context,
            type,
            id;

        if (this.trackIds) {
          id = this.popStack();
        }
        if (this.stringParams) {
          type = this.popStack();
          context = this.popStack();
        }

        var hash = this.hash;
        if (context) {
          hash.contexts.push("'" + key + "': " + context);
        }
        if (type) {
          hash.types.push("'" + key + "': " + type);
        }
        if (id) {
          hash.ids.push("'" + key + "': " + id);
        }
        hash.values.push("'" + key + "': (" + value + ")");
      },

      pushId: function(type, name) {
        if (type === 'ID' || type === 'DATA') {
          this.pushString(name);
        } else if (type === 'sexpr') {
          this.pushStackLiteral('true');
        } else {
          this.pushStackLiteral('null');
        }
      },

      // HELPERS

      compiler: JavaScriptCompiler,

      compileChildren: function(environment, options) {
        var children = environment.children, child, compiler;

        for(var i=0, l=children.length; i<l; i++) {
          child = children[i];
          compiler = new this.compiler();

          var index = this.matchExistingProgram(child);

          if (index == null) {
            this.context.programs.push('');     // Placeholder to prevent name conflicts for nested children
            index = this.context.programs.length;
            child.index = index;
            child.name = 'program' + index;
            this.context.programs[index] = compiler.compile(child, options, this.context, !this.precompile);
            this.context.environments[index] = child;
          } else {
            child.index = index;
            child.name = 'program' + index;
          }
        }
      },
      matchExistingProgram: function(child) {
        for (var i = 0, len = this.context.environments.length; i < len; i++) {
          var environment = this.context.environments[i];
          if (environment && environment.equals(child)) {
            return i;
          }
        }
      },

      programExpression: function(guid) {
        if(guid == null) {
          return 'this.noop';
        }

        var child = this.environment.children[guid],
            depths = child.depths.list, depth;

        var programParams = [child.index, 'data'];

        for(var i=0, l = depths.length; i<l; i++) {
          depth = depths[i];

          programParams.push('depth' + (depth - 1));
        }

        return (depths.length === 0 ? 'this.program(' : 'this.programWithDepth(') + programParams.join(', ') + ')';
      },

      register: function(name, val) {
        this.useRegister(name);
        this.pushSource(name + " = " + val + ";");
      },

      useRegister: function(name) {
        if(!this.registers[name]) {
          this.registers[name] = true;
          this.registers.list.push(name);
        }
      },

      pushStackLiteral: function(item) {
        return this.push(new Literal(item));
      },

      pushSource: function(source) {
        if (this.pendingContent) {
          this.source.push(this.appendToBuffer(this.quotedString(this.pendingContent)));
          this.pendingContent = undefined;
        }

        if (source) {
          this.source.push(source);
        }
      },

      pushStack: function(item) {
        this.flushInline();

        var stack = this.incrStack();
        if (item) {
          this.pushSource(stack + " = " + item + ";");
        }
        this.compileStack.push(stack);
        return stack;
      },

      replaceStack: function(callback) {
        var prefix = '',
            inline = this.isInline(),
            stack,
            createdStack,
            usedLiteral;

        // If we are currently inline then we want to merge the inline statement into the
        // replacement statement via ','
        if (inline) {
          var top = this.popStack(true);

          if (top instanceof Literal) {
            // Literals do not need to be inlined
            stack = top.value;
            usedLiteral = true;
          } else {
            // Get or create the current stack name for use by the inline
            createdStack = !this.stackSlot;
            var name = !createdStack ? this.topStackName() : this.incrStack();

            prefix = '(' + this.push(name) + ' = ' + top + '),';
            stack = this.topStack();
          }
        } else {
          stack = this.topStack();
        }

        var item = callback.call(this, stack);

        if (inline) {
          if (!usedLiteral) {
            this.popStack();
          }
          if (createdStack) {
            this.stackSlot--;
          }
          this.push('(' + prefix + item + ')');
        } else {
          // Prevent modification of the context depth variable. Through replaceStack
          if (!/^stack/.test(stack)) {
            stack = this.nextStack();
          }

          this.pushSource(stack + " = (" + prefix + item + ");");
        }
        return stack;
      },

      nextStack: function() {
        return this.pushStack();
      },

      incrStack: function() {
        this.stackSlot++;
        if(this.stackSlot > this.stackVars.length) { this.stackVars.push("stack" + this.stackSlot); }
        return this.topStackName();
      },
      topStackName: function() {
        return "stack" + this.stackSlot;
      },
      flushInline: function() {
        var inlineStack = this.inlineStack;
        if (inlineStack.length) {
          this.inlineStack = [];
          for (var i = 0, len = inlineStack.length; i < len; i++) {
            var entry = inlineStack[i];
            if (entry instanceof Literal) {
              this.compileStack.push(entry);
            } else {
              this.pushStack(entry);
            }
          }
        }
      },
      isInline: function() {
        return this.inlineStack.length;
      },

      popStack: function(wrapped) {
        var inline = this.isInline(),
            item = (inline ? this.inlineStack : this.compileStack).pop();

        if (!wrapped && (item instanceof Literal)) {
          return item.value;
        } else {
          if (!inline) {
            if (!this.stackSlot) {
              throw new Exception('Invalid stack pop');
            }
            this.stackSlot--;
          }
          return item;
        }
      },

      topStack: function(wrapped) {
        var stack = (this.isInline() ? this.inlineStack : this.compileStack),
            item = stack[stack.length - 1];

        if (!wrapped && (item instanceof Literal)) {
          return item.value;
        } else {
          return item;
        }
      },

      quotedString: function(str) {
        return '"' + str
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\u2028/g, '\\u2028')   // Per Ecma-262 7.3 + 7.8.4
          .replace(/\u2029/g, '\\u2029') + '"';
      },

      objectLiteral: function(obj) {
        var pairs = [];

        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            pairs.push(this.quotedString(key) + ':' + obj[key]);
          }
        }

        return '{' + pairs.join(',') + '}';
      },

      setupHelper: function(paramSize, name, blockHelper) {
        var params = [],
            paramsInit = this.setupParams(name, paramSize, params, blockHelper);
        var foundHelper = this.nameLookup('helpers', name, 'helper');

        return {
          params: params,
          paramsInit: paramsInit,
          name: foundHelper,
          callParams: ["depth0"].concat(params).join(", ")
        };
      },

      setupOptions: function(helper, paramSize, params) {
        var options = {}, contexts = [], types = [], ids = [], param, inverse, program;

        options.name = this.quotedString(helper);
        options.hash = this.popStack();

        if (this.trackIds) {
          options.hashIds = this.popStack();
        }
        if (this.stringParams) {
          options.hashTypes = this.popStack();
          options.hashContexts = this.popStack();
        }

        inverse = this.popStack();
        program = this.popStack();

        // Avoid setting fn and inverse if neither are set. This allows
        // helpers to do a check for `if (options.fn)`
        if (program || inverse) {
          if (!program) {
            program = 'this.noop';
          }

          if (!inverse) {
            inverse = 'this.noop';
          }

          options.fn = program;
          options.inverse = inverse;
        }

        // The parameters go on to the stack in order (making sure that they are evaluated in order)
        // so we need to pop them off the stack in reverse order
        var i = paramSize;
        while (i--) {
          param = this.popStack();
          params[i] = param;

          if (this.trackIds) {
            ids[i] = this.popStack();
          }
          if (this.stringParams) {
            types[i] = this.popStack();
            contexts[i] = this.popStack();
          }
        }

        if (this.trackIds) {
          options.ids = "[" + ids.join(",") + "]";
        }
        if (this.stringParams) {
          options.types = "[" + types.join(",") + "]";
          options.contexts = "[" + contexts.join(",") + "]";
        }

        if (this.options.data) {
          options.data = "data";
        }

        return options;
      },

      // the params and contexts arguments are passed in arrays
      // to fill in
      setupParams: function(helperName, paramSize, params, useRegister) {
        var options = this.objectLiteral(this.setupOptions(helperName, paramSize, params));

        if (useRegister) {
          this.useRegister('options');
          params.push('options');
          return 'options=' + options;
        } else {
          params.push(options);
          return '';
        }
      }
    };

    var reservedWords = (
      "break else new var" +
      " case finally return void" +
      " catch for switch while" +
      " continue function this with" +
      " default if throw" +
      " delete in try" +
      " do instanceof typeof" +
      " abstract enum int short" +
      " boolean export interface static" +
      " byte extends long super" +
      " char final native synchronized" +
      " class float package throws" +
      " const goto private transient" +
      " debugger implements protected volatile" +
      " double import public let yield"
    ).split(" ");

    var compilerWords = JavaScriptCompiler.RESERVED_WORDS = {};

    for(var i=0, l=reservedWords.length; i<l; i++) {
      compilerWords[reservedWords[i]] = true;
    }

    JavaScriptCompiler.isValidJavaScriptVariableName = function(name) {
      return !JavaScriptCompiler.RESERVED_WORDS[name] && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name);
    };

    __exports__["default"] = JavaScriptCompiler;
  });
define("handlebars", 
  ["./handlebars.runtime","./handlebars/compiler/ast","./handlebars/compiler/base","./handlebars/compiler/compiler","./handlebars/compiler/javascript-compiler","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    
    /*globals Handlebars: true */
    var Handlebars = __dependency1__["default"];

    // Compiler imports
    var AST = __dependency2__["default"];
    var Parser = __dependency3__.parser;
    var parse = __dependency3__.parse;
    var Compiler = __dependency4__.Compiler;
    var compile = __dependency4__.compile;
    var precompile = __dependency4__.precompile;
    var JavaScriptCompiler = __dependency5__["default"];

    var _create = Handlebars.create;
    var create = function() {
      var hb = _create();

      hb.compile = function(input, options) {
        return compile(input, options, hb);
      };
      hb.precompile = function (input, options) {
        return precompile(input, options, hb);
      };

      hb.AST = AST;
      hb.Compiler = Compiler;
      hb.JavaScriptCompiler = JavaScriptCompiler;
      hb.Parser = Parser;
      hb.parse = parse;

      return hb;
    };

    Handlebars = create();
    Handlebars.create = create;

    __exports__["default"] = Handlebars;
  });
define("simple-html-tokenizer/char-refs", 
  ["exports"],
  function(__exports__) {
    
    var namedCodepoints = {
      AElig: [198],
      AMP: [38],
      Aacute: [193],
      Abreve: [258],
      Acirc: [194],
      Acy: [1040],
      Afr: [120068],
      Agrave: [192],
      Alpha: [913],
      Amacr: [256],
      And: [10835],
      Aogon: [260],
      Aopf: [120120],
      ApplyFunction: [8289],
      Aring: [197],
      Ascr: [119964],
      Assign: [8788],
      Atilde: [195],
      Auml: [196],
      Backslash: [8726],
      Barv: [10983],
      Barwed: [8966],
      Bcy: [1041],
      Because: [8757],
      Bernoullis: [8492],
      Beta: [914],
      Bfr: [120069],
      Bopf: [120121],
      Breve: [728],
      Bscr: [8492],
      Bumpeq: [8782],
      CHcy: [1063],
      COPY: [169],
      Cacute: [262],
      Cap: [8914],
      CapitalDifferentialD: [8517],
      Cayleys: [8493],
      Ccaron: [268],
      Ccedil: [199],
      Ccirc: [264],
      Cconint: [8752],
      Cdot: [266],
      Cedilla: [184],
      CenterDot: [183],
      Cfr: [8493],
      Chi: [935],
      CircleDot: [8857],
      CircleMinus: [8854],
      CirclePlus: [8853],
      CircleTimes: [8855],
      ClockwiseContourIntegral: [8754],
      CloseCurlyDoubleQuote: [8221],
      CloseCurlyQuote: [8217],
      Colon: [8759],
      Colone: [10868],
      Congruent: [8801],
      Conint: [8751],
      ContourIntegral: [8750],
      Copf: [8450],
      Coproduct: [8720],
      CounterClockwiseContourIntegral: [8755],
      Cross: [10799],
      Cscr: [119966],
      Cup: [8915],
      CupCap: [8781],
      DD: [8517],
      DDotrahd: [10513],
      DJcy: [1026],
      DScy: [1029],
      DZcy: [1039],
      Dagger: [8225],
      Darr: [8609],
      Dashv: [10980],
      Dcaron: [270],
      Dcy: [1044],
      Del: [8711],
      Delta: [916],
      Dfr: [120071],
      DiacriticalAcute: [180],
      DiacriticalDot: [729],
      DiacriticalDoubleAcute: [733],
      DiacriticalGrave: [96],
      DiacriticalTilde: [732],
      Diamond: [8900],
      DifferentialD: [8518],
      Dopf: [120123],
      Dot: [168],
      DotDot: [8412],
      DotEqual: [8784],
      DoubleContourIntegral: [8751],
      DoubleDot: [168],
      DoubleDownArrow: [8659],
      DoubleLeftArrow: [8656],
      DoubleLeftRightArrow: [8660],
      DoubleLeftTee: [10980],
      DoubleLongLeftArrow: [10232],
      DoubleLongLeftRightArrow: [10234],
      DoubleLongRightArrow: [10233],
      DoubleRightArrow: [8658],
      DoubleRightTee: [8872],
      DoubleUpArrow: [8657],
      DoubleUpDownArrow: [8661],
      DoubleVerticalBar: [8741],
      DownArrow: [8595],
      DownArrowBar: [10515],
      DownArrowUpArrow: [8693],
      DownBreve: [785],
      DownLeftRightVector: [10576],
      DownLeftTeeVector: [10590],
      DownLeftVector: [8637],
      DownLeftVectorBar: [10582],
      DownRightTeeVector: [10591],
      DownRightVector: [8641],
      DownRightVectorBar: [10583],
      DownTee: [8868],
      DownTeeArrow: [8615],
      Downarrow: [8659],
      Dscr: [119967],
      Dstrok: [272],
      ENG: [330],
      ETH: [208],
      Eacute: [201],
      Ecaron: [282],
      Ecirc: [202],
      Ecy: [1069],
      Edot: [278],
      Efr: [120072],
      Egrave: [200],
      Element: [8712],
      Emacr: [274],
      EmptySmallSquare: [9723],
      EmptyVerySmallSquare: [9643],
      Eogon: [280],
      Eopf: [120124],
      Epsilon: [917],
      Equal: [10869],
      EqualTilde: [8770],
      Equilibrium: [8652],
      Escr: [8496],
      Esim: [10867],
      Eta: [919],
      Euml: [203],
      Exists: [8707],
      ExponentialE: [8519],
      Fcy: [1060],
      Ffr: [120073],
      FilledSmallSquare: [9724],
      FilledVerySmallSquare: [9642],
      Fopf: [120125],
      ForAll: [8704],
      Fouriertrf: [8497],
      Fscr: [8497],
      GJcy: [1027],
      GT: [62],
      Gamma: [915],
      Gammad: [988],
      Gbreve: [286],
      Gcedil: [290],
      Gcirc: [284],
      Gcy: [1043],
      Gdot: [288],
      Gfr: [120074],
      Gg: [8921],
      Gopf: [120126],
      GreaterEqual: [8805],
      GreaterEqualLess: [8923],
      GreaterFullEqual: [8807],
      GreaterGreater: [10914],
      GreaterLess: [8823],
      GreaterSlantEqual: [10878],
      GreaterTilde: [8819],
      Gscr: [119970],
      Gt: [8811],
      HARDcy: [1066],
      Hacek: [711],
      Hat: [94],
      Hcirc: [292],
      Hfr: [8460],
      HilbertSpace: [8459],
      Hopf: [8461],
      HorizontalLine: [9472],
      Hscr: [8459],
      Hstrok: [294],
      HumpDownHump: [8782],
      HumpEqual: [8783],
      IEcy: [1045],
      IJlig: [306],
      IOcy: [1025],
      Iacute: [205],
      Icirc: [206],
      Icy: [1048],
      Idot: [304],
      Ifr: [8465],
      Igrave: [204],
      Im: [8465],
      Imacr: [298],
      ImaginaryI: [8520],
      Implies: [8658],
      Int: [8748],
      Integral: [8747],
      Intersection: [8898],
      InvisibleComma: [8291],
      InvisibleTimes: [8290],
      Iogon: [302],
      Iopf: [120128],
      Iota: [921],
      Iscr: [8464],
      Itilde: [296],
      Iukcy: [1030],
      Iuml: [207],
      Jcirc: [308],
      Jcy: [1049],
      Jfr: [120077],
      Jopf: [120129],
      Jscr: [119973],
      Jsercy: [1032],
      Jukcy: [1028],
      KHcy: [1061],
      KJcy: [1036],
      Kappa: [922],
      Kcedil: [310],
      Kcy: [1050],
      Kfr: [120078],
      Kopf: [120130],
      Kscr: [119974],
      LJcy: [1033],
      LT: [60],
      Lacute: [313],
      Lambda: [923],
      Lang: [10218],
      Laplacetrf: [8466],
      Larr: [8606],
      Lcaron: [317],
      Lcedil: [315],
      Lcy: [1051],
      LeftAngleBracket: [10216],
      LeftArrow: [8592],
      LeftArrowBar: [8676],
      LeftArrowRightArrow: [8646],
      LeftCeiling: [8968],
      LeftDoubleBracket: [10214],
      LeftDownTeeVector: [10593],
      LeftDownVector: [8643],
      LeftDownVectorBar: [10585],
      LeftFloor: [8970],
      LeftRightArrow: [8596],
      LeftRightVector: [10574],
      LeftTee: [8867],
      LeftTeeArrow: [8612],
      LeftTeeVector: [10586],
      LeftTriangle: [8882],
      LeftTriangleBar: [10703],
      LeftTriangleEqual: [8884],
      LeftUpDownVector: [10577],
      LeftUpTeeVector: [10592],
      LeftUpVector: [8639],
      LeftUpVectorBar: [10584],
      LeftVector: [8636],
      LeftVectorBar: [10578],
      Leftarrow: [8656],
      Leftrightarrow: [8660],
      LessEqualGreater: [8922],
      LessFullEqual: [8806],
      LessGreater: [8822],
      LessLess: [10913],
      LessSlantEqual: [10877],
      LessTilde: [8818],
      Lfr: [120079],
      Ll: [8920],
      Lleftarrow: [8666],
      Lmidot: [319],
      LongLeftArrow: [10229],
      LongLeftRightArrow: [10231],
      LongRightArrow: [10230],
      Longleftarrow: [10232],
      Longleftrightarrow: [10234],
      Longrightarrow: [10233],
      Lopf: [120131],
      LowerLeftArrow: [8601],
      LowerRightArrow: [8600],
      Lscr: [8466],
      Lsh: [8624],
      Lstrok: [321],
      Lt: [8810],
      Map: [10501],
      Mcy: [1052],
      MediumSpace: [8287],
      Mellintrf: [8499],
      Mfr: [120080],
      MinusPlus: [8723],
      Mopf: [120132],
      Mscr: [8499],
      Mu: [924],
      NJcy: [1034],
      Nacute: [323],
      Ncaron: [327],
      Ncedil: [325],
      Ncy: [1053],
      NegativeMediumSpace: [8203],
      NegativeThickSpace: [8203],
      NegativeThinSpace: [8203],
      NegativeVeryThinSpace: [8203],
      NestedGreaterGreater: [8811],
      NestedLessLess: [8810],
      NewLine: [10],
      Nfr: [120081],
      NoBreak: [8288],
      NonBreakingSpace: [160],
      Nopf: [8469],
      Not: [10988],
      NotCongruent: [8802],
      NotCupCap: [8813],
      NotDoubleVerticalBar: [8742],
      NotElement: [8713],
      NotEqual: [8800],
      NotEqualTilde: [8770, 824],
      NotExists: [8708],
      NotGreater: [8815],
      NotGreaterEqual: [8817],
      NotGreaterFullEqual: [8807, 824],
      NotGreaterGreater: [8811, 824],
      NotGreaterLess: [8825],
      NotGreaterSlantEqual: [10878, 824],
      NotGreaterTilde: [8821],
      NotHumpDownHump: [8782, 824],
      NotHumpEqual: [8783, 824],
      NotLeftTriangle: [8938],
      NotLeftTriangleBar: [10703, 824],
      NotLeftTriangleEqual: [8940],
      NotLess: [8814],
      NotLessEqual: [8816],
      NotLessGreater: [8824],
      NotLessLess: [8810, 824],
      NotLessSlantEqual: [10877, 824],
      NotLessTilde: [8820],
      NotNestedGreaterGreater: [10914, 824],
      NotNestedLessLess: [10913, 824],
      NotPrecedes: [8832],
      NotPrecedesEqual: [10927, 824],
      NotPrecedesSlantEqual: [8928],
      NotReverseElement: [8716],
      NotRightTriangle: [8939],
      NotRightTriangleBar: [10704, 824],
      NotRightTriangleEqual: [8941],
      NotSquareSubset: [8847, 824],
      NotSquareSubsetEqual: [8930],
      NotSquareSuperset: [8848, 824],
      NotSquareSupersetEqual: [8931],
      NotSubset: [8834, 8402],
      NotSubsetEqual: [8840],
      NotSucceeds: [8833],
      NotSucceedsEqual: [10928, 824],
      NotSucceedsSlantEqual: [8929],
      NotSucceedsTilde: [8831, 824],
      NotSuperset: [8835, 8402],
      NotSupersetEqual: [8841],
      NotTilde: [8769],
      NotTildeEqual: [8772],
      NotTildeFullEqual: [8775],
      NotTildeTilde: [8777],
      NotVerticalBar: [8740],
      Nscr: [119977],
      Ntilde: [209],
      Nu: [925],
      OElig: [338],
      Oacute: [211],
      Ocirc: [212],
      Ocy: [1054],
      Odblac: [336],
      Ofr: [120082],
      Ograve: [210],
      Omacr: [332],
      Omega: [937],
      Omicron: [927],
      Oopf: [120134],
      OpenCurlyDoubleQuote: [8220],
      OpenCurlyQuote: [8216],
      Or: [10836],
      Oscr: [119978],
      Oslash: [216],
      Otilde: [213],
      Otimes: [10807],
      Ouml: [214],
      OverBar: [8254],
      OverBrace: [9182],
      OverBracket: [9140],
      OverParenthesis: [9180],
      PartialD: [8706],
      Pcy: [1055],
      Pfr: [120083],
      Phi: [934],
      Pi: [928],
      PlusMinus: [177],
      Poincareplane: [8460],
      Popf: [8473],
      Pr: [10939],
      Precedes: [8826],
      PrecedesEqual: [10927],
      PrecedesSlantEqual: [8828],
      PrecedesTilde: [8830],
      Prime: [8243],
      Product: [8719],
      Proportion: [8759],
      Proportional: [8733],
      Pscr: [119979],
      Psi: [936],
      QUOT: [34],
      Qfr: [120084],
      Qopf: [8474],
      Qscr: [119980],
      RBarr: [10512],
      REG: [174],
      Racute: [340],
      Rang: [10219],
      Rarr: [8608],
      Rarrtl: [10518],
      Rcaron: [344],
      Rcedil: [342],
      Rcy: [1056],
      Re: [8476],
      ReverseElement: [8715],
      ReverseEquilibrium: [8651],
      ReverseUpEquilibrium: [10607],
      Rfr: [8476],
      Rho: [929],
      RightAngleBracket: [10217],
      RightArrow: [8594],
      RightArrowBar: [8677],
      RightArrowLeftArrow: [8644],
      RightCeiling: [8969],
      RightDoubleBracket: [10215],
      RightDownTeeVector: [10589],
      RightDownVector: [8642],
      RightDownVectorBar: [10581],
      RightFloor: [8971],
      RightTee: [8866],
      RightTeeArrow: [8614],
      RightTeeVector: [10587],
      RightTriangle: [8883],
      RightTriangleBar: [10704],
      RightTriangleEqual: [8885],
      RightUpDownVector: [10575],
      RightUpTeeVector: [10588],
      RightUpVector: [8638],
      RightUpVectorBar: [10580],
      RightVector: [8640],
      RightVectorBar: [10579],
      Rightarrow: [8658],
      Ropf: [8477],
      RoundImplies: [10608],
      Rrightarrow: [8667],
      Rscr: [8475],
      Rsh: [8625],
      RuleDelayed: [10740],
      SHCHcy: [1065],
      SHcy: [1064],
      SOFTcy: [1068],
      Sacute: [346],
      Sc: [10940],
      Scaron: [352],
      Scedil: [350],
      Scirc: [348],
      Scy: [1057],
      Sfr: [120086],
      ShortDownArrow: [8595],
      ShortLeftArrow: [8592],
      ShortRightArrow: [8594],
      ShortUpArrow: [8593],
      Sigma: [931],
      SmallCircle: [8728],
      Sopf: [120138],
      Sqrt: [8730],
      Square: [9633],
      SquareIntersection: [8851],
      SquareSubset: [8847],
      SquareSubsetEqual: [8849],
      SquareSuperset: [8848],
      SquareSupersetEqual: [8850],
      SquareUnion: [8852],
      Sscr: [119982],
      Star: [8902],
      Sub: [8912],
      Subset: [8912],
      SubsetEqual: [8838],
      Succeeds: [8827],
      SucceedsEqual: [10928],
      SucceedsSlantEqual: [8829],
      SucceedsTilde: [8831],
      SuchThat: [8715],
      Sum: [8721],
      Sup: [8913],
      Superset: [8835],
      SupersetEqual: [8839],
      Supset: [8913],
      THORN: [222],
      TRADE: [8482],
      TSHcy: [1035],
      TScy: [1062],
      Tab: [9],
      Tau: [932],
      Tcaron: [356],
      Tcedil: [354],
      Tcy: [1058],
      Tfr: [120087],
      Therefore: [8756],
      Theta: [920],
      ThickSpace: [8287, 8202],
      ThinSpace: [8201],
      Tilde: [8764],
      TildeEqual: [8771],
      TildeFullEqual: [8773],
      TildeTilde: [8776],
      Topf: [120139],
      TripleDot: [8411],
      Tscr: [119983],
      Tstrok: [358],
      Uacute: [218],
      Uarr: [8607],
      Uarrocir: [10569],
      Ubrcy: [1038],
      Ubreve: [364],
      Ucirc: [219],
      Ucy: [1059],
      Udblac: [368],
      Ufr: [120088],
      Ugrave: [217],
      Umacr: [362],
      UnderBar: [95],
      UnderBrace: [9183],
      UnderBracket: [9141],
      UnderParenthesis: [9181],
      Union: [8899],
      UnionPlus: [8846],
      Uogon: [370],
      Uopf: [120140],
      UpArrow: [8593],
      UpArrowBar: [10514],
      UpArrowDownArrow: [8645],
      UpDownArrow: [8597],
      UpEquilibrium: [10606],
      UpTee: [8869],
      UpTeeArrow: [8613],
      Uparrow: [8657],
      Updownarrow: [8661],
      UpperLeftArrow: [8598],
      UpperRightArrow: [8599],
      Upsi: [978],
      Upsilon: [933],
      Uring: [366],
      Uscr: [119984],
      Utilde: [360],
      Uuml: [220],
      VDash: [8875],
      Vbar: [10987],
      Vcy: [1042],
      Vdash: [8873],
      Vdashl: [10982],
      Vee: [8897],
      Verbar: [8214],
      Vert: [8214],
      VerticalBar: [8739],
      VerticalLine: [124],
      VerticalSeparator: [10072],
      VerticalTilde: [8768],
      VeryThinSpace: [8202],
      Vfr: [120089],
      Vopf: [120141],
      Vscr: [119985],
      Vvdash: [8874],
      Wcirc: [372],
      Wedge: [8896],
      Wfr: [120090],
      Wopf: [120142],
      Wscr: [119986],
      Xfr: [120091],
      Xi: [926],
      Xopf: [120143],
      Xscr: [119987],
      YAcy: [1071],
      YIcy: [1031],
      YUcy: [1070],
      Yacute: [221],
      Ycirc: [374],
      Ycy: [1067],
      Yfr: [120092],
      Yopf: [120144],
      Yscr: [119988],
      Yuml: [376],
      ZHcy: [1046],
      Zacute: [377],
      Zcaron: [381],
      Zcy: [1047],
      Zdot: [379],
      ZeroWidthSpace: [8203],
      Zeta: [918],
      Zfr: [8488],
      Zopf: [8484],
      Zscr: [119989],
      aacute: [225],
      abreve: [259],
      ac: [8766],
      acE: [8766, 819],
      acd: [8767],
      acirc: [226],
      acute: [180],
      acy: [1072],
      aelig: [230],
      af: [8289],
      afr: [120094],
      agrave: [224],
      alefsym: [8501],
      aleph: [8501],
      alpha: [945],
      amacr: [257],
      amalg: [10815],
      amp: [38],
      and: [8743],
      andand: [10837],
      andd: [10844],
      andslope: [10840],
      andv: [10842],
      ang: [8736],
      ange: [10660],
      angle: [8736],
      angmsd: [8737],
      angmsdaa: [10664],
      angmsdab: [10665],
      angmsdac: [10666],
      angmsdad: [10667],
      angmsdae: [10668],
      angmsdaf: [10669],
      angmsdag: [10670],
      angmsdah: [10671],
      angrt: [8735],
      angrtvb: [8894],
      angrtvbd: [10653],
      angsph: [8738],
      angst: [197],
      angzarr: [9084],
      aogon: [261],
      aopf: [120146],
      ap: [8776],
      apE: [10864],
      apacir: [10863],
      ape: [8778],
      apid: [8779],
      apos: [39],
      approx: [8776],
      approxeq: [8778],
      aring: [229],
      ascr: [119990],
      ast: [42],
      asymp: [8776],
      asympeq: [8781],
      atilde: [227],
      auml: [228],
      awconint: [8755],
      awint: [10769],
      bNot: [10989],
      backcong: [8780],
      backepsilon: [1014],
      backprime: [8245],
      backsim: [8765],
      backsimeq: [8909],
      barvee: [8893],
      barwed: [8965],
      barwedge: [8965],
      bbrk: [9141],
      bbrktbrk: [9142],
      bcong: [8780],
      bcy: [1073],
      bdquo: [8222],
      becaus: [8757],
      because: [8757],
      bemptyv: [10672],
      bepsi: [1014],
      bernou: [8492],
      beta: [946],
      beth: [8502],
      between: [8812],
      bfr: [120095],
      bigcap: [8898],
      bigcirc: [9711],
      bigcup: [8899],
      bigodot: [10752],
      bigoplus: [10753],
      bigotimes: [10754],
      bigsqcup: [10758],
      bigstar: [9733],
      bigtriangledown: [9661],
      bigtriangleup: [9651],
      biguplus: [10756],
      bigvee: [8897],
      bigwedge: [8896],
      bkarow: [10509],
      blacklozenge: [10731],
      blacksquare: [9642],
      blacktriangle: [9652],
      blacktriangledown: [9662],
      blacktriangleleft: [9666],
      blacktriangleright: [9656],
      blank: [9251],
      blk12: [9618],
      blk14: [9617],
      blk34: [9619],
      block: [9608],
      bne: [61, 8421],
      bnequiv: [8801, 8421],
      bnot: [8976],
      bopf: [120147],
      bot: [8869],
      bottom: [8869],
      bowtie: [8904],
      boxDL: [9559],
      boxDR: [9556],
      boxDl: [9558],
      boxDr: [9555],
      boxH: [9552],
      boxHD: [9574],
      boxHU: [9577],
      boxHd: [9572],
      boxHu: [9575],
      boxUL: [9565],
      boxUR: [9562],
      boxUl: [9564],
      boxUr: [9561],
      boxV: [9553],
      boxVH: [9580],
      boxVL: [9571],
      boxVR: [9568],
      boxVh: [9579],
      boxVl: [9570],
      boxVr: [9567],
      boxbox: [10697],
      boxdL: [9557],
      boxdR: [9554],
      boxdl: [9488],
      boxdr: [9484],
      boxh: [9472],
      boxhD: [9573],
      boxhU: [9576],
      boxhd: [9516],
      boxhu: [9524],
      boxminus: [8863],
      boxplus: [8862],
      boxtimes: [8864],
      boxuL: [9563],
      boxuR: [9560],
      boxul: [9496],
      boxur: [9492],
      boxv: [9474],
      boxvH: [9578],
      boxvL: [9569],
      boxvR: [9566],
      boxvh: [9532],
      boxvl: [9508],
      boxvr: [9500],
      bprime: [8245],
      breve: [728],
      brvbar: [166],
      bscr: [119991],
      bsemi: [8271],
      bsim: [8765],
      bsime: [8909],
      bsol: [92],
      bsolb: [10693],
      bsolhsub: [10184],
      bull: [8226],
      bullet: [8226],
      bump: [8782],
      bumpE: [10926],
      bumpe: [8783],
      bumpeq: [8783],
      cacute: [263],
      cap: [8745],
      capand: [10820],
      capbrcup: [10825],
      capcap: [10827],
      capcup: [10823],
      capdot: [10816],
      caps: [8745, 65024],
      caret: [8257],
      caron: [711],
      ccaps: [10829],
      ccaron: [269],
      ccedil: [231],
      ccirc: [265],
      ccups: [10828],
      ccupssm: [10832],
      cdot: [267],
      cedil: [184],
      cemptyv: [10674],
      cent: [162],
      centerdot: [183],
      cfr: [120096],
      chcy: [1095],
      check: [10003],
      checkmark: [10003],
      chi: [967],
      cir: [9675],
      cirE: [10691],
      circ: [710],
      circeq: [8791],
      circlearrowleft: [8634],
      circlearrowright: [8635],
      circledR: [174],
      circledS: [9416],
      circledast: [8859],
      circledcirc: [8858],
      circleddash: [8861],
      cire: [8791],
      cirfnint: [10768],
      cirmid: [10991],
      cirscir: [10690],
      clubs: [9827],
      clubsuit: [9827],
      colon: [58],
      colone: [8788],
      coloneq: [8788],
      comma: [44],
      commat: [64],
      comp: [8705],
      compfn: [8728],
      complement: [8705],
      complexes: [8450],
      cong: [8773],
      congdot: [10861],
      conint: [8750],
      copf: [120148],
      coprod: [8720],
      copy: [169],
      copysr: [8471],
      crarr: [8629],
      cross: [10007],
      cscr: [119992],
      csub: [10959],
      csube: [10961],
      csup: [10960],
      csupe: [10962],
      ctdot: [8943],
      cudarrl: [10552],
      cudarrr: [10549],
      cuepr: [8926],
      cuesc: [8927],
      cularr: [8630],
      cularrp: [10557],
      cup: [8746],
      cupbrcap: [10824],
      cupcap: [10822],
      cupcup: [10826],
      cupdot: [8845],
      cupor: [10821],
      cups: [8746, 65024],
      curarr: [8631],
      curarrm: [10556],
      curlyeqprec: [8926],
      curlyeqsucc: [8927],
      curlyvee: [8910],
      curlywedge: [8911],
      curren: [164],
      curvearrowleft: [8630],
      curvearrowright: [8631],
      cuvee: [8910],
      cuwed: [8911],
      cwconint: [8754],
      cwint: [8753],
      cylcty: [9005],
      dArr: [8659],
      dHar: [10597],
      dagger: [8224],
      daleth: [8504],
      darr: [8595],
      dash: [8208],
      dashv: [8867],
      dbkarow: [10511],
      dblac: [733],
      dcaron: [271],
      dcy: [1076],
      dd: [8518],
      ddagger: [8225],
      ddarr: [8650],
      ddotseq: [10871],
      deg: [176],
      delta: [948],
      demptyv: [10673],
      dfisht: [10623],
      dfr: [120097],
      dharl: [8643],
      dharr: [8642],
      diam: [8900],
      diamond: [8900],
      diamondsuit: [9830],
      diams: [9830],
      die: [168],
      digamma: [989],
      disin: [8946],
      div: [247],
      divide: [247],
      divideontimes: [8903],
      divonx: [8903],
      djcy: [1106],
      dlcorn: [8990],
      dlcrop: [8973],
      dollar: [36],
      dopf: [120149],
      dot: [729],
      doteq: [8784],
      doteqdot: [8785],
      dotminus: [8760],
      dotplus: [8724],
      dotsquare: [8865],
      doublebarwedge: [8966],
      downarrow: [8595],
      downdownarrows: [8650],
      downharpoonleft: [8643],
      downharpoonright: [8642],
      drbkarow: [10512],
      drcorn: [8991],
      drcrop: [8972],
      dscr: [119993],
      dscy: [1109],
      dsol: [10742],
      dstrok: [273],
      dtdot: [8945],
      dtri: [9663],
      dtrif: [9662],
      duarr: [8693],
      duhar: [10607],
      dwangle: [10662],
      dzcy: [1119],
      dzigrarr: [10239],
      eDDot: [10871],
      eDot: [8785],
      eacute: [233],
      easter: [10862],
      ecaron: [283],
      ecir: [8790],
      ecirc: [234],
      ecolon: [8789],
      ecy: [1101],
      edot: [279],
      ee: [8519],
      efDot: [8786],
      efr: [120098],
      eg: [10906],
      egrave: [232],
      egs: [10902],
      egsdot: [10904],
      el: [10905],
      elinters: [9191],
      ell: [8467],
      els: [10901],
      elsdot: [10903],
      emacr: [275],
      empty: [8709],
      emptyset: [8709],
      emptyv: [8709],
      emsp: [8195],
      emsp13: [8196],
      emsp14: [8197],
      eng: [331],
      ensp: [8194],
      eogon: [281],
      eopf: [120150],
      epar: [8917],
      eparsl: [10723],
      eplus: [10865],
      epsi: [949],
      epsilon: [949],
      epsiv: [1013],
      eqcirc: [8790],
      eqcolon: [8789],
      eqsim: [8770],
      eqslantgtr: [10902],
      eqslantless: [10901],
      equals: [61],
      equest: [8799],
      equiv: [8801],
      equivDD: [10872],
      eqvparsl: [10725],
      erDot: [8787],
      erarr: [10609],
      escr: [8495],
      esdot: [8784],
      esim: [8770],
      eta: [951],
      eth: [240],
      euml: [235],
      euro: [8364],
      excl: [33],
      exist: [8707],
      expectation: [8496],
      exponentiale: [8519],
      fallingdotseq: [8786],
      fcy: [1092],
      female: [9792],
      ffilig: [64259],
      fflig: [64256],
      ffllig: [64260],
      ffr: [120099],
      filig: [64257],
      fjlig: [102, 106],
      flat: [9837],
      fllig: [64258],
      fltns: [9649],
      fnof: [402],
      fopf: [120151],
      forall: [8704],
      fork: [8916],
      forkv: [10969],
      fpartint: [10765],
      frac12: [189],
      frac13: [8531],
      frac14: [188],
      frac15: [8533],
      frac16: [8537],
      frac18: [8539],
      frac23: [8532],
      frac25: [8534],
      frac34: [190],
      frac35: [8535],
      frac38: [8540],
      frac45: [8536],
      frac56: [8538],
      frac58: [8541],
      frac78: [8542],
      frasl: [8260],
      frown: [8994],
      fscr: [119995],
      gE: [8807],
      gEl: [10892],
      gacute: [501],
      gamma: [947],
      gammad: [989],
      gap: [10886],
      gbreve: [287],
      gcirc: [285],
      gcy: [1075],
      gdot: [289],
      ge: [8805],
      gel: [8923],
      geq: [8805],
      geqq: [8807],
      geqslant: [10878],
      ges: [10878],
      gescc: [10921],
      gesdot: [10880],
      gesdoto: [10882],
      gesdotol: [10884],
      gesl: [8923, 65024],
      gesles: [10900],
      gfr: [120100],
      gg: [8811],
      ggg: [8921],
      gimel: [8503],
      gjcy: [1107],
      gl: [8823],
      glE: [10898],
      gla: [10917],
      glj: [10916],
      gnE: [8809],
      gnap: [10890],
      gnapprox: [10890],
      gne: [10888],
      gneq: [10888],
      gneqq: [8809],
      gnsim: [8935],
      gopf: [120152],
      grave: [96],
      gscr: [8458],
      gsim: [8819],
      gsime: [10894],
      gsiml: [10896],
      gt: [62],
      gtcc: [10919],
      gtcir: [10874],
      gtdot: [8919],
      gtlPar: [10645],
      gtquest: [10876],
      gtrapprox: [10886],
      gtrarr: [10616],
      gtrdot: [8919],
      gtreqless: [8923],
      gtreqqless: [10892],
      gtrless: [8823],
      gtrsim: [8819],
      gvertneqq: [8809, 65024],
      gvnE: [8809, 65024],
      hArr: [8660],
      hairsp: [8202],
      half: [189],
      hamilt: [8459],
      hardcy: [1098],
      harr: [8596],
      harrcir: [10568],
      harrw: [8621],
      hbar: [8463],
      hcirc: [293],
      hearts: [9829],
      heartsuit: [9829],
      hellip: [8230],
      hercon: [8889],
      hfr: [120101],
      hksearow: [10533],
      hkswarow: [10534],
      hoarr: [8703],
      homtht: [8763],
      hookleftarrow: [8617],
      hookrightarrow: [8618],
      hopf: [120153],
      horbar: [8213],
      hscr: [119997],
      hslash: [8463],
      hstrok: [295],
      hybull: [8259],
      hyphen: [8208],
      iacute: [237],
      ic: [8291],
      icirc: [238],
      icy: [1080],
      iecy: [1077],
      iexcl: [161],
      iff: [8660],
      ifr: [120102],
      igrave: [236],
      ii: [8520],
      iiiint: [10764],
      iiint: [8749],
      iinfin: [10716],
      iiota: [8489],
      ijlig: [307],
      imacr: [299],
      image: [8465],
      imagline: [8464],
      imagpart: [8465],
      imath: [305],
      imof: [8887],
      imped: [437],
      in: [8712],
      incare: [8453],
      infin: [8734],
      infintie: [10717],
      inodot: [305],
      int: [8747],
      intcal: [8890],
      integers: [8484],
      intercal: [8890],
      intlarhk: [10775],
      intprod: [10812],
      iocy: [1105],
      iogon: [303],
      iopf: [120154],
      iota: [953],
      iprod: [10812],
      iquest: [191],
      iscr: [119998],
      isin: [8712],
      isinE: [8953],
      isindot: [8949],
      isins: [8948],
      isinsv: [8947],
      isinv: [8712],
      it: [8290],
      itilde: [297],
      iukcy: [1110],
      iuml: [239],
      jcirc: [309],
      jcy: [1081],
      jfr: [120103],
      jmath: [567],
      jopf: [120155],
      jscr: [119999],
      jsercy: [1112],
      jukcy: [1108],
      kappa: [954],
      kappav: [1008],
      kcedil: [311],
      kcy: [1082],
      kfr: [120104],
      kgreen: [312],
      khcy: [1093],
      kjcy: [1116],
      kopf: [120156],
      kscr: [120000],
      lAarr: [8666],
      lArr: [8656],
      lAtail: [10523],
      lBarr: [10510],
      lE: [8806],
      lEg: [10891],
      lHar: [10594],
      lacute: [314],
      laemptyv: [10676],
      lagran: [8466],
      lambda: [955],
      lang: [10216],
      langd: [10641],
      langle: [10216],
      lap: [10885],
      laquo: [171],
      larr: [8592],
      larrb: [8676],
      larrbfs: [10527],
      larrfs: [10525],
      larrhk: [8617],
      larrlp: [8619],
      larrpl: [10553],
      larrsim: [10611],
      larrtl: [8610],
      lat: [10923],
      latail: [10521],
      late: [10925],
      lates: [10925, 65024],
      lbarr: [10508],
      lbbrk: [10098],
      lbrace: [123],
      lbrack: [91],
      lbrke: [10635],
      lbrksld: [10639],
      lbrkslu: [10637],
      lcaron: [318],
      lcedil: [316],
      lceil: [8968],
      lcub: [123],
      lcy: [1083],
      ldca: [10550],
      ldquo: [8220],
      ldquor: [8222],
      ldrdhar: [10599],
      ldrushar: [10571],
      ldsh: [8626],
      le: [8804],
      leftarrow: [8592],
      leftarrowtail: [8610],
      leftharpoondown: [8637],
      leftharpoonup: [8636],
      leftleftarrows: [8647],
      leftrightarrow: [8596],
      leftrightarrows: [8646],
      leftrightharpoons: [8651],
      leftrightsquigarrow: [8621],
      leftthreetimes: [8907],
      leg: [8922],
      leq: [8804],
      leqq: [8806],
      leqslant: [10877],
      les: [10877],
      lescc: [10920],
      lesdot: [10879],
      lesdoto: [10881],
      lesdotor: [10883],
      lesg: [8922, 65024],
      lesges: [10899],
      lessapprox: [10885],
      lessdot: [8918],
      lesseqgtr: [8922],
      lesseqqgtr: [10891],
      lessgtr: [8822],
      lesssim: [8818],
      lfisht: [10620],
      lfloor: [8970],
      lfr: [120105],
      lg: [8822],
      lgE: [10897],
      lhard: [8637],
      lharu: [8636],
      lharul: [10602],
      lhblk: [9604],
      ljcy: [1113],
      ll: [8810],
      llarr: [8647],
      llcorner: [8990],
      llhard: [10603],
      lltri: [9722],
      lmidot: [320],
      lmoust: [9136],
      lmoustache: [9136],
      lnE: [8808],
      lnap: [10889],
      lnapprox: [10889],
      lne: [10887],
      lneq: [10887],
      lneqq: [8808],
      lnsim: [8934],
      loang: [10220],
      loarr: [8701],
      lobrk: [10214],
      longleftarrow: [10229],
      longleftrightarrow: [10231],
      longmapsto: [10236],
      longrightarrow: [10230],
      looparrowleft: [8619],
      looparrowright: [8620],
      lopar: [10629],
      lopf: [120157],
      loplus: [10797],
      lotimes: [10804],
      lowast: [8727],
      lowbar: [95],
      loz: [9674],
      lozenge: [9674],
      lozf: [10731],
      lpar: [40],
      lparlt: [10643],
      lrarr: [8646],
      lrcorner: [8991],
      lrhar: [8651],
      lrhard: [10605],
      lrm: [8206],
      lrtri: [8895],
      lsaquo: [8249],
      lscr: [120001],
      lsh: [8624],
      lsim: [8818],
      lsime: [10893],
      lsimg: [10895],
      lsqb: [91],
      lsquo: [8216],
      lsquor: [8218],
      lstrok: [322],
      lt: [60],
      ltcc: [10918],
      ltcir: [10873],
      ltdot: [8918],
      lthree: [8907],
      ltimes: [8905],
      ltlarr: [10614],
      ltquest: [10875],
      ltrPar: [10646],
      ltri: [9667],
      ltrie: [8884],
      ltrif: [9666],
      lurdshar: [10570],
      luruhar: [10598],
      lvertneqq: [8808, 65024],
      lvnE: [8808, 65024],
      mDDot: [8762],
      macr: [175],
      male: [9794],
      malt: [10016],
      maltese: [10016],
      map: [8614],
      mapsto: [8614],
      mapstodown: [8615],
      mapstoleft: [8612],
      mapstoup: [8613],
      marker: [9646],
      mcomma: [10793],
      mcy: [1084],
      mdash: [8212],
      measuredangle: [8737],
      mfr: [120106],
      mho: [8487],
      micro: [181],
      mid: [8739],
      midast: [42],
      midcir: [10992],
      middot: [183],
      minus: [8722],
      minusb: [8863],
      minusd: [8760],
      minusdu: [10794],
      mlcp: [10971],
      mldr: [8230],
      mnplus: [8723],
      models: [8871],
      mopf: [120158],
      mp: [8723],
      mscr: [120002],
      mstpos: [8766],
      mu: [956],
      multimap: [8888],
      mumap: [8888],
      nGg: [8921, 824],
      nGt: [8811, 8402],
      nGtv: [8811, 824],
      nLeftarrow: [8653],
      nLeftrightarrow: [8654],
      nLl: [8920, 824],
      nLt: [8810, 8402],
      nLtv: [8810, 824],
      nRightarrow: [8655],
      nVDash: [8879],
      nVdash: [8878],
      nabla: [8711],
      nacute: [324],
      nang: [8736, 8402],
      nap: [8777],
      napE: [10864, 824],
      napid: [8779, 824],
      napos: [329],
      napprox: [8777],
      natur: [9838],
      natural: [9838],
      naturals: [8469],
      nbsp: [160],
      nbump: [8782, 824],
      nbumpe: [8783, 824],
      ncap: [10819],
      ncaron: [328],
      ncedil: [326],
      ncong: [8775],
      ncongdot: [10861, 824],
      ncup: [10818],
      ncy: [1085],
      ndash: [8211],
      ne: [8800],
      neArr: [8663],
      nearhk: [10532],
      nearr: [8599],
      nearrow: [8599],
      nedot: [8784, 824],
      nequiv: [8802],
      nesear: [10536],
      nesim: [8770, 824],
      nexist: [8708],
      nexists: [8708],
      nfr: [120107],
      ngE: [8807, 824],
      nge: [8817],
      ngeq: [8817],
      ngeqq: [8807, 824],
      ngeqslant: [10878, 824],
      nges: [10878, 824],
      ngsim: [8821],
      ngt: [8815],
      ngtr: [8815],
      nhArr: [8654],
      nharr: [8622],
      nhpar: [10994],
      ni: [8715],
      nis: [8956],
      nisd: [8954],
      niv: [8715],
      njcy: [1114],
      nlArr: [8653],
      nlE: [8806, 824],
      nlarr: [8602],
      nldr: [8229],
      nle: [8816],
      nleftarrow: [8602],
      nleftrightarrow: [8622],
      nleq: [8816],
      nleqq: [8806, 824],
      nleqslant: [10877, 824],
      nles: [10877, 824],
      nless: [8814],
      nlsim: [8820],
      nlt: [8814],
      nltri: [8938],
      nltrie: [8940],
      nmid: [8740],
      nopf: [120159],
      not: [172],
      notin: [8713],
      notinE: [8953, 824],
      notindot: [8949, 824],
      notinva: [8713],
      notinvb: [8951],
      notinvc: [8950],
      notni: [8716],
      notniva: [8716],
      notnivb: [8958],
      notnivc: [8957],
      npar: [8742],
      nparallel: [8742],
      nparsl: [11005, 8421],
      npart: [8706, 824],
      npolint: [10772],
      npr: [8832],
      nprcue: [8928],
      npre: [10927, 824],
      nprec: [8832],
      npreceq: [10927, 824],
      nrArr: [8655],
      nrarr: [8603],
      nrarrc: [10547, 824],
      nrarrw: [8605, 824],
      nrightarrow: [8603],
      nrtri: [8939],
      nrtrie: [8941],
      nsc: [8833],
      nsccue: [8929],
      nsce: [10928, 824],
      nscr: [120003],
      nshortmid: [8740],
      nshortparallel: [8742],
      nsim: [8769],
      nsime: [8772],
      nsimeq: [8772],
      nsmid: [8740],
      nspar: [8742],
      nsqsube: [8930],
      nsqsupe: [8931],
      nsub: [8836],
      nsubE: [10949, 824],
      nsube: [8840],
      nsubset: [8834, 8402],
      nsubseteq: [8840],
      nsubseteqq: [10949, 824],
      nsucc: [8833],
      nsucceq: [10928, 824],
      nsup: [8837],
      nsupE: [10950, 824],
      nsupe: [8841],
      nsupset: [8835, 8402],
      nsupseteq: [8841],
      nsupseteqq: [10950, 824],
      ntgl: [8825],
      ntilde: [241],
      ntlg: [8824],
      ntriangleleft: [8938],
      ntrianglelefteq: [8940],
      ntriangleright: [8939],
      ntrianglerighteq: [8941],
      nu: [957],
      num: [35],
      numero: [8470],
      numsp: [8199],
      nvDash: [8877],
      nvHarr: [10500],
      nvap: [8781, 8402],
      nvdash: [8876],
      nvge: [8805, 8402],
      nvgt: [62, 8402],
      nvinfin: [10718],
      nvlArr: [10498],
      nvle: [8804, 8402],
      nvlt: [60, 8402],
      nvltrie: [8884, 8402],
      nvrArr: [10499],
      nvrtrie: [8885, 8402],
      nvsim: [8764, 8402],
      nwArr: [8662],
      nwarhk: [10531],
      nwarr: [8598],
      nwarrow: [8598],
      nwnear: [10535],
      oS: [9416],
      oacute: [243],
      oast: [8859],
      ocir: [8858],
      ocirc: [244],
      ocy: [1086],
      odash: [8861],
      odblac: [337],
      odiv: [10808],
      odot: [8857],
      odsold: [10684],
      oelig: [339],
      ofcir: [10687],
      ofr: [120108],
      ogon: [731],
      ograve: [242],
      ogt: [10689],
      ohbar: [10677],
      ohm: [937],
      oint: [8750],
      olarr: [8634],
      olcir: [10686],
      olcross: [10683],
      oline: [8254],
      olt: [10688],
      omacr: [333],
      omega: [969],
      omicron: [959],
      omid: [10678],
      ominus: [8854],
      oopf: [120160],
      opar: [10679],
      operp: [10681],
      oplus: [8853],
      or: [8744],
      orarr: [8635],
      ord: [10845],
      order: [8500],
      orderof: [8500],
      ordf: [170],
      ordm: [186],
      origof: [8886],
      oror: [10838],
      orslope: [10839],
      orv: [10843],
      oscr: [8500],
      oslash: [248],
      osol: [8856],
      otilde: [245],
      otimes: [8855],
      otimesas: [10806],
      ouml: [246],
      ovbar: [9021],
      par: [8741],
      para: [182],
      parallel: [8741],
      parsim: [10995],
      parsl: [11005],
      part: [8706],
      pcy: [1087],
      percnt: [37],
      period: [46],
      permil: [8240],
      perp: [8869],
      pertenk: [8241],
      pfr: [120109],
      phi: [966],
      phiv: [981],
      phmmat: [8499],
      phone: [9742],
      pi: [960],
      pitchfork: [8916],
      piv: [982],
      planck: [8463],
      planckh: [8462],
      plankv: [8463],
      plus: [43],
      plusacir: [10787],
      plusb: [8862],
      pluscir: [10786],
      plusdo: [8724],
      plusdu: [10789],
      pluse: [10866],
      plusmn: [177],
      plussim: [10790],
      plustwo: [10791],
      pm: [177],
      pointint: [10773],
      popf: [120161],
      pound: [163],
      pr: [8826],
      prE: [10931],
      prap: [10935],
      prcue: [8828],
      pre: [10927],
      prec: [8826],
      precapprox: [10935],
      preccurlyeq: [8828],
      preceq: [10927],
      precnapprox: [10937],
      precneqq: [10933],
      precnsim: [8936],
      precsim: [8830],
      prime: [8242],
      primes: [8473],
      prnE: [10933],
      prnap: [10937],
      prnsim: [8936],
      prod: [8719],
      profalar: [9006],
      profline: [8978],
      profsurf: [8979],
      prop: [8733],
      propto: [8733],
      prsim: [8830],
      prurel: [8880],
      pscr: [120005],
      psi: [968],
      puncsp: [8200],
      qfr: [120110],
      qint: [10764],
      qopf: [120162],
      qprime: [8279],
      qscr: [120006],
      quaternions: [8461],
      quatint: [10774],
      quest: [63],
      questeq: [8799],
      quot: [34],
      rAarr: [8667],
      rArr: [8658],
      rAtail: [10524],
      rBarr: [10511],
      rHar: [10596],
      race: [8765, 817],
      racute: [341],
      radic: [8730],
      raemptyv: [10675],
      rang: [10217],
      rangd: [10642],
      range: [10661],
      rangle: [10217],
      raquo: [187],
      rarr: [8594],
      rarrap: [10613],
      rarrb: [8677],
      rarrbfs: [10528],
      rarrc: [10547],
      rarrfs: [10526],
      rarrhk: [8618],
      rarrlp: [8620],
      rarrpl: [10565],
      rarrsim: [10612],
      rarrtl: [8611],
      rarrw: [8605],
      ratail: [10522],
      ratio: [8758],
      rationals: [8474],
      rbarr: [10509],
      rbbrk: [10099],
      rbrace: [125],
      rbrack: [93],
      rbrke: [10636],
      rbrksld: [10638],
      rbrkslu: [10640],
      rcaron: [345],
      rcedil: [343],
      rceil: [8969],
      rcub: [125],
      rcy: [1088],
      rdca: [10551],
      rdldhar: [10601],
      rdquo: [8221],
      rdquor: [8221],
      rdsh: [8627],
      real: [8476],
      realine: [8475],
      realpart: [8476],
      reals: [8477],
      rect: [9645],
      reg: [174],
      rfisht: [10621],
      rfloor: [8971],
      rfr: [120111],
      rhard: [8641],
      rharu: [8640],
      rharul: [10604],
      rho: [961],
      rhov: [1009],
      rightarrow: [8594],
      rightarrowtail: [8611],
      rightharpoondown: [8641],
      rightharpoonup: [8640],
      rightleftarrows: [8644],
      rightleftharpoons: [8652],
      rightrightarrows: [8649],
      rightsquigarrow: [8605],
      rightthreetimes: [8908],
      ring: [730],
      risingdotseq: [8787],
      rlarr: [8644],
      rlhar: [8652],
      rlm: [8207],
      rmoust: [9137],
      rmoustache: [9137],
      rnmid: [10990],
      roang: [10221],
      roarr: [8702],
      robrk: [10215],
      ropar: [10630],
      ropf: [120163],
      roplus: [10798],
      rotimes: [10805],
      rpar: [41],
      rpargt: [10644],
      rppolint: [10770],
      rrarr: [8649],
      rsaquo: [8250],
      rscr: [120007],
      rsh: [8625],
      rsqb: [93],
      rsquo: [8217],
      rsquor: [8217],
      rthree: [8908],
      rtimes: [8906],
      rtri: [9657],
      rtrie: [8885],
      rtrif: [9656],
      rtriltri: [10702],
      ruluhar: [10600],
      rx: [8478],
      sacute: [347],
      sbquo: [8218],
      sc: [8827],
      scE: [10932],
      scap: [10936],
      scaron: [353],
      sccue: [8829],
      sce: [10928],
      scedil: [351],
      scirc: [349],
      scnE: [10934],
      scnap: [10938],
      scnsim: [8937],
      scpolint: [10771],
      scsim: [8831],
      scy: [1089],
      sdot: [8901],
      sdotb: [8865],
      sdote: [10854],
      seArr: [8664],
      searhk: [10533],
      searr: [8600],
      searrow: [8600],
      sect: [167],
      semi: [59],
      seswar: [10537],
      setminus: [8726],
      setmn: [8726],
      sext: [10038],
      sfr: [120112],
      sfrown: [8994],
      sharp: [9839],
      shchcy: [1097],
      shcy: [1096],
      shortmid: [8739],
      shortparallel: [8741],
      shy: [173],
      sigma: [963],
      sigmaf: [962],
      sigmav: [962],
      sim: [8764],
      simdot: [10858],
      sime: [8771],
      simeq: [8771],
      simg: [10910],
      simgE: [10912],
      siml: [10909],
      simlE: [10911],
      simne: [8774],
      simplus: [10788],
      simrarr: [10610],
      slarr: [8592],
      smallsetminus: [8726],
      smashp: [10803],
      smeparsl: [10724],
      smid: [8739],
      smile: [8995],
      smt: [10922],
      smte: [10924],
      smtes: [10924, 65024],
      softcy: [1100],
      sol: [47],
      solb: [10692],
      solbar: [9023],
      sopf: [120164],
      spades: [9824],
      spadesuit: [9824],
      spar: [8741],
      sqcap: [8851],
      sqcaps: [8851, 65024],
      sqcup: [8852],
      sqcups: [8852, 65024],
      sqsub: [8847],
      sqsube: [8849],
      sqsubset: [8847],
      sqsubseteq: [8849],
      sqsup: [8848],
      sqsupe: [8850],
      sqsupset: [8848],
      sqsupseteq: [8850],
      squ: [9633],
      square: [9633],
      squarf: [9642],
      squf: [9642],
      srarr: [8594],
      sscr: [120008],
      ssetmn: [8726],
      ssmile: [8995],
      sstarf: [8902],
      star: [9734],
      starf: [9733],
      straightepsilon: [1013],
      straightphi: [981],
      strns: [175],
      sub: [8834],
      subE: [10949],
      subdot: [10941],
      sube: [8838],
      subedot: [10947],
      submult: [10945],
      subnE: [10955],
      subne: [8842],
      subplus: [10943],
      subrarr: [10617],
      subset: [8834],
      subseteq: [8838],
      subseteqq: [10949],
      subsetneq: [8842],
      subsetneqq: [10955],
      subsim: [10951],
      subsub: [10965],
      subsup: [10963],
      succ: [8827],
      succapprox: [10936],
      succcurlyeq: [8829],
      succeq: [10928],
      succnapprox: [10938],
      succneqq: [10934],
      succnsim: [8937],
      succsim: [8831],
      sum: [8721],
      sung: [9834],
      sup: [8835],
      sup1: [185],
      sup2: [178],
      sup3: [179],
      supE: [10950],
      supdot: [10942],
      supdsub: [10968],
      supe: [8839],
      supedot: [10948],
      suphsol: [10185],
      suphsub: [10967],
      suplarr: [10619],
      supmult: [10946],
      supnE: [10956],
      supne: [8843],
      supplus: [10944],
      supset: [8835],
      supseteq: [8839],
      supseteqq: [10950],
      supsetneq: [8843],
      supsetneqq: [10956],
      supsim: [10952],
      supsub: [10964],
      supsup: [10966],
      swArr: [8665],
      swarhk: [10534],
      swarr: [8601],
      swarrow: [8601],
      swnwar: [10538],
      szlig: [223],
      target: [8982],
      tau: [964],
      tbrk: [9140],
      tcaron: [357],
      tcedil: [355],
      tcy: [1090],
      tdot: [8411],
      telrec: [8981],
      tfr: [120113],
      there4: [8756],
      therefore: [8756],
      theta: [952],
      thetasym: [977],
      thetav: [977],
      thickapprox: [8776],
      thicksim: [8764],
      thinsp: [8201],
      thkap: [8776],
      thksim: [8764],
      thorn: [254],
      tilde: [732],
      times: [215],
      timesb: [8864],
      timesbar: [10801],
      timesd: [10800],
      tint: [8749],
      toea: [10536],
      top: [8868],
      topbot: [9014],
      topcir: [10993],
      topf: [120165],
      topfork: [10970],
      tosa: [10537],
      tprime: [8244],
      trade: [8482],
      triangle: [9653],
      triangledown: [9663],
      triangleleft: [9667],
      trianglelefteq: [8884],
      triangleq: [8796],
      triangleright: [9657],
      trianglerighteq: [8885],
      tridot: [9708],
      trie: [8796],
      triminus: [10810],
      triplus: [10809],
      trisb: [10701],
      tritime: [10811],
      trpezium: [9186],
      tscr: [120009],
      tscy: [1094],
      tshcy: [1115],
      tstrok: [359],
      twixt: [8812],
      twoheadleftarrow: [8606],
      twoheadrightarrow: [8608],
      uArr: [8657],
      uHar: [10595],
      uacute: [250],
      uarr: [8593],
      ubrcy: [1118],
      ubreve: [365],
      ucirc: [251],
      ucy: [1091],
      udarr: [8645],
      udblac: [369],
      udhar: [10606],
      ufisht: [10622],
      ufr: [120114],
      ugrave: [249],
      uharl: [8639],
      uharr: [8638],
      uhblk: [9600],
      ulcorn: [8988],
      ulcorner: [8988],
      ulcrop: [8975],
      ultri: [9720],
      umacr: [363],
      uml: [168],
      uogon: [371],
      uopf: [120166],
      uparrow: [8593],
      updownarrow: [8597],
      upharpoonleft: [8639],
      upharpoonright: [8638],
      uplus: [8846],
      upsi: [965],
      upsih: [978],
      upsilon: [965],
      upuparrows: [8648],
      urcorn: [8989],
      urcorner: [8989],
      urcrop: [8974],
      uring: [367],
      urtri: [9721],
      uscr: [120010],
      utdot: [8944],
      utilde: [361],
      utri: [9653],
      utrif: [9652],
      uuarr: [8648],
      uuml: [252],
      uwangle: [10663],
      vArr: [8661],
      vBar: [10984],
      vBarv: [10985],
      vDash: [8872],
      vangrt: [10652],
      varepsilon: [1013],
      varkappa: [1008],
      varnothing: [8709],
      varphi: [981],
      varpi: [982],
      varpropto: [8733],
      varr: [8597],
      varrho: [1009],
      varsigma: [962],
      varsubsetneq: [8842, 65024],
      varsubsetneqq: [10955, 65024],
      varsupsetneq: [8843, 65024],
      varsupsetneqq: [10956, 65024],
      vartheta: [977],
      vartriangleleft: [8882],
      vartriangleright: [8883],
      vcy: [1074],
      vdash: [8866],
      vee: [8744],
      veebar: [8891],
      veeeq: [8794],
      vellip: [8942],
      verbar: [124],
      vert: [124],
      vfr: [120115],
      vltri: [8882],
      vnsub: [8834, 8402],
      vnsup: [8835, 8402],
      vopf: [120167],
      vprop: [8733],
      vrtri: [8883],
      vscr: [120011],
      vsubnE: [10955, 65024],
      vsubne: [8842, 65024],
      vsupnE: [10956, 65024],
      vsupne: [8843, 65024],
      vzigzag: [10650],
      wcirc: [373],
      wedbar: [10847],
      wedge: [8743],
      wedgeq: [8793],
      weierp: [8472],
      wfr: [120116],
      wopf: [120168],
      wp: [8472],
      wr: [8768],
      wreath: [8768],
      wscr: [120012],
      xcap: [8898],
      xcirc: [9711],
      xcup: [8899],
      xdtri: [9661],
      xfr: [120117],
      xhArr: [10234],
      xharr: [10231],
      xi: [958],
      xlArr: [10232],
      xlarr: [10229],
      xmap: [10236],
      xnis: [8955],
      xodot: [10752],
      xopf: [120169],
      xoplus: [10753],
      xotime: [10754],
      xrArr: [10233],
      xrarr: [10230],
      xscr: [120013],
      xsqcup: [10758],
      xuplus: [10756],
      xutri: [9651],
      xvee: [8897],
      xwedge: [8896],
      yacute: [253],
      yacy: [1103],
      ycirc: [375],
      ycy: [1099],
      yen: [165],
      yfr: [120118],
      yicy: [1111],
      yopf: [120170],
      yscr: [120014],
      yucy: [1102],
      yuml: [255],
      zacute: [378],
      zcaron: [382],
      zcy: [1079],
      zdot: [380],
      zeetrf: [8488],
      zeta: [950],
      zfr: [120119],
      zhcy: [1078],
      zigrarr: [8669],
      zopf: [120171],
      zscr: [120015],
      zwj: [8205],
      zwnj: [8204]
    };
    __exports__.namedCodepoints = namedCodepoints;
  });
define("simple-html-tokenizer/helpers", 
  ["exports"],
  function(__exports__) {
    
    function makeArray(object) {
      if (object instanceof Array) {
        return object;
      } else {
        return [object];
      }
    }

    __exports__.makeArray = makeArray;var objectCreate = Object.create || function objectCreate(obj) {
      function F() {}
      F.prototype = obj;
      return new F();
    };
    __exports__.objectCreate = objectCreate;
    function isSpace(char) {
      return (/[\t\n\f ]/).test(char);
    }

    __exports__.isSpace = isSpace;function isAlpha(char) {
      return (/[A-Za-z]/).test(char);
    }

    __exports__.isAlpha = isAlpha;function isUpper(char) {
      return (/[A-Z]/).test(char);
    }

    __exports__.isUpper = isUpper;function removeLocInfo(tokens) {
      for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        delete token.firstLine;
        delete token.firstColumn;
        delete token.lastLine;
        delete token.lastColumn;
      }
    }

    __exports__.removeLocInfo = removeLocInfo;function tokensEqual(actual, expected, checkLocInfo, message) {
      if (!checkLocInfo) {
        removeLocInfo(actual);
      }
      deepEqual(actual, makeArray(expected), message);
    }

    __exports__.tokensEqual = tokensEqual;function locInfo(token, firstLine, firstColumn, lastLine, lastColumn) {
      token.firstLine = firstLine;
      token.firstColumn = firstColumn;
      token.lastLine = lastLine;
      token.lastColumn = lastColumn;
      return token;
    }

    __exports__.locInfo = locInfo;
  });
define("simple-html-tokenizer", 
  ["simple-html-tokenizer/char-refs","simple-html-tokenizer/helpers","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    /*jshint boss:true*/

    var namedCodepoints = __dependency1__.namedCodepoints;
    var objectCreate = __dependency2__.objectCreate;
    var isSpace = __dependency2__.isSpace;
    var isAlpha = __dependency2__.isAlpha;
    var isUpper = __dependency2__.isUpper;

    function preprocessInput(input) {
      return input.replace(/\r\n?/g, "\n");
    }

    function Tokenizer(input) {
      this.input = preprocessInput(input);
      this.char = 0;
      this.line = 1;
      this.column = 0;

      this.state = 'data';
      this.token = null;
    }

    Tokenizer.prototype = {
      tokenize: function() {
        var tokens = [], token;

        while (true) {
          token = this.lex();
          if (token === 'EOF') { break; }
          if (token) { tokens.push(token); }
        }

        if (this.token) {
          tokens.push(this.token);
        }

        return tokens;
      },

      tokenizePart: function(string) {
        this.input += preprocessInput(string);
        var tokens = [], token;

        while (this.char < this.input.length) {
          token = this.lex();
          if (token) { tokens.push(token); }
        }

        this.tokens = (this.tokens || []).concat(tokens);
        return tokens;
      },

      tokenizeEOF: function() {
        var token = this.token;
        if (token) {
          this.token = null;
          return token;
        }
      },

      tag: function(Type, char) {
        var lastToken = this.token;
        this.token = new Type(char);
        this.state = 'tagName';
        return lastToken;
      },

      selfClosing: function() {
        this.token.selfClosing = true;
      },

      attribute: function(char) {
        this.token.startAttribute(char);
        this.state = 'attributeName';
      },

      addToAttributeName: function(char) {
        this.token.addToAttributeName(char);
      },

      addToAttributeValue: function(char) {
        this.token.addToAttributeValue(char);
      },

      commentStart: function() {
        var lastToken = this.token;
        this.token = new CommentToken();
        this.state = 'commentStart';
        return lastToken;
      },

      addToComment: function(char) {
        this.token.addChar(char);
      },

      emitData: function() {
        this.addLocInfo(this.line, this.column - 1);
        var lastToken = this.token;
        this.token = null;
        this.state = 'tagOpen';
        return lastToken;
      },

      emitToken: function() {
        this.addLocInfo();
        var lastToken = this.token.finalize();
        this.token = null;
        this.state = 'data';
        return lastToken;
      },

      addData: function(char) {
        if (this.token === null) {
          this.token = new Chars();
          this.markFirst();
        }

        this.token.addChar(char);
      },

      markFirst: function(line, column) {
        this.firstLine = (line === 0) ? 0 : (line || this.line);
        this.firstColumn = (column === 0) ? 0 : (column || this.column);
      },

      addLocInfo: function(line, column) {
        if (!this.token) return;
        this.token.firstLine = this.firstLine;
        this.token.firstColumn = this.firstColumn;
        this.token.lastLine = (line === 0) ? 0 : (line || this.line);
        this.token.lastColumn = (column === 0) ? 0 : (column || this.column);
      },

      consumeCharRef: function(allowedChar) {
        var matches;
        var input = this.input.slice(this.char);

        if (matches = input.match(/^#(?:x|X)([0-9A-Fa-f]+);/)) {
          this.char += matches[0].length;
          return String.fromCharCode(parseInt(matches[1], 16));
        } else if (matches = input.match(/^#([0-9]+);/)) {
          this.char += matches[0].length;
          return String.fromCharCode(parseInt(matches[1], 10));
        } else if (matches = input.match(/^([A-Za-z]+);/)) {
          var codepoints = namedCodepoints[matches[1]];
          if (codepoints) {
            this.char += matches[0].length;
            for (var i = 0, str = ""; i < codepoints.length; i++) {
              str += String.fromCharCode(codepoints[i]);
            }
            return str;
          }
        }

      },

      lex: function() {
        var char = this.input.charAt(this.char++);

        if (char) {
          if (char === "\n") {
            this.line++;
            this.column = 0;
          } else {
            this.column++;
          }
          // console.log(this.state, char);
          return this.states[this.state].call(this, char);
        } else {
          this.addLocInfo(this.line, this.column);
          return 'EOF';
        }
      },

      states: {
        data: function(char) {
          if (char === "<") {
            var chars = this.emitData();
            this.markFirst();
            return chars;
          } else if (char === "&") {
            this.addData(this.consumeCharRef() || "&");
          } else {
            this.addData(char);
          }
        },

        tagOpen: function(char) {
          if (char === "!") {
            this.state = 'markupDeclaration';
          } else if (char === "/") {
            this.state = 'endTagOpen';
          } else if (isAlpha(char)) {
            return this.tag(StartTag, char.toLowerCase());
          }
        },

        markupDeclaration: function(char) {
          if (char === "-" && this.input[this.char] === "-") {
            this.char++;
            this.commentStart();
          }
        },

        commentStart: function(char) {
          if (char === "-") {
            this.state = 'commentStartDash';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.addToComment(char);
            this.state = 'comment';
          }
        },

        commentStartDash: function(char) {
          if (char === "-") {
            this.state = 'commentEnd';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.addToComment("-");
            this.state = 'comment';
          }
        },

        comment: function(char) {
          if (char === "-") {
            this.state = 'commentEndDash';
          } else {
            this.addToComment(char);
          }
        },

        commentEndDash: function(char) {
          if (char === "-") {
            this.state = 'commentEnd';
          } else {
            this.addToComment("-" + char);
            this.state = 'comment';
          }
        },

        commentEnd: function(char) {
          if (char === ">") {
            return this.emitToken();
          } else {
            this.addToComment("--" + char);
            this.state = 'comment';
          }
        },

        tagName: function(char) {
          if (isSpace(char)) {
            this.state = 'beforeAttributeName';
          } else if (char === "/") {
            this.state = 'selfClosingStartTag';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.token.addToTagName(char);
          }
        },

        beforeAttributeName: function(char) {
          if (isSpace(char)) {
            return;
          } else if (char === "/") {
            this.state = 'selfClosingStartTag';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.attribute(char);
          }
        },

        attributeName: function(char) {
          if (isSpace(char)) {
            this.state = 'afterAttributeName';
          } else if (char === "/") {
            this.state = 'selfClosingStartTag';
          } else if (char === "=") {
            this.state = 'beforeAttributeValue';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.addToAttributeName(char);
          }
        },

        afterAttributeName: function(char) {
          if (isSpace(char)) {
            return;
          } else if (char === "/") {
            this.state = 'selfClosingStartTag';
          } else if (char === "=") {
            this.state = 'beforeAttributeValue';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.attribute(char);
          }
        },

        beforeAttributeValue: function(char) {
          if (isSpace(char)) {
            return;
          } else if (char === '"') {
            this.state = 'attributeValueDoubleQuoted';
          } else if (char === "'") {
            this.state = 'attributeValueSingleQuoted';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.state = 'attributeValueUnquoted';
            this.addToAttributeValue(char);
          }
        },

        attributeValueDoubleQuoted: function(char) {
          if (char === '"') {
            this.state = 'afterAttributeValueQuoted';
          } else if (char === "&") {
            this.addToAttributeValue(this.consumeCharRef('"') || "&");
          } else {
            this.addToAttributeValue(char);
          }
        },

        attributeValueSingleQuoted: function(char) {
          if (char === "'") {
            this.state = 'afterAttributeValueQuoted';
          } else if (char === "&") {
            this.addToAttributeValue(this.consumeCharRef("'") || "&");
          } else {
            this.addToAttributeValue(char);
          }
        },

        attributeValueUnquoted: function(char) {
          if (isSpace(char)) {
            this.state = 'beforeAttributeName';
          } else if (char === "&") {
            this.addToAttributeValue(this.consumeCharRef(">") || "&");
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.addToAttributeValue(char);
          }
        },

        afterAttributeValueQuoted: function(char) {
          if (isSpace(char)) {
            this.state = 'beforeAttributeName';
          } else if (char === "/") {
            this.state = 'selfClosingStartTag';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.char--;
            this.state = 'beforeAttributeName';
          }
        },

        selfClosingStartTag: function(char) {
          if (char === ">") {
            this.selfClosing();
            return this.emitToken();
          } else {
            this.char--;
            this.state = 'beforeAttributeName';
          }
        },

        endTagOpen: function(char) {
          if (isAlpha(char)) {
            this.tag(EndTag, char.toLowerCase());
          }
        }
      }
    };

    function Tag(tagName, attributes, options) {
      this.tagName = tagName || "";
      this.attributes = attributes || [];
      this.selfClosing = options ? options.selfClosing : false;
    }

    Tag.prototype = {
      constructor: Tag,

      addToTagName: function(char) {
        this.tagName += char;
      },

      startAttribute: function(char) {
        this.currentAttribute = [char.toLowerCase(), null];
        this.attributes.push(this.currentAttribute);
      },

      addToAttributeName: function(char) {
        this.currentAttribute[0] += char;
      },

      addToAttributeValue: function(char) {
        this.currentAttribute[1] = this.currentAttribute[1] || "";
        this.currentAttribute[1] += char;
      },

      finalize: function() {
        delete this.currentAttribute;
        return this;
      }
    };

    function StartTag() {
      Tag.apply(this, arguments);
    }

    StartTag.prototype = objectCreate(Tag.prototype);
    StartTag.prototype.type = 'StartTag';
    StartTag.prototype.constructor = StartTag;

    StartTag.prototype.toHTML = function() {
      return config.generateTag(this);
    };

    function generateTag(tag) {
      var out = "<";
      out += tag.tagName;

      if (tag.attributes.length) {
        out += " " + config.generateAttributes(tag.attributes);
      }

      out += ">";

      return out;
    }

    function generateAttributes(attributes) {
      var out = [], attribute, attrString, value;

      for (var i=0, l=attributes.length; i<l; i++) {
        attribute = attributes[i];

        out.push(config.generateAttribute.apply(this, attribute));
      }

      return out.join(" ");
    }

    function generateAttribute(name, value) {
      var attrString = name;

      if (value) {
        value = value.replace(/"/, '\\"');
        attrString += "=\"" + value + "\"";
      }

      return attrString;
    }

    function EndTag() {
      Tag.apply(this, arguments);
    }

    EndTag.prototype = objectCreate(Tag.prototype);
    EndTag.prototype.type = 'EndTag';
    EndTag.prototype.constructor = EndTag;

    EndTag.prototype.toHTML = function() {
      var out = "</";
      out += this.tagName;
      out += ">";

      return out;
    };

    function Chars(chars) {
      this.chars = chars || "";
    }

    Chars.prototype = {
      type: 'Chars',
      constructor: Chars,

      addChar: function(char) {
        this.chars += char;
      },

      toHTML: function() {
        return this.chars;
      }
    };

    function CommentToken(chars) {
      this.chars = chars || "";
    }

    CommentToken.prototype = {
      type: 'CommentToken',
      constructor: CommentToken,

      finalize: function() { return this; },

      addChar: function(char) {
        this.chars += char;
      },

      toHTML: function() {
        return "<!--" + this.chars + "-->";
      }
    };

    function tokenize(input) {
      var tokenizer = new Tokenizer(input);
      return tokenizer.tokenize();
    }

    function generate(tokens) {
      var output = "";

      for (var i=0, l=tokens.length; i<l; i++) {
        output += tokens[i].toHTML();
      }

      return output;
    }

    var config = {
      generateAttributes: generateAttributes,
      generateAttribute: generateAttribute,
      generateTag: generateTag
    };

    var original = {
      generateAttributes: generateAttributes,
      generateAttribute: generateAttribute,
      generateTag: generateTag
    };

    function configure(name, value) {
      config[name] = value;
    }

    __exports__.Tokenizer = Tokenizer;
    __exports__.tokenize = tokenize;
    __exports__.generate = generate;
    __exports__.configure = configure;
    __exports__.original = original;
    __exports__.StartTag = StartTag;
    __exports__.EndTag = EndTag;
    __exports__.Chars = Chars;
    __exports__.CommentToken = CommentToken;
  });
define("htmlbars-compiler/ast", 
  ["handlebars/compiler/ast","exports"],
  function(__dependency1__, __exports__) {
    
    var AST = __dependency1__["default"];

    var MustacheNode = AST.MustacheNode;
    __exports__.MustacheNode = MustacheNode;var SexprNode = AST.SexprNode;
    __exports__.SexprNode = SexprNode;var HashNode = AST.HashNode;
    __exports__.HashNode = HashNode;var IdNode = AST.IdNode;
    __exports__.IdNode = IdNode;var StringNode = AST.StringNode;
    __exports__.StringNode = StringNode;
    function ProgramNode(statements, strip) {
      this.type = 'program';
      this.statements = statements;
      this.strip = strip;
    }

    __exports__.ProgramNode = ProgramNode;function BlockNode(mustache, program, inverse, strip) {
      this.type = 'block';
      this.mustache = mustache;
      this.program = program;
      this.inverse = inverse;
      this.strip = strip;
    }

    __exports__.BlockNode = BlockNode;function ComponentNode(tag, attributes, program) {
      this.type = 'component';
      this.tag = tag;
      this.attributes = attributes;
      this.program = program;
    }

    __exports__.ComponentNode = ComponentNode;function ElementNode(tag, attributes, helpers, children) {
      this.type = 'element';
      this.tag = tag;
      this.attributes = attributes;
      this.helpers = helpers;
      this.children = children;
    }

    __exports__.ElementNode = ElementNode;function PartialNode(name) {
      this.id = {};
      this.id.string = this.name = 'partial';
      this.type = 'mustache';
      this.params = [name];
      this.program = null;
      this.inverse = null;
      this.hash = undefined;
      this.escaped = true;
      this.isHelper = true;
    }

    __exports__.PartialNode = PartialNode;function AttrNode(name, value) {
      this.type = 'attr';
      this.name = name;
      this.value = value;
    }

    __exports__.AttrNode = AttrNode;function TextNode(chars) {
      this.type = 'text';
      this.chars = chars;
    }

    __exports__.TextNode = TextNode;function childrenFor(node) {
      if (node.type === 'program') return node.statements;
      if (node.type === 'element') return node.children;
    }

    __exports__.childrenFor = childrenFor;function usesMorph(node) {
      return node.type === 'mustache' || node.type === 'block' || node.type === 'component';
    }

    __exports__.usesMorph = usesMorph;function appendChild(parent, node) {
      var children = childrenFor(parent);

      var len = children.length, last;
      if (len > 0) {
        last = children[len-1];
        if (usesMorph(last) && usesMorph(node)) {
          children.push(new TextNode(''));
        }
      }
      children.push(node);
    }

    __exports__.appendChild = appendChild;
  });
define("htmlbars-compiler/html-parser/helpers", 
  ["../ast","exports"],
  function(__dependency1__, __exports__) {
    
    var TextNode = __dependency1__.TextNode;
    var StringNode = __dependency1__.StringNode;
    var HashNode = __dependency1__.HashNode;
    var usesMorph = __dependency1__.usesMorph;

    // Rewrites an array of AttrNodes into a HashNode.
    // MustacheNodes are replaced with their root SexprNode and
    // TextNodes are replaced with StringNodes

    function buildHashFromAttributes(attributes) {
      var pairs = [];

      for (var i = 0; i < attributes.length; i++) {
        var attr = attributes[i];
        if (attr.value.type === 'mustache') {
          pairs.push([attr.name, attr.value.sexpr]);
        } else if (attr.value.type === 'text') {
          pairs.push([attr.name, new StringNode(attr.value.chars)]);
        }
      }

      return new HashNode(pairs);
    }

    __exports__.buildHashFromAttributes = buildHashFromAttributes;// Adds an empty text node at the beginning and end of a program.
    // The empty text nodes *between* nodes are handled elsewhere.
    // Also processes all whitespace stripping directives.

    function postprocessProgram(program) {
      var statements = program.statements;

      if (statements.length === 0) return;

      if (usesMorph(statements[0])) {
        statements.unshift(new TextNode(''));
      }

      if (usesMorph(statements[statements.length-1])) {
        statements.push(new TextNode(''));
      }

      // Perform any required whitespace stripping
      var l = statements.length;
      for (var i = 0; i < l; i++) {
        var statement = statements[i];

        if (statement.type !== 'text') continue;

        if ((i > 0 && statements[i-1].strip && statements[i-1].strip.right) ||
          (i === 0 && program.strip.left)) {
          statement.chars = statement.chars.replace(/^\s+/, '');
        }

        if ((i < l-1 && statements[i+1].strip && statements[i+1].strip.left) ||
          (i === l-1 && program.strip.right)) {
          statement.chars = statement.chars.replace(/\s+$/, '');
        }

        // Remove unnecessary text nodes
        if (statement.chars.length === 0) {
          if ((i > 0 && statements[i-1].type === 'element') ||
            (i < l-1 && statements[i+1].type === 'element')) {
            statements.splice(i, 1);
            i--;
            l--;
          }
        }
      }
    }

    __exports__.postprocessProgram = postprocessProgram;
  });
define("htmlbars-compiler/html-parser/tokens", 
  ["simple-html-tokenizer","../ast","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    var Chars = __dependency1__.Chars;
    var StartTag = __dependency1__.StartTag;
    var EndTag = __dependency1__.EndTag;
    var AttrNode = __dependency2__.AttrNode;
    var TextNode = __dependency2__.TextNode;
    var MustacheNode = __dependency2__.MustacheNode;
    var StringNode = __dependency2__.StringNode;
    var IdNode = __dependency2__.IdNode;

    StartTag.prototype.startAttribute = function(char) {
      this.finalizeAttributeValue();
      this.currentAttribute = new AttrNode(char.toLowerCase(), []);
      this.attributes.push(this.currentAttribute);
    };

    StartTag.prototype.addToAttributeName = function(char) {
      this.currentAttribute.name += char;
    };

    StartTag.prototype.addToAttributeValue = function(char) {
      var value = this.currentAttribute.value;

      if (char.type === 'mustache') {
        value.push(char);
      } else {
        if (value.length > 0 && value[value.length - 1].type === 'text') {
          value[value.length - 1].chars += char;
        } else {
          value.push(new TextNode(char));
        }
      }
    };

    StartTag.prototype.finalize = function() {
      this.finalizeAttributeValue();
      delete this.currentAttribute;
      return this;
    };

    StartTag.prototype.finalizeAttributeValue = function() {
      var attr = this.currentAttribute;

      if (!attr) return;

      if (attr.value.length === 1) {
        // Unwrap a single TextNode or MustacheNode
        attr.value = attr.value[0];
      } else {
        // If the attr value has multiple parts combine them into
        // a single MustacheNode with the concat helper
        var params = [ new IdNode([{ part: 'concat' }]) ];

        for (var i = 0; i < attr.value.length; i++) {
          var part = attr.value[i];
          if (part.type === 'text') {
            params.push(new StringNode(part.chars));
          } else if (part.type === 'mustache') {
            var sexpr = part.sexpr;
            delete sexpr.isRoot;

            if (sexpr.isHelper) {
              sexpr.isHelper = true;
            }

            params.push(sexpr);
          }
        }

        attr.value = new MustacheNode(params, undefined, true, { left: false, right: false });
      }
    };

    StartTag.prototype.addTagHelper = function(helper) {
      var helpers = this.helpers = this.helpers || [];
      helpers.push(helper);
    };

    __exports__.Chars = Chars;
    __exports__.StartTag = StartTag;
    __exports__.EndTag = EndTag;
  });
define("htmlbars-compiler/html-parser/node-handlers", 
  ["../ast","../html-parser/helpers","../html-parser/tokens","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    
    var BlockNode = __dependency1__.BlockNode;
    var ProgramNode = __dependency1__.ProgramNode;
    var TextNode = __dependency1__.TextNode;
    var PartialNode = __dependency1__.PartialNode;
    var appendChild = __dependency1__.appendChild;
    var usesMorph = __dependency1__.usesMorph;
    var postprocessProgram = __dependency2__.postprocessProgram;
    var Chars = __dependency3__.Chars;

    var nodeHandlers = {

      program: function(program) {
        var statements = [];
        var node = new ProgramNode(statements, program.strip);
        var i, l = program.statements.length;

        this.elementStack.push(node);

        if (l === 0) { return this.elementStack.pop(); }

        for (i = 0; i < l; i++) {
          this.acceptNode(program.statements[i]);
        }

        this.acceptToken(this.tokenizer.tokenizeEOF());

        postprocessProgram(node);

        // Ensure that that the element stack is balanced properly.
        var poppedNode = this.elementStack.pop();
        if (poppedNode !== node) {
          throw new Error("Unclosed element: " + poppedNode.tag);
        }

        return node;
      },

      block: function(block) {
        switchToHandlebars(this);
        this.acceptToken(block);

        var mustache = block.mustache;
        var program = this.acceptNode(block.program);
        var inverse = block.inverse ? this.acceptNode(block.inverse) : null;
        var strip = block.strip;

        // Normalize inverse's strip
        if (inverse && !inverse.strip.left) {
          inverse.strip.left = false;
        }

        var node = new BlockNode(mustache, program, inverse, strip);
        var parentProgram = this.currentElement();
        appendChild(parentProgram, node);
      },

      content: function(content) {
        var tokens = this.tokenizer.tokenizePart(content.string);

        return tokens.forEach(function(token) {
          this.acceptToken(token);
        }, this);
      },

      mustache: function(mustache) {
        switchToHandlebars(this);
        this.acceptToken(mustache);
      },

      comment: function(comment) {
        return;
      },

      partial: function(partial) {
        var node = new PartialNode(partial.partialName.name);
        appendChild(this.currentElement(), node);
        return;
      }
    };

    function switchToHandlebars(processor) {
      var token = processor.tokenizer.token;

      // TODO: Monkey patch Chars.addChar like attributes
      if (token instanceof Chars) {
        processor.acceptToken(token);
        processor.tokenizer.token = null;
      }
    }

    __exports__["default"] = nodeHandlers;
  });
define("htmlbars-compiler/html-parser/token-handlers", 
  ["htmlbars-compiler/ast","htmlbars-compiler/html-parser/helpers","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    var ProgramNode = __dependency1__.ProgramNode;
    var ComponentNode = __dependency1__.ComponentNode;
    var ElementNode = __dependency1__.ElementNode;
    var TextNode = __dependency1__.TextNode;
    var appendChild = __dependency1__.appendChild;
    var postprocessProgram = __dependency2__.postprocessProgram;

    // This table maps from the state names in the tokenizer to a smaller
    // number of states that control how mustaches are handled
    var states = {
      "beforeAttributeValue": "before-attr",
      "attributeValueDoubleQuoted": "attr",
      "attributeValueSingleQuoted": "attr",
      "attributeValueUnquoted": "attr",
      "beforeAttributeName": "in-tag"
    };

    // The HTML elements in this list are speced by
    // http://www.w3.org/TR/html-markup/syntax.html#syntax-elements,
    // and will be forced to close regardless of if they have a
    // self-closing /> at the end.
    var voidTagNames = "area base br col command embed hr img input keygen link meta param source track wbr";
    var voidMap = {};

    voidTagNames.split(" ").forEach(function(tagName) {
      voidMap[tagName] = true;
    });

    var svgNamespace = "http://www.w3.org/2000/svg",
        // http://www.w3.org/html/wg/drafts/html/master/syntax.html#html-integration-point
        svgHTMLIntegrationPoints = ['foreignObject', 'desc', 'title'];

    function applyNamespace(tag, element, currentElement){
      if (tag.tagName === 'svg') {
        element.namespaceURI = svgNamespace;
      } else if (
        currentElement.type === 'element' &&
        currentElement.namespaceURI &&
        !currentElement.isHTMLIntegrationPoint
      ) {
        element.namespaceURI = currentElement.namespaceURI;
      }
    }

    function applyHTMLIntegrationPoint(tag, element){
      if (svgHTMLIntegrationPoints.indexOf(tag.tagName) !== -1) {
        element.isHTMLIntegrationPoint = true;
      }
    }


    // Except for `mustache`, all tokens are only allowed outside of
    // a start or end tag.
    var tokenHandlers = {

      Chars: function(token) {
        var current = this.currentElement();
        var text = new TextNode(token.chars);
        appendChild(current, text);
      },

      StartTag: function(tag) {
        var element = new ElementNode(tag.tagName, tag.attributes, tag.helpers || [], []);
        applyNamespace(tag, element, this.currentElement());
        applyHTMLIntegrationPoint(tag, element);
        this.elementStack.push(element);
        if (voidMap.hasOwnProperty(tag.tagName) || tag.selfClosing) {
          tokenHandlers.EndTag.call(this, tag);
        }
      },

      block: function(block) {
        if (this.tokenizer.state !== 'data') {
          throw new Error("A block may only be used inside an HTML element or another block.");
        }
      },

      mustache: function(mustache) {
        var state = this.tokenizer.state;
        var token = this.tokenizer.token;

        switch(states[state]) {
          case "before-attr":
            this.tokenizer.state = 'attributeValueUnquoted';
            token.addToAttributeValue(mustache);
            return;
          case "attr":
            token.addToAttributeValue(mustache);
            return;
          case "in-tag":
            token.addTagHelper(mustache);
            return;
          default:
            appendChild(this.currentElement(), mustache);
        }
      },

      EndTag: function(tag) {
        var element = this.elementStack.pop();
        var parent = this.currentElement();

        if (element.tag !== tag.tagName) {
          throw new Error("Closing tag " + tag.tagName + " did not match last open tag " + element.tag);
        }

        if (element.tag.indexOf("-") === -1) {
          appendChild(parent, element);
        } else {
          var program = new ProgramNode(element.children, { left: false, right: false });
          postprocessProgram(program);
          var component = new ComponentNode(element.tag, element.attributes, program);
          appendChild(parent, component);
        }

      }

    };

    __exports__["default"] = tokenHandlers;
  });
define("htmlbars-compiler/parser", 
  ["handlebars","simple-html-tokenizer","./html-parser/node-handlers","./html-parser/token-handlers","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    
    var Handlebars = __dependency1__["default"];
    var Tokenizer = __dependency2__.Tokenizer;
    var nodeHandlers = __dependency3__["default"];
    var tokenHandlers = __dependency4__["default"];

    function preprocess(html, options) {
      var ast = Handlebars.parse(html);
      var combined = new HTMLProcessor().acceptNode(ast);
      return combined;
    }

    __exports__.preprocess = preprocess;function HTMLProcessor() {
      this.elementStack = [];
      this.tokenizer = new Tokenizer('');
      this.nodeHandlers = nodeHandlers;
      this.tokenHandlers = tokenHandlers;
    }

    HTMLProcessor.prototype.acceptNode = function(node) {
      return this.nodeHandlers[node.type].call(this, node);
    };

    HTMLProcessor.prototype.acceptToken = function(token) {
      if (token) {
        return this.tokenHandlers[token.type].call(this, token);
      }
    };

    HTMLProcessor.prototype.currentElement = function() {
      return this.elementStack[this.elementStack.length - 1];
    };
  });
define("htmlbars-compiler/compiler/template_visitor", 
  ["exports"],
  function(__exports__) {
    
    var push = Array.prototype.push;

    function Frame() {
      this.parentNode = null;
      this.childIndex = null;
      this.childCount = null;
      this.childTemplateCount = 0;
      this.mustacheCount = 0;
      this.actions = [];
    }

    /**
     * Takes in an AST and outputs a list of actions to be consumed
     * by a compiler. For example, the template
     *
     *     foo{{bar}}<div>baz</div>
     *
     * produces the actions
     *
     *     [['startProgram', [programNode, 0]],
     *      ['text', [textNode, 0, 3]],
     *      ['mustache', [mustacheNode, 1, 3]],
     *      ['openElement', [elementNode, 2, 3, 0]],
     *      ['text', [textNode, 0, 1]],
     *      ['closeElement', [elementNode, 2, 3],
     *      ['endProgram', [programNode]]]
     *
     * This visitor walks the AST depth first and backwards. As
     * a result the bottom-most child template will appear at the
     * top of the actions list whereas the root template will appear
     * at the bottom of the list. For example,
     *
     *     <div>{{#if}}foo{{else}}bar<b></b>{{/if}}</div>
     *
     * produces the actions
     *
     *     [['startProgram', [programNode, 0]],
     *      ['text', [textNode, 0, 2, 0]],
     *      ['openElement', [elementNode, 1, 2, 0]],
     *      ['closeElement', [elementNode, 1, 2]],
     *      ['endProgram', [programNode]],
     *      ['startProgram', [programNode, 0]],
     *      ['text', [textNode, 0, 1]],
     *      ['endProgram', [programNode]],
     *      ['startProgram', [programNode, 2]],
     *      ['openElement', [elementNode, 0, 1, 1]],
     *      ['block', [blockNode, 0, 1]],
     *      ['closeElement', [elementNode, 0, 1]],
     *      ['endProgram', [programNode]]]
     *
     * The state of the traversal is maintained by a stack of frames.
     * Whenever a node with children is entered (either a ProgramNode
     * or an ElementNode) a frame is pushed onto the stack. The frame
     * contains information about the state of the traversal of that
     * node. For example,
     *
     *   - index of the current child node being visited
     *   - the number of mustaches contained within its child nodes
     *   - the list of actions generated by its child nodes
     */

    function TemplateVisitor() {
      this.frameStack = [];
      this.actions = [];
      this.programDepth = -1;
    }

    // Traversal methods

    TemplateVisitor.prototype.visit = function(node) {
      this[node.type](node);
    };

    TemplateVisitor.prototype.program = function(program) {
      this.programDepth++;

      var parentFrame = this.getCurrentFrame();
      var programFrame = this.pushFrame();

      programFrame.parentNode = program;
      programFrame.childCount = program.statements.length;
      programFrame.blankChildTextNodes = [];
      programFrame.actions.push(['endProgram', [program, this.programDepth]]);

      for (var i = program.statements.length - 1; i >= 0; i--) {
        programFrame.childIndex = i;
        this.visit(program.statements[i]);
      }

      programFrame.actions.push(['startProgram', [
        program, programFrame.childTemplateCount, programFrame.blankChildTextNodes.reverse() ]]);
      this.popFrame();

      this.programDepth--;

      // Push the completed template into the global actions list
      if (parentFrame) { parentFrame.childTemplateCount++; }
      push.apply(this.actions, programFrame.actions.reverse());
    };

    TemplateVisitor.prototype.element = function(element) {
      var parentFrame = this.getCurrentFrame();
      var elementFrame = this.pushFrame();
      var parentNode = parentFrame.parentNode;

      elementFrame.parentNode = element;
      elementFrame.childCount = element.children.length;
      elementFrame.mustacheCount += element.helpers.length;
      elementFrame.blankChildTextNodes = [];

      var actionArgs = [
        element,
        parentFrame.childIndex,
        parentFrame.childCount,
        parentNode.type === 'program' && parentFrame.childCount === 1
      ];

      elementFrame.actions.push(['closeElement', actionArgs]);

      for (var i = element.attributes.length - 1; i >= 0; i--) {
        this.visit(element.attributes[i]);
      }

      for (i = element.children.length - 1; i >= 0; i--) {
        elementFrame.childIndex = i;
        this.visit(element.children[i]);
      }

      elementFrame.actions.push(['openElement', actionArgs.concat([
        elementFrame.mustacheCount, elementFrame.blankChildTextNodes.reverse() ])]);
      this.popFrame();

      // Propagate the element's frame state to the parent frame
      if (elementFrame.mustacheCount > 0) { parentFrame.mustacheCount++; }
      parentFrame.childTemplateCount += elementFrame.childTemplateCount;
      push.apply(parentFrame.actions, elementFrame.actions);
    };

    TemplateVisitor.prototype.attr = function(attr) {
      if (attr.value.type === 'mustache') {
        this.getCurrentFrame().mustacheCount++;
      }
    };

    TemplateVisitor.prototype.block = function(node) {
      var frame = this.getCurrentFrame();
      var parentNode = frame.parentNode;

      frame.mustacheCount++;
      frame.actions.push([node.type, [node, frame.childIndex, frame.childCount]]);

      if (node.inverse) { this.visit(node.inverse); }
      if (node.program) { this.visit(node.program); }
    };

    TemplateVisitor.prototype.partial = function(node) {
      var frame = this.getCurrentFrame();
      frame.mustacheCount++;
      frame.actions.push(['mustache', [node, frame.childIndex, frame.childCount]]);
    };

    TemplateVisitor.prototype.component = TemplateVisitor.prototype.block;

    TemplateVisitor.prototype.text = function(text) {
      var frame = this.getCurrentFrame();
      var isSingleRoot = frame.parentNode.type === 'program' && frame.childCount === 1;
      if (text.chars === '') {
        frame.blankChildTextNodes.push(frame.childIndex);
      }
      frame.actions.push(['text', [text, frame.childIndex, frame.childCount, isSingleRoot]]);
    };

    TemplateVisitor.prototype.mustache = function(mustache) {
      var frame = this.getCurrentFrame();
      frame.mustacheCount++;
      frame.actions.push(['mustache', [mustache, frame.childIndex, frame.childCount]]);
    };

    // Frame helpers

    TemplateVisitor.prototype.getCurrentFrame = function() {
      return this.frameStack[this.frameStack.length - 1];
    };

    TemplateVisitor.prototype.pushFrame = function() {
      var frame = new Frame();
      this.frameStack.push(frame);
      return frame;
    };

    TemplateVisitor.prototype.popFrame = function() {
      return this.frameStack.pop();
    };

    __exports__["default"] = TemplateVisitor;
  });
define("htmlbars-compiler/compiler/utils", 
  ["exports"],
  function(__exports__) {
    
    function processOpcodes(compiler, opcodes) {
      for (var i=0, l=opcodes.length; i<l; i++) {
        var method = opcodes[i][0];
        var params = opcodes[i][1];
        compiler[method].apply(compiler, params);
      }
    }

    __exports__.processOpcodes = processOpcodes;
  });
define("htmlbars-compiler/compiler/fragment_opcode", 
  ["./template_visitor","./utils","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    var TemplateVisitor = __dependency1__["default"];
    var processOpcodes = __dependency2__.processOpcodes;

    function FragmentOpcodeCompiler() {
      this.opcodes = [];
    }

    FragmentOpcodeCompiler.prototype.compile = function(ast) {
      var templateVisitor = new TemplateVisitor();
      templateVisitor.visit(ast);

      processOpcodes(this, templateVisitor.actions);

      return this.opcodes;
    };

    FragmentOpcodeCompiler.prototype.opcode = function(type, params) {
      this.opcodes.push([type, params]);
    };

    FragmentOpcodeCompiler.prototype.text = function(text, childIndex, childCount, isSingleRoot) {
      this.opcode('createText', [text.chars]);
      if (!isSingleRoot) { this.opcode('appendChild'); }
    };

    FragmentOpcodeCompiler.prototype.openElement = function(element) {
      this.opcode('createElement', [element.tag]);
      element.attributes.forEach(this.attribute, this);
    };

    FragmentOpcodeCompiler.prototype.closeElement = function(element, childIndex, childCount, isSingleRoot) {
      if (!isSingleRoot) { this.opcode('appendChild'); }
    };

    FragmentOpcodeCompiler.prototype.startProgram = function(program) {
      this.opcodes.length = 0;
      if (program.statements.length !== 1) {
        this.opcode('createFragment');
      }
    };

    FragmentOpcodeCompiler.prototype.endProgram = function(program) {
      this.opcode('returnNode');
    };

    FragmentOpcodeCompiler.prototype.mustache = function () {};

    FragmentOpcodeCompiler.prototype.component = function () {};

    FragmentOpcodeCompiler.prototype.block = function () {};

    FragmentOpcodeCompiler.prototype.attribute = function(attr) {
      if (attr.value.type === 'text') {
        this.opcode('setAttribute', [attr.name, attr.value.chars]);
      }
    };

    __exports__.FragmentOpcodeCompiler = FragmentOpcodeCompiler;
  });
define("htmlbars-compiler/compiler/quoting", 
  ["exports"],
  function(__exports__) {
    
    function escapeString(str) {
      return str.replace(/"/g, '\\"').replace(/\n/g, "\\n");
    }

    __exports__.escapeString = escapeString;

    function string(str) {
      return '"' + escapeString(str) + '"';
    }

    __exports__.string = string;

    function array(a) {
      return "[" + a + "]";
    }

    __exports__.array = array;

    function quotedArray(list) {
      return array(list.map(string).join(", "));
    }

    __exports__.quotedArray = quotedArray;function hash(pairs) {
      return "{" + pairs.join(",") + "}";
    }

    __exports__.hash = hash;function repeat(chars, times) {
      var str = "";
      while (times--) {
        str += chars;
      }
      return str;
    }

    __exports__.repeat = repeat;
  });
define("htmlbars-compiler/compiler/fragment", 
  ["./utils","./quoting","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    var processOpcodes = __dependency1__.processOpcodes;
    var string = __dependency2__.string;

    function FragmentCompiler() {
      this.source = [];
      this.depth = -1;
    }

    __exports__.FragmentCompiler = FragmentCompiler;FragmentCompiler.prototype.compile = function(opcodes, options) {
      this.source.length = 0;
      this.depth = -1;
      this.indent = (options && options.indent) || "";

      this.source.push(this.indent+'function build(dom) {\n');
      processOpcodes(this, opcodes);
      this.source.push(this.indent+'}\n');

      return this.source.join('');
    };

    FragmentCompiler.prototype.createFragment = function() {
      var el = 'el'+(++this.depth);
      this.source.push(this.indent+'  var '+el+' = dom.createDocumentFragment();\n');
    };

    FragmentCompiler.prototype.createElement = function(tagName) {
      var el = 'el'+(++this.depth);
      this.source.push(this.indent+'  var '+el+' = dom.createElement('+string(tagName)+');\n');
    };

    FragmentCompiler.prototype.createText = function(str) {
      var el = 'el'+(++this.depth);
      this.source.push(this.indent+'  var '+el+' = dom.createTextNode('+string(str)+');\n');
    };

    FragmentCompiler.prototype.returnNode = function() {
      var el = 'el'+this.depth;
      this.source.push(this.indent+'  return '+el+';\n');
    };

    FragmentCompiler.prototype.setAttribute = function(name, value) {
      var el = 'el'+this.depth;
      this.source.push(this.indent+'  dom.setAttribute('+el+','+string(name)+','+string(value)+');\n');
    };

    FragmentCompiler.prototype.appendChild = function() {
      var child = 'el'+(this.depth--);
      var el = 'el'+this.depth;
      this.source.push(this.indent+'  dom.appendChild('+el+', '+child+');\n');
    };
  });
define("htmlbars-compiler/compiler/hydration_opcode", 
  ["./template_visitor","./utils","../html-parser/helpers","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    
    var TemplateVisitor = __dependency1__["default"];
    var processOpcodes = __dependency2__.processOpcodes;
    var buildHashFromAttributes = __dependency3__.buildHashFromAttributes;

    function detectIsElementChecked(element){
      for (var i=0, len=element.attributes.length;i<len;i++) {
        if (element.attributes[i].name === 'checked') {
          return true;
        }
      }
      return false;
    }

    function HydrationOpcodeCompiler() {
      this.opcodes = [];
      this.paths = [];
      this.templateId = 0;
      this.currentDOMChildIndex = 0;
      this.morphs = [];
      this.morphNum = 0;
      this.element = null;
      this.elementNum = -1;
    }

    HydrationOpcodeCompiler.prototype.compile = function(ast) {
      var templateVisitor = new TemplateVisitor();
      templateVisitor.visit(ast);

      processOpcodes(this, templateVisitor.actions);

      return this.opcodes;
    };

    HydrationOpcodeCompiler.prototype.startProgram = function(p, c, blankChildTextNodes) {
      this.opcodes.length = 0;
      this.paths.length = 0;
      this.morphs.length = 0;
      this.templateId = 0;
      this.currentDOMChildIndex = -1;
      this.morphNum = 0;

      if (blankChildTextNodes.length > 0){
        this.opcode( 'repairClonedNode',
                     blankChildTextNodes );
      }
    };

    HydrationOpcodeCompiler.prototype.endProgram = function(program) {
      distributeMorphs(this.morphs, this.opcodes);
    };

    HydrationOpcodeCompiler.prototype.text = function(string, pos, len) {
      ++this.currentDOMChildIndex;
    };

    HydrationOpcodeCompiler.prototype.openElement = function(element, pos, len, isSingleRoot, mustacheCount, blankChildTextNodes) {
      distributeMorphs(this.morphs, this.opcodes);
      ++this.currentDOMChildIndex;

      this.element = this.currentDOMChildIndex;

      if (!isSingleRoot) {
        this.opcode('consumeParent', this.currentDOMChildIndex);

        // If our parent referance will be used more than once, cache its referance.
        if (mustacheCount > 1) {
          this.opcode('element', ++this.elementNum);
          this.element = null; // Set element to null so we don't cache it twice
        }
      }
      var isElementChecked = detectIsElementChecked(element);
      if (blankChildTextNodes.length > 0 || isElementChecked) {
        this.opcode( 'repairClonedNode',
                     blankChildTextNodes,
                     isElementChecked );
      }

      this.paths.push(this.currentDOMChildIndex);
      this.currentDOMChildIndex = -1;

      element.attributes.forEach(this.attribute, this);
      element.helpers.forEach(this.nodeHelper, this);
    };

    HydrationOpcodeCompiler.prototype.closeElement = function(element, pos, len, isSingleRoot) {
      distributeMorphs(this.morphs, this.opcodes);
      if (!isSingleRoot) { this.opcode('popParent'); }
      this.currentDOMChildIndex = this.paths.pop();
    };

    HydrationOpcodeCompiler.prototype.block = function(block, childIndex, childrenLength) {
      var currentDOMChildIndex = this.currentDOMChildIndex,
          mustache = block.mustache;

      var start = (currentDOMChildIndex < 0 ? null : currentDOMChildIndex),
          end = (childIndex === childrenLength - 1 ? null : currentDOMChildIndex + 1);

      var morphNum = this.morphNum++;
      this.morphs.push([morphNum, this.paths.slice(), start, end]);

      this.opcode('program', this.templateId++, block.inverse === null ? null : this.templateId++);
      processParams(this, mustache.params);
      processHash(this, mustache.hash);
      this.opcode('helper', mustache.id.string, mustache.params.length, mustache.escaped, morphNum);
    };

    HydrationOpcodeCompiler.prototype.component = function(component, childIndex, childrenLength) {
      var currentDOMChildIndex = this.currentDOMChildIndex;

      var start = (currentDOMChildIndex < 0 ? null : currentDOMChildIndex),
          end = (childIndex === childrenLength - 1 ? null : currentDOMChildIndex + 1);

      var morphNum = this.morphNum++;
      this.morphs.push([morphNum, this.paths.slice(), start, end]);

      this.opcode('program', this.templateId++, null);
      processHash(this, buildHashFromAttributes(component.attributes));
      this.opcode('component', component.tag, morphNum);
    };

    HydrationOpcodeCompiler.prototype.opcode = function(type) {
      var params = [].slice.call(arguments, 1);
      this.opcodes.push([type, params]);
    };

    HydrationOpcodeCompiler.prototype.attribute = function(attr) {
      if (attr.value.type === 'text') return;

      // We treat attribute like a attribute helper evaluated by the element hook.
      // <p {{attribute 'class' 'foo ' (bar)}}></p>
      // Unwrapped any mustaches to just be their internal sexprs.
      this.nodeHelper({
        params: [attr.name, attr.value.sexpr],
        hash: null,
        id: {
          string: 'attribute'
        }
      });
    };

    HydrationOpcodeCompiler.prototype.nodeHelper = function(mustache) {
      this.opcode('program', null, null);
      processParams(this, mustache.params);
      processHash(this, mustache.hash);
      // If we have a helper in a node, and this element has not been cached, cache it
      if(this.element !== null){
        this.opcode('element', ++this.elementNum);
        this.element = null; // Reset element so we don't cache it more than once
      }
      this.opcode('nodeHelper', mustache.id.string, mustache.params.length, this.elementNum);
    };

    HydrationOpcodeCompiler.prototype.mustache = function(mustache, childIndex, childrenLength) {
      var currentDOMChildIndex = this.currentDOMChildIndex;

      var start = currentDOMChildIndex,
          end = (childIndex === childrenLength - 1 ? -1 : currentDOMChildIndex + 1);

      var morphNum = this.morphNum++;
      this.morphs.push([morphNum, this.paths.slice(), start, end]);

      if (mustache.isHelper) {
        this.opcode('program', null, null);
        processParams(this, mustache.params);
        processHash(this, mustache.hash);
        this.opcode('helper', (mustache.id.string || mustache.id.idName), mustache.params.length, mustache.escaped, morphNum);
      } else {
        this.opcode('ambiguous', (mustache.id.string || mustache.id.idName), mustache.escaped, morphNum);
      }
    };

    HydrationOpcodeCompiler.prototype.sexpr = function(sexpr) {
      this.string('sexpr');
      this.opcode('program', null, null);
      processParams(this, sexpr.params);
      processHash(this, sexpr.hash);
      this.opcode('sexpr', (sexpr.id.string || sexpr.id.idName), sexpr.params.length);
    };

    HydrationOpcodeCompiler.prototype.string = function(str) {
      this.opcode('string', str);
    };

    HydrationOpcodeCompiler.prototype.mustacheInAttr = function(mustache) {
      if (mustache.isHelper) {
        this.opcode('program', null, null);
        processParams(this, mustache.params);
        processHash(this, mustache.hash);
        this.opcode('helperAttr', (mustache.id.string || mustache.id.idName), mustache.params.length, mustache.escaped);
      } else {
        this.opcode('ambiguousAttr', (mustache.id.string || mustache.id.idName), mustache.escaped);
      }
    };

    HydrationOpcodeCompiler.prototype.ID = function(id) {
      this.opcode('id', id.parts);
    };

    HydrationOpcodeCompiler.prototype.STRING = function(string) {
      this.opcode('stringLiteral', string.stringModeValue);
    };

    HydrationOpcodeCompiler.prototype.BOOLEAN = function(boolean) {
      this.opcode('literal', boolean.stringModeValue);
    };

    HydrationOpcodeCompiler.prototype.INTEGER = function(integer) {
      this.opcode('literal', integer.stringModeValue);
    };

    function processParams(compiler, params) {
      params.forEach(function(param) {
        if (param.type === 'text') {
          compiler.STRING({ stringModeValue: param.chars });
        } else if (param.type) {
          compiler[param.type](param);
        } else {
          compiler.STRING({ stringModeValue: param });
        }
      });
    }

    function processHash(compiler, hash) {
      if (hash) {
        hash.pairs.forEach(function(pair) {
          var name = pair[0], param = pair[1];
          compiler[param.type](param);
          compiler.opcode('stackLiteral', name);
        });
        compiler.opcode('stackLiteral', hash.pairs.length);
      } else {
        compiler.opcode('stackLiteral', 0);
      }
    }

    function distributeMorphs(morphs, opcodes) {
      if (morphs.length === 0) {
        return;
      }

      // Splice morphs after the most recent shareParent/consumeParent.
      var o;
      for (o = opcodes.length - 1; o >= 0; --o) {
        var opcode = opcodes[o][0];
        if (opcode === 'element' || opcode === 'consumeParent'  || opcode === 'popParent') {
          break;
        }
      }

      var spliceArgs = [o + 1, 0];
      for (var i = 0; i < morphs.length; ++i) {
        var p = morphs[i];
        spliceArgs.push(['morph', [p[0], p[1], p[2], p[3]]]);
      }
      opcodes.splice.apply(opcodes, spliceArgs);
      morphs.length = 0;
    }

    __exports__.HydrationOpcodeCompiler = HydrationOpcodeCompiler;
  });
define("htmlbars-compiler/compiler/helpers", 
  ["./quoting","exports"],
  function(__dependency1__, __exports__) {
    
    var array = __dependency1__.array;
    var hash = __dependency1__.hash;
    var string = __dependency1__.string;

    function prepareHelper(stack, size) {
      var args = [],
          types = [],
          hashPairs = [],
          hashTypes = [],
          keyName,
          i;

      var hashSize = stack.pop();

      for (i=0; i<hashSize; i++) {
        keyName = stack.pop();
        hashPairs.unshift(keyName + ':' + stack.pop());
        hashTypes.unshift(keyName + ':' + stack.pop());
      }

      for (i=0; i<size; i++) {
        args.unshift(stack.pop());
        types.unshift(stack.pop());
      }

      var programId = stack.pop();
      var inverseId = stack.pop();

      var options = ['context:context', 'types:' + array(types), 'hashTypes:' + hash(hashTypes), 'hash:' + hash(hashPairs)];

      if (programId !== null) {
        options.push('render:child' + programId);
      }

      if (inverseId !== null) {
        options.push('inverse:child' + inverseId);
      }

      return {
        options: options,
        args: array(args)
      };
    }

    __exports__.prepareHelper = prepareHelper;
  });
define("htmlbars-compiler/compiler/hydration", 
  ["./utils","./helpers","./quoting","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    
    var processOpcodes = __dependency1__.processOpcodes;
    var prepareHelper = __dependency2__.prepareHelper;
    var string = __dependency3__.string;
    var quotedArray = __dependency3__.quotedArray;
    var hash = __dependency3__.hash;
    var array = __dependency3__.array;

    function HydrationCompiler() {
      this.stack = [];
      this.source = [];
      this.mustaches = [];
      this.parents = ['fragment'];
      this.parentCount = 0;
      this.morphs = [];
      this.fragmentProcessing = [];
    }

    var prototype = HydrationCompiler.prototype;

    prototype.compile = function(opcodes, options) {
      this.stack.length = 0;
      this.mustaches.length = 0;
      this.source.length = 0;
      this.parents.length = 1;
      this.morphs.length = 0;
      this.fragmentProcessing.length = 0;
      this.parentCount = 0;
      this.indent = (options && options.indent) || "";

      processOpcodes(this, opcodes);

      var i, l;
      if (this.morphs.length) {
        var morphs = "";
        for (i = 0, l = this.morphs.length; i < l; ++i) {
          var morph = this.morphs[i];
          morphs += this.indent+'  var '+morph[0]+' = '+morph[1]+';\n';
        }
        this.source.unshift(morphs);
      }

      if (this.fragmentProcessing.length) {
        var processing = "";
        for (i = 0, l = this.fragmentProcessing.length; i < l; ++i) {
          processing += this.indent+'  '+this.fragmentProcessing[i]+'\n';
        }
        this.source.unshift(processing);
      }

      return this.source.join('');
    };

    prototype.program = function(programId, inverseId) {
      this.stack.push(inverseId);
      this.stack.push(programId);
    };

    prototype.id = function(parts) {
      this.stack.push(string('id'));
      this.stack.push(string(parts.join('.')));
    };

    prototype.literal = function(literal) {
      this.stack.push(string(typeof literal));
      this.stack.push(literal);
    };

    prototype.stringLiteral = function(str) {
      this.stack.push(string('string'));
      this.stack.push(string(str));
    };

    prototype.stackLiteral = function(literal) {
      this.stack.push(literal);
    };

    prototype.helper = function(name, size, escaped, morphNum) {
      var prepared = prepareHelper(this.stack, size);
      prepared.options.push('escaped:'+escaped);
      prepared.options.push('morph:morph'+morphNum);
      this.pushMustacheInContent(string(name), prepared.args, prepared.options, morphNum);
    };

    prototype.component = function(tag, morphNum) {
      var prepared = prepareHelper(this.stack, 0);
      this.pushWebComponent(string(tag), prepared.options, morphNum);
    };

    prototype.ambiguous = function(str, escaped, morphNum) {
      this.pushMustacheInContent(string(str), '[]', ['escaped:'+escaped], morphNum);
    };

    prototype.ambiguousAttr = function(str, escaped) {
      this.stack.push('['+string(str)+', [], {escaped:'+escaped+'}]');
    };

    prototype.helperAttr = function(name, size, escaped) {
      var prepared = prepareHelper(this.stack, size);
      prepared.options.push('escaped:'+escaped);
      this.stack.push('['+string(name)+','+prepared.args+','+ hash(prepared.options)+']');
    };

    prototype.sexpr = function(name, size) {
      var prepared = prepareHelper(this.stack, size);
      this.stack.push('hooks.subexpr(' + string(name) + ', context, ' + prepared.args + ', ' + hash(prepared.options) + ', env)');
    };

    prototype.string = function(str) {
      this.stack.push(string(str));
    };

    prototype.nodeHelper = function(name, size, elementNum) {
      var prepared = prepareHelper(this.stack, size);
      prepared.options.push('element:element'+elementNum);
      this.pushMustacheInNode(string(name), prepared.args, prepared.options, elementNum);
    };

    prototype.morph = function(num, parentPath, startIndex, endIndex) {
      var isRoot = parentPath.length === 0;
      var parent = this.getParent();

      var morph = "dom.createMorphAt("+parent+
        ","+(startIndex === null ? "-1" : startIndex)+
        ","+(endIndex === null ? "-1" : endIndex)+
        (isRoot ? ",contextualElement)" : ")");

      this.morphs.push(['morph' + num, morph]);
    };

    // Adds our element to cached declaration
    prototype.element = function(elementNum){
      var elementNodesName = "element" + elementNum;
      this.fragmentProcessing.push('var '+elementNodesName+' = '+this.getParent()+';');
      this.parents[this.parents.length-1] = elementNodesName;
    };

    prototype.pushWebComponent = function(name, pairs, morphNum) {
      this.source.push(this.indent+'  hooks.webComponent(morph' + morphNum + ', ' + name + ', context, ' + hash(pairs) + ', env);\n');
    };

    prototype.repairClonedNode = function(blankChildTextNodes, isElementChecked) {
      var parent = this.getParent(),
          processing = 'dom.repairClonedNode('+parent+','+
                       array(blankChildTextNodes)+
                       ( isElementChecked ? ',true' : '' )+
                       ');';
      this.fragmentProcessing.push(
        processing
      );
    };

    prototype.pushMustacheInContent = function(name, args, pairs, morphNum) {
      this.source.push(this.indent+'  hooks.content(morph' + morphNum + ', ' + name + ', context, ' + args + ', ' + hash(pairs) + ', env);\n');
    };

    prototype.pushMustacheInNode = function(name, args, pairs, elementNum) {
      this.source.push(this.indent+'  hooks.element(element' + elementNum + ', ' + name + ', context, ' + args + ', ' + hash(pairs) + ', env);\n');
    };

    prototype.shareParent = function(i) {
      var parentNodesName = "parent" + this.parentCount++;
      this.fragmentProcessing.push('var '+parentNodesName+' = '+this.getParent()+'.childNodes['+i+'];');
      this.parents.push(parentNodesName);
    };

    prototype.consumeParent = function(i) {
      this.parents.push(this.getParent() + '.childNodes[' + i + ']');
    };

    prototype.popParent = function() {
      this.parents.pop();
    };

    prototype.getParent = function() {
      return this.parents[this.parents.length-1];
    };

    __exports__.HydrationCompiler = HydrationCompiler;
  });
define("htmlbars-compiler/compiler/template", 
  ["./fragment_opcode","./fragment","./hydration_opcode","./hydration","./template_visitor","./utils","./quoting","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __exports__) {
    
    var FragmentOpcodeCompiler = __dependency1__.FragmentOpcodeCompiler;
    var FragmentCompiler = __dependency2__.FragmentCompiler;
    var HydrationOpcodeCompiler = __dependency3__.HydrationOpcodeCompiler;
    var HydrationCompiler = __dependency4__.HydrationCompiler;
    var TemplateVisitor = __dependency5__["default"];
    var processOpcodes = __dependency6__.processOpcodes;
    var string = __dependency7__.string;
    var repeat = __dependency7__.repeat;

    function TemplateCompiler() {
      this.fragmentOpcodeCompiler = new FragmentOpcodeCompiler();
      this.fragmentCompiler = new FragmentCompiler();
      this.hydrationOpcodeCompiler = new HydrationOpcodeCompiler();
      this.hydrationCompiler = new HydrationCompiler();
      this.templates = [];
      this.childTemplates = [];
    }

    __exports__.TemplateCompiler = TemplateCompiler;TemplateCompiler.prototype.compile = function(ast) {
      var templateVisitor = new TemplateVisitor();
      templateVisitor.visit(ast);

      processOpcodes(this, templateVisitor.actions);

      return this.templates.pop();
    };

    TemplateCompiler.prototype.startProgram = function(program, childTemplateCount, blankChildTextNodes) {
      this.fragmentOpcodeCompiler.startProgram(program, childTemplateCount, blankChildTextNodes);
      this.hydrationOpcodeCompiler.startProgram(program, childTemplateCount, blankChildTextNodes);

      this.childTemplates.length = 0;
      while(childTemplateCount--) {
        this.childTemplates.push(this.templates.pop());
      }
    };

    TemplateCompiler.prototype.endProgram = function(program, programDepth) {
      this.fragmentOpcodeCompiler.endProgram(program);
      this.hydrationOpcodeCompiler.endProgram(program);

      var indent = repeat("  ", programDepth);
      var options = {
        indent: indent + "  "
      };

      // function build(dom) { return fragment; }
      var fragmentProgram = this.fragmentCompiler.compile(
        this.fragmentOpcodeCompiler.opcodes,
        options
      );

      // function hydrate(fragment) { return mustaches; }
      var hydrationProgram = this.hydrationCompiler.compile(
        this.hydrationOpcodeCompiler.opcodes,
        options
      );

      var childTemplateVars = "";
      for (var i=0, l=this.childTemplates.length; i<l; i++) {
        childTemplateVars += indent+'  var child' + i + ' = ' + this.childTemplates[i] + '\n';
      }

      var template =
        '(function() {\n' +
        childTemplateVars +
        fragmentProgram +
        indent+'  var cachedFragment;\n' +
        indent+'  return function template(context, env, contextualElement) {\n' +
        indent+'    var dom = env.dom, hooks = env.hooks;\n' +
        indent+'    if (cachedFragment === undefined) {\n' +
        indent+'      cachedFragment = build(dom);\n' +
        indent+'    }\n' +
        indent+'    var fragment = dom.cloneNode(cachedFragment, true);\n' +
        hydrationProgram +
        indent+'    return fragment;\n' +
        indent+'  };\n' +
        indent+'}());';

      this.templates.push(template);
    };

    TemplateCompiler.prototype.openElement = function(element, i, l, r, c, b) {
      this.fragmentOpcodeCompiler.openElement(element, i, l, r, c, b);
      this.hydrationOpcodeCompiler.openElement(element, i, l, r, c, b);
    };

    TemplateCompiler.prototype.closeElement = function(element, i, l, r) {
      this.fragmentOpcodeCompiler.closeElement(element, i, l, r);
      this.hydrationOpcodeCompiler.closeElement(element, i, l, r);
    };

    TemplateCompiler.prototype.component = function(component, i, l) {
      this.fragmentOpcodeCompiler.component(component, i, l);
      this.hydrationOpcodeCompiler.component(component, i, l);
    };

    TemplateCompiler.prototype.block = function(block, i, l) {
      this.fragmentOpcodeCompiler.block(block, i, l);
      this.hydrationOpcodeCompiler.block(block, i, l);
    };

    TemplateCompiler.prototype.text = function(string, i, l, r) {
      this.fragmentOpcodeCompiler.text(string, i, l, r);
      this.hydrationOpcodeCompiler.text(string, i, l, r);
    };

    TemplateCompiler.prototype.mustache = function (mustache, i, l) {
      this.fragmentOpcodeCompiler.mustache(mustache, i, l);
      this.hydrationOpcodeCompiler.mustache(mustache, i, l);
    };
  });
define("htmlbars-compiler/compiler", 
  ["./parser","./compiler/template","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    /*jshint evil:true*/
    var preprocess = __dependency1__.preprocess;
    var TemplateCompiler = __dependency2__.TemplateCompiler;

    /*
     * Compile a string into a template rendering function
     *
     * Example usage:
     *
     *     // Template is the hydration portion of the compiled template
     *     var template = compile("Howdy {{name}}");
     *
     *     // Template accepts three arguments:
     *     //
     *     //   1. A context object
     *     //   2. An env object
     *     //   3. A contextualElement (optional, document.body is the default)
     *     //
     *     // The env object *must* have at least these two properties:
     *     //
     *     //   1. `hooks` - Basic hooks for rendering a template
     *     //   2. `dom` - An instance of DOMHelper
     *     //
     *     import {hooks} from 'htmlbars-runtime';
     *     import {DOMHelper} from 'morph';
     *     var context = {name: 'whatever'},
     *         env = {hooks: hooks, dom: new DOMHelper()},
     *         contextualElement = document.body;
     *     var domFragment = template(context, env, contextualElement);
     *
     * @method compile
     * @param {String} string An htmlbars template string
     * @return {Function} A function for rendering the template
     */
    function compile(string) {
      var program = compileSpec(string);
      return new Function("return " + program)();
    }

    __exports__.compile = compile;/*
     * Compile a string into a template spec string. The template spec is a string
     * representation of a template. Usually, you would use compileSpec for
     * pre-compilation of a template on the server.
     *
     * Example usage:
     *
     *     var templateSpec = compileSpec("Howdy {{name}}");
     *     // This next step is basically what plain compile does
     *     var template = new Function("return " + templateSpec)();
     *
     * @method compileSpec
     * @param {String} string An htmlbars template string
     * @return {Function} A template spec string
     */
    function compileSpec(string) {
      var ast = preprocess(string);
      var compiler = new TemplateCompiler();
      var program = compiler.compile(ast);
      return program;
    }

    __exports__.compileSpec = compileSpec;
  });
define("rebound/compiler", 
  ["htmlbars-compiler/compiler","htmlbars-runtime/utils","rebound/helpers","rebound/hooks","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    
    var htmlbarsCompile = __dependency1__.compile;
    var htmlbarsCompileSpec = __dependency1__.compileSpec;
    var merge = __dependency2__.merge;
    var defaultHelpers = __dependency3__["default"];
    var defaultHooks = __dependency4__["default"];

    function compile(string, options){
      // Ensure we have a well-formed object as var options
      options = options || {};
      options.helpers = options.helpers || {};
      options.hooks = options.hooks || {};

      // Merge our default helpers with user provided helpers
      options.helpers = merge(defaultHelpers, options.helpers);
      options.hooks = merge(defaultHooks, options.hooks);

      // Compile our template function
      var func = htmlbarsCompile(string, {
        helpers: options.helpers,
        hooks: options.hooks
      });

      // Return a wrapper function that will merge user provided helpers with our defaults
      return function(data, options){
        // Ensure we have a well-formed object as var options
        options = options || {};
        options.helpers = options.helpers || {};
        options.hooks = options.hooks || {};

        // Merge our default helpers and hooks with user provided helpers
        options.helpers = merge(defaultHelpers, options.helpers);
        options.hooks = merge(defaultHooks, options.hooks);

        // Call our func with merged helpers and hooks
        return func.call(this, data, {
          helpers: options.helpers,
          hooks: options.hooks
        });
      };
    }

    __exports__.compile = compile;
  });
define("rebound", 
  ["rebound.runtime","rebound/compiler","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    var registerHelper = __dependency1__.registerHelper;
    var registerPartial = __dependency1__.registerPartial;
    var router = __dependency1__.router;
    var seedData = __dependency1__.seedData;
    var compile = __dependency2__.compile;

    __exports__.compile = compile;
    __exports__.registerHelper = registerHelper;
    __exports__.registerPartial = registerPartial;
    __exports__.router = router;
    __exports__.seedData = seedData;
  });
//The modules for your project will be inlined above
//this snippet. Ask almond to synchronously require the
//module value for 'main' here and return it as the
//value to use for the public API for the built file.

return (function(){
  require(['rebound'], function(Rebound){
    window.Rebound = Rebound;
  });
})();
}));

require.config({
    baseUrl: "/"
})

require(['Rebound']);