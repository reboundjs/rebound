require(['rebound-runtime/component', 'simple-html-tokenizer'], function(Component, tokenizer){
    Component = Component.default;
    function equalTokens(fragment, html, message) {
      var div = document.createElement("div");

      div.appendChild(fragment.cloneNode(true));

      var fragTokens = tokenizer.tokenize(div.innerHTML);
      var htmlTokens = tokenizer.tokenize(html);

      function normalizeTokens(token) {
        if (token.type === 'StartTag') {
          token.attributes = token.attributes.sort(function(a,b){
            if (a.name > b.name) {
              return 1;
            }
            if (a.name < b.name) {
              return -1;
            }
            return 0;
          });
        }
      }

      fragTokens.forEach(normalizeTokens);
      htmlTokens.forEach(normalizeTokens);

      deepEqual(fragTokens, htmlTokens, message);
    }

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
        return fragment;
      };
    }());


    QUnit.test('Rebound Components', function() {

      var el = document.createElement('div');
      var component = Component.extend({
        bool: true,
        int: 1,
        arr: [{a:1, b:2, c:3}],
        obj: {d:4, e:5, f:6},
        compProp: function(){
          return 1;
        },
        method: function(event){
          console.log('Method Called');
        }
      });

      el.__root__ = new component({template: template, outlet: el});

      equal(1, 1);

    });


});
