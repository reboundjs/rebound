define( [], function(){

  return (function() {
    return window.Rebound.registerComponent("edit-todo", {
      prototype: (function(){ return ({ value: 'Default Value', arr: [{f:1}, {g:2}], obj: {a:1, b:2}, createdCallback: function(event){ this.oldValue = this.get('value'); }, attachedCallback: function(event){ this.el.querySelector('input.edit').focus(); }, detachedCallback: function(){ }, doneEditing: function(event){ this.set('editing', false); }, inputModified: function(event){ if(event.keyCode == 13) this.doneEditing(event); if(event.keyCode == 27){ this.set('value', this.oldValue); this.doneEditing(event); } } }) })(),
      template: (function() {
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
}()),
      style: ""
    });
  })();
});