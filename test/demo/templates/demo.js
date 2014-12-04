define( ["test/demo/templates/components/editing"], function(){
return (function(){
  var template = (function() {
  var child0 = (function() {
    var child0 = (function() {
      var child0 = (function() {
        var child0 = (function() {
          return {
            isHTMLBars: true,
            cachedFragment: null,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              return el0;
            },
            render: function render(context, env, contextualElement) {
              var dom = env.dom;
              dom.detectNamespace(contextualElement);
              if (this.cachedFragment === null) {
                this.cachedFragment = this.build(dom);
              }
              var fragment = dom.cloneNode(this.cachedFragment, true);
              return fragment;
            }
          };
        }());
        return {
          isHTMLBars: true,
          cachedFragment: null,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode(" ");
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode(" ");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, get = hooks.get, subexpr = hooks.subexpr, component = hooks.component;
            dom.detectNamespace(contextualElement);
            if (this.cachedFragment === null) {
              this.cachedFragment = this.build(dom);
            }
            var fragment = dom.cloneNode(this.cachedFragment, true);
            var morph0 = dom.createUnsafeMorphAt(fragment,0,1,contextualElement);
            component(morph0, "edit-todo", context, {"value":subexpr("concat", context, [get(context, "title", env)], {}, {}, env),"editing":subexpr("concat", context, [get(context, "editing", env)], {}, {}, env),"arr":subexpr("concat", context, [get(context, "arr", env)], {}, {}, env),"obj":subexpr("concat", context, [get(context, "obj", env)], {}, {}, env)}, {template:child0,morph:morph0}, env);
            return fragment;
          }
        };
      }());
      var child1 = (function() {
        return {
          isHTMLBars: true,
          cachedFragment: null,
          build: function build(dom) {
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
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, get = hooks.get, attribute = hooks.attribute, element = hooks.element, content = hooks.content;
            dom.detectNamespace(contextualElement);
            if (this.cachedFragment === null) {
              this.cachedFragment = this.build(dom);
            }
            var fragment = dom.cloneNode(this.cachedFragment, true);
            dom.repairClonedNode(fragment.childNodes[1],[],true);
            var element1 = fragment.childNodes[1];
            var element2 = fragment.childNodes[2];
            var element3 = fragment.childNodes[3];
            var morph0 = dom.createMorphAt(element2,-1,-1);
            attribute(element1, "checked", true, context, [get(context, "isCompleted", env)], {}, env);
            element(element2, "on", context, ["dblclick","editTodo"], {}, {element:element2}, env);
            content(morph0, "title", context, [], {}, {morph:morph0}, env);
            element(element3, "on", context, ["click","removeTodo"], {}, {element:element3}, env);
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        cachedFragment: null,
        build: function build(dom) {
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
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, subexpr = hooks.subexpr, attribute = hooks.attribute, content = hooks.content;
          dom.detectNamespace(contextualElement);
          if (this.cachedFragment === null) {
            this.cachedFragment = this.build(dom);
          }
          var fragment = dom.cloneNode(this.cachedFragment, true);
          var element4 = fragment.childNodes[1];
          var morph0 = dom.createMorphAt(element4,0,1);
          attribute(element4, "class", true, context, [subexpr("if", context, [get(context, "isCompleted", env),"completed"], {}, {}, env)," ",subexpr("if", context, [get(context, "editing", env),"editing"], {}, {}, env)], {}, env);
          content(morph0, "if", context, [get(context, "editing", env)], {}, {template:child0,inverse:child1,morph:morph0}, env);
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      return {
        isHTMLBars: true,
        cachedFragment: null,
        build: function build(dom) {
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
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, element = hooks.element, content = hooks.content;
          dom.detectNamespace(contextualElement);
          if (this.cachedFragment === null) {
            this.cachedFragment = this.build(dom);
          }
          var fragment = dom.cloneNode(this.cachedFragment, true);
          var element0 = fragment.childNodes[1];
          var morph0 = dom.createMorphAt(element0,0,1);
          element(element0, "on", context, ["click","clearCompleted"], {}, {element:element0}, env);
          content(morph0, "completed", context, [], {}, {morph:morph0}, env);
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      cachedFragment: null,
      build: function build(dom) {
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
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, content = hooks.content, attribute = hooks.attribute, element = hooks.element, subexpr = hooks.subexpr;
        dom.detectNamespace(contextualElement);
        if (this.cachedFragment === null) {
          this.cachedFragment = this.build(dom);
        }
        var fragment = dom.cloneNode(this.cachedFragment, true);
        var element5 = fragment.childNodes[1];
        dom.repairClonedNode(element5.childNodes[1],[],true);
        var element6 = element5.childNodes[1];
        var element7 = fragment.childNodes[2];
        var element8 = element7.childNodes[1].childNodes[0].childNodes[0];
        var element9 = element7.childNodes[1].childNodes[1].childNodes[0];
        var element10 = element7.childNodes[1].childNodes[2].childNodes[0];
        var morph0 = dom.createMorphAt(element5.childNodes[0],0,1);
        var morph1 = dom.createMorphAt(element7.childNodes[0].childNodes[0],-1,-1);
        var morph2 = dom.createMorphAt(element7,2,3);
        content(morph0, "each", context, [get(context, "filteredTodos", env)], {}, {template:child0,morph:morph0}, env);
        attribute(element6, "checked", false, context, [get(context, "allAreDone", env)], {}, env);
        element(element6, "on", context, ["click","toggleAll"], {}, {element:element6}, env);
        content(morph1, "remaining", context, [], {}, {morph:morph1}, env);
        attribute(element8, "class", true, context, [subexpr("if", context, [get(context, "isAll", env),"selected"], {}, {}, env)], {}, env);
        attribute(element9, "class", true, context, [subexpr("if", context, [get(context, "isActive", env),"selected"], {}, {}, env)], {}, env);
        attribute(element10, "class", true, context, [subexpr("if", context, [get(context, "isCompleted", env),"selected"], {}, {}, env)], {}, env);
        content(morph2, "unless", context, [get(context, "noneAreDone", env)], {}, {template:child1,morph:morph2}, env);
        return fragment;
      }
    };
  }());
  return {
    isHTMLBars: true,
    cachedFragment: null,
    build: function build(dom) {
      var el0 = dom.createDocumentFragment();
      var el1 = dom.createElement("section");
      dom.setAttribute(el1,"id","todoapp");
      var el2 = dom.createElement("header");
      dom.setAttribute(el2,"id","header");
      var el3 = dom.createElement("h1");
      dom.appendChild(el2, el3);
      var el3 = dom.createElement("input");
      dom.setAttribute(el3,"id","new-todo");
      dom.setAttribute(el3,"type","text");
      dom.setAttribute(el3,"placeholder","What needs to be done?");
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
    },
    render: function render(context, env, contextualElement) {
      var dom = env.dom;
      var hooks = env.hooks, content = hooks.content, get = hooks.get, attribute = hooks.attribute, element = hooks.element;
      dom.detectNamespace(contextualElement);
      if (this.cachedFragment === null) {
        this.cachedFragment = this.build(dom);
      }
      var fragment = dom.cloneNode(this.cachedFragment, true);
      var element11 = fragment.childNodes[0];
      var element12 = element11.childNodes[0];
      var element13 = element12.childNodes[1];
      var morph0 = dom.createMorphAt(element12.childNodes[0],-1,-1);
      var morph1 = dom.createMorphAt(element11,1,2);
      content(morph0, "firstTodo.title", context, [], {}, {morph:morph0}, env);
      attribute(element13, "value", true, context, [get(context, "newTitle", env)], {}, env);
      element(element13, "on", context, ["keyup","createTodo"], {}, {element:element13}, env);
      content(morph1, "if", context, [get(context, "todos", env)], {}, {template:child0,morph:morph1}, env);
      return fragment;
    }
  };
}())
  var script = (function(){ return ({ initialize: function(options){ }, createdCallback: function(){ }, attachedCallback: function(){ }, detachedCallback: function(){ }, routes: { ":filter" : "filterList" }, newTitle: '', filter: 'all', todos: [ { title: "Tie Bowtie", editing: false, isCompleted: true },{ title: "Look Dapper", editing: false, isCompleted: false },{ title: "Profit", editing: false, isCompleted: false } ], allAreDone: function(){ return this.get('todos').where({'isCompleted': true}).length == this.get('todos').length; }, noneAreDone: function(){ return this.get('todos').where({'isCompleted': true}).length == 0; }, remaining: function(){ return this.get('todos').where({'isCompleted': false}).length; }, completed: function(){ return this.get('todos').where({'isCompleted': true}).length; }, todosProxy: function(){ return this.get('filteredTodos'); }, firstTodo: function(){ return this.get('todosProxy[0]'); }, secondTodo: function(){ return this.get('filteredTodos[1]'); }, filteredTodos: function(){ if(this.get('filter') == 'all') return this.get('todos'); if(this.get('filter') == 'active') return this.get('todos').where({'isCompleted': false}); if(this.get('filter') == 'completed') return this.get('todos').where({'isCompleted': true}); }, isAll: function(){ return this.get('filter') === 'all'; }, isActive: function(){ return this.get('filter') === 'active'; }, isCompleted: function(){ return this.get('filter') === 'completed'; }, createTodo: function(event){ if(event.keyCode !== 13){ return; } if(this.get('newTitle') == '') return; this.get('todos').add({ title: this.get('newTitle'), editing: false, isCompleted: false }); this.set('newTitle', ''); }, toggleAll: function(event){ var value = event.target.checked; this.get('todos').forEach(function(model, index) { model.set('isCompleted', value); }); }, clearCompleted: function(event){ this.get('todos').remove( this.get('todos').where({'isCompleted': true}) ); }, removeTodo: function(event){ this.get('todos').remove(event.data); }, editTodo: function(event){ event.data.set('editing', true); }, filterList: function(filter){ this.set('filter', filter) } }); })();
  var style = "";
  var component = Rebound.Component.extend(script, { __name: "rebound-demo" });
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
  return document.registerElement("rebound-demo", {prototype: proto} );
})();
});