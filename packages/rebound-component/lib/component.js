// Rebound Component
// ----------------

import DOMHelper from "dom-helper";
import hooks from "rebound-component/hooks";
import helpers from "rebound-component/helpers";
import $ from "rebound-component/utils";
import { Model } from "rebound-data/rebound-data";


// If Backbone hasn't been started yet, throw error
if(!window.Backbone) throw "Backbone must be on the page for Rebound to load.";

// Returns true if `str` starts with `test`
function startsWith(str, test){
  if(str === test) return true;
  str = $.splitPath(str);
  test = $.splitPath(test);
  while(test[0] && str[0]){
    if(str[0] !== test[0] && str[0] !== '@each' && test[0] !== '@each') return false;
    test.shift();
    str.shift();
  }
  return true;
}

function renderCallback(){
  var i = 0, len = this._toRender.length;
  delete this._renderTimeout;
  for(i=0;i<len;i++){
    this._toRender.shift().notify();
  }
  this._toRender.added = {};
}

function hydrate(spec, options){
  // Return a wrapper function that will merge user provided helpers and hooks with our defaults
  return function(data, options){

    // Rebound's default environment
    // The application environment is propagated down each render call and
    // augmented with helpers as it goes
    var env = {
      helpers: helpers.helpers,
      hooks: hooks,
      dom: new DOMHelper(),
      useFragmentCache: true
    };

    // Ensure we have a contextual element to pass to render
    var contextElement = data.el || document.body;

    // Merge our default helpers and hooks with user provided helpers
    env.helpers = _.defaults((options.helpers || {}), env.helpers);
    env.hooks = _.defaults((options.hooks || {}), env.hooks);

    // Call our func with merged helpers and hooks
    return spec.render(data, env, contextElement);
  };
};

// New Backbone Component
var Component = Model.extend({

  isComponent: true,

  constructor: function(options){
    options = options || (options = {});
    _.bindAll(this, '__callOnComponent');
    this.cid = _.uniqueId('component');
    this.attributes = {};
    this.changed = {};
    this.helpers = {};
    this.__parent__ = this.__root__ = this;
    this.listenTo(this, 'all', this._onChange);

    // Take our parsed data and add it to our backbone data structure. Does a deep defaults set.
    // In the model, primatives (arrays, objects, etc) are converted to Backbone Objects
    // Functions are compiled to find their dependancies and added as computed properties
    // Set our component's context with the passed data merged with the component's defaults
    this.set((this.defaults || {}), {defaults: true});
    this.set((options.data || {}));

    // Call on component is used by the {{on}} helper to call all event callbacks in the scope of the component
    this.helpers.__callOnComponent = this.__callOnComponent;


    // Get any additional routes passed in from options
    this.routes =  _.defaults((options.routes || {}), this.routes);
    // Ensure that all route functions exist
    _.each(this.routes, function(value, key, routes){
        if(typeof value !== 'string'){ throw('Function name passed to routes in  ' + this.__name + ' component must be a string!'); }
        if(!this[value]){ throw('Callback function '+value+' does not exist on the  ' + this.__name + ' component!'); }
    }, this);


    // Set our outlet and template if we have one
    this.el = options.outlet || undefined;
    this.$el = (_.isUndefined(window.Backbone.$)) ? false : window.Backbone.$(this.el);

    if(_.isFunction(this.createdCallback)){
      this.createdCallback.call(this);
    }

    // Take our precompiled template and hydrates it. When Rebound Compiler is included, can be a handlebars template string.
    // TODO: Check if template is a string, and if the compiler exists on the page, and compile if needed
    if(!options.template && !this.template){ throw('Template must provided for ' + this.__name + ' component!'); }
    this.template = options.template || this.template;
    this.template = (typeof this.template === 'object') ? hydrate(this.template) : this.template;


    // Render our dom and place the dom in our custom element
    // Template accepts [data, options, contextualElement]
    this.el.appendChild(this.template(this, {helpers: this.helpers}, this.el));

    // Add active class to this newly rendered template's link elements that require it
    var links = this.el.querySelectorAll('a[href="/'+Backbone.history.fragment+'"]');
    for(var i=0;i<links.length;i++){
      links.item(i).classList.add('active');
      links.item(i).active = true;
    }

    this.initialize();

  },

  $: function(selector) {
    if(!this.$el){
      return console.error('No DOM manipulation library on the page!');
    }
    return this.$el.find(selector);
  },

  // Trigger all events on both the component and the element
  trigger: function(eventName){
    if(this.el){
      $(this.el).trigger(eventName, arguments);
    }
    Backbone.Model.prototype.trigger.apply(this, arguments);
  },

  __callOnComponent: function(name, event){
    if(!_.isFunction(this[name])){ throw "ERROR: No method named " + name + " on component " + this.__name + "!"; }
    return this[name].call(this, event);
  },

  _onAttributeChange: function(attrName, oldVal, newVal){
    // Commented out because tracking attribute changes and making sure they dont infinite loop is hard.
    // TODO: Make work.
    // try{ newVal = JSON.parse(newVal); } catch (e){ newVal = newVal; }
    //
    // // data attributes should be referanced by their camel case name
    // attrName = attrName.replace(/^data-/g, "").replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
    //
    // oldVal = this.get(attrName);
    //
    // if(newVal === null){ this.unset(attrName); }
    //
    // // If oldVal is a number, and newVal is only numerical, preserve type
    // if(_.isNumber(oldVal) && _.isString(newVal) && newVal.match(/^[0-9]*$/i)){
    //   newVal = parseInt(newVal);
    // }
    //
    // else{ this.set(attrName, newVal, {quiet: true}); }
  },


  _onChange: function(type, model, collection, options){
    var shortcircuit = { change: 1, sort: 1, request: 1, destroy: 1, sync: 1, error: 1, invalid: 1, route: 1, dirty: 1 };
    if( shortcircuit[type] ) return;

    var data, changed;
    model || (model = {});
    collection || (collection = {});
    options || (options = {});
    !collection.isData && (options = collection) && (collection = model);
    this._toRender || (this._toRender = []);

    if( (type === 'reset' && options.previousAttributes) || type.indexOf('change:') !== -1){
      data = model;
      changed = model.changedAttributes();
    }
    else if(type === 'add' || type === 'remove' || (type === 'reset' && options.previousModels)){
      data = collection;
      changed = {
        '@each': data
      };
    }

    if(!data || !changed) return;

    var push = function(arr){
      var i, len = arr.length;
      this.added || (this.added = {});
      for(i=0;i<len;i++){
        if(this.added[arr[i].cid]) continue;
        this.added[arr[i].cid] = 1;
        this.push(arr[i]);
      }
    };
    var context = this;
    var basePath = data.__path();
    var parts = $.splitPath(basePath);
    var key, obsPath, path, observers;

    // For each changed key, walk down the data tree from the root to the data
    // element that triggered the event and add all relevent callbacks to this
    // object's _toRender queue.
    do{
      for(key in changed){
        path = (basePath + (basePath && key && '.') + key).replace(context.__path(), '').replace(/\[[^\]]+\]/g, ".@each").replace(/^\./, '');
        for(obsPath in context.__observers){
          observers = context.__observers[obsPath];
          if(startsWith(obsPath, path)){
            // If this is a collection event, trigger everything, otherwise only trigger property change callbacks
            if(data.isCollection) push.call(this._toRender, observers.collection);
            push.call(this._toRender, observers.model);
          }
        }
      }
    } while(context !== data && (context = context.get(parts.shift())))

    // Queue our render callback to be called after the current call stack has been exhausted
    window.clearTimeout(this._renderTimeout);
    this._renderTimeout = window.setTimeout(_.bind(renderCallback, this), 0);
  }

});

