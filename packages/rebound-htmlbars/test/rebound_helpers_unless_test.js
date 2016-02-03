import compiler from 'rebound-compiler/compile';
import tokenizer from 'simple-html-tokenizer';
import helpers from 'rebound-htmlbars/helpers';
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

/************************************************************

Unles

*************************************************************/

QUnit.test('Rebound Helpers - Unless', function() {


  var template, data, dom, el = document.createDocumentFragment();


  template = compiler.compile('<div>{{#unless bool}}{{foo}}{{/unless}}</div>', {name: 'test/partial'});
  template.render(el, new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(el, '<div>bar</div>', 'Block Unless helper in content without else block - false');



  template = compiler.compile('<div>{{#unless bool}}{{foo}}{{else}}{{bar}}{{/unless}}</div>', {name: 'test/partial'});
  template.render(el, new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(el, '<div>bar</div>', 'Block Unless helper in content with else block - false');



  template = compiler.compile('<div>{{#unless bool}}{{foo}}{{/unless}}</div>', {name: 'test/partial'});
  template.render(el, new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(el, '<div>bar</div>', 'Block Unless helper in content without else block - false');



  template = compiler.compile('<div>{{#unless bool}}{{foo}}{{else}}{{bar}}{{/unless}}</div>', {name: 'test/partial'});
  template.render(el, new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(el, '<div>foo</div>', 'Block Unless helper in content with else block - true');



  template = compiler.compile('<div>{{#unless bool}}{{foo}}{{else}}{{bar}}{{/unless}}</div>', {name: 'test/partial'});
  data = new Model({foo:'bar', bar:'foo', bool: false});
  template.render(el, data);
  data.set('bool', true);
  equalTokens(el, '<div>foo</div>', 'Block Unless helper is data bound');



  template = compiler.compile('<div>{{unless bool foo}}</div>', {name: 'test/partial'});
  template.render(el, new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(el, '<div><!----></div>', 'Inline Unless helper in content without else term - true');



  template = compiler.compile('<div>{{unless bool foo bar}}</div>', {name: 'test/partial'});
  template.render(el, new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(el, '<div>foo</div>', 'Inline Unless helper in content with else term - true');



  template = compiler.compile('<div>{{unless bool foo}}</div>', {name: 'test/partial'});
  template.render(el, new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(el, '<div>bar</div>', 'Inline Unless helper in content without else term - false');



  template = compiler.compile('<div>{{unless bool foo bar}}</div>', {name: 'test/partial'});
  template.render(el, new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(el, '<div>bar</div>', 'Inline Unless helper in content without else term - true');



  template = compiler.compile('<div class={{unless bool foo}}>test</div>', {name: 'test/partial'});
  template.render(el, new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(el, '<div>test</div>', 'Inline Unless helper in element without else term - true');



  template = compiler.compile('<div class={{unless bool foo bar}}>test</div>', {name: 'test/partial'});
  template.render(el, new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(el, '<div class="foo">test</div>', 'Inline Unless helper in element with else term - true');



  template = compiler.compile('<div class={{unless bool foo}}>test</div>', {name: 'test/partial'});
  template.render(el, new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(el, '<div class="bar">test</div>', 'Inline Unless helper in element without else term - false');



  template = compiler.compile('<div class={{unless bool foo bar}}>test</div>', {name: 'test/partial'});
  template.render(el, new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(el, '<div class="bar">test</div>', 'Inline Unless helper in element with else term - true');



  template = compiler.compile('<div>{{unless bool foo bar}}</div>', {name: 'test/partial'});
  data = new Model({foo:'bar', bar:'foo', bool: false});
  template.render(el, data);
  data.set('bool', true);
  equalTokens(el, '<div>foo</div>', 'Inline Unless helper is data bound');


});
