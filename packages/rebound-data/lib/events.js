'use strict';

// Rebound Events
// ---------------

// Delivers module that can be extended in order to provide subclasses with
// a custom event channel. You may bind a callback to an event with `on` or
// remove with `off`; `trigger`-ing an event fires all callbacks in
// succession.
//
//     class Obj extends Rebound.Event {};
//     var object = new Obj();
//     object.on('expand', function(){ alert('expanded'); });
//     object.trigger('expand');

import { $ } from "rebound-utils/rebound-utils";
import Path from "rebound-data/path";

// ### Private State Storage

// The `EVENTS` Symbol is used to store private event metadata.
const EVENTS = Symbol('<events>');

// Instances of the `Events` class hold all the meta data for a given eventable
// object instance. Any class extending the `Eventable` interface, defined below,
// will have an instance of this state object to track event bindings and listeners.
class Events {

  constructor () {
    this.listenId = $.uniqueId('listener');
    this.cache = {};
    this.delegates = {};
    this.delegateCount = 0;
    this.listeningTo = {};
    this.listeners = {};
  }

  // **extractPath**: Given an event of the form: `name:optional.path[parts]`,
  // return an array of the path parts, or empty array if the event has no path data.
  static extractPath (str) {
    if (typeof str !== 'string') return [];
    return  Path.split(str.split(':').pop() || '');
  }

  // **extractName**: Given an event of the form: `name:optional.path[parts]`, return the name.
  static extractName (str) {
    if (typeof str !== 'string') return '';
    return str.split(':').shift() || '';
  }

  // **hasPath**: Check if the string passed contains a paths part.
  static hasPath (name) {
    return !!~name.indexOf(':');
  }
}

// ### Internal API Methods

// Regular expression used to split event strings.
const EVENT_SPLITTER = /\s+/;

// **eventsApi** iterates over the standard `event, callback` (as well as the fancy multiple
// space-separated events `"change blur", callback` and jQuery-style event
// maps `{event: callback}`).
function eventsApi (iteratee, events, name, callback, opts) {
  var i = 0, names;

  // Handle event maps.
  if (name && typeof name === 'object') {
    if (callback !== void 0 && 'context' in opts && opts.context === void 0) opts.context = callback;
    for (names = Object.keys(name); i < names.length ; i++) {
      events = eventsApi(iteratee, events, names[i], name[names[i]], opts);
    }
  }

  // Handle space-separated event names by delegating them individually.
  else if (typeof name === 'string' && EVENT_SPLITTER.test(name)) {
    for (names = name.split(EVENT_SPLITTER); i < names.length; i++) {
      events = iteratee(events, names[i], callback, opts);
    }
  }

  // Finally, standard events.
  else { events = iteratee(events, name, callback, opts); }

  return events;
}

// **internalOn** guards the `listening` argument from the public API.
function internalOn (obj, name, callback, context, listening) {
  eventsApi(onApi, obj[EVENTS], name, callback, {
    context: context,
    ctx: obj,
    listening: listening
  });

  if (listening) {
    var listeners = obj[EVENTS].listeners;
    listeners[listening.id] = listening;
  }

  return obj;
}

// **onApi** is the reducing API that adds a callback to the `events` object.
function onApi (events, name, callback, options) {
  if (callback) {
    var handlers = events.cache[name] || (events.cache[name] = []);
    var delegates = events.delegates;
    var context = options.context, ctx = options.ctx, listening = options.listening;
    if (listening) listening.count++;

    if (Path.hasWildcard(name) && !delegates.hasOwnProperty(name)){
      delegates[name] = Events.extractPath(name);
      events.delegateCount++;
    }

    handlers.push({
      callback: callback,
      context: context,
      ctx: context || ctx,
      listening: listening
    });
  }
  return events;
}

