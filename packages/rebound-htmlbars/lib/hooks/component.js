import { $, REBOUND_SYMBOL } from "rebound-utils/rebound-utils";
import Component from "rebound-component/factory";

// All valid HTML attributes
const ATTRIBUTES = {  abbr: 1,      "accept-charset": 1,   accept: 1,      accesskey: 1,     action: 1,
                      align: 1,      alink: 1,             alt: 1,         archive: 1,       axis: 1,
                      background: 1, bgcolor: 1,           border: 1,      cellpadding: 1,   cellspacing: 1,
                      char: 1,       charoff: 1,           charset: 1,     checked: 1,       cite: 1,
                      class: 1,      classid: 1,           clear: 1,       code: 1,          codebase: 1,
                      codetype: 1,   color: 1,             cols: 1,        colspan: 1,       compact: 1,
                      content: 1,    coords: 1,            data: 1,        datetime: 1,      declare: 1,
                      defer: 1,      dir: 1,               disabled: 1,    enctype: 1,       face: 1,
                      for: 1,        frame: 1,             frameborder: 1, headers: 1,       height: 1,
                      href: 1,       hreflang: 1,          hspace: 1,     "http-equiv": 1,   id: 1,
                      ismap: 1,      label: 1,             lang: 1,        language: 1,      link: 1,
                      longdesc: 1,   marginheight: 1,      marginwidth: 1, maxlength: 1,     media: 1,
                      method: 1,     multiple: 1,          name: 1,        nohref: 1,        noresize: 1,
                      noshade: 1,    nowrap: 1,            object: 1,      onblur: 1,        onchange: 1,
                      onclick: 1,    ondblclick: 1,        onfocus: 1,     onkeydown: 1,     onkeypress: 1,
                      onkeyup: 1,    onload: 1,            onmousedown: 1, onmousemove: 1,   onmouseout: 1,
                      onmouseover: 1,onmouseup: 1,         onreset: 1,     onselect: 1,      onsubmit: 1,
                      onunload: 1,   profile: 1,           prompt: 1,      readonly: 1,      rel: 1,
                      rev: 1,        rows: 1,              rowspan: 1,     rules: 1,         scheme: 1,
                      scope: 1,      scrolling: 1,         selected: 1,    shape: 1,         size: 1,
                      span: 1,       src: 1,               standby: 1,     start: 1,         style: 1,
                      summary: 1,    tabindex: 1,          target: 1,      text: 1,          title: 1,
                      type: 1,       usemap: 1,            valign: 1,      value: 1,         valuetype: 1,
                      version: 1,    vlink: 1,             vspace: 1,      width: 1  };

export default function component(morph, env, scope, tagName, params, attrs, templates, visitor) {

  // Components are only ever rendered once
  if (morph.componentIsRendered){ return void 0; }

  var component, element, outlet,
      render = this.buildRenderResult,
      seedData = {},
      componentData = {};

  // Create a plain data object to pass to our new component as seed data
  for(let key in attrs){ seedData[key] = this.getValue(attrs[key]); }

  // For each param passed to our shared component, add it to our custom element
  component = Component(tagName, seedData, {[REBOUND_SYMBOL]: {templates: templates, env: env, scope: scope}});
  element = component.el;

  for(let key in seedData){

    // For each param passed to our component, create its lazyValue
    componentData[key] = this.get(component.env, component.scope, key);

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


  // TODO: Move this to Component
  // // For each change on our component, update the states of the original context and the element's proeprties.
  var updateAttrs = function updateAttrs() {
    // Only do this for fully hydrated components
    if(!component.isHydrated){ return; }
    var json = component.toJSON();

    if (_.isString(json)) return; // If is a string, this model is seralizing already

    // Set the properties on our element for visual referance if we are on a top level attribute
    _.each(json, function (value, key) {
      // TODO: Currently, showing objects as properties on the custom element causes problems.
      // Linked models between the context and component become the same exact model and all hell breaks loose.
      // Find a way to remedy this. Until then, don't show objects.
      if (_.isObject(value) || value === void 0) { return; }
      value = _.isObject(value) ? JSON.stringify(value) : value;
      try {
        ATTRIBUTES[key] ? element.setAttribute(key, value) : element.dataset[key] = value;
      } catch (e) {
        console.error(e.message);
      }
    });
  };
  component.listenTo(component, 'change', updateAttrs);
  component.onLoad(updateAttrs);

  /** The attributeChangedCallback on our custom element updates the component's data. **/

  morph.setNode(element);
  morph.componentIsRendered = true;

}
