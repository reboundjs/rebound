import compiler from 'rebound-compiler/compile';
import tokenizer from 'htmlbars/dist/cjs/simple-html-tokenizer';
import helpers from 'rebound-component/helpers';
import Model from 'rebound-data/model';


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
function notify(obj, path, template) {
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
  template.revalidate();
}


/************************************************************

If

*************************************************************/

QUnit.test('Rebound Helpers - If', function() {

  var template, data, dom;

  template = compiler.compile('<div>{{#if bool}}{{foo}}{{/if}}</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(dom.fragment, '<div><!----></div>', 'Block If helper without else block - false');


  template = compiler.compile('<div>{{#if bool}}{{foo}}{{else}}{{bar}}{{/if}}</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(dom.fragment, '<div>foo</div>', 'Block If helper with else block - false');



  template = compiler.compile('<div>{{#if bool}}{{foo}}{{/if}}</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(dom.fragment, '<div>bar</div>', 'Block If helper without else block - true');



  template = compiler.compile('<div>{{#if bool}}{{foo}}{{else}}{{bar}}{{/if}}</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(dom.fragment, '<div>bar</div>', 'Block If helper with else block - true');



  template = compiler.compile('<div>{{#if bool}}{{foo}}{{else}}{{bar}}{{/if}}</div>', {name: 'test/partial'});
  data = new Model({foo:'bar', bar:'foo', bool: false});
  dom = template.render(data);
  data.set('bool', true);
  notify(data, 'bool', dom);
  equalTokens(dom.fragment, '<div>bar</div>', 'Block If helper is data bound');
  data.set('bool', false);
  notify(data, 'bool', dom);
  equalTokens(dom.fragment, '<div>foo</div>', 'Block If helper is data bound and returns to old value');



  template = compiler.compile('<div>{{if bool foo}}</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(dom.fragment, '<div>bar</div>', 'Inline If helper in content without else term - true');



  template = compiler.compile('<div>{{if bool foo bar}}</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(dom.fragment, '<div>bar</div>', 'Inline If helper in content with else term - true');



  template = compiler.compile('<div>{{if bool foo}}</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(dom.fragment, '<div><!----></div>', 'Inline If helper in content without else term - false');



  template = compiler.compile('<div>{{if bool foo bar}}</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(dom.fragment, '<div>foo</div>', 'Inline If helper in content with else term - false');



  template = compiler.compile('<div class={{if bool foo}}>test</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(dom.fragment, '<div class="bar">test</div>', 'Inline If helper in element without else term - true');



  template = compiler.compile('<div class={{if bool foo bar}}>test</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(dom.fragment, '<div class="bar">test</div>', 'Inline If helper in element with else term - true');



  template = compiler.compile('<div class={{if bool foo}}>test</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(dom.fragment, '<div>test</div>', 'Inline If helper in element without else term - false');



  template = compiler.compile('<div class={{if bool foo bar}}>test</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(dom.fragment, '<div class="foo">test</div>', 'Inline If helper in element without else term - true');



  template = compiler.compile('<div>{{if bool foo bar}}</div>', {name: 'test/partial'});
  data = new Model({foo:'bar', bar:'foo', bool: false});
  dom = template.render(data);
  data.set('bool', true);
  notify(data, 'bool', dom);
  equalTokens(dom.fragment, '<div>bar</div>', 'Inline If helper is data bound');


  // Nexted Block IFs
  template = compiler.compile('<div>{{#if bool}}{{#if bool}}{{val}}{{else}}{{val2}}{{/if}}{{else}}{{val2}}{{/if}}</div>', {name: 'test/partial'});
  data = new Model({bool: true, val: 'true', val2: 'false'});
  dom = template.render(data);
  equal(dom.fragment.firstChild.innerHTML, 'true', 'If helpers that are the immediate children of if helpers render on first run.');
  data.set('bool', false);
  notify(data, 'bool', dom);
  equal(dom.fragment.firstChild.innerHTML, 'false', 'If helpers that are the immediate children of if helpers re-render successfully on change.');

  // Re-eval on reset of collection
  template = compiler.compile('<div>{{if arr 1 0}}</div>', {name: 'test/partial'});
  data = new Model({arr: []});
  dom = template.render(data);
  data.reset({arr: [{id: 1}]});
  notify(data, 'arr', dom);
  equalTokens(dom.fragment, '<div>1</div>', 'Inline If helper is data bound for collection reset');

});
