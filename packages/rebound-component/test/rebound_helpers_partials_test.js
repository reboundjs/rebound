import compiler from 'rebound-compiler/compile';
import tokenizer from 'simple-html-tokenizer';
import helpers from 'rebound-component/helpers';
import Model from 'rebound-data/model';
import hooks from 'rebound-component/hooks';

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

QUnit.test('Rebound Helpers - Partial', function() {

  var template, data, dom, partial, env = hooks.createFreshEnv();

  template = compiler.compile('<div class={{bar}}>{{foo}}</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo'}));
  partial = (compiler.compile('{{partial "test/partial"}}', {name: 'test'})).render(new Model({foo:'bar', bar:'foo'}));
  equalTokens(partial.fragment, '<div class="foo">bar</div>', 'Partial helper inserts partial template');



  template = compiler.compile('<div class={{bar}}>{{foo}}</div>', {name: 'test/partial'});
  partial = compiler.compile('{{partial "test/partial"}}{{bar}}', {name: 'test'});
  data = new Model({foo:'bar', bar:'foo', bool: false});
  dom = partial.render(data, env);
  data.set('foo', 'foo');
  data.set('bar','bar');
  notify(data, ['foo', 'bar'], env);
  equalTokens(dom.fragment, '<div class="bar">foo</div>bar', 'Partial is data bound to data in scope');



  template = compiler.compile('<div class={{test.val}}>{{foo}}</div>', {name: 'test/partial2'});
  partial = compiler.compile('{{#each local as |test|}}{{partial "test/partial2"}}{{/each}}', {name: 'test2'});
  data = new Model({foo:'bar', local:[{val: 'foo'}]});
  dom = partial.render(data, env);
  equalTokens(dom.fragment, '<div class="foo">bar</div>', 'Partial has access to data in parents block scope');
  data.set('local[0].val','bar');
  notify(data.get('local[0]'), ['val'], env);
  equalTokens(dom.fragment, '<div class="bar">bar</div>', 'Partial is data bound to data in block scope');



});
