import compiler from 'rebound-compiler/compile';
import tokenizer from 'simple-html-tokenizer';
import helpers, { hasHelper, lookupHelper, registerHelper, registerPartial } from "rebound-htmlbars/helpers";
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

Register Helper

*************************************************************/

QUnit.test('Rebound Helpers - Register', function(assert) {

  assert.expect(5);

  var func = function() {
    return 'test';
  };
  registerHelper('test', func);
  var regFunc = lookupHelper('test');
  equal(func, regFunc, 'helpers.register adds a helper to the global scope which can be fetched by Helpers.lookupHelper');


  var template, dom = document.createDocumentFragment();

  template = compiler.compile('<div>{{doesnotexist foo bar}}</div>');
  template.render(dom, new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(dom, '<div><!----></div>', 'Using a helper that does not exist failes silently.');

  template = compiler.compile('<div>{{test foo bar}}</div>');
  template.render(dom, new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(dom, '<div>test</div>', 'Using a helper that does exist outputs the return value.');


  template = compiler.compile('<div>{{if bool (doesnotexist foo)}}</div>');
  template.render(dom, new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(dom, '<div><!----></div>', 'Using a helper that does not exist in a subexpression fails silently.');

  template = compiler.compile('<div>{{if bool (test)}}</div>');
  template.render(dom, new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(dom, '<div>test</div>', 'Using a helper that does exist in a subexpression outputs the return value.');


});
