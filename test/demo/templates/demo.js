var template = (function() {
  var child0 = (function() {
    var child0 = (function() {
      var child0 = (function() {
        function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("\n							");
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
          var morph0 = dom.createMorph(fragment,0,1,contextualElement);
          hooks.content(morph0, "edit-todo", context, [], {context:context,types:[],hashTypes:{class:"string",value:"id",focusOut:"string",insertNewline:"string",escapePress:"string"},hash:{class:"edit",value:"bufferedTitle",focusOut:"doneEditing",insertNewline:"doneEditing",escapePress:"cancelEditing"},escaped:true,morph:morph0}, env);
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
          hooks.element(element2, "action", context, ["editTodo"], {context:context,types:["string"],hashTypes:{on:"string"},hash:{on:"doubleClick"},element:element2}, env);
          hooks.content(morph0, "title", context, [], {escaped:true}, env);
          hooks.element(element3, "action", context, ["removeTodo"], {context:context,types:["string"],hashTypes:{},hash:{},element:element3}, env);
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
        var el0 = dom.createTextNode("All");
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
    var child2 = (function() {
      function build(dom) {
        var el0 = dom.createTextNode("Active");
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
    var child3 = (function() {
      function build(dom) {
        var el0 = dom.createTextNode("Completed");
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
    var child4 = (function() {
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
        hooks.element(element0, "action", context, ["clearCompleted"], {context:context,types:["string"],hashTypes:{},hash:{},element:element0}, env);
        hooks.content(morph0, "remaining", context, [], {escaped:true}, env);
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
      var el4 = dom.createTextNode("\n				");
      dom.appendChild(el3, el4);
      dom.appendChild(el2, el3);
      var el3 = dom.createTextNode("\n				");
      dom.appendChild(el2, el3);
      var el3 = dom.createElement("li");
      var el4 = dom.createTextNode("\n					");
      dom.appendChild(el3, el4);
      var el4 = dom.createTextNode("\n				");
      dom.appendChild(el3, el4);
      dom.appendChild(el2, el3);
      var el3 = dom.createTextNode("\n				");
      dom.appendChild(el2, el3);
      var el3 = dom.createElement("li");
      var el4 = dom.createTextNode("\n					");
      dom.appendChild(el3, el4);
      var el4 = dom.createTextNode("\n				");
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
      var el1 = dom.createTextNode("\n	");
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
      var morph1 = dom.createMorph(element5,2,3);
      var element6 = fragment.childNodes[3];
      var morph2 = dom.createMorph(element6.childNodes[1].childNodes[0],-1,-1);
      var element7 = element6.childNodes[3];
      var morph3 = dom.createMorph(element7.childNodes[1],0,1);
      var morph4 = dom.createMorph(element7.childNodes[3],0,1);
      var morph5 = dom.createMorph(element7.childNodes[5],0,1);
      var morph6 = dom.createMorph(element6,4,5);
      hooks.content(morph0, "each", context, ["filteredTodos"], {context:context,types:["id"],hashTypes:{},hash:{},render:child0,escaped:true,morph:morph0}, env);
      hooks.content(morph1, "input", context, [], {context:context,types:[],hashTypes:{type:"string",id:"string",checked:"id"},hash:{type:"checkbox",id:"toggle-all",checked:"allAreDone"},escaped:true,morph:morph1}, env);
      hooks.content(morph2, "remaining", context, [], {escaped:true}, env);
      hooks.content(morph3, "link-to", context, ["todos.index"], {context:context,types:["string"],hashTypes:{activeClass:"string"},hash:{activeClass:"selected"},render:child1,escaped:true,morph:morph3}, env);
      hooks.content(morph4, "link-to", context, ["todos.active"], {context:context,types:["string"],hashTypes:{activeClass:"string"},hash:{activeClass:"selected"},render:child2,escaped:true,morph:morph4}, env);
      hooks.content(morph5, "link-to", context, ["todos.completed"], {context:context,types:["string"],hashTypes:{activeClass:"string"},hash:{activeClass:"selected"},render:child3,escaped:true,morph:morph5}, env);
      hooks.content(morph6, "if", context, ["remaining"], {context:context,types:["id"],hashTypes:{},hash:{},render:child4,escaped:true,morph:morph6}, env);
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
    var el2 = dom.createTextNode("\n	");
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
    var element8 = fragment.childNodes[2];
    var element9 = element8.childNodes[1].childNodes[3];
    var morph0 = dom.createMorph(element8,2,3);
    hooks.element(element9, "attribute", context, ["value",hooks.subexpr("newTitle", context, [], {context:context,types:[],hashTypes:{},hash:{}}, env)], {context:context,types:["string","sexpr"],hashTypes:{},hash:{},element:element9}, env);
    hooks.content(morph0, "if", context, ["length"], {context:context,types:["id"],hashTypes:{},hash:{},render:child0,escaped:true,morph:morph0}, env);
    return fragment;
  };
}());