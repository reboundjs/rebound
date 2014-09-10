require(['rebound-compiler/rebound-compiler', 'simple-html-tokenizer', 'rebound-runtime/helpers'], function(compiler, tokenizer, helpers){

    function equalTokens(fragment, html) {
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

      deepEqual(fragTokens, htmlTokens);
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

    // Add get method to all objects to simulate models
    Object.prototype.get = function(key){ return this[key]; };
    Object.prototype.set = function(key, val){ this[val] = val; };

    helpers = helpers.default;


    /************************************************************

                          Register Helper

    *************************************************************/

    QUnit.test('REGISTER HELPER adds a helper which can be fetch by LOOKUP HELPER', function() {
      var func = function(){ return 1; };
      helpers.registerHelper('test', func);
      var regFunc = helpers.lookupHelper('test');
      equal(func, regFunc);
    });


    /************************************************************

                              Attribute

    *************************************************************/

    QUnit.test('ATTRIBUTE helper adds element attribute', function() {

      var template = compiler.compile('<div class={{bar}}>test</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo'});
      equalTokens(dom, '<div class="foo">test</div>');
    });

    QUnit.test('ATTRIBUTE helper adds additional element attribute', function() {

      var template = compiler.compile('<div class="test {{bar}}">test</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo'});
      equalTokens(dom, '<div class="test foo">test</div>');
    });

    QUnit.test('ATTRIBUTE is data bound', function() {

      var template = compiler.compile('<div class={{bar}}>test</div>', {name: 'test/partial'});
      var data = {foo:'bar', bar:'foo', bool: false};
      var dom = template(data);
      equalTokens(dom, '<div class="foo">test</div>');
      data.bar = 'bar';
      notify(data, ['bar']);
      equalTokens(dom, '<div class="bar">test</div>');

    });

    inputTypes = {'text':true, 'email':true, 'password':true, 'search':true, 'url':true, 'tel':true,},

    QUnit.test('value ATTRIBUTE on text input is two way data bound', function() {

      var template = compiler.compile('<input value={{bar}}>', {name: 'test/partial'});
      var data = {foo:'bar', bar:'foo', bool: false};
      var dom = template(data);
      equalTokens(dom, '<input value="foo">');
      data.bar = 'bar';
      notify(data, ['bar']);
      equalTokens(dom, '<input value="bar">');
      dom.setAttribute('value',"Hello World");
      equalTokens(dom, '<input value="Hello World">');

    });

    QUnit.test('value ATTRIBUTE on email input is two way data bound', function() {

      var template = compiler.compile('<input type="email" value={{bar}}>', {name: 'test/partial'});
      var data = {foo:'bar', bar:'foo', bool: false};
      var dom = template(data);
      equalTokens(dom, '<input type="email" value="foo">');
      data.bar = 'bar';
      notify(data, ['bar']);
      equalTokens(dom, '<input type="email" value="bar">');
      dom.setAttribute('value',"Hello World");
      equalTokens(dom, '<input type="email" value="Hello World">');

    });

    QUnit.test('value ATTRIBUTE on password input is two way data bound', function() {

      var template = compiler.compile('<input type="password" value={{bar}}>', {name: 'test/partial'});
      var data = {foo:'bar', bar:'foo', bool: false};
      var dom = template(data);
      equalTokens(dom, '<input type="password" value="foo">');
      data.bar = 'bar';
      notify(data, ['bar']);
      equalTokens(dom, '<input type="password" value="bar">');
      dom.setAttribute('value',"Hello World");
      equalTokens(dom, '<input type="password" value="Hello World">');

    });

    QUnit.test('value ATTRIBUTE on search input is two way data bound', function() {

      var template = compiler.compile('<input type="search" value={{bar}}>', {name: 'test/partial'});
      var data = {foo:'bar', bar:'foo', bool: false};
      var dom = template(data);
      equalTokens(dom, '<input type="search" value="foo">');
      data.bar = 'bar';
      notify(data, ['bar']);
      equalTokens(dom, '<input type="search" value="bar">');
      dom.setAttribute('value',"Hello World");
      equalTokens(dom, '<input type="search" value="Hello World">');

    });

    QUnit.test('value ATTRIBUTE on url input is two way data bound', function() {

      var template = compiler.compile('<input type="url" value={{bar}}>', {name: 'test/partial'});
      var data = {foo:'bar', bar:'foo', bool: false};
      var dom = template(data);
      equalTokens(dom, '<input type="url" value="foo">');
      data.bar = 'bar';
      notify(data, ['bar']);
      equalTokens(dom, '<input type="url" value="bar">');
      dom.setAttribute('value',"Hello World");
      equalTokens(dom, '<input type="url" value="Hello World">');

    });

    QUnit.test('value ATTRIBUTE on tel input is two way data bound', function() {

      var template = compiler.compile('<input type="tel" value={{bar}}>', {name: 'test/partial'});
      var data = {foo:'bar', bar:'foo', bool: false};
      var dom = template(data);
      equalTokens(dom, '<input type="tel" value="foo">');
      data.bar = 'bar';
      notify(data, ['bar']);
      equalTokens(dom, '<input type="tel" value="bar">');
      dom.setAttribute('value',"Hello World");
      equalTokens(dom, '<input type="tel" value="Hello World">');

    });

    QUnit.test('checked ATTRIBUTE on checkbox present on true, removed on false and is data bound', function() {
      var template = compiler.compile('<input type="checkbox" checked={{bool}}>', {name: 'test/partial'});
      var data = {bool: false};
      var dom = template(data);
      equalTokens(dom, '<input type="checkbox">');
      data.bool = true;
      notify(data, ['bool']);
      equalTokens(dom, '<input type="checkbox" checked="true">');
    });


    /************************************************************

                              Partials

    *************************************************************/

    QUnit.test('PARTIAL helper inserts partial template', function() {

      var template = compiler.compile('<div class={{bar}}>{{foo}}</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo'});
      equalTokens(dom, '<div class="foo">bar</div>');

      var partial = (compiler.compile('{{partial "test/partial"}}', 'test'))({foo:'bar', bar:'foo'});
      equalTokens(dom, '<div class="foo">bar</div>');

    });

    QUnit.test('PARTIAL is data bound', function() {

      var template = compiler.compile('<div class={{bar}}>{{foo}}</div>', {name: 'test/partial'});
      var partial = compiler.compile('{{partial "test/partial"}}', 'test');

      var data = {foo:'bar', bar:'foo', bool: false};
      var dom = partial(data);
      equalTokens(dom, '<div class="foo">bar</div>');

      data.foo = 'foo';
      data.bar = 'bar';
      notify(data, ['foo', 'bar']);
      equalTokens(dom, '<div class="bar">foo</div>');

    });

    /************************************************************

                                If

    *************************************************************/

    QUnit.test('Block IF helper without else block - false', function() {

      var template = compiler.compile('<div>{{#if bool}}{{foo}}{{/if}}</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div></div>');

    });

    QUnit.test('Block IF helper with else block - false', function() {

      var template = compiler.compile('<div>{{#if bool}}{{foo}}{{else}}{{bar}}{{/if}}</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div>foo</div>');

    });

    QUnit.test('Block IF helper without else block - true', function() {

      var template = compiler.compile('<div>{{#if bool}}{{foo}}{{/if}}</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div>bar</div>');

    });

    QUnit.test('Block IF helper with else block - true', function() {

      var template = compiler.compile('<div>{{#if bool}}{{foo}}{{else}}{{bar}}{{/if}}</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div>bar</div>');

    });

    QUnit.test('Block IF helper is data bound', function() {

      var template = compiler.compile('<div>{{#if bool}}{{foo}}{{/if}}</div>', {name: 'test/partial'});
      var data = {foo:'bar', bar:'foo', bool: false};
      var dom = template(data);
      equalTokens(dom, '<div></div>');
      data.bool = true;
      notify(data, 'bool');
      equalTokens(dom, '<div>bar</div>');

    });

    QUnit.test('Non Block IF helper in content without else term - true', function() {

      var template = compiler.compile('<div>{{if bool foo}}</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div>bar</div>');

    });

    QUnit.test('Non Block IF helper in content with else term - true', function() {

      var template = compiler.compile('<div>{{if bool foo bar}}</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div>bar</div>');

    });

    QUnit.test('Non Block IF helper in content without else term - false', function() {

      var template = compiler.compile('<div>{{if bool foo}}</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div></div>');

    });

    QUnit.test('Non Block IF helper in content without else term - true', function() {

      var template = compiler.compile('<div>{{if bool foo bar}}</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div>foo</div>');

    });

    QUnit.test('Non Block IF helper in element without else term - true', function() {

      var template = compiler.compile('<div class={{if bool foo}}>test</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div class="bar">test</div>');

    });

    QUnit.test('Non Block IF helper in element with else term - true', function() {

      var template = compiler.compile('<div class={{if bool foo bar}}>test</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div class="bar">test</div>');

    });

    QUnit.test('Non Block IF helper in element without else term - false', function() {

      var template = compiler.compile('<div class={{if bool foo}}>test</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div class="">test</div>');

    });

    QUnit.test('Non Block IF helper in element without else term - true', function() {

      var template = compiler.compile('<div class={{if bool foo bar}}>test</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div class="foo">test</div>');

    });

    QUnit.test('Non Block IF helper is data bound', function() {

      var template = compiler.compile('<div>{{if bool foo bar}}</div>', {name: 'test/partial'});
      var data = {foo:'bar', bar:'foo', bool: false};
      var dom = template(data);
      equalTokens(dom, '<div>foo</div>');
      data.bool = true;
      notify(data, 'bool');
      equalTokens(dom, '<div>bar</div>');

    });

    /************************************************************

                                Unles

    *************************************************************/

    QUnit.test('Block UNLESS helper in content without else block - false', function() {

      var template = compiler.compile('<div>{{#unless bool}}{{foo}}{{/unless}}</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div>bar</div>');

    });

    QUnit.test('Block UNLESS helper in content with else block - false', function() {

      var template = compiler.compile('<div>{{#unless bool}}{{foo}}{{else}}{{bar}}{{/unless}}</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div>bar</div>');

    });

    QUnit.test('Block UNLESS helper in content without else block - false', function() {

      var template = compiler.compile('<div>{{#unless bool}}{{foo}}{{/unless}}</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div>bar</div>');

    });

    QUnit.test('Block UNLESS helper in content with else block - true', function() {

      var template = compiler.compile('<div>{{#unless bool}}{{foo}}{{else}}{{bar}}{{/unless}}</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div>foo</div>');

    });

    QUnit.test('Block UNLESS helper is data bound', function() {

      var template = compiler.compile('<div>{{#unless bool}}{{foo}}{{else}}{{bar}}{{/unless}}</div>', {name: 'test/partial'});
      var data = {foo:'bar', bar:'foo', bool: false};
      var dom = template(data);
      equalTokens(dom, '<div>bar</div>');
      data.bool = true;
      notify(data, 'bool');
      equalTokens(dom, '<div>foo</div>');

    });

    QUnit.test('Non Block UNLESS helper in content without else term - true', function() {

      var template = compiler.compile('<div>{{unless bool foo}}</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div></div>');

    });

    QUnit.test('Non Block UNLESS helper in content with else term - true', function() {

      var template = compiler.compile('<div>{{unless bool foo bar}}</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div>foo</div>');

    });

    QUnit.test('Non Block UNLESS helper in content without else term - false', function() {

      var template = compiler.compile('<div>{{unless bool foo}}</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div>bar</div>');

    });

    QUnit.test('Non Block UNLESS helper in content without else term - true', function() {

      var template = compiler.compile('<div>{{unless bool foo bar}}</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div>bar</div>');

    });

    QUnit.test('Non Block UNLESS helper in element without else term - true', function() {

      var template = compiler.compile('<div class={{unless bool foo}}>test</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div class="">test</div>');

    });

    QUnit.test('Non Block UNLESS helper in element with else term - true', function() {

      var template = compiler.compile('<div class={{unless bool foo bar}}>test</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div class="foo">test</div>');

    });

    QUnit.test('Non Block UNLESS helper in element without else term - false', function() {

      var template = compiler.compile('<div class={{unless bool foo}}>test</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div class="bar">test</div>');

    });

    QUnit.test('Non Block UNLESS helper in element without else term - true', function() {

      var template = compiler.compile('<div class={{unless bool foo bar}}>test</div>', {name: 'test/partial'});
      var dom = template({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div class="bar">test</div>');

    });

    QUnit.test('Non Block IF helper is data bound', function() {

      var template = compiler.compile('<div>{{unless bool foo bar}}</div>', {name: 'test/partial'});
      var data = {foo:'bar', bar:'foo', bool: false};
      var dom = template(data);
      equalTokens(dom, '<div>bar</div>');
      data.bool = true;
      notify(data, 'bool');
      equalTokens(dom, '<div>foo</div>');

    });


    // TODO: Add each helper tests

    // TODO: Add with helper tests

    // TODO: Add length helper tests

    // TODO: Add on helper tests

});
