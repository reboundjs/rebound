define( [], function(){
return (function(){
  var template = (function() {
  function build(dom) {
    var el0 = dom.createElement("input");
    dom.setAttribute(el0,"class","edit");
    dom.setAttribute(el0,"type","text");
    return el0;
  }
  var cachedFragment;
  return function template(context, env, contextualElement) {
    var dom = env.dom, hooks = env.hooks;
    dom.detectNamespace(contextualElement);
    if (cachedFragment === undefined) {
      cachedFragment = build(dom);
    }
    var fragment = dom.cloneNode(cachedFragment, true);
    var element0 = fragment;
    hooks.element(element0, "attribute", context, ["value",hooks.subexpr("value", context, [], {context:context,types:[],hashTypes:{},hash:{}}, env)], {context:context,types:["string","sexpr"],hashTypes:{},hash:{},element:element0}, env);
    hooks.element(element0, "on", context, ["keyup","inputModified"], {context:context,types:["string","string"],hashTypes:{},hash:{},element:element0}, env);
    hooks.element(element0, "on", context, ["focusout","doneEditing"], {context:context,types:["string","string"],hashTypes:{},hash:{},element:element0}, env);
    return fragment;
  };
}());
  var script = {};
  var style = "";
  var component = Rebound.Component.extend(script, { __name: "edit-todo" });
  var proto = Object.create(HTMLElement.prototype, {});
  proto.createdCallback = function(){
    this.__component = new component({template: template, outlet: this, data: Rebound.seedData});
    script.createdCallback && script.createdCallback.call(this.__component);
  }
  proto.attachedCallback = function(){script.attachedCallback && script.attachedCallback.call(this.__component)};
  proto.detachedCallback = function(){
    this.__component.deinitialize();
    script.detachedCallback && script.detachedCallback.call(this.__component);
    };
  proto.attributeChangedCallback = function(attrName, oldVal, newVal){
    try{ newVal = JSON.parse(newVal); } catch (e){ newVal = newVal; }
    if(newVal === null){ this.__component.unset(attrName); }
    else{ this.__component.set(attrName, newVal); }
    script.attributeChangedCallback && script.attributeChangedCallback.call(this.__component);
  }
  return document.registerElement("edit-todo", {prototype: proto} );
})();
});