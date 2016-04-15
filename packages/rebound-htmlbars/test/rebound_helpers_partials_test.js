import compiler from 'rebound-compiler/compile';
import { tokenize } from 'simple-html-tokenizer/index';
import helpers from 'rebound-htmlbars/helpers';
import Model from 'rebound-data/model';
import hooks from 'rebound-htmlbars/hooks';

function equalTokens(fragment, html, message) {
  var div = document.createElement("div");

  div.appendChild(fragment.cloneNode(true));

  var fragTokens = tokenize(div.innerHTML);
  var htmlTokens = tokenize(html);

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

  // Basic partial render
  template = compiler.compile('<div class={{bar}}>{{foo}}</div>', {name: 'test/partial'});
  partial = compiler.compile('{{partial "test/partial"}}');
  partial.render(dom, new Model({foo:'bar', bar:'foo'}));
  equalTokens(dom, '<rebound-partial path="test/partial"><div class="foo">bar</div></rebound-partial>', 'Partial helper inserts partial template');
  assert.equal(document.querySelectorAll("script[src*='test/partial']").length, 0, "If a partial is already registered, compiling and running a template that consumes it does not attempt to fetch that partial from the server.");


  // Partial data binding
  data = new Model({foo:'bar', bar:'foo', bool: false});
  partial.render(dom, data);
  data.set('foo', 'foo');
  data.set('bar', 'bar');
  equalTokens(dom, '<rebound-partial path="test/partial"><div class="bar">foo</div></rebound-partial>', 'Partial is data bound to data in scope');

  // Dynamic, non-lazy partial
  template = compiler.compile('<div class={{foo}}>{{bar}}</div>', {name: 'test/partial2'});
  partial = compiler.compile('{{partial partialName}}');
  data = new Model({partialName:'test/partial', foo:'bar', bar:'foo'});
  partial.render(dom, data);
  equalTokens(dom, '<rebound-partial path="test/partial"><div class="foo">bar</div></rebound-partial>', 'Partial can take a dynamic variable as partial name');
  data.set('partialName', 'test/partial2');
  equalTokens(dom, '<rebound-partial path="test/partial2"><div class="bar">foo</div></rebound-partial>', 'Partial can take a dynamic variable as partial name');

  // Block scoped partial data
  template = compiler.compile('<div class={{test.val}}>{{foo}}</div>', {name: 'test/partial3'});
  partial = compiler.compile('{{#each local as |test|}}{{partial "test/partial3"}}{{/each}}', {name: 'test3'});
  data = new Model({foo:'bar', local:[{val: 'foo'}]});
  partial.render(dom, data);
  equalTokens(dom, '<rebound-partial path="test/partial3"><div class="foo">bar</div></rebound-partial>', 'Partial has access to data in parents block scope');
  data.set('local[0].val','bar');
  equalTokens(dom, '<rebound-partial path="test/partial3"><div class="bar">bar</div></rebound-partial>', 'Partial is data bound to data in block scope');

  // Basic lazy partial
  (compiler.compile('{{partial "test/lazy-partial"}}')).render(dom, new Model({foo:'bar', bar:'foo'}));
  equalTokens(dom, '<rebound-partial path="test/lazy-partial"></rebound-partial>', 'A Partial rendered before registration inserts an empty placeholder text node.');
  assert.equal(document.querySelectorAll("script[src*='test/lazy-partial']").length, 1, "If a partial is used that is not registered, compiling and running a template that consumes it will attempt to fetch that partial from the server.");
  compiler.compile('<div class={{bar}}>{{foo}}</div>', {name: 'test/lazy-partial'});
  equalTokens(dom, '<rebound-partial path="test/lazy-partial"><div class="foo">bar</div></rebound-partial>', 'After registration a pre-rendered Partial helper inserts the correct partial template');


  // Dynamic lazy Partials
  partial = compiler.compile('{{partial name}}', {name: 'dynamic-partial-test'});
  data = new Model({name: 'test/dynamic-partial-1'});
  partial.render(dom, data);
  template = compiler.compile('Partial One', {name: 'test/dynamic-partial-1'});
  equalTokens(dom, '<rebound-partial path="test/dynamic-partial-1">Partial One</rebound-partial>', 'Dynamic lazy partials work on first render');
  data.set('name', 'test/dynamic-partial-2');
  template = compiler.compile('Partial Two', {name: 'test/dynamic-partial-2'});
  equalTokens(dom, '<rebound-partial path="test/dynamic-partial-2">Partial Two</rebound-partial>', 'Dynamic lazy partial names are databound');

});
