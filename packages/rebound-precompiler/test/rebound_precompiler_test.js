require(['rebound-precompiler/rebound-precompiler', 'simple-html-tokenizer'], function(compiler, tokenizer){

    function equalTokens(fragment, html) {
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

      deepEqual(fragTokens, htmlTokens);
    }


    QUnit.test('Rebound Precompiler', function() {

      var dom = compiler.precompile('<div></div>', {name: 'test/filepath'}).replace(/(\r\n|\n|\r)/gm," ").replace(/\s+/g," "),
          expected = 'define( [], function(){ (function(){var template = (function() { function build(dom) { var el0 = dom.createElement("div"); return el0; } var cachedFragment; return function template(context, env, contextualElement) { var dom = env.dom, hooks = env.hooks; if (cachedFragment === undefined) { cachedFragment = build(dom); } var fragment = dom.cloneNode(cachedFragment, true); return fragment; }; }()); window.Rebound.registerPartial( "test/filepath", template);})(); });';

      equal(dom, expected, 'Pre-compiler can handle partials');

    });


});