Component.extend= function(protoProps, staticProps) {
  var parent = this,
      child,
      reservedMethods = {
        'trigger':1,    'constructor':1, 'get':1,               'set':1,             'has':1,
        'extend':1,     'escape':1,      'unset':1,             'clear':1,           'cid':1,
        'attributes':1, 'changed':1,     'toJSON':1,            'validationError':1, 'isValid':1,
        'isNew':1,      'hasChanged':1,  'changedAttributes':1, 'previous':1,        'previousAttributes':1
      },
      configProperties = {
        'routes':1,     'template':1,    'defaults':1, 'outlet':1,          'url':1,
        'urlRoot':1,    'idAttribute':1, 'id':1,       'createdCallback':1, 'attachedCallback':1,
        'detachedCallback':1
      };

  protoProps.defaults = {};

  // For each property passed into our component base class
  _.each(protoProps, function(value, key, protoProps){

    // If a configuration property, ignore it
    if(configProperties[key]){ return; }

    // If a primative or backbone type object, or computed property (function which takes no arguments and returns a value) move it to our defaults
    if(!_.isFunction(value) || value.isModel || value.isComponent || (_.isFunction(value) && value.length === 0 && value.toString().indexOf('return') > -1)){
      protoProps.defaults[key] = value;
      delete protoProps[key];
    }

    // If a reserved method, yell
    if(reservedMethods[key]){ throw "ERROR: " + key + " is a reserved method name in " + staticProps.__name + "!"; }

    // All other values are component methods, leave them be unless already defined.

  }, this);

  // If given a constructor, use it, otherwise use the default one defined above
  if (protoProps && _.has(protoProps, 'constructor')) {
    child = protoProps.constructor;
  } else {
    child = function(){ return parent.apply(this, arguments); };
  }

  // Our class should inherit everything from its parent, defined above
  var Surrogate = function(){ this.constructor = child; };
  Surrogate.prototype = parent.prototype;
  child.prototype = new Surrogate();

  // Extend our prototype with any remaining protoProps, overriting pre-defined ones
  if (protoProps){ _.extend(child.prototype, protoProps, staticProps); }

  // Set our ancestry
  child.__super__ = parent.prototype;

  return child;
};

Component.register = function registerComponent(name, options) {
  var script = options.prototype;
  var template = options.template;
  var style = options.style;

  var component = this.extend(script, { __name: name });
  var proto = Object.create(HTMLElement.prototype, {});

  proto.createdCallback = function() {
    this.__component__ = new component({
      template: template,
      outlet: this,
      data: Rebound.seedData
    });
  };

  proto.attachedCallback = function() {
    script.attachedCallback && script.attachedCallback.call(this.__component__);
  };

  proto.detachedCallback = function() {
    script.detachedCallback && script.detachedCallback.call(this.__component__);
    this.__component__.deinitialize();
  };

  proto.attributeChangedCallback = function(attrName, oldVal, newVal) {
    this.__component__._onAttributeChange(attrName, oldVal, newVal);
    script.attributeChangedCallback && script.attributeChangedCallback.call(this.__component__, attrName, oldVal, newVal);
  };

  return document.registerElement(name, { prototype: proto });
}

_.bindAll(Component, 'register');

export default Component;
