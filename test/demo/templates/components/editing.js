define( [], function(){

  return (function() {
    return window.Rebound.registerComponent("edit-todo", {
      prototype: (function(){ return ({ test: 'test?', value: 'Default Value', arr: [{f:1}, {g:2}], obj: {a:1, b:2}, createdCallback: function(event){ this.oldValue = this.get('value'); }, attachedCallback: function(event){ this.el.querySelector('input.edit').focus(); }, detachedCallback: function(){ }, doneEditing: function(event){ this.set('editing', false); }, inputModified: function(event){ if(event.keyCode == 13) this.doneEditing(event); if(event.keyCode == 27){ this.set('value', this.oldValue); this.doneEditing(event); } } }) })(),
      template: (function() {
  return {
    isHTMLBars: true,
    blockParams: 0,
    cachedFragment: null,
    hasRendered: false,
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
      var hooks = env.hooks, get = hooks.get, concat = hooks.concat, attribute = hooks.attribute, element = hooks.element;
      dom.detectNamespace(contextualElement);
      var fragment;
      if (this.cachedFragment === null) {
        fragment = this.build(dom);
        if (this.hasRendered) {
          this.cachedFragment = fragment;
        } else {
          this.hasRendered = true;
        }
      }
      if (this.cachedFragment) {
        fragment = dom.cloneNode(this.cachedFragment, true);
      }
      var element0 = fragment.childNodes[1];
      attribute(env, element0, "value", concat(env, [get(env, context, "value")]));
      element(env, element0, context, "on", ["keyup", "inputModified"], {});
      element(env, element0, context, "on", ["focusout", "doneEditing"], {});
      return fragment;
    }
  };
}()),
      style: ""
    });
  })();
});