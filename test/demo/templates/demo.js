define( ["test/demo/templates/components/editing"], function(){

  return (function () {
    return window.Rebound.registerComponent("rebound-demo", {
      prototype: (function(){ return ({ name: 'woo', val: { test: function(){ return this.get('@parent.name'); } }, initialize: function(options){ }, createdCallback: function(){ }, attachedCallback: function(){ }, detachedCallback: function(){ }, routes: { ":filter" : "filterList" }, newTitle: '', filter: 'all', todos: [ { title: "Tie Bowtie", editing: false, isCompleted: true },{ title: "Look Dapper", editing: false, isCompleted: false },{ title: "Profit", editing: false, isCompleted: false } ], allAreDone: function(){ return this.get('todos').where({'isCompleted': true}).length == this.get('todos').length; }, noneAreDone: function(){ return this.get('todos').where({'isCompleted': true}).length == 0; }, remaining: function(){ return this.get('todos').where({'isCompleted': false}).length; }, completed: function(){ return this.get('todos').where({'isCompleted': true}).length; }, todosProxy: function(){ return this.get('filteredTodos'); }, firstTodo: function(){ return this.get('todosProxy[0]'); }, secondTodo: function(){ return this.get('filteredTodos[1]'); }, filteredTodos: function(){ if(this.get('filter') == 'all') return this.get('todos'); if(this.get('filter') == 'active') return this.get('todos').where({'isCompleted': false}); if(this.get('filter') == 'completed') return this.get('todos').where({'isCompleted': true}); }, isAll: function(){ return this.get('filter') === 'all'; }, isActive: function(){ return this.get('filter') === 'active'; }, isCompleted: function(){ return this.get('filter') === 'completed'; }, createTodo: function(event){ if(event.keyCode !== 13){ return; } if(this.get('newTitle') == '') return; this.get('todos').add({ title: this.get('newTitle'), editing: false, isCompleted: false }); this.set('newTitle', ''); }, toggleAll: function(event){ var value = event.target.checked; this.get('todos').forEach(function(model, index) { model.set('isCompleted', value); }); }, clearCompleted: function(event){ this.get('todos').remove( this.get('todos').where({'isCompleted': true}) ); }, removeTodo: function(event){ this.get('todos').remove(event.context); }, editTodo: function(event){ event.context.set('editing', true); }, filterList: function(filter){ this.set('filter', filter) } }); })(),
      template: (function() {
  var child0 = (function() {
    var child0 = (function() {
      var child0 = (function() {
        var child0 = (function() {
          return {
            isHTMLBars: true,
            blockParams: 0,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              return el0;
            },
            render: function render(context, env, contextualElement) {
              var dom = env.dom;
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
              return fragment;
            }
          };
        }());
        return {
          isHTMLBars: true,
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
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
            var hooks = env.hooks, get = hooks.get, component = hooks.component;
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
            var morph0 = dom.createMorphAt(fragment,0,1,contextualElement);
            component(env, morph0, context, "edit-todo", {"value": get(env, context, "title"), "editing": get(env, context, "editing"), "arr": get(env, context, "arr"), "obj": get(env, context, "obj"), "test": get(env, context, "name")}, child0);
            return fragment;
          }
        };
      }());
      var child1 = (function() {
        return {
          isHTMLBars: true,
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
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
            var hooks = env.hooks, get = hooks.get, concat = hooks.concat, attribute = hooks.attribute, element = hooks.element, content = hooks.content;
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
            if (this.cachedFragment) { dom.repairClonedNode(dom.childAt(fragment, [1]),[],true); }
            var element1 = dom.childAt(fragment, [1]);
            var element2 = dom.childAt(fragment, [2]);
            var element3 = dom.childAt(fragment, [3]);
            var attrMorph0 = dom.createAttrMorph(element1, 'checked');
            var morph0 = dom.createMorphAt(element2,-1,-1);
            attribute(env, attrMorph0, element1, "checked", concat(env, [get(env, context, "isCompleted")]));
            element(env, element2, context, "on", ["dblclick", "editTodo"], {});
            content(env, morph0, context, "title");
            element(env, element3, context, "on", ["click", "removeTodo"], {});
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
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
          var hooks = env.hooks, get = hooks.get, subexpr = hooks.subexpr, concat = hooks.concat, attribute = hooks.attribute, block = hooks.block;
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
          var element4 = dom.childAt(fragment, [1]);
          var morph0 = dom.createMorphAt(element4,0,1);
          var attrMorph0 = dom.createAttrMorph(element4, 'class');
          attribute(env, attrMorph0, element4, "class", concat(env, [subexpr(env, context, "if", [get(env, context, "isCompleted"), "completed"], {}), " ", subexpr(env, context, "if", [get(env, context, "editing"), "editing"], {})]));
          block(env, morph0, context, "if", [get(env, context, "editing")], {}, child0, child1);
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      return {
        isHTMLBars: true,
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
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
          var element0 = dom.childAt(fragment, [1]);
          var morph0 = dom.createMorphAt(element0,0,1);
          element(env, element0, context, "on", ["click", "clearCompleted"], {});
          content(env, morph0, context, "completed");
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
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
        var hooks = env.hooks, get = hooks.get, block = hooks.block, attribute = hooks.attribute, element = hooks.element, content = hooks.content, subexpr = hooks.subexpr, concat = hooks.concat;
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
        var element5 = dom.childAt(fragment, [1]);
        var element6 = dom.childAt(element5, [1]);
        if (this.cachedFragment) { dom.repairClonedNode(element6,[],true); }
        var element7 = dom.childAt(fragment, [2]);
        var element8 = dom.childAt(element7, [1]);
        var element9 = dom.childAt(element8, [0, 0]);
        var element10 = dom.childAt(element8, [1, 0]);
        var element11 = dom.childAt(element8, [2, 0]);
        var morph0 = dom.createMorphAt(dom.childAt(element5, [0]),0,1);
        var attrMorph0 = dom.createAttrMorph(element6, 'checked');
        var morph1 = dom.createMorphAt(dom.childAt(element7, [0, 0]),-1,-1);
        var attrMorph1 = dom.createAttrMorph(element9, 'class');
        var attrMorph2 = dom.createAttrMorph(element10, 'class');
        var attrMorph3 = dom.createAttrMorph(element11, 'class');
        var morph2 = dom.createMorphAt(element7,2,3);
        block(env, morph0, context, "each", [get(env, context, "filteredTodos")], {}, child0, null);
        attribute(env, attrMorph0, element6, "checked", get(env, context, "allAreDone"));
        element(env, element6, context, "on", ["click", "toggleAll"], {});
        content(env, morph1, context, "remaining");
        attribute(env, attrMorph1, element9, "class", concat(env, [subexpr(env, context, "if", [get(env, context, "isAll"), "selected"], {})]));
        attribute(env, attrMorph2, element10, "class", concat(env, [subexpr(env, context, "if", [get(env, context, "isActive"), "selected"], {})]));
        attribute(env, attrMorph3, element11, "class", concat(env, [subexpr(env, context, "if", [get(env, context, "isCompleted"), "selected"], {})]));
        block(env, morph2, context, "unless", [get(env, context, "noneAreDone")], {}, child1, null);
        return fragment;
      }
    };
  }());
  return {
    isHTMLBars: true,
    blockParams: 0,
    cachedFragment: null,
    hasRendered: false,
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
      var hooks = env.hooks, content = hooks.content, get = hooks.get, concat = hooks.concat, attribute = hooks.attribute, element = hooks.element, block = hooks.block;
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
      var element12 = dom.childAt(fragment, [0]);
      var element13 = dom.childAt(element12, [0]);
      var element14 = dom.childAt(element13, [1]);
      var morph0 = dom.createMorphAt(dom.childAt(element13, [0]),-1,-1);
      var attrMorph0 = dom.createAttrMorph(element14, 'value');
      var morph1 = dom.createMorphAt(element12,1,2);
      content(env, morph0, context, "firstTodo.title");
      attribute(env, attrMorph0, element14, "value", concat(env, [get(env, context, "newTitle")]));
      element(env, element14, context, "on", ["keyup", "createTodo"], {});
      block(env, morph1, context, "if", [get(env, context, "todos")], {}, child0, null);
      return fragment;
    }
  };
}()),
      style: ""
    });
  })();
});