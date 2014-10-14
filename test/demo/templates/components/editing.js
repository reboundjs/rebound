define( [], function(){
return (function(){
  var template = (function() {
  function build(dom) {
    var el0 = dom.createDocumentFragment();
    var el1 = dom.createElement("content");
    dom.appendChild(el0, el1);
    var el1 = dom.createElement("input");
    dom.setAttribute(el1,"class","edit");
    dom.setAttribute(el1,"type","text");
    dom.appendChild(el0, el1);
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
    var element0 = fragment.childNodes[1];
    hooks.element(element0, "attribute", context, ["value",hooks.subexpr("value", context, [], {context:context,types:[],hashTypes:{},hash:{}}, env)], {context:context,types:["string","sexpr"],hashTypes:{},hash:{},element:element0}, env);
    hooks.element(element0, "on", context, ["keyup","inputModified"], {context:context,types:["string","string"],hashTypes:{},hash:{},element:element0}, env);
    hooks.element(element0, "on", context, ["focusout","doneEditing"], {context:context,types:["string","string"],hashTypes:{},hash:{},element:element0}, env);
    return fragment;
  };
}());
  var script = (function(){ return ({ value: 'Default Value', arr: [{f:1}, {g:2}], obj: {a:1, b:2}, createdCallback: function(event){ this.oldValue = this.get('value'); }, attachedCallback: function(event){ this.el.querySelector('input.edit').focus(); }, detachedCallback: function(){ }, doneEditing: function(event){ this.set('editing', false); }, inputModified: function(event){ if(event.keyCode == 13) this.doneEditing(event); if(event.keyCode == 27){ this.set('value', this.oldValue); this.doneEditing(event); } } }) })();
  var style = "";
  var component = Rebound.Component.extend(script, { __name: "edit-todo" });
  var proto = Object.create(HTMLElement.prototype, {});
  proto.createdCallback = function(){
    this.__component__ = new component({template: template, outlet: this, data: Rebound.seedData});
  }
  proto.attachedCallback = function(){script.attachedCallback && script.attachedCallback.call(this.__component__)};
  proto.detachedCallback = function(){
    script.detachedCallback && script.detachedCallback.call(this.__component__);
    this.__component__.deinitialize();
    };
  proto.attributeChangedCallback = function(attrName, oldVal, newVal){
    try{ newVal = JSON.parse(newVal); } catch (e){ newVal = newVal; }
    if(newVal === null){ this.__component__.unset(attrName); }
    else{ this.__component__.set(attrName, newVal); }
    script.attributeChangedCallback && script.attributeChangedCallback.call(this.__component__);
  }
  return document.registerElement("edit-todo", {prototype: proto} );
})();
});