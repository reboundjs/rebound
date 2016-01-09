import { wrapPartial } from "rebound-htmlbars/wrap";
import loader from "rebound-router/loader";

var PARTIALS = {};

if(!window.partialsRegistered){
  // Create our new element prototype object
  var element = Object.create(HTMLElement.prototype, {});

  // On element creation, make a new instance of the component and attach it
  // to the element object as `data`
  element.createdCallback = function() {

  };

  element.attributeChangedCallback = function(attr, oldVal, newVal){
    console.log('PARTIAL NAME:', attr, oldVal, newVal);
    if(attr !== 'type' || !this.data || !PARTIALS[newVal]){ return void 0; }
    this.template = PARTIALS[newVal].render(this.data.scope, {env: this.data.env, contextualElement: this.data.renderNode.contextualElement});
    this.innerHTML = null;
    this.appendChild(this.template.fragment);
  }

  // Register our partial component
  document.registerElement('rebound-partial', { prototype: element });
  window.partialsRegistered = true;
}

export function registerPartial(name, func){
  if(func && _.isString(name)){
    loader.register(name);
    return PARTIALS[name] = wrapPartial(func);
  }
}

export default function partial(renderNode, env, scope, path){
  if(!path){ console.error('Partial hook must be passed path!'); }
  path = path.isLazyValue ? path.value : path;
  var el = document.createElement('rebound-partial');
  el.data = {scope: scope, env: env, renderNode: renderNode};
  el.setAttribute('type', path);
  return el;
}