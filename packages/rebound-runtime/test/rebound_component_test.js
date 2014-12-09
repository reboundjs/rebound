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

    var template = (function() { return { isHTMLBars: true, cachedFragment: null, build: function build(dom) { var el0 = dom.createElement("div"); return el0; }, render: function render(context, env, contextualElement) { var dom = env.dom; dom.detectNamespace(contextualElement); if (this.cachedFragment === null) { this.cachedFragment = this.build(dom); } var fragment = dom.cloneNode(this.cachedFragment, true); return fragment; } }; }());

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

      el.__component__ = new component({template: template, outlet: el});
      equalTokens(el, '<div><div></div></div>', 'Component places rendered template inside of outlet');

    });


});
