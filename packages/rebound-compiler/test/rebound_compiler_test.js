require(['rebound-compiler/rebound-compiler', 'simple-html-tokenizer'], function(compiler, tokenizer){

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


    QUnit.test('Rebound Compiler', function() {

      var template = compiler.compile('<div class={{bar}}>{{foo}}</div>', {name:'test/partial'});
      var dom = template({foo:'bar', bar:'foo'});
      equalTokens(dom, '<div class="foo">bar</div>', 'Compiler accepts plain HTMLBars strings');

      var partial = (compiler.compile('{{partial "test/partial"}}', {name:'test'}))({foo:'bar', bar:'foo'});
      equalTokens(dom, '<div class="foo">bar</div>', 'Compiler interperts plain HTMLBars strings as partials');

    });


});
