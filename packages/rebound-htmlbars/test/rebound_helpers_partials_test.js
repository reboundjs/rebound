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

// Notify all of a object's observers of the change, execute the callback
function notify(obj, path, env) {
  // If path is not an array of keys, wrap it in array
  path = (_.isString(path)) ? [path] : path;

  // For each path, alert each observer and call its callback
  _.each(path, function(path) {
    if (obj.__observers && _.isObject(obj.__observers[path])) {
      _.each(obj.__observers[path].collection, function(callback, index) {
        if (callback) {
          callback.notify();
        } else {
          delete obj.__observers[path][index];
        }
      });
      _.each(obj.__observers[path].model, function(callback, index) {
        if (callback) {
          callback.notify();
        } else {
          delete obj.__observers[path][index];
        }
      });
    }
  });

  _.each(env.revalidateQueue, function(template){
    template.revalidate();
  });
}


/************************************************************

Partials

*************************************************************/

QUnit.test('Rebound Partials', function( assert ) {

  var template, data, dom, partial, env = hooks.createFreshEnv();

  template = compiler.compile('<div class={{bar}}>{{foo}}</div>', {name: 'test/partial'});
  partial = compiler.compile('{{partial "test/partial"}}');
  dom = partial.render(new Model({foo:'bar', bar:'foo'}));
  equalTokens(dom.fragment, '<partial-template.test.partial><div class="foo">bar</div></partial-template.test.partial>', 'Partial helper inserts partial template');
  assert.equal(document.querySelectorAll("script[src*='test/partial']").length, 0, "If a partial is already registered, compiling and running a template that consumes it does not attempt to fetch that partial from the server.")


  data = new Model({foo:'bar', bar:'foo', bool: false});
  dom = partial.render(data);
  data.set('foo', 'foo');
  data.set('bar','bar');
  notify(data, ['foo', 'bar'], env);
  equalTokens(dom.fragment, '<partial-template.test.partial><div class="bar">foo</div>bar</partial-template.test.partial>', 'Partial is data bound to data in scope');

  partial = compiler.compile('{{partial partialName}}');
  data = new Model({partialName:'test/partial', foo:'bar', bar:'foo'});
  dom = partial.render(data);
  equalTokens(dom.fragment, '<partial-template.test.partial><div class="foo">bar</div></partial-template.test.partial>', 'Partial can take a dynamic variable as partial name');



  template = compiler.compile('<div class={{test.val}}>{{foo}}</div>', {name: 'test/partial2'});
  partial = compiler.compile('{{#each local as |test|}}{{partial "test/partial2"}}{{/each}}', {name: 'test3'});
  data = new Model({foo:'bar', local:[{val: 'foo'}]});
  dom = partial.render(data, env);
  equalTokens(dom.fragment, '<partial-template.test.partial2><div class="foo">bar</div></partial-template.test.partial2>', 'Partial has access to data in parents block scope');
  data.set('local[0].val','bar');
  notify(data.get('local[0]'), ['val'], env);
  equalTokens(dom.fragment, '<partial-template.test.partial2><div class="bar">bar</div></partial-template.test.partial2>', 'Partial is data bound to data in block scope');



  partial = (compiler.compile('{{partial "test/lazy-partial"}}')).render(new Model({foo:'bar', bar:'foo'}));
  equalTokens(partial.fragment, '<partial-template.test.lazy-partial></partial-template.test.lazy-partial>', 'A Partial rendered before registration inserts an empty template');
  assert.equal(document.querySelectorAll("script[src*='test/lazy-partial']").length, 1, "If a partial is used that is not registered, compiling and running a template that consumes it will attempt to fetch that partial from the server.")
  compiler.compile('<div class={{bar}}>{{foo}}</div>', {name: 'test/lazy-partial'});
  equalTokens(partial.fragment, '<partial-template.test.lazy-partial><div class="foo">bar</div></partial-template.test.lazy-partial>', 'After registration a pre-rendered Partial helper inserts the correct partial template');

});
