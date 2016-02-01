// Rebound Component
// ----------------

import Backbone from "backbone";
import {$, REBOUND_SYMBOL} from "rebound-utils/rebound-utils";
import { Model } from "rebound-data/rebound-data";
import render from "rebound-htmlbars/render";

// New Backbone Component
var Component = Model.extend({

  isComponent: true,
  isHydrated: true,
  defaults: {},

  constructor(el, data, options){

    // Ensure options is an object
    options || (options = {});

    // Bind certian methods to ensure they are run in the context of our Component
    _.bindAll(this, '_callOnComponent', '_listenToService');

    // Set instance cid and caches for this Component
    this.cid = $.uniqueId('component');
    this.attributes = {};
    this.changed = {};
    this.consumers = [];
    this.services = {};
    this.loadCallbacks = [];

    // If we are told this is not a hydrated component, mark it as such
    if(options.isHydrated === false){ this.isHydrated = false; }

    // Components are always the top of their data tree. Set parent and root to itself.
    this.__parent__ = this.__root__ = this;

    // Take our parsed data and add it to our backbone data structure. Does a deep defaults set.
    // In the model, primatives (arrays, objects, etc) are converted to Backbone Objects
    // Functions are compiled to find their dependancies and added as computed properties
    // Set our component's context with the passed data merged with the component's defaults
    this.set((this.defaults || {}));
    this.set((data || {}));

    // Get any additional routes passed in from options
    this.routes =  _.defaults((options.routes || {}), this.routes);

    // Ensure that all route functions exist
    _.each(this.routes, function(value, key, routes){
        if(typeof value !== 'string'){ throw('Function name passed to routes in  ' + this.tagName + ' component must be a string!'); }
        if(!this[value]){ throw('Callback function '+value+' does not exist on the  ' + this.tagName + ' component!'); }
    }, this);


    // Set or create our element and template if we have them
    this.el = el || document.createDocumentFragment();
    this.$el = (_.isFunction(Backbone.$)) ? Backbone.$(this.el) : false;

    // Render our dom and place the dom in our custom element
    this.render();

    // Add active class to this newly rendered template's link elements that require it
    $(this.el).markLinks();

    // Call user provided initialize
    this.initialize();

    return this;
  },

  _callOnComponent(name, event){
    if(!_.isFunction(this[name])){ throw "ERROR: No method named " + name + " on component " + this.tagName + "!"; }
    return this[name].call(this, event);
  },

  _listenToService(key, service){
    var self = this;
    this.listenTo(service, 'all', (type, model, value, options={}) => {
      var attr,
          path = model.__path(),
          changed;

      // Send the service's key via options
      // TODO: Find a better way to get service keys in their path() method
      options.service = key;

      if(type.indexOf('change:') === 0){
        changed = model.changedAttributes();
        for(attr in changed){
          // TODO: Modifying arguments array is bad. change this
          type = ('change:' + key + '.' + path + (path && '.') + attr); // jshint ignore:line
          this.trigger.call(this, type, model, value, options);
        }
        return void 0;
      }

      return this.trigger.call(this, type, model, value, options);
    });
  },

  // Render our dom and place the dom in our custom element
  // TODO: Check if template is a string, and if the compiler exists on the page, and compile if needed
  render(){
    this.el.innerHTML = null;
    this.el.appendChild(render(this[REBOUND_SYMBOL].template, this).fragment);
  },

  deinitialize(){
    if(this.consumers.length){ return void 0; }
    _.each(this.services, (service, key) => {
      _.each(service.consumers, (consumer, index) => {
        if(consumer.component === this) service.consumers.splice(index, 1);
      });
    });
    delete this.services;
    Model.prototype.deinitialize.apply(this, arguments);
  },

  // LazyComponents have an onLoad function that calls all the registered callbacks
  // after it has been hydrated. If we are calling onLoad on an already loaded
  // component, just call the callback provided.
  onLoad(cb){
    if(!this.isHydrated){ this.loadCallbacks.push(cb); }
    else{ cb(this); }
  },

  // Set is overridden on components to accept components as a valid input type.
  // Components set on other Components are mixed in as a shared object. {raw: true}
  // It also marks itself as a consumer of this component
  set(key, val, options){
    var attrs, attr, serviceOptions;
    if (typeof key === 'object') {
      attrs = (key.isModel) ? key.attributes : key;
      options = val;
    } else (attrs = {})[key] = val;
    options || (options = {});

    // If reset option passed, do a reset. If nothing passed, return.
    if(options.reset === true) return this.reset(attrs, options);
    if(options.defaults === true) this.defaults = attrs;
    if(_.isEmpty(attrs)){ return void 0; }

    // For each attribute passed:
    for(key in attrs){
      attr = attrs[key];
      if(attr && attr.isComponent){
        if(attr.isLazyComponent && attr._component){ attr = attr._component; }
        serviceOptions || (serviceOptions = _.defaults(_.clone(options), {raw: true}));
        attr.consumers.push({key: key, component: this});
        this.services[key] = attr;
        this._listenToService(key, attr);
        Model.prototype.set.call(this, key, attr, serviceOptions);
      }
      Model.prototype.set.call(this, key, attr, options);
    }

    return this;
  },

  $(selector) {
    if(!this.$el){
      return console.error('No DOM manipulation library on the page!');
    }
    return this.$el.find(selector);
  },

  // Trigger all events on both the component and the element
  trigger(eventName){
    if(this.el){
      $(this.el).trigger(eventName, arguments);
    }
    Backbone.Model.prototype.trigger.apply(this, arguments);
  },

  _onAttributeChange(attrName, oldVal, newVal){
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
  }

});