// **delegateMatch** takes two path parts arrays and returns true or false
// if the delegate part – including wild cards – matches the event path.
// For each part in the delegate path:
//  - If event names don't match, return false.
//  - If delegate path length (excluding trailing `@all`) is > event path length, it will never match.
//  - If `@all` is encountered, it is an automatic match.
//  - If `@each` is encountered, skip equality match.
//  - If any part does not match, return false.
//  - Then, if lengths are equal, we have a match.
function delegateMatch (delegateName, delegatePath, eventName, eventPath){
  var len = delegatePath.length;
  if (delegateName.indexOf(eventName) !== 0) return false;
  if (len - +!!(delegatePath[len-1] === '@all') > eventPath.length) return false;
  for (var key = 0; key < delegatePath.length; key++){
    let val = delegatePath[key];
    if (val === '@all') return true;
    if (val === '@each') continue;
    if (val !== eventPath[key]) return false;
  }
  return key == eventPath.length;
}

// **triggerApi** handles triggering the appropriate event callbacks. Ony trigger `all` callbacks
// for non-Symbol events
function triggerApi (events, name, callback, args) {
  if (events) {
    var eventsList = events.cache[name];
    var allEvents = events.cache.all;

    if (eventsList && allEvents) allEvents = allEvents.slice();
    if (eventsList) triggerEvents(eventsList, args);
    if (allEvents && typeof name === 'string') triggerEvents(allEvents, [name].concat(args));

    // If there are no delegate listeners, or this is not an event with path data, we're done.
    if (!events.delegateCount) return events;

    // For each delegate event, check if it matches this event. If it does, trigger callbacks.
    var delegates = events.delegates;
    var delegateNames = Object.keys(delegates);
    var eventPath = Events.extractPath(name);
    var eventName = Events.extractName(name);
    for (let i=0; i<delegateNames.length; i++) {
      let delegateName=delegateNames[i];
      if (delegateMatch(delegateName, delegates[delegateName], eventName, eventPath)) triggerEvents(events.cache[delegateName], args);
    }
  }
  return events;
}

// **triggerEvents**: A difficult-to-believe, but optimized internal dispatch function for
// triggering events. Tries to keep the usual cases speedy (most internal
// events have 3 arguments).
function triggerEvents (events, args) {
  var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2], a4 = args[3];
  switch (args.length) {
    case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
    case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
    case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
    case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
    case 4: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3, a4); return;
    default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args); return;
  }
}

// **offApi**: The reducing API that removes a callback from the `events` object.
function offApi (events, name, callback, options) {
  if (!events) return;

  var listening;
  var context = options.context, listeners = options.listeners;

  // Delete all events listeners and "drop" events.
  if (!name && !callback && !context) {
    var ids = listeners ? Object.keys(listeners) : [];
    for (let i=0; i<ids.length; i++) {
      listening = listeners[ids[i]];
      delete listeners[listening.id];
      delete listening.listeningTo[listening.objId];
    }
    return new Events();
  }

  var names = name ? [name] : Object.keys(events.cache);
  for (let i=0; i<names.length; i++) {
    name = names[i];
    var handlers = events.cache[name];

    // Bail out if there are no events stored.
    if (!handlers) break;

    // Replace events if there are any remaining.  Otherwise, clean up.
    var remaining = [];
    for (var j = 0; j < handlers.length; j++) {
      var handler = handlers[j];
      if (
        callback && callback !== handler.callback &&
          callback !== handler.callback._callback ||
            context && context !== handler.context
      ) {
        remaining.push(handler);
      } else {
        listening = handler.listening;
        if (listening && --listening.count === 0) {
          delete listeners[listening.id];
          delete listening.listeningTo[listening.objId];
        }
      }
    }

    // Update event callbacks list if the list has any remaining events. Otherwise, clean up.
    if (remaining.length){ events.cache[name] = remaining; }
    else {
      delete events.cache[name];
      if (events.delegates.hasOwnProperty(name)){
        delete events.delegates[name];
        events.delegateCount--;
      }
    }
  }
  return events;
}


