require(['rebound-data/rebound-data'], function(compiler, tokenizer){

    QUnit.test('Compiler interperts plain HTMLBars strings as partials', function() {

      var template = compiler.compile('<div class={{bar}}>{{foo}}</div>', {name:'test/partial'});
      var dom = template({foo:'bar', bar:'foo'});
      equalTokens(dom, '<div class="foo">bar</div>');

      var partial = (compiler.compile('{{partial "test/partial"}}', {name:'test'}))({foo:'bar', bar:'foo'});
      equalTokens(dom, '<div class="foo">bar</div>');

    });


});
