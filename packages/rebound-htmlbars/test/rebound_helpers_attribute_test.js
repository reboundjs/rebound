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
        // IE9 does strange things with uppercasing checkboxes' checked property
        a[0] = a[0] ? a[0].toLowerCase() : a[0];
        b[0] = b[0] ? b[0].toLowerCase() : b[0];
        if (a[0] > b[0]) {
          return 1;
        }
        if (a[0] < b[0]) {
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

Attribute

*************************************************************/

QUnit.test('Rebound Helpers - Attribute', function() {


  /*******************************************************************/
  /** The only interface these helpers should need is get and set.  **/
  /**      Augment the object prototype to provide this api         **/

  // Object.prototype.get = function(key){ return this[key]; };
  // Object.prototype.set = function(key, val){ this[key] = val; };

  /*******************************************************************/

  var evt = document.createEvent("HTMLEvents");
  evt.initEvent("change", false, true);

  var template, data, dom = document.createDocumentFragment();

  template = compiler.compile('<div class={{bar}}>test</div>', {name: 'test/partial'});
  template.render(dom, new Model({foo:'bar', bar:'foo'}));
  equalTokens(dom, '<div class="foo">test</div>', 'Attribute helper adds element attribute');



  template = compiler.compile('<div class="test {{bar}}">test</div>', {name: 'test/partial'});
  window.foo = true;
  template.render(dom, new Model({foo:'bar', bar:'foo'}));
  equalTokens(dom, '<div class="test foo">test</div>', 'Attribute helper appends additional element attributes');



  template = compiler.compile('<div class={{bar}}>test</div>', {name: 'test/partial'});
  data = new Model({foo:'bar', bar:'foo', bool: false});
  template.render(dom, data);
  data.set('bar', 'bar');
  equalTokens(dom, '<div class="bar">test</div>', 'Attribute is data bound');



  template = compiler.compile('<input value={{bar}}>', {name: 'test/partial'});
  data = new Model({foo:'bar', bar:'foo', bool: false});
  template.render(dom, data);
  data.set('bar', 'bar');
  equal(dom.firstChild.value, 'bar', 'Value of text input is two way data bound data -> element');
  equalTokens(dom, '<input value="bar">', 'Value Attribute on text input is two way data bound element -> data');
  dom.firstChild.value = 'Hello World';
  dom.firstChild.dispatchEvent(evt);
  equal(data.get('bar'), 'Hello World', 'Value on text input is two way data bound element -> data');



  template = compiler.compile('<input type="email" value={{bar}}>', {name: 'test/partial'});
  data = new Model({foo:'bar', bar:'foo', bool: false});
  template.render(dom, data);
  data.set('bar', 'bar');
  equal(dom.firstChild.value, 'bar', 'Value of email input is two way data bound data -> element');
  equalTokens(dom, '<input type="email" value="bar">', 'Value Attribute on email input is two way data bound element -> data');
  dom.firstChild.value = 'Hello World';
  dom.firstChild.dispatchEvent(evt);
  equal(data.get('bar'), 'Hello World', 'Value on email input is two way data bound element -> data');



  template = compiler.compile('<input type="password" value={{bar}}>', {name: 'test/partial'});
  data = new Model({foo:'bar', bar:'foo', bool: false});
  template.render(dom, data);
  data.set('bar', 'bar');
  equal(dom.firstChild.value, 'bar', 'Value of password input is two way data bound data -> element');
  equalTokens(dom, '<input type="password" value="bar">', 'Value Attribute on password input is two way data bound element -> data');
  dom.firstChild.value = 'Hello World';
  dom.firstChild.dispatchEvent(evt);
  equal(data.get('bar'), 'Hello World', 'Value on password input is two way data bound element -> data');



  template = compiler.compile('<input type="search" value={{bar}}>', {name: 'test/partial'});
  data = new Model({foo:'bar', bar:'foo', bool: false});
  template.render(dom, data);
  data.set('bar', 'bar');
  equal(dom.firstChild.value, 'bar', 'Value of search input is two way data bound data -> element');
  equalTokens(dom, '<input type="search" value="bar">', 'Value Attribute on search input is two way data bound element -> data');
  dom.firstChild.value = 'Hello World';
  dom.firstChild.dispatchEvent(evt);
  equal(data.get('bar'), 'Hello World', 'Value on search input is two way data bound element -> data');



  template = compiler.compile('<input type="url" value={{bar}}>', {name: 'test/partial'});
  data = new Model({foo:'bar', bar:'foo', bool: false});
  template.render(dom, data);
  data.set('bar', 'bar');
  equal(dom.firstChild.value, 'bar', 'Value of url input is two way data bound data -> element');
  equalTokens(dom, '<input type="url" value="bar">', 'Value Attribute on url input is two way data bound element -> data');
  dom.firstChild.value = 'Hello World';
  dom.firstChild.dispatchEvent(evt);
  equal(data.get('bar'), 'Hello World', 'Value on url input is two way data bound element -> data');



  template = compiler.compile('<input type="tel" value={{bar}}>', {name: 'test/partial'});
  data = new Model({foo:'bar', bar:'foo', bool: false});
  template.render(dom, data);
  data.set('bar', 'bar');
  equal(dom.firstChild.value, 'bar', 'Value of tel input is two way data bound data -> element');
  equalTokens(dom, '<input type="tel" value="bar">', 'Value Attribute on tel input is two way data bound element -> data');
  dom.firstChild.value = 'Hello World';
  dom.firstChild.dispatchEvent(evt);
  equal(data.get('bar'), 'Hello World', 'Value on tel input is two way data bound element -> data');


  template = compiler.compile('<input type="checkbox" checked={{bool}}>', {name: 'test/partial'});
  data = new Model({bool: false});
  template.render(dom, data);
  equalTokens(dom, "<input type='checkbox'>", 'Checked Attribute on checkbox not present on false');
  data.set('bool', true);
  equalTokens(dom, "<input type='checkbox' checked='true'>", 'Checked Attribute on checkbox present on true, and is data bound');


  template = compiler.compile('<div class="{{foo}} {{bar}}"></div>', {name: 'test/partial'});
  data = new Model({foo: 'foo', bar: 'bar'});
  template.render(dom, data);
  equalTokens(dom, "<div class='foo bar'></div>", 'Multiple attribute morphs concat properly');
  data.set('bar', 'foo');
  equalTokens(dom, "<div class='foo foo'></div>", 'Concatted attributes are data bound');
  data.set('bar', undefined);
  equalTokens(dom, "<div class='foo '></div>", 'Concatted attributes handle undefined values');


});
