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
    if (cachedFragment === undefined) {
      cachedFragment = build(dom);
    }
    var fragment = dom.cloneNode(cachedFragment, true);
    var element0 = fragment;
    hooks.element(element0, "attribute", context, ["value",hooks.subexpr("value", context, [], {context:context,types:[],hashTypes:{},hash:{}}, env)], {context:context,types:["string","sexpr"],hashTypes:{},hash:{},element:element0}, env);
    hooks.element(element0, "on", context, ["blur","doneEditing"], {context:context,types:["string","string"],hashTypes:{},hash:{},element:element0}, env);
    hooks.element(element0, "on", context, ["keyup","inputModified"], {context:context,types:["string","string"],hashTypes:{},hash:{},element:element0}, env);
    return fragment;
  };
}());
  var script = (function(){ return ({ value: 'Default Value', createdCallback: function(event){ console.log('created!'); this.oldValue = this.get('value'); }, attachedCallback: function(event){ console.log('attached!'); this.$('input.edit').focus(); }, detachedCallback: function(){ console.log('removed!', this.el); }, doneEditing: function(event){ this.set('editing', false); }, inputModified: function(event){ if(event.keyCode == 13) this.doneEditing(event); if(event.keyCode == 27){ this.set('value', this.oldValue); this.doneEditing(event); } } }) })() || {};
  var style = "";
  var component = Backbone.Controller.extend(script, { __name: "edit-todo" });
  var proto = Object.create(HTMLElement.prototype, {});
  proto.createdCallback = function(){
    this.__template = new component({template: template, outlet: this, data: Rebound.seedData});
    script.createdCallback && script.createdCallback.call(this.__template);
  }
  proto.attachedCallback = function(){script.attachedCallback && script.attachedCallback.call(this.__template)};
  proto.detachedCallback = function(){
    this.__template.deinitialize();
    script.detachedCallback && script.detachedCallback.call(this.__template);
    };
  proto.attributeChangedCallback = function(attrName, oldVal, newVal){
    try{ newVal = JSON.parse(newVal); } catch (e){ newVal = newVal; }
    this.__template.set(attrName, newVal);
    script.attributeChangedCallback && script.attributeChangedCallback.call(this.__template);
  }
  return document.registerElement("edit-todo", {prototype: proto} );
})();
});