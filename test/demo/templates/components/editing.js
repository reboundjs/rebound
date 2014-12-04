define( [], function(){
return (function(){
  var template = (function() {
  return {
    isHTMLBars: true,
    cachedFragment: null,
    build: function build(dom) {
      var el0 = dom.createDocumentFragment();
      var el1 = dom.createElement("content");
      dom.appendChild(el0, el1);
      var el1 = dom.createElement("input");
      dom.setAttribute(el1,"class","edit");
      dom.setAttribute(el1,"type","text");
      dom.appendChild(el0, el1);
      return el0;
    },
    render: function render(context, env, contextualElement) {
      var dom = env.dom;
      var hooks = env.hooks, get = hooks.get, attribute = hooks.attribute, element = hooks.element;
      dom.detectNamespace(contextualElement);
      if (this.cachedFragment === null) {
        this.cachedFragment = this.build(dom);
      }
      var fragment = dom.cloneNode(this.cachedFragment, true);
      var element0 = fragment.childNodes[1];
      attribute(element0, "value", true, context, [get(context, "value", env)], {}, env);
      element(element0, "on", context, ["keyup","inputModified"], {}, {element:element0}, env);
      element(element0, "on", context, ["focusout","doneEditing"], {}, {element:element0}, env);
      return fragment;
    }
  };
}())
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
    attrName = attrName.replace(/^data-/g, "").replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
    if(newVal === null){ this.__component__.unset(attrName); }
    else{ this.__component__.set(attrName, newVal, {quiet: true}); }
    script.attributeChangedCallback && script.attributeChangedCallback.call(this.__component__);
  }
  return document.registerElement("edit-todo", {prototype: proto} );
})();
});