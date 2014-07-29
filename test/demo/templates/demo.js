define( ["test/demo/templates/components/editing"], function(){
(function(){
  var template = (function() {
  var child0 = (function() {
    var child0 = (function() {
      var child0 = (function() {
        var child0 = (function() {
          function build(dom) {
            var el0 = dom.createTextNode("asdf");
            return el0;
          }
          var cachedFragment;
          return function template(context, env, contextualElement) {
            var dom = env.dom, hooks = env.hooks;
            if (cachedFragment === undefined) {
              cachedFragment = build(dom);
            }
            var fragment = dom.cloneNode(cachedFragment, true);
            return fragment;
          };
        }());
        function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode(" ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode(" ");
          dom.appendChild(el0, el1);
          return el0;
        }
        var cachedFragment;
        return function template(context, env, contextualElement) {
          var dom = env.dom, hooks = env.hooks;
          if (cachedFragment === undefined) {
            cachedFragment = build(dom);
          }
          var fragment = dom.cloneNode(cachedFragment, true);
          var morph0 = dom.createMorphAt(fragment.childNodes[1],-1,-1);
          hooks.webComponent(morph0, "edit-todo", context, {context:context,types:[],hashTypes:{value:"sexpr",editing:"sexpr"},hash:{value:hooks.subexpr("title", context, [], {context:context,types:[],hashTypes:{},hash:{}}, env),editing:hooks.subexpr("editing", context, [], {context:context,types:[],hashTypes:{},hash:{}}, env)},render:child0}, env);
          return fragment;
        };
      }());
      var child1 = (function() {
        function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode(" ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("input");
          dom.setAttribute(el1,"type","checkbox");
          dom.setAttribute(el1,"class","toggle");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("label");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("button");
          dom.setAttribute(el1,"class","destroy");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode(" ");
          dom.appendChild(el0, el1);
          return el0;
        }
        var cachedFragment;
        return function template(context, env, contextualElement) {
          var dom = env.dom, hooks = env.hooks;
          if (cachedFragment === undefined) {
            cachedFragment = build(dom);
          }
          var fragment = dom.cloneNode(cachedFragment, true);
          dom.repairClonedNode(fragment.childNodes[1],[],true);
          var element1 = fragment.childNodes[1];
          var element2 = fragment.childNodes[2];
          var element3 = fragment.childNodes[3];
          var morph0 = dom.createMorphAt(element2,-1,-1);
          hooks.element(element1, "attribute", context, ["checked",hooks.subexpr("isCompleted", context, [], {context:context,types:[],hashTypes:{},hash:{}}, env)], {context:context,types:["string","sexpr"],hashTypes:{},hash:{},element:element1}, env);
          hooks.element(element2, "on", context, ["dblclick","editTodo"], {context:context,types:["string","string"],hashTypes:{},hash:{},element:element2}, env);
          hooks.content(morph0, "title", context, [], {escaped:true}, env);
          hooks.element(element3, "on", context, ["click","removeTodo"], {context:context,types:["string","string"],hashTypes:{},hash:{},element:element3}, env);
          return fragment;
        };
      }());
      function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createTextNode(" ");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("li");
        var el2 = dom.createTextNode(" ");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode(" ");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode(" ");
        dom.appendChild(el0, el1);
        return el0;
      }
      var cachedFragment;
      return function template(context, env, contextualElement) {
        var dom = env.dom, hooks = env.hooks;
        if (cachedFragment === undefined) {
          cachedFragment = build(dom);
        }
        var fragment = dom.cloneNode(cachedFragment, true);
        var element4 = fragment.childNodes[1];
        var morph0 = dom.createMorphAt(element4,0,1);
        hooks.element(element4, "attribute", context, ["class",hooks.subexpr("concat", context, [hooks.subexpr("if", context, ["isCompleted","completed"], {context:context,types:["id","string"],hashTypes:{},hash:{}}, env)," ",hooks.subexpr("if", context, ["editing","editing"], {context:context,types:["id","string"],hashTypes:{},hash:{}}, env)], {context:context,types:["sexpr","string","sexpr"],hashTypes:{},hash:{}}, env)], {context:context,types:["string","sexpr"],hashTypes:{},hash:{},element:element4}, env);
        hooks.content(morph0, "if", context, ["editing"], {context:context,types:["id"],hashTypes:{},hash:{},render:child0,inverse:child1,escaped:true,morph:morph0}, env);
        return fragment;
      };
    }());
    var child1 = (function() {
      function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createTextNode(" ");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("button");
        dom.setAttribute(el1,"id","clear-completed");
        var el2 = dom.createTextNode(" Clear completed (");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode(") ");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode(" ");
        dom.appendChild(el0, el1);
        return el0;
      }
      var cachedFragment;
      return function template(context, env, contextualElement) {
        var dom = env.dom, hooks = env.hooks;
        if (cachedFragment === undefined) {
          cachedFragment = build(dom);
        }
        var fragment = dom.cloneNode(cachedFragment, true);
        var element0 = fragment.childNodes[1];
        var morph0 = dom.createMorphAt(element0,0,1);
        hooks.element(element0, "on", context, ["click","clearCompleted"], {context:context,types:["string","string"],hashTypes:{},hash:{},element:element0}, env);
        hooks.content(morph0, "completed", context, [], {escaped:true}, env);
        return fragment;
      };
    }());
    function build(dom) {
      var el0 = dom.createDocumentFragment();
      var el1 = dom.createTextNode(" ");
      dom.appendChild(el0, el1);
      var el1 = dom.createElement("section");
      dom.setAttribute(el1,"id","main");
      var el2 = dom.createElement("ul");
      dom.setAttribute(el2,"id","todo-list");
      var el3 = dom.createTextNode(" ");
      dom.appendChild(el2, el3);
      var el3 = dom.createTextNode(" ");
      dom.appendChild(el2, el3);
      dom.appendChild(el1, el2);
      var el2 = dom.createElement("input");
      dom.setAttribute(el2,"type","checkbox");
      dom.setAttribute(el2,"id","toggle-all");
      dom.appendChild(el1, el2);
      dom.appendChild(el0, el1);
      var el1 = dom.createElement("footer");
      dom.setAttribute(el1,"id","footer");
      var el2 = dom.createElement("span");
      dom.setAttribute(el2,"id","todo-count");
      var el3 = dom.createElement("strong");
      dom.appendChild(el2, el3);
      var el3 = dom.createTextNode(" item left");
      dom.appendChild(el2, el3);
      dom.appendChild(el1, el2);
      var el2 = dom.createElement("ul");
      dom.setAttribute(el2,"id","filters");
      var el3 = dom.createElement("li");
      var el4 = dom.createElement("a");
      dom.setAttribute(el4,"href","/all");
      dom.setAttribute(el4,"class","selected");
      var el5 = dom.createTextNode("All");
      dom.appendChild(el4, el5);
      dom.appendChild(el3, el4);
      dom.appendChild(el2, el3);
      var el3 = dom.createElement("li");
      var el4 = dom.createElement("a");
      dom.setAttribute(el4,"href","/active");
      var el5 = dom.createTextNode("Active");
      dom.appendChild(el4, el5);
      dom.appendChild(el3, el4);
      dom.appendChild(el2, el3);
      var el3 = dom.createElement("li");
      var el4 = dom.createElement("a");
      dom.setAttribute(el4,"href","/completed");
      var el5 = dom.createTextNode("Completed");
      dom.appendChild(el4, el5);
      dom.appendChild(el3, el4);
      dom.appendChild(el2, el3);
      dom.appendChild(el1, el2);
      var el2 = dom.createTextNode(" ");
      dom.appendChild(el1, el2);
      var el2 = dom.createTextNode(" ");
      dom.appendChild(el1, el2);
      dom.appendChild(el0, el1);
      var el1 = dom.createTextNode(" ");
      dom.appendChild(el0, el1);
      return el0;
    }
    var cachedFragment;
    return function template(context, env, contextualElement) {
      var dom = env.dom, hooks = env.hooks;
      if (cachedFragment === undefined) {
        cachedFragment = build(dom);
      }
      var fragment = dom.cloneNode(cachedFragment, true);
      var element5 = fragment.childNodes[1];
      var element6 = element5.childNodes[1];
      dom.repairClonedNode(element6,[],true);
      var element7 = fragment.childNodes[2];
      var morph0 = dom.createMorphAt(element5.childNodes[0],0,1);
      var morph1 = dom.createMorphAt(element7.childNodes[0].childNodes[0],-1,-1);
      var morph2 = dom.createMorphAt(element7,2,3);
      hooks.content(morph0, "each", context, ["filteredTodos"], {context:context,types:["id"],hashTypes:{},hash:{},render:child0,escaped:true,morph:morph0}, env);
      hooks.element(element6, "attribute", context, ["checked",hooks.subexpr("allAreDone", context, [], {context:context,types:[],hashTypes:{},hash:{}}, env)], {context:context,types:["string","sexpr"],hashTypes:{},hash:{},element:element6}, env);
      hooks.element(element6, "on", context, ["click","toggleAll"], {context:context,types:["string","string"],hashTypes:{},hash:{},element:element6}, env);
      hooks.content(morph1, "remaining", context, [], {escaped:true}, env);
      hooks.content(morph2, "unless", context, ["noneAreDone"], {context:context,types:["id"],hashTypes:{},hash:{},render:child1,escaped:true,morph:morph2}, env);
      return fragment;
    };
  }());
  function build(dom) {
    var el0 = dom.createDocumentFragment();
    var el1 = dom.createElement("img");
    dom.setAttribute(el1,"src","http://reboundjs.com/images/rebound.svg");
    dom.setAttribute(el1,"id","rebound-logo");
    dom.appendChild(el0, el1);
    var el1 = dom.createElement("section");
    dom.setAttribute(el1,"id","todoapp");
    var el2 = dom.createElement("header");
    dom.setAttribute(el2,"id","header");
    var el3 = dom.createElement("h1");
    var el4 = dom.createTextNode("todos");
    dom.appendChild(el3, el4);
    dom.appendChild(el2, el3);
    var el3 = dom.createElement("input");
    dom.setAttribute(el3,"id","new-todo");
    dom.setAttribute(el3,"type","text");
    dom.setAttribute(el3,"placeholder","What needs to be done?");
    dom.setAttribute(el3,"rebound-action","createTodo");
    dom.appendChild(el2, el3);
    dom.appendChild(el1, el2);
    var el2 = dom.createTextNode(" ");
    dom.appendChild(el1, el2);
    var el2 = dom.createTextNode(" ");
    dom.appendChild(el1, el2);
    dom.appendChild(el0, el1);
    var el1 = dom.createElement("footer");
    dom.setAttribute(el1,"id","info");
    var el2 = dom.createElement("p");
    var el3 = dom.createTextNode("Double-click to edit a todo");
    dom.appendChild(el2, el3);
    dom.appendChild(el1, el2);
    var el2 = dom.createElement("p");
    var el3 = dom.createTextNode(" Created by ");
    dom.appendChild(el2, el3);
    var el3 = dom.createElement("a");
    dom.setAttribute(el3,"href","http://github.com/epicmiller");
    var el4 = dom.createTextNode("Adam Miller");
    dom.appendChild(el3, el4);
    dom.appendChild(el2, el3);
    var el3 = dom.createTextNode(", ");
    dom.appendChild(el2, el3);
    dom.appendChild(el1, el2);
    var el2 = dom.createElement("p");
    var el3 = dom.createTextNode("Part of ");
    dom.appendChild(el2, el3);
    var el3 = dom.createElement("a");
    dom.setAttribute(el3,"href","http://todomvc.com");
    var el4 = dom.createTextNode("TodoMVC");
    dom.appendChild(el3, el4);
    dom.appendChild(el2, el3);
    dom.appendChild(el1, el2);
    dom.appendChild(el0, el1);
    return el0;
  }
  var cachedFragment;
  return function template(context, env, contextualElement) {
    var dom = env.dom, hooks = env.hooks;
    if (cachedFragment === undefined) {
      cachedFragment = build(dom);
    }
    var fragment = dom.cloneNode(cachedFragment, true);
    var element8 = fragment.childNodes[1];
    var element9 = element8.childNodes[0].childNodes[1];
    var morph0 = dom.createMorphAt(element8,1,2);
    hooks.element(element9, "attribute", context, ["value",hooks.subexpr("newTitle", context, [], {context:context,types:[],hashTypes:{},hash:{}}, env)], {context:context,types:["string","sexpr"],hashTypes:{},hash:{},element:element9}, env);
    hooks.content(morph0, "if", context, ["todos"], {context:context,types:["id"],hashTypes:{},hash:{},render:child0,escaped:true,morph:morph0}, env);
    return fragment;
  };
}());
  var script = (function(){ return ({ initialize: function(options){ }, readyCallback: function(){ }, insertedCallback: function(){ }, removedCallback: function(){ }, routes: { ":filter" : "filterList" }, newTitle: '', filter: 'all', todos: [ { title: "Tie Bowtie", editing: false, isCompleted: true },{ title: "Look Dapper", editing: false, isCompleted: false, },{ title: "Profit", editing: false, isCompleted: false, arr: [{a: 1}, {b: 2}, {c: 3}] } ], allAreDone: function(){ return this.get('todos').where({'isCompleted': true}).length == this.get('filteredTodos').length; }, noneAreDone: function(){ return this.get('todos').where({'isCompleted': true}).length == 0; }, remaining: function(){ return this.get('todos').where({'isCompleted': false}).length; }, completed: function(){ return this.get('todos').where({'isCompleted': true}).length; }, filteredTodos: function(){ if(this.get('filter') == 'all') return this.get('todos'); if(this.get('filter') == 'active') return this.get('todos').where({'isCompleted': false}); if(this.get('filter') == 'completed') return this.get('todos').where({'isCompleted': true}); }, createTodo: function(event){ if(this.get('newTitle') == '') return; this.get('todos').add({ title: this.get('newTitle'), editing: false, isCompleted: false }); this.set('newTitle', ''); }, toggleAll: function(event){ var value = event.currentTarget.checked; this.get('todos').forEach(function(model, index) { model.set('isCompleted', value); }); }, clearCompleted: function(event){ this.get('todos').remove( this.get('todos').where({'isCompleted': true}) ); }, removeTodo: function(event){ this.get('todos').remove(event.data); }, editTodo: function(event){ event.data.set('editing', true); }, filterList: function(filter){ this.set('filter', filter) } }); })() || {};
  var style = "";
  window.Rebound.registerComponent({
    name:"demo",
    template: template,
    script: script,
    style: style
  });
})();
return Rebound.components["demo"];
});