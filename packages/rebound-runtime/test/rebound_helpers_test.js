require(['rebound-compiler/rebound-compiler', 'simple-html-tokenizer', 'rebound-runtime/helpers'], function(compiler, tokenizer, helpers){

    function equalTokens(fragment, html, message) {
      var div = document.createElement("div");

      div.appendChild(fragment.cloneNode(true));

      var fragTokens = tokenizer.tokenize(div.innerHTML);
      var htmlTokens = tokenizer.tokenize(html);

      function normalizeTokens(token) {
        if (token.type === 'StartTag') {
          token.attributes = token.attributes.sort(function(a,b){
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
      _.each(path, function(path){
        if(_.isArray(obj.__observers[path])){
          _.each(obj.__observers[path], function(callback, index) {
            if(callback){ callback(); }
            else{ delete obj.__observers[path][index]; }
          });
        }
      });
    }

    helpers = helpers.default;


    /************************************************************

                          Register Helper

    *************************************************************/

    QUnit.test('Rebound Helpers - Register', function() {

      /*******************************************************************/
      /** The only interface these helpers should need is get and set.  **/
      /**      Augment the object prototype to provide this api         **/

          Object.prototype.get = function(key){ return this[key]; };
          Object.prototype.set = function(key, val){ this[key] = val; };

      /*******************************************************************/


      var func = function(){ return 1; };
      helpers.registerHelper('test', func);
      var regFunc = helpers.lookupHelper('test');
      equal(func, regFunc, 'helpers.register adds a helper to the global scope which can be fetched by Helpers.lookupHelper');


      /*******************************************************************/
      /**                Clean up our object prototype hack             **/

          Object.prototype.get = undefined;
          Object.prototype.set = undefined;

      /*******************************************************************/
    });


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
      dom = template({foo:'bar', bar:'foo'});
      equalTokens(dom, '<div class="foo">test</div>', 'Attribute helper adds element attribute');



      template = compiler.compile('<div class="test {{bar}}">test</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo'});
      equalTokens(dom, '<div class="test foo">test</div>', 'Attribute helper appends additional element attributes');



      template = compiler.compile('<div class={{bar}}>test</div>', {name: 'test/partial'});
      data = {foo:'bar', bar:'foo', bool: false};
      dom = template(data);
      data.bar = 'bar';
      notify(data, ['bar']);
      equalTokens(dom, '<div class="bar">test</div>', 'Attribute is data bound');



      template = compiler.compile('<input value={{bar}}>', {name: 'test/partial'});
      data = {foo:'bar', bar:'foo', bool: false};
      dom = template(data);
      data.bar = 'bar';
      notify(data, ['bar']);
      equal(dom.value, 'bar', 'Value of text input is two way data bound data -> element');
      equalTokens(dom, '<input value="bar">', 'Value Attribute on text input is two way data bound element -> data');
      dom.value = 'Hello World';
      dom.dispatchEvent(evt);
      notify(data, ['bar']);
      equal(data.bar, 'Hello World', 'Value on text input is two way data bound element -> data');



      template = compiler.compile('<input type="email" value={{bar}}>', {name: 'test/partial'});
      data = {foo:'bar', bar:'foo', bool: false};
      dom = template(data);
      data.bar = 'bar';
      notify(data, ['bar']);
      equal(dom.value, 'bar', 'Value of email input is two way data bound data -> element');
      equalTokens(dom, '<input type="email" value="bar">', 'Value Attribute on email input is two way data bound element -> data');
      dom.value = 'Hello World';
      dom.dispatchEvent(evt);
      notify(data, ['bar']);
      equal(data.bar, 'Hello World', 'Value on email input is two way data bound element -> data');



      template = compiler.compile('<input type="password" value={{bar}}>', {name: 'test/partial'});
      data = {foo:'bar', bar:'foo', bool: false};
      dom = template(data);
      data.bar = 'bar';
      notify(data, ['bar']);
      equal(dom.value, 'bar', 'Value of password input is two way data bound data -> element');
      equalTokens(dom, '<input type="password" value="bar">', 'Value Attribute on password input is two way data bound element -> data');
      dom.value = 'Hello World';
      dom.dispatchEvent(evt);
      notify(data, ['bar']);
      equal(data.bar, 'Hello World', 'Value on password input is two way data bound element -> data');



      template = compiler.compile('<input type="search" value={{bar}}>', {name: 'test/partial'});
      data = {foo:'bar', bar:'foo', bool: false};
      dom = template(data);
      data.bar = 'bar';
      notify(data, ['bar']);
      equal(dom.value, 'bar', 'Value of search input is two way data bound data -> element');
      equalTokens(dom, '<input type="search" value="bar">', 'Value Attribute on search input is two way data bound element -> data');
      dom.value = 'Hello World';
      dom.dispatchEvent(evt);
      notify(data, ['bar']);
      equal(data.bar, 'Hello World', 'Value on search input is two way data bound element -> data');



      template = compiler.compile('<input type="url" value={{bar}}>', {name: 'test/partial'});
      data = {foo:'bar', bar:'foo', bool: false};
      dom = template(data);
      data.bar = 'bar';
      notify(data, ['bar']);
      equal(dom.value, 'bar', 'Value of url input is two way data bound data -> element');
      equalTokens(dom, '<input type="url" value="bar">', 'Value Attribute on url input is two way data bound element -> data');
      dom.value = 'Hello World';
      dom.dispatchEvent(evt);
      notify(data, ['bar']);
      equal(data.bar, 'Hello World', 'Value on url input is two way data bound element -> data');



      template = compiler.compile('<input type="tel" value={{bar}}>', {name: 'test/partial'});
      data = {foo:'bar', bar:'foo', bool: false};
      dom = template(data);
      data.bar = 'bar';
      notify(data, ['bar']);
      equal(dom.value, 'bar', 'Value of tel input is two way data bound data -> element');
      equalTokens(dom, '<input type="tel" value="bar">', 'Value Attribute on tel input is two way data bound element -> data');
      dom.value = 'Hello World';
      dom.dispatchEvent(evt);
      notify(data, ['bar']);
      equal(data.bar, 'Hello World', 'Value on tel input is two way data bound element -> data');


      template = compiler.compile('<input type="checkbox" checked={{bool}}>', {name: 'test/partial'});
      data = {bool: false};
      dom = template(data);
      equalTokens(dom, "<input type='checkbox'>", 'Checked Attribute on checkbox not present on false');
      data.bool = true;
      notify(data, ['bool']);
      equalTokens(dom, "<input type='checkbox' checked='true'>", 'Checked Attribute on checkbox present on true, and is data bound');


      /*******************************************************************/
      /**                Clean up our object prototype hack             **/

          Object.prototype.get = undefined;
          Object.prototype.set = undefined;

      /*******************************************************************/

    });


    /************************************************************

                              Partials

    *************************************************************/

    QUnit.test('Rebound Helpers - Partial', function() {


      /*******************************************************************/
      /** The only interface these helpers should need is get and set.  **/
      /**      Augment the object prototype to provide this api         **/

          Object.prototype.get = function(key){ return this[key]; };
          Object.prototype.set = function(key, val){ this[key] = val; };

      /*******************************************************************/

      var template, data, dom, partial;

      template = compiler.compile('<div class={{bar}}>{{foo}}</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo'});
      partial = (compiler.compile('{{partial "test/partial"}}', {name: 'test'}))({foo:'bar', bar:'foo'});
      equalTokens(dom, '<div class="foo">bar</div>', 'Partial helper inserts partial template');



      template = compiler.compile('<div class={{bar}}>{{foo}}</div>', {name: 'test/partial'});

      partial = compiler.compile('{{partial "test/partial"}}', {name: 'test'});

      data = {foo:'bar', bar:'foo', bool: false};
      dom = partial(data);
      data.foo = 'foo';
      data.bar = 'bar';
      notify(data, ['foo', 'bar']);
      equalTokens(dom, '<div class="bar">foo</div>', 'Partial is data bound');


      /*******************************************************************/
      /**                Clean up our object prototype hack             **/

          Object.prototype.get = undefined;
          Object.prototype.set = undefined;

      /*******************************************************************/

    });

    /************************************************************

                                If

    *************************************************************/

    QUnit.test('Rebound Helpers - If', function() {


      /*******************************************************************/
      /** The only interface these helpers should need is get and set.  **/
      /**      Augment the object prototype to provide this api         **/

          Object.prototype.get = function(key){ return this[key]; };
          Object.prototype.set = function(key, val){ this[key] = val; };

      /*******************************************************************/

      var template, data, dom;

      template = compiler.compile('<div>{{#if bool}}{{foo}}{{/if}}</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div></div>', 'Block If helper without else block - false');



      template = compiler.compile('<div>{{#if bool}}{{foo}}{{else}}{{bar}}{{/if}}</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div>foo</div>', 'Block If helper with else block - false');



      template = compiler.compile('<div>{{#if bool}}{{foo}}{{/if}}</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div>bar</div>', 'Block If helper without else block - true');



      template = compiler.compile('<div>{{#if bool}}{{foo}}{{else}}{{bar}}{{/if}}</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div>bar</div>', 'Block If helper with else block - true');



      template = compiler.compile('<div>{{#if bool}}{{foo}}{{/if}}</div>', {name: 'test/partial'});
      data = {foo:'bar', bar:'foo', bool: false};
      dom = template(data);
      data.bool = true;
      notify(data, 'bool');
      equalTokens(dom, '<div>bar</div>', 'Block If helper is data bound');



      template = compiler.compile('<div>{{if bool foo}}</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div>bar</div>', 'Inline If helper in content without else term - true');



      template = compiler.compile('<div>{{if bool foo bar}}</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div>bar</div>', 'Inline If helper in content with else term - true');



      template = compiler.compile('<div>{{if bool foo}}</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div></div>', 'Inline If helper in content without else term - false');



      template = compiler.compile('<div>{{if bool foo bar}}</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div>foo</div>', 'Inline If helper in content without else term - true');



      template = compiler.compile('<div class={{if bool foo}}>test</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div class="bar">test</div>', 'Inline If helper in element without else term - true');



      template = compiler.compile('<div class={{if bool foo bar}}>test</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div class="bar">test</div>', 'Inline If helper in element with else term - true');



      template = compiler.compile('<div class={{if bool foo}}>test</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div class="">test</div>', 'Inline If helper in element without else term - false');



      template = compiler.compile('<div class={{if bool foo bar}}>test</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div class="foo">test</div>', 'Inline If helper in element without else term - true');



      template = compiler.compile('<div>{{if bool foo bar}}</div>', {name: 'test/partial'});
      data = {foo:'bar', bar:'foo', bool: false};
      dom = template(data);
      data.bool = true;
      notify(data, 'bool');
      equalTokens(dom, '<div>bar</div>', 'Inline If helper is data bound');


      /*******************************************************************/
      /**                Clean up our object prototype hack             **/

          Object.prototype.get = undefined;
          Object.prototype.set = undefined;

      /*******************************************************************/

    });

    /************************************************************

                                Unles

    *************************************************************/

    QUnit.test('Rebound Helpers - Unless', function() {


      /*******************************************************************/
      /** The only interface these helpers should need is get and set.  **/
      /**      Augment the object prototype to provide this api         **/

          Object.prototype.get = function(key){ return this[key]; };
          Object.prototype.set = function(key, val){ this[key] = val; };

      /*******************************************************************/

      var template, data, dom;


      template = compiler.compile('<div>{{#unless bool}}{{foo}}{{/unless}}</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div>bar</div>', 'Block Unless helper in content without else block - false');



      template = compiler.compile('<div>{{#unless bool}}{{foo}}{{else}}{{bar}}{{/unless}}</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div>bar</div>', 'Block Unless helper in content with else block - false');



      template = compiler.compile('<div>{{#unless bool}}{{foo}}{{/unless}}</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div>bar</div>', 'Block Unless helper in content without else block - false');



      template = compiler.compile('<div>{{#unless bool}}{{foo}}{{else}}{{bar}}{{/unless}}</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div>foo</div>', 'Block Unless helper in content with else block - true');



      template = compiler.compile('<div>{{#unless bool}}{{foo}}{{else}}{{bar}}{{/unless}}</div>', {name: 'test/partial'});
      data = {foo:'bar', bar:'foo', bool: false};
      dom = template(data);
      data.bool = true;
      notify(data, 'bool');
      equalTokens(dom, '<div>foo</div>', 'Block Unless helper is data bound');



      template = compiler.compile('<div>{{unless bool foo}}</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div></div>', 'Inline Unless helper in content without else term - true');



      template = compiler.compile('<div>{{unless bool foo bar}}</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div>foo</div>', 'Inline Unless helper in content with else term - true');



      template = compiler.compile('<div>{{unless bool foo}}</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div>bar</div>', 'Inline Unless helper in content without else term - false');



      template = compiler.compile('<div>{{unless bool foo bar}}</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div>bar</div>', 'Inline Unless helper in content without else term - true');



      template = compiler.compile('<div class={{unless bool foo}}>test</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div class="">test</div>', 'Inline Unless helper in element without else term - true');



      template = compiler.compile('<div class={{unless bool foo bar}}>test</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div class="foo">test</div>', 'Inline Unless helper in element with else term - true');



      template = compiler.compile('<div class={{unless bool foo}}>test</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div class="bar">test</div>', 'Inline Unless helper in element without else term - false');



      template = compiler.compile('<div class={{unless bool foo bar}}>test</div>', {name: 'test/partial'});
      dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div class="bar">test</div>', 'Inline Unless helper in element without else term - true');



      template = compiler.compile('<div>{{unless bool foo bar}}</div>', {name: 'test/partial'});
      data = {foo:'bar', bar:'foo', bool: false};
      dom = template(data);
      data.bool = true;
      notify(data, 'bool');
      equalTokens(dom, '<div>foo</div>', 'Inline Unless helper is data bound');


      /*******************************************************************/
      /**                Clean up our object prototype hack             **/

          Object.prototype.get = undefined;
          Object.prototype.set = undefined;

      /*******************************************************************/

    });


    // TODO: Add each helper tests

    // TODO: Add with helper tests

    // TODO: Add length helper tests

    // TODO: Add on helper tests

    // TODO: Computed properties passed to helpers evaluate properly (specifically they break lazyvalue caches when their dependancies re evaluate)

});