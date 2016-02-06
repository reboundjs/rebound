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

If

*************************************************************/

QUnit.test('Rebound Helpers - If', function() {

  var template, data, dom = document.createDocumentFragment();

  template = compiler.compile('<div>{{#if bool}}{{foo}}{{/if}}</div>', {name: 'test/partial'});
  template.render(dom, new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(dom, '<div><!----></div>', 'Block If helper without else block - false');


  template = compiler.compile('<div>{{#if bool}}{{foo}}{{else}}{{bar}}{{/if}}</div>', {name: 'test/partial'});
  template.render(dom, new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(dom, '<div>foo</div>', 'Block If helper with else block - false');



  template = compiler.compile('<div>{{#if bool}}{{foo}}{{/if}}</div>', {name: 'test/partial'});
  template.render(dom, new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(dom, '<div>bar</div>', 'Block If helper without else block - true');



  template = compiler.compile('<div>{{#if bool}}{{foo}}{{else}}{{bar}}{{/if}}</div>', {name: 'test/partial'});
  template.render(dom, new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(dom, '<div>bar</div>', 'Block If helper with else block - true');



  template = compiler.compile('<div>{{#if bool}}{{foo}}{{else}}{{bar}}{{/if}}</div>', {name: 'test/partial'});
  data = new Model({foo:'bar', bar:'foo', bool: false});
  template.render(dom, data);
  data.set('bool', true);
  equalTokens(dom, '<div>bar</div>', 'Block If helper is data bound');
  data.set('bool', false);
  equalTokens(dom, '<div>foo</div>', 'Block If helper is data bound and returns to old value');



  template = compiler.compile('<div>{{if bool foo}}</div>', {name: 'test/partial'});
  template.render(dom, new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(dom, '<div>bar</div>', 'Inline If helper in content without else term - true');



  template = compiler.compile('<div>{{if bool foo bar}}</div>', {name: 'test/partial'});
  template.render(dom, new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(dom, '<div>bar</div>', 'Inline If helper in content with else term - true');



  template = compiler.compile('<div>{{if bool foo}}</div>', {name: 'test/partial'});
  template.render(dom, new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(dom, '<div><!----></div>', 'Inline If helper in content without else term - false');



  template = compiler.compile('<div>{{if bool foo bar}}</div>', {name: 'test/partial'});
  template.render(dom, new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(dom, '<div>foo</div>', 'Inline If helper in content with else term - false');



  template = compiler.compile('<div class={{if bool foo}}>test</div>', {name: 'test/partial'});
  template.render(dom, new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(dom, '<div class="bar">test</div>', 'Inline If helper in element without else term - true');



  template = compiler.compile('<div class={{if bool foo bar}}>test</div>', {name: 'test/partial'});
  template.render(dom, new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(dom, '<div class="bar">test</div>', 'Inline If helper in element with else term - true');



  template = compiler.compile('<div class={{if bool foo}}>test</div>', {name: 'test/partial'});
  template.render(dom, new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(dom, '<div>test</div>', 'Inline If helper in element without else term - false');



  template = compiler.compile('<div class={{if bool foo bar}}>test</div>', {name: 'test/partial'});
  template.render(dom, new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(dom, '<div class="foo">test</div>', 'Inline If helper in element without else term - true');



  template = compiler.compile('<div>{{if bool foo bar}}</div>', {name: 'test/partial'});
  data = new Model({foo:'bar', bar:'foo', bool: false});
  template.render(dom, data);
  data.set('bool', true);
  equalTokens(dom, '<div>bar</div>', 'Inline If helper is data bound');
  data.set('bool', '1');
  equalTokens(dom, '<div>bar</div>', 'Inline If helper works with string values');
  data.set('bool', '');
  equalTokens(dom, '<div>foo</div>', 'Inline If helper works with falsy string values');




  // Nexted Block IFs
  template = compiler.compile('<div>{{#if bool}}{{#if bool}}{{val}}{{else}}{{val2}}{{/if}}{{else}}{{val2}}{{/if}}</div>', {name: 'test/partial'});
  data = new Model({bool: true, val: 'true', val2: 'false'});
  template.render(dom, data);
  equal(dom.firstChild.innerHTML, 'true', 'If helpers that are the immediate children of if helpers render on first run.');
  data.set('bool', false);
  equal(dom.firstChild.innerHTML, 'false', 'If helpers that are the immediate children of if helpers re-render successfully on change.');

  // Re-eval on reset of collection
  template = compiler.compile('<div>{{if arr 1 0}}</div>', {name: 'test/partial'});
  data = new Model({arr: []});
  template.render(dom, data);
  data.reset({arr: [{id: 1}]});
  equalTokens(dom, '<div>1</div>', 'Inline If helper is data bound for collection reset');

});
