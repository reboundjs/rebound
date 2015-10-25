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

Unles

*************************************************************/

QUnit.test('Rebound Helpers - Unless', function() {


  var template, data, dom;


  template = compiler.compile('<div>{{#unless bool}}{{foo}}{{/unless}}</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(dom.fragment, '<div>bar</div>', 'Block Unless helper in content without else block - false');



  template = compiler.compile('<div>{{#unless bool}}{{foo}}{{else}}{{bar}}{{/unless}}</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(dom.fragment, '<div>bar</div>', 'Block Unless helper in content with else block - false');



  template = compiler.compile('<div>{{#unless bool}}{{foo}}{{/unless}}</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(dom.fragment, '<div>bar</div>', 'Block Unless helper in content without else block - false');



  template = compiler.compile('<div>{{#unless bool}}{{foo}}{{else}}{{bar}}{{/unless}}</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(dom.fragment, '<div>foo</div>', 'Block Unless helper in content with else block - true');



  template = compiler.compile('<div>{{#unless bool}}{{foo}}{{else}}{{bar}}{{/unless}}</div>', {name: 'test/partial'});
  data = new Model({foo:'bar', bar:'foo', bool: false});
  dom = template.render(data);
  data.set('bool', true);
  notify(data, 'bool', dom);
  equalTokens(dom.fragment, '<div>foo</div>', 'Block Unless helper is data bound');



  template = compiler.compile('<div>{{unless bool foo}}</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(dom.fragment, '<div><!----></div>', 'Inline Unless helper in content without else term - true');



  template = compiler.compile('<div>{{unless bool foo bar}}</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(dom.fragment, '<div>foo</div>', 'Inline Unless helper in content with else term - true');



  template = compiler.compile('<div>{{unless bool foo}}</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(dom.fragment, '<div>bar</div>', 'Inline Unless helper in content without else term - false');



  template = compiler.compile('<div>{{unless bool foo bar}}</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(dom.fragment, '<div>bar</div>', 'Inline Unless helper in content without else term - true');



  template = compiler.compile('<div class={{unless bool foo}}>test</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(dom.fragment, '<div>test</div>', 'Inline Unless helper in element without else term - true');



  template = compiler.compile('<div class={{unless bool foo bar}}>test</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(dom.fragment, '<div class="foo">test</div>', 'Inline Unless helper in element with else term - true');



  template = compiler.compile('<div class={{unless bool foo}}>test</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(dom.fragment, '<div class="bar">test</div>', 'Inline Unless helper in element without else term - false');



  template = compiler.compile('<div class={{unless bool foo bar}}>test</div>', {name: 'test/partial'});
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(dom.fragment, '<div class="bar">test</div>', 'Inline Unless helper in element with else term - true');



  template = compiler.compile('<div>{{unless bool foo bar}}</div>', {name: 'test/partial'});
  data = new Model({foo:'bar', bar:'foo', bool: false});
  dom = template.render(data);
  data.set('bool', true);
  notify(data, 'bool', dom);
  equalTokens(dom.fragment, '<div>foo</div>', 'Inline Unless helper is data bound');


});
