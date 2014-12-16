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

      /*******************************************************************/
      /**    The only interface compile should need is get and set.     **/
      /**      Augment the object prototype to provide this api         **/

          Object.prototype.get = function(key){ return this[key]; };
          Object.prototype.set = function(key, val){ this[key] = val; };

      /*******************************************************************/

      var template = compiler.compile('<div class={{bar}}>{{foo}}</div>', {name:'test/partial'});
      var dom = template.render({foo:'bar', bar:'foo'});
      equalTokens(dom, '<div class="foo">bar</div>', 'Compiler accepts plain HTMLBars strings');

      var partial = (compiler.compile('{{partial "test/partial"}}', {name:'test'})).render({foo:'bar', bar:'foo'});
      equalTokens(dom, '<div class="foo">bar</div>', 'Compiler interperts plain HTMLBars strings as partials');


      /*******************************************************************/
      /**                Clean up our object prototype hack             **/

          delete Object.prototype.get;
          delete Object.prototype.set;

      /*******************************************************************/

    });


});