// **onceMap** reduces the event callbacks into a map of `{event: onceWrapper}`.
// `offer` unbinds the `onceWrapper` after it has been called.
function onceMap (map, name, callback, offer) {
  if (callback) {
    let called = 0;
    var once = map[name] = function() {
        if (called++) return;
        offer(name, once);
        callback.apply(this, arguments);
      };
    once._callback = callback;
  }
  return map;
}

// ### Eventable Class

// **Eventable** is main class delivered to consumers of this module. Extend this
// class to provide subclasses with a custom event channel.
export default class Eventable {

  constructor () {
    this[EVENTS] = new Events();
  }

  // **on** binds an event to a `callback` function. Passing `"all"` will bind
  // the callback to all events fired.
  on (name, callback, context) { return internalOn(this, name, callback, context); }

  // **listenTo**: Inversion-of-control versions of `on`. Tell *this* object to listen to
  // an event in another object... keeping track of what it's listening to
  // for easier unbinding later.
  listenTo (obj, name, callback) {
    if (!obj) return this;
    var id = obj[EVENTS].listenId;
    var listeningTo = this[EVENTS].listeningTo;
    var listening = listeningTo[id];

    // This object is not listening to any other events on `obj` yet.
    // Setup the necessary references to track the listening callbacks.
    if (!listening) {
      var thisId = this[EVENTS].listenId;
      listening = listeningTo[id] = {obj: obj, objId: id, id: thisId, listeningTo: listeningTo, count: 0};
    }

    // Bind callbacks on obj, and keep track of them on listening.
    internalOn(obj, name, callback, this, listening);
    return this;
  }

  // **off** removes one or many callbacks. If `context` is null, removes all
  // callbacks with that function. If `callback` is null, removes all
  // callbacks for the event. If `name` is null, removes all bound
  // callbacks for all events.
  off (name, callback, context) {
    if (!this[EVENTS]) return this;
    this[EVENTS] = eventsApi(offApi, this[EVENTS], name, callback, {
      context: context,
      listeners: this[EVENTS].listeners
    });
    return this;
  }

  // **stopListening** tells this object to stop listening to either specific events ... or
  // to every object it's currently listening to.
  stopListening (obj, name, callback) {
    var listeningTo = this[EVENTS].listeningTo;
    if (!listeningTo) return this;

    var ids = obj ? [obj[EVENTS].listenId] : Object.keys(listeningTo);

    for (var i = 0; i < ids.length; i++) {
      var listening = listeningTo[ids[i]];

      // If listening doesn't exist, this object is not currently
      // listening to obj. Break out early.
      if (!listening) break;

      listening.obj.off(name, callback, this);
    }

    return this;
  }

  // **once** binds an event to only be triggered a single time. After the first time
  // the callback is invoked, its listener will be removed. If multiple events
  // are passed in using the space-separated syntax, the handler will fire
  // once for each event, not once for a combination of all events.
  once (name, callback, context) {
    // Map the event into a `{event: once}` object.
    var events = eventsApi(onceMap, {}, name, callback, this.off.bind(this));
    if (typeof name === 'string' && context == null){ callback = void 0; }
    return this.on(events, callback, context);
  }

  // **listenToOnce**: Inversion-of-control versions of `once`.
  listenToOnce (obj, name, callback) {
    // Map the event into a `{event: once}` object.
    var events = eventsApi(onceMap, {}, name, callback, this.stopListening.bind(this, obj));
    return this.listenTo(obj, events);
  }

  // **trigger** triggers one or many events, firing all bound callbacks. Callbacks are
  // passed the same arguments as `trigger` is, apart from the event name
  // (unless you're listening on `"all"`, which will cause your callback to
  // receive the true name of the event as the first argument).
  trigger (name, ...params) {
    if (!this[EVENTS]) return this;

    var len = params.length;
    var options = len ? (params[len - 1] || {}): (params[len] = {});

    // Trigger our events on this object
    if (options.silent !== false) eventsApi(triggerApi, this[EVENTS], name, void 0, params);

    return this;

  }
}

export { Eventable as Events };
