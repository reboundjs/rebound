define( [], function(){
(function(){var template = (function() {
  function build(dom) {
    var el0 = dom.createElement("input");
    dom.setAttribute(el0,"class","edit");
    dom.setAttribute(el0,"type","text");
    dom.setAttribute(el0,"rebound-action","doneEditing");
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
    hooks.element(element0, "attribute", context, ["value",hooks.subexpr("title", context, [], {context:context,types:[],hashTypes:{},hash:{}}, env)], {context:context,types:["string","sexpr"],hashTypes:{},hash:{},element:element0}, env);
    hooks.element(element0, "on", context, ["blur","doneEditing"], {context:context,types:["string","string"],hashTypes:{},hash:{},element:element0}, env);
    hooks.element(element0, "loadEdit", context, [], {context:context,types:[],hashTypes:{},hash:{},element:element0}, env);
    return fragment;
  };
}()); window.Rebound.registerPartial( "", template);})();
});