// Rebound Component Factory
// ----------------

import { $, REBOUND_SYMBOL } from "rebound-utils/rebound-utils";
import Component from "rebound-component/component";
import { wrapComponent } from "rebound-htmlbars/wrap";

var REGISTRY = {};
const DUMMY_TEMPLATE = {
  render(){
    return { fragment: new DocumentFragment() };
  }
};

// Used to transport component specific data to the native element created callback
// in leu of a good API for passing initialization data to document.createElement.
// When registry.create is called, it stashes instance data on this object in a
// shared scope. After createElement is finished, it cleans this transport object
var ELEMENT_DATA = {
  full: false,
  save(instance, data, options){
    this.full = true;
    this.instance = instance;
    this.data = data;
    this.options = options;
  },
  clean(){
    this.full = false;
    delete this.instance;
    delete this.data;
    delete this.options;
  }
};

function reserveComponent(type){

  // If the component exists in the registry, and is hydrated already, this is
  // a duplicate component name – exit and log an error.
  if(REGISTRY[type] && REGISTRY[type].isHydrated){ return console.error('A component of type', type, 'already exists!'); }

  // If the component exists in the registry, and is not yet hydrated,
  // simply return the existing dehydrated constructor.
  if(REGISTRY[type] && !REGISTRY[type].isHydrated){ return REGISTRY[type]; }

  // Otherwise, create and return a new component subclass and register the element
  return REGISTRY[type] = Component.extend({}, {
    isHydrated: false,
    type: type,
    template: DUMMY_TEMPLATE
  });

}


export function registerComponent(type, options={}) {

  // Ensure our options are set nicely and extract the prototype provided to us
  var proto = options.prototype || {};
      delete options.prototype;
      options.type = type;
      options.isHydrated = true;

  // If the view layer provides a teplate wrapper, wrap any template provided in it
  if(wrapComponent){ options.template = wrapComponent(options.template); }

  // If the component exists in the registry, and is already hydrated, then this
  // is a conflicting component name – exit and log an error.
  if(REGISTRY[type] && REGISTRY[type].isHydrated){ return console.error('A component of type', type, 'already exists!'); }

  // If there is a non-hydrated component in the registry, hydrate it with the
  // newly provided prototype.
  if(REGISTRY[type]){
    REGISTRY[type].hydrate(proto, options);
  }

  // Otherwise, create and save a new component subclass and register the element
  else {
    REGISTRY[type] = Component.extend(proto, options);
  }

  // Create our new element prototype object
  var element = Object.create(HTMLElement.prototype, {});

  // On element creation, make a new instance of the component and attach it
  // to the element object as `data`
  element.createdCallback = function() {

    // If `this.data` already exists on this element, then it was present on the
    // page via a `new Component(component-name);` call before this component was
    // actually registered. Now, we need to finish hydrating this instance of the
    // component data object.
    if(this.data){
      this.data.reset(this.data.toJSON());
      this.data.rerender();
      this.data.isHydrated = true;
      this.data.loadCallbacks.forEach( (cb)=>{ cb(this.data); } );
    }

    // If we have element data, then we have come from a `new Component(component-name);`
    // call and may have been provided data to initialize with. Call the component
    // constructor with the provided properties. We don't need `new` here because
    // the instance we are building is provided for us, so we use `component.call`
    // to call the component constructor using that scope.
    else if(ELEMENT_DATA.full){
      this.data = new REGISTRY[type](this, ELEMENT_DATA.data, ELEMENT_DATA.options);
    }

    // Otherwise, this is an upgraded instance of the element that was pre-existing
    // in the dom, or just created using `document.createElement`. Go ahead and
    // give it a new component object.
    else { this.data = new REGISTRY[type](this); }

    // Call user provided `attachedCallback`
    _.isFunction(proto.createdCallback) && proto.createdCallback.call(this.data);
  };

  // Call user provided `attachedCallback`
  element.attachedCallback = function() {
    _.isFunction(proto.attachedCallback) && proto.attachedCallback.call(this.data);
  };

  // Call user provided `detachedCallback`
  element.detachedCallback = function() {
    _.isFunction(proto.detachedCallback) && proto.detachedCallback.call(this.data);
  };

  // Call user provided `attributeChangedCallback`
  element.attributeChangedCallback = function(attrName, oldVal, newVal) {
    this.data._onAttributeChange(attrName, oldVal, newVal);
    _.isFunction(proto.attributeChangedCallback) && proto.attributeChangedCallback.call(this.data, attrName, oldVal, newVal);
  };

  // Register our new element
  document.registerElement(type, { prototype: element });

  // Return the new component constructor
  return REGISTRY[type];
}


export var ComponentFactory = function ComponentFactory(type, data={}, options={}){

  // If type is not a valid component name, error
  if(typeof type !== 'string'){ return console.error('Invalid component type provided to createComponent. Instead received:', type); }

  var el;

  // If this component is not in the registry, register a dehydrated component
  // as a placeholder. Once the actual component is loaded, all running instances
  // of this component type will be hydrated.
  if(!REGISTRY[type] || !REGISTRY[type].isHydrated){
    el = document.createElement(type);
    options.isHydrated = false;
    el.data = new (reserveComponent(type))(el, data, options);
  }

  // If this component is in the registry, save the instance specific data to
  // deliver to the createElement call, and create the element. As part of the
  // `createdCallback` a new instance of
  else {
    ELEMENT_DATA.save(this, data, options);
    el = document.createElement(type);
    ELEMENT_DATA.clean();
  }

  return el.data;

};

ComponentFactory.registerComponent = registerComponent;

export default ComponentFactory;