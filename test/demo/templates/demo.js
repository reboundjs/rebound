(function(){var template = (function() {
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
            if (contextualElement === undefined) {
              contextualElement = dom.document.body;
            }
            var fragment = dom.cloneNode(cachedFragment, true);
            return fragment;
          };
        }());
        function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n              \n              ");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n							\n						");
          dom.appendChild(el0, el1);
          return el0;
        }
        var cachedFragment;
        return function template(context, env, contextualElement) {
          var dom = env.dom, hooks = env.hooks;
          if (cachedFragment === undefined) {
            cachedFragment = build(dom);
          }
          if (contextualElement === undefined) {
            contextualElement = dom.document.body;
          }
          var fragment = dom.cloneNode(cachedFragment, true);
          var morph0 = dom.createMorph(fragment,0,1,contextualElement);
          var morph1 = dom.createMorph(fragment,1,2,contextualElement);
          hooks.content(morph0, "partial", context, ["test/demo/templates/editing"], {context:context,types:["string"],hashTypes:{},hash:{},escaped:true,morph:morph0}, env);
          hooks.webComponent(morph1, "test-element", context, {context:context,types:[],hashTypes:{},hash:{},render:child0}, env);
          return fragment;
        };
      }());
      var child1 = (function() {
        function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("\n							");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("input");
          dom.setAttribute(el1,"type","checkbox");
          dom.setAttribute(el1,"class","toggle");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n							");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("label");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n							");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("button");
          dom.setAttribute(el1,"class","destroy");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n						");
          dom.appendChild(el0, el1);
          return el0;
        }
        var cachedFragment;
        return function template(context, env, contextualElement) {
          var dom = env.dom, hooks = env.hooks;
          if (cachedFragment === undefined) {
            cachedFragment = build(dom);
          }
          if (contextualElement === undefined) {
            contextualElement = dom.document.body;
          }
          var fragment = dom.cloneNode(cachedFragment, true);
          var element1 = fragment.childNodes[1];
          var element2 = fragment.childNodes[3];
          var morph0 = dom.createMorph(element2,-1,-1);
          var element3 = fragment.childNodes[5];
          hooks.element(element1, "attribute", context, ["checked",hooks.subexpr("isCompleted", context, [], {context:context,types:[],hashTypes:{},hash:{}}, env)], {context:context,types:["string","sexpr"],hashTypes:{},hash:{},element:element1}, env);
          hooks.element(element2, "on", context, ["dblclick","editTodo"], {context:context,types:["string","string"],hashTypes:{},hash:{},element:element2}, env);
          hooks.content(morph0, "title", context, [], {escaped:true}, env);
          hooks.element(element3, "on", context, ["click","removeTodo"], {context:context,types:["string","string"],hashTypes:{},hash:{},element:element3}, env);
          return fragment;
        };
      }());
      function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createTextNode("\n					");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("li");
        var el2 = dom.createTextNode("\n						");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n						");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n				");
        dom.appendChild(el0, el1);
        return el0;
      }
      var cachedFragment;
      return function template(context, env, contextualElement) {
        var dom = env.dom, hooks = env.hooks;
        if (cachedFragment === undefined) {
          cachedFragment = build(dom);
        }
        if (contextualElement === undefined) {
          contextualElement = dom.document.body;
        }
        var fragment = dom.cloneNode(cachedFragment, true);
        var element4 = fragment.childNodes[1];
        var morph0 = dom.createMorph(element4,0,1);
        hooks.element(element4, "attribute", context, ["class",hooks.subexpr("concat", context, [hooks.subexpr("if", context, ["isCompleted","completed"], {context:context,types:["id","string"],hashTypes:{},hash:{}}, env)," ",hooks.subexpr("if", context, ["editing","editing"], {context:context,types:["id","string"],hashTypes:{},hash:{}}, env)], {context:context,types:["sexpr","string","sexpr"],hashTypes:{},hash:{}}, env)], {context:context,types:["string","sexpr"],hashTypes:{},hash:{},element:element4}, env);
        hooks.content(morph0, "if", context, ["editing"], {context:context,types:["id"],hashTypes:{},hash:{},render:child0,inverse:child1,escaped:true,morph:morph0}, env);
        return fragment;
      };
    }());
    var child1 = (function() {
      function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createTextNode("\n				");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("button");
        dom.setAttribute(el1,"id","clear-completed");
        var el2 = dom.createTextNode("\n					Clear completed (");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode(")\n				");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n			");
        dom.appendChild(el0, el1);
        return el0;
      }
      var cachedFragment;
      return function template(context, env, contextualElement) {
        var dom = env.dom, hooks = env.hooks;
        if (cachedFragment === undefined) {
          cachedFragment = build(dom);
        }
        if (contextualElement === undefined) {
          contextualElement = dom.document.body;
        }
        var fragment = dom.cloneNode(cachedFragment, true);
        var element0 = fragment.childNodes[1];
        var morph0 = dom.createMorph(element0,0,1);
        hooks.element(element0, "on", context, ["click","clearCompleted"], {context:context,types:["string","string"],hashTypes:{},hash:{},element:element0}, env);
        hooks.content(morph0, "completed", context, [], {escaped:true}, env);
        return fragment;
      };
    }());
    function build(dom) {
      var el0 = dom.createDocumentFragment();
      var el1 = dom.createTextNode("\n		");
      dom.appendChild(el0, el1);
      var el1 = dom.createElement("section");
      dom.setAttribute(el1,"id","main");
      var el2 = dom.createTextNode("\n			");
      dom.appendChild(el1, el2);
      var el2 = dom.createElement("ul");
      dom.setAttribute(el2,"id","todo-list");
      var el3 = dom.createTextNode("\n				");
      dom.appendChild(el2, el3);
      var el3 = dom.createTextNode("\n			");
      dom.appendChild(el2, el3);
      dom.appendChild(el1, el2);
      var el2 = dom.createTextNode("\n			");
      dom.appendChild(el1, el2);
      var el2 = dom.createElement("input");
      dom.setAttribute(el2,"type","checkbox");
      dom.setAttribute(el2,"id","toggle-all");
      dom.appendChild(el1, el2);
      var el2 = dom.createTextNode("\n		");
      dom.appendChild(el1, el2);
      dom.appendChild(el0, el1);
      var el1 = dom.createTextNode("\n		");
      dom.appendChild(el0, el1);
      var el1 = dom.createElement("footer");
      dom.setAttribute(el1,"id","footer");
      var el2 = dom.createTextNode("\n			");
      dom.appendChild(el1, el2);
      var el2 = dom.createElement("span");
      dom.setAttribute(el2,"id","todo-count");
      var el3 = dom.createElement("strong");
      dom.appendChild(el2, el3);
      var el3 = dom.createTextNode(" item left");
      dom.appendChild(el2, el3);
      dom.appendChild(el1, el2);
      var el2 = dom.createTextNode("\n			");
      dom.appendChild(el1, el2);
      var el2 = dom.createElement("ul");
      dom.setAttribute(el2,"id","filters");
      var el3 = dom.createTextNode("\n				");
      dom.appendChild(el2, el3);
      var el3 = dom.createElement("li");
      var el4 = dom.createTextNode("\n					");
      dom.appendChild(el3, el4);
      var el4 = dom.createElement("a");
      dom.setAttribute(el4,"class","selected");
      var el5 = dom.createTextNode("All");
      dom.appendChild(el4, el5);
      dom.appendChild(el3, el4);
      var el4 = dom.createTextNode("\n				");
      dom.appendChild(el3, el4);
      dom.appendChild(el2, el3);
      var el3 = dom.createTextNode("\n				");
      dom.appendChild(el2, el3);
      var el3 = dom.createElement("li");
      var el4 = dom.createTextNode("\n					");
      dom.appendChild(el3, el4);
      var el4 = dom.createElement("a");
      var el5 = dom.createTextNode("Active");
      dom.appendChild(el4, el5);
      dom.appendChild(el3, el4);
      var el4 = dom.createTextNode("\n				");
      dom.appendChild(el3, el4);
      dom.appendChild(el2, el3);
      var el3 = dom.createTextNode("\n				");
      dom.appendChild(el2, el3);
      var el3 = dom.createElement("li");
      var el4 = dom.createTextNode("\n          ");
      dom.appendChild(el3, el4);
      var el4 = dom.createElement("a");
      var el5 = dom.createTextNode("Completed");
      dom.appendChild(el4, el5);
      dom.appendChild(el3, el4);
      var el4 = dom.createTextNode("\n					\n				");
      dom.appendChild(el3, el4);
      dom.appendChild(el2, el3);
      var el3 = dom.createTextNode("\n			");
      dom.appendChild(el2, el3);
      dom.appendChild(el1, el2);
      var el2 = dom.createTextNode("\n			");
      dom.appendChild(el1, el2);
      var el2 = dom.createTextNode("\n		");
      dom.appendChild(el1, el2);
      dom.appendChild(el0, el1);
      var el1 = dom.createTextNode("\n  ");
      dom.appendChild(el0, el1);
      return el0;
    }
    var cachedFragment;
    return function template(context, env, contextualElement) {
      var dom = env.dom, hooks = env.hooks;
      if (cachedFragment === undefined) {
        cachedFragment = build(dom);
      }
      if (contextualElement === undefined) {
        contextualElement = dom.document.body;
      }
      var fragment = dom.cloneNode(cachedFragment, true);
      var element5 = fragment.childNodes[1];
      var morph0 = dom.createMorph(element5.childNodes[1],0,1);
      var element6 = element5.childNodes[3];
      var element7 = fragment.childNodes[3];
      var morph1 = dom.createMorph(element7.childNodes[1].childNodes[0],-1,-1);
      var element8 = element7.childNodes[3];
      var element9 = element8.childNodes[1].childNodes[1];
      var element10 = element8.childNodes[3].childNodes[1];
      var element11 = element8.childNodes[5].childNodes[1];
      var morph2 = dom.createMorph(element7,4,5);
      hooks.content(morph0, "each", context, ["filteredTodos"], {context:context,types:["id"],hashTypes:{},hash:{},render:child0,escaped:true,morph:morph0}, env);
      hooks.element(element6, "attribute", context, ["checked",hooks.subexpr("allAreDone", context, [], {context:context,types:[],hashTypes:{},hash:{}}, env)], {context:context,types:["string","sexpr"],hashTypes:{},hash:{},element:element6}, env);
      hooks.element(element6, "on", context, ["click","toggleAll"], {context:context,types:["string","string"],hashTypes:{},hash:{},element:element6}, env);
      hooks.content(morph1, "remaining", context, [], {escaped:true}, env);
      hooks.element(element9, "attribute", context, ["href",hooks.subexpr("concat", context, [], {context:context,types:[],hashTypes:{},hash:{}}, env)], {context:context,types:["string","sexpr"],hashTypes:{},hash:{},element:element9}, env);
      hooks.element(element9, "on", context, ["click","filterList"], {context:context,types:["string","string"],hashTypes:{data:"string"},hash:{data:"all"},element:element9}, env);
      hooks.element(element10, "attribute", context, ["href",hooks.subexpr("concat", context, [], {context:context,types:[],hashTypes:{},hash:{}}, env)], {context:context,types:["string","sexpr"],hashTypes:{},hash:{},element:element10}, env);
      hooks.element(element10, "on", context, ["click","filterList"], {context:context,types:["string","string"],hashTypes:{data:"string"},hash:{data:"active"},element:element10}, env);
      hooks.element(element11, "attribute", context, ["href",hooks.subexpr("concat", context, [], {context:context,types:[],hashTypes:{},hash:{}}, env)], {context:context,types:["string","sexpr"],hashTypes:{},hash:{},element:element11}, env);
      hooks.element(element11, "on", context, ["click","filterList"], {context:context,types:["string","string"],hashTypes:{data:"string"},hash:{data:"completed"},element:element11}, env);
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
    var el1 = dom.createTextNode("\n\n");
    dom.appendChild(el0, el1);
    var el1 = dom.createElement("section");
    dom.setAttribute(el1,"id","todoapp");
    var el2 = dom.createTextNode("\n	");
    dom.appendChild(el1, el2);
    var el2 = dom.createElement("header");
    dom.setAttribute(el2,"id","header");
    var el3 = dom.createTextNode("\n		");
    dom.appendChild(el2, el3);
    var el3 = dom.createElement("h1");
    var el4 = dom.createTextNode("todos");
    dom.appendChild(el3, el4);
    dom.appendChild(el2, el3);
    var el3 = dom.createTextNode("\n    ");
    dom.appendChild(el2, el3);
    var el3 = dom.createElement("input");
    dom.setAttribute(el3,"id","new-todo");
    dom.setAttribute(el3,"type","text");
    dom.setAttribute(el3,"placeholder","What needs to be done?");
    dom.setAttribute(el3,"rebound-action","createTodo");
    dom.appendChild(el2, el3);
    var el3 = dom.createTextNode("\n	");
    dom.appendChild(el2, el3);
    dom.appendChild(el1, el2);
    var el2 = dom.createTextNode("\n  ");
    dom.appendChild(el1, el2);
    var el2 = dom.createTextNode("\n");
    dom.appendChild(el1, el2);
    dom.appendChild(el0, el1);
    var el1 = dom.createTextNode("\n");
    dom.appendChild(el0, el1);
    var el1 = dom.createElement("footer");
    dom.setAttribute(el1,"id","info");
    var el2 = dom.createTextNode("\n	");
    dom.appendChild(el1, el2);
    var el2 = dom.createElement("p");
    var el3 = dom.createTextNode("Double-click to edit a todo");
    dom.appendChild(el2, el3);
    dom.appendChild(el1, el2);
    var el2 = dom.createTextNode("\n	");
    dom.appendChild(el1, el2);
    var el2 = dom.createElement("p");
    var el3 = dom.createTextNode("\n		Created by\n		");
    dom.appendChild(el2, el3);
    var el3 = dom.createElement("a");
    dom.setAttribute(el3,"href","http://github.com/epicmiller");
    var el4 = dom.createTextNode("Adam Miller");
    dom.appendChild(el3, el4);
    dom.appendChild(el2, el3);
    var el3 = dom.createTextNode(",\n	");
    dom.appendChild(el2, el3);
    dom.appendChild(el1, el2);
    var el2 = dom.createTextNode("\n	");
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
    var el2 = dom.createTextNode("\n");
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
    if (contextualElement === undefined) {
      contextualElement = dom.document.body;
    }
    var fragment = dom.cloneNode(cachedFragment, true);
    var element12 = fragment.childNodes[2];
    var element13 = element12.childNodes[1].childNodes[3];
    var morph0 = dom.createMorph(element12,2,3);
    hooks.element(element13, "attribute", context, ["value",hooks.subexpr("newTitle", context, [], {context:context,types:[],hashTypes:{},hash:{}}, env)], {context:context,types:["string","sexpr"],hashTypes:{},hash:{},element:element13}, env);
    hooks.content(morph0, "if", context, ["filteredTodos"], {context:context,types:["id"],hashTypes:{},hash:{},render:child0,escaped:true,morph:morph0}, env);
    return fragment;
  };
}()); window.Rebound.registerTemplate( "test/demo/templates/demo", template);})();