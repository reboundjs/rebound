import { $, REBOUND_SYMBOL } from "rebound-utils/rebound-utils";
import Component from "rebound-component/factory";

export default function component(morph, env, scope, tagName, params, attrs, templates, visitor) {

  // Components are only ever rendered once
  if (morph.componentIsRendered){ return void 0; }

  var component, element, outlet,
      render = this.buildRenderResult,
      seedData = {},
      componentData = {},
      componentScope = this.createFreshScope();

  // Create a plain data object to pass to our new component as seed data
  for(let key in attrs){ seedData[key] = this.getValue(attrs[key]); }

  // For each param passed to our shared component, add it to our custom element
  component = Component(tagName, seedData, {[REBOUND_SYMBOL]: {templates: templates, env: env, scope: scope}});
  element = component.el;
  componentScope.self = component;

  for(let key in seedData){

    // For each param passed to our component, create its lazyValue
    componentData[key] = this.get(component.env, componentScope, key);

    // Set up two way binding between component and original context
    if(componentData[key].isLazyValue && attrs[key].isLazyValue){

      // For each lazy param passed to our component, have it update the original context when changed.
      componentData[key].onNotify(function(){
        attrs[key].set(attrs[key].path, componentData[key].value);
      });

      // For each lazy param passed to our component, have it update the component when changed.
      attrs[key].onNotify(function(){
        componentData[key].set(key, attrs[key].value);
      });

      // Seed the cache
      componentData[key].value;

    }
  }

  /** The attributeChangedCallback on our custom element updates the component's data. **/

  morph.setNode(element);
  morph.componentIsRendered = true;

}