function processProps(protoProps, staticProps){

  var reservedMethods = {
    'trigger':1,    'get':1,      'set':1,     'has':1,        'escape':1,
    'unset':1,      'clear':1,    'cid':1,     'attributes':1, 'hasChanged':1,
    'changed':1,    'toJSON':1,   'isValid':1, 'isNew':1,      'validationError':1,
    'previous':1,   'toggle':1,   'previousAttributes':1,      'changedAttributes':1,
  },
  configProperties = {
    'id':1,        'idAttribute':1,      'url':1,              'urlRoot':1,
    'routes':1,    'createdCallback':1,  'attachedCallback':1, 'detachedCallback':1,
    'attributeChangedCallback':1, 'defaults': 1
  };

  // These properties exist on all instances of the Component
  protoProps || (protoProps = {});
  protoProps.defaults = {};

  // These properties exist on the custom Component constructor
  // Ensure every constructor has a template and stylesheet
  staticProps || (staticProps = {});
  staticProps.template || (staticProps.template = null);
  staticProps.stylesheet || (staticProps.stylesheet = '');


  // Convert computed properties (getters and setters on this object) to Computed
  // Property primitives
  $.extractComputedProps(protoProps);

  // For each property passed into our component base class determine if it is
  // intended as a default value (move it into the defaults hash) or a component
  // method (leave it alone).
  for(var key in protoProps){
  let value = protoProps[key];

  // If this isn't an actual property, keep going
  if(!protoProps.hasOwnProperty(key)){ continue; }

  // If this is a reserved property name, yell
  if(reservedMethods[key]){ throw "ERROR: " + key + " is a reserved method name in " + staticProps.tagName + "!"; }

  // If a configuration property, or not actually on the obj, ignore it
  if(!protoProps.hasOwnProperty(key) || configProperties[key]){ continue; }

  // If a primative, backbone type object, or computed property, move it to our defaults
  if(!_.isFunction(value) || value.isComputedProto || value.isModel || value.isComponent){
    protoProps.defaults[key] = value;
    delete protoProps[key];
  }

  // All other values are component methods, leave them be.

  }

}

Component.hydrate = function hydrateComponent(protoProps={}, staticProps={}){

  // If already hydrated, return.
  if(this.isHydrated){ return void 0; }

  // Process our new properties objects
  processProps(protoProps, staticProps);

  // Extend our prototype with any protoProps, overriting pre-defined ones
  if (protoProps){ _.extend(this.prototype, protoProps); }

  // Add any static props to the function object itself
  if (staticProps){ _.extend(this, staticProps); }

  // Ensure we have a type, template and stylesheet
  this.prototype[REBOUND_SYMBOL] = {
    type: staticProps.type || 'anonymous-component',
    template: staticProps.template || null,
    stylesheet: staticProps.stylesheet || '',
    isHydrated: true
  };

};

Component.extend = function extendComponent(protoProps={}, staticProps={}){
  var parent = this,

      // Call our parent Component constructor and pass through the instance specific
      // name, template and stylesheet via options if no other name, template or
      // stylesheet is present.
      Component = function Component(type, data={}, options={}){
        return parent.call(this, type, data, options);
      },

      // Surrogate constructor allows us to inherit everything from the parent and
      // retain a referance to our component specific constructor as `this.constructor`
      // on component instances' prototype chains. This is also the object we augment
      // with additional protoProps on component hydration if needed.
      Surrogate = function Surrogate(){ this.constructor = Component; };

  // Our class should inherit everything from its parent, defined above
  Surrogate.prototype = parent.prototype;
  Component.prototype = new Surrogate();

  // Set our ancestry
  Component.__super__ = parent.prototype;

  // Process our new properties objects
  processProps(protoProps, staticProps);

  // Extend our prototype with any remaining protoProps, overriting pre-defined ones
  if (protoProps){ _.extend(Component.prototype, protoProps ); }

  // Add any static props to the function object itself
  if (staticProps){ _.extend(Component, parent, staticProps); }

  // Ensure we hae a type, template and stylesheet
  Component.prototype[REBOUND_SYMBOL] = {
    type: staticProps.type || 'anonymous-component',
    template: staticProps.template || null,
    stylesheet: staticProps.stylesheet || '',
    isHydrated: staticProps.hasOwnProperty('isHydrated') ? staticProps.isHydrated : true
  };

  return Component;
};

export default Component;
