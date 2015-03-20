require(['rebound-compiler/rebound-compiler', 'simple-html-tokenizer', 'rebound-component/helpers', 'rebound-data/model'], function(compiler, tokenizer, helpers, Model) {

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
  function notify(obj, path) {
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
  }


  /************************************************************

  Attribute

  *************************************************************/

  QUnit.test('Rebound Helpers - Attribute', function() {


    /*******************************************************************/
    /** The only interface these helpers should need is get and set.  **/
    /**      Augment the object prototype to provide this api         **/

    Object.prototype.get = function(key){ return this[key]; };
    Object.prototype.set = function(key, val){ this[key] = val; };

    /*******************************************************************/

    var evt = document.createEvent("HTMLEvents");
    evt.initEvent("change", false, true);

    var template, data, dom;

    template = compiler.compile('<div class={{bar}}>test</div>', {name: 'test/partial'});
    dom = template.render({foo:'bar', bar:'foo'});
    equalTokens(dom, '<div class="foo">test</div>', 'Attribute helper adds element attribute');



    template = compiler.compile('<div class="test {{bar}}">test</div>', {name: 'test/partial'});
    dom = template.render({foo:'bar', bar:'foo'});
    equalTokens(dom, '<div class="test foo">test</div>', 'Attribute helper appends additional element attributes');



    template = compiler.compile('<div class={{bar}}>test</div>', {name: 'test/partial'});
    data = {foo:'bar', bar:'foo', bool: false};
    dom = template.render(data);
    data.bar = 'bar';
    notify(data, ['bar']);
    equalTokens(dom, '<div class="bar">test</div>', 'Attribute is data bound');



    template = compiler.compile('<input value={{bar}}>', {name: 'test/partial'});
    data = {foo:'bar', bar:'foo', bool: false};
    dom = template.render(data);
    data.bar = 'bar';
    notify(data, ['bar']);
    equal(dom.firstChild.value, 'bar', 'Value of text input is two way data bound data -> element');
    equalTokens(dom, '<input value="bar">', 'Value Attribute on text input is two way data bound element -> data');
    dom.firstChild.value = 'Hello World';
    dom.firstChild.dispatchEvent(evt);
    notify(data, ['bar']);
    equal(data.bar, 'Hello World', 'Value on text input is two way data bound element -> data');



    template = compiler.compile('<input type="email" value={{bar}}>', {name: 'test/partial'});
    data = {foo:'bar', bar:'foo', bool: false};
    dom = template.render(data);
    data.bar = 'bar';
    notify(data, ['bar']);
    equal(dom.firstChild.value, 'bar', 'Value of email input is two way data bound data -> element');
    equalTokens(dom, '<input type="email" value="bar">', 'Value Attribute on email input is two way data bound element -> data');
    dom.firstChild.value = 'Hello World';
    dom.firstChild.dispatchEvent(evt);
    notify(data, ['bar']);
    equal(data.bar, 'Hello World', 'Value on email input is two way data bound element -> data');



    template = compiler.compile('<input type="password" value={{bar}}>', {name: 'test/partial'});
    data = {foo:'bar', bar:'foo', bool: false};
    dom = template.render(data);
    data.bar = 'bar';
    notify(data, ['bar']);
    equal(dom.firstChild.value, 'bar', 'Value of password input is two way data bound data -> element');
    equalTokens(dom, '<input type="password" value="bar">', 'Value Attribute on password input is two way data bound element -> data');
    dom.firstChild.value = 'Hello World';
    dom.firstChild.dispatchEvent(evt);
    notify(data, ['bar']);
    equal(data.bar, 'Hello World', 'Value on password input is two way data bound element -> data');



    template = compiler.compile('<input type="search" value={{bar}}>', {name: 'test/partial'});
    data = {foo:'bar', bar:'foo', bool: false};
    dom = template.render(data);
    data.bar = 'bar';
    notify(data, ['bar']);
    equal(dom.firstChild.value, 'bar', 'Value of search input is two way data bound data -> element');
    equalTokens(dom, '<input type="search" value="bar">', 'Value Attribute on search input is two way data bound element -> data');
    dom.firstChild.value = 'Hello World';
    dom.firstChild.dispatchEvent(evt);
    notify(data, ['bar']);
    equal(data.bar, 'Hello World', 'Value on search input is two way data bound element -> data');



    template = compiler.compile('<input type="url" value={{bar}}>', {name: 'test/partial'});
    data = {foo:'bar', bar:'foo', bool: false};
    dom = template.render(data);
    data.bar = 'bar';
    notify(data, ['bar']);
    equal(dom.firstChild.value, 'bar', 'Value of url input is two way data bound data -> element');
    equalTokens(dom, '<input type="url" value="bar">', 'Value Attribute on url input is two way data bound element -> data');
    dom.firstChild.value = 'Hello World';
    dom.firstChild.dispatchEvent(evt);
    notify(data, ['bar']);
    equal(data.bar, 'Hello World', 'Value on url input is two way data bound element -> data');



    template = compiler.compile('<input type="tel" value={{bar}}>', {name: 'test/partial'});
    data = {foo:'bar', bar:'foo', bool: false};
    dom = template.render(data);
    data.bar = 'bar';
    notify(data, ['bar']);
    equal(dom.firstChild.value, 'bar', 'Value of tel input is two way data bound data -> element');
    equalTokens(dom, '<input type="tel" value="bar">', 'Value Attribute on tel input is two way data bound element -> data');
    dom.firstChild.value = 'Hello World';
    dom.firstChild.dispatchEvent(evt);
    notify(data, ['bar']);
    equal(data.bar, 'Hello World', 'Value on tel input is two way data bound element -> data');


    template = compiler.compile('<input type="checkbox" checked={{bool}}>', {name: 'test/partial'});
    data = {bool: false};
    dom = template.render(data);
    equalTokens(dom, "<input type='checkbox'>", 'Checked Attribute on checkbox not present on false');
    data.bool = true;
    notify(data, ['bool']);
    equalTokens(dom, "<input type='checkbox' checked='true'>", 'Checked Attribute on checkbox present on true, and is data bound');


    /*******************************************************************/
    /**                Clean up our object prototype hack             **/

    delete Object.prototype.get;
    delete Object.prototype.set;

    /*******************************************************************/

  });
});
