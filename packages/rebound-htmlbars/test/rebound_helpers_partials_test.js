import compiler from 'rebound-compiler/compile';
import tokenizer from 'simple-html-tokenizer';
import helpers from 'rebound-htmlbars/helpers';
import Model from 'rebound-data/model';
import hooks from 'rebound-htmlbars/hooks';

function equalTokens(fragment, html, message) {
  var div = document.createElement("div");

  div.appendChild(fragment.cloneNode(true));

  var fragTokens = tokenizer.tokenize(div.innerHTML);
  var htmlTokens = tokenizer.tokenize(html);

  function normalizeTokens(token) {
    if (token.type === 'StartTag') {
      token.attributes = token.attributes.sort(function(a, b) {
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


/************************************************************

Partials

*************************************************************/

QUnit.test('Rebound Partials', function( assert ) {

  var template, data, partial, dom = document.createDocumentFragment();

  template = compiler.compile('<div class={{bar}}>{{foo}}</div>', {name: 'test/partial'});
  partial = compiler.compile('{{partial "test/partial"}}');
  partial.render(dom, new Model({foo:'bar', bar:'foo'}));
  equalTokens(dom, '<div class="foo">bar</div>', 'Partial helper inserts partial template');
  assert.equal(document.querySelectorAll("script[src*='test/partial']").length, 0, "If a partial is already registered, compiling and running a template that consumes it does not attempt to fetch that partial from the server.");


  data = new Model({foo:'bar', bar:'foo', bool: false});
  partial.render(dom, data);
  data.set('foo', 'foo');
  data.set('bar', 'bar');
  equalTokens(dom, '<div class="bar">foo</div>', 'Partial is data bound to data in scope');

  partial = compiler.compile('{{partial partialName}}');
  data = new Model({partialName:'test/partial', foo:'bar', bar:'foo'});
  partial.render(dom, data);
  equalTokens(dom, '<div class="foo">bar</div>', 'Partial can take a dynamic variable as partial name');



  template = compiler.compile('<div class={{test.val}}>{{foo}}</div>', {name: 'test/partial2'});
  partial = compiler.compile('{{#each local as |test|}}{{partial "test/partial2"}}{{/each}}', {name: 'test3'});
  data = new Model({foo:'bar', local:[{val: 'foo'}]});
  partial.render(dom, data);
  equalTokens(dom, '<div class="foo">bar</div>', 'Partial has access to data in parents block scope');
  data.set('local[0].val','bar');
  equalTokens(dom, '<div class="bar">bar</div>', 'Partial is data bound to data in block scope');



  (compiler.compile('{{partial "test/lazy-partial"}}')).render(dom, new Model({foo:'bar', bar:'foo'}));
  equalTokens(dom, '', 'A Partial rendered before registration inserts an empty placeholder text node.');
  assert.equal(document.querySelectorAll("script[src*='test/lazy-partial']").length, 1, "If a partial is used that is not registered, compiling and running a template that consumes it will attempt to fetch that partial from the server.");
  compiler.compile('<div class={{bar}}>{{foo}}</div>', {name: 'test/lazy-partial'});
  equalTokens(dom, '<div class="foo">bar</div>', 'After registration a pre-rendered Partial helper inserts the correct partial template');

});
