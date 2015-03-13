require(['rebound-compiler/rebound-compiler', 'simple-html-tokenizer', 'rebound-component/helpers', 'rebound-data/model'], function(compiler, tokenizer, helpers, Model){

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
        if(obj.__observers && _.isObject(obj.__observers[path])){
          _.each(obj.__observers[path].collection, function(callback, index) {
            if(callback){ callback.notify(); }
            else{ delete obj.__observers[path][index]; }
          });
          _.each(obj.__observers[path].model, function(callback, index) {
            if(callback){ callback.notify(); }
            else{ delete obj.__observers[path][index]; }
          });
        }
      });
    }


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

          delete Object.prototype.get;
          delete Object.prototype.set;

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
      dom = template.render({foo:'bar', bar:'foo'});
      partial = (compiler.compile('{{partial "test/partial"}}', {name: 'test'})).render({foo:'bar', bar:'foo'});
      equalTokens(dom, '<div class="foo">bar</div>', 'Partial helper inserts partial template');



      template = compiler.compile('<div class={{bar}}>{{foo}}</div>', {name: 'test/partial'});

      partial = compiler.compile('{{partial "test/partial"}}', {name: 'test'});

      data = {foo:'bar', bar:'foo', bool: false};
      dom = partial.render(data);
      data.foo = 'foo';
      data.bar = 'bar';
      notify(data, ['foo', 'bar']);
      equalTokens(dom, '<div class="bar">foo</div>', 'Partial is data bound');


      /*******************************************************************/
      /**                Clean up our object prototype hack             **/

          delete Object.prototype.get;
          delete Object.prototype.set;

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
      dom = template.render({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div><!----></div>', 'Block If helper without else block - false');



      template = compiler.compile('<div>{{#if bool}}{{foo}}{{else}}{{bar}}{{/if}}</div>', {name: 'test/partial'});
      dom = template.render({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div>foo</div>', 'Block If helper with else block - false');



      template = compiler.compile('<div>{{#if bool}}{{foo}}{{/if}}</div>', {name: 'test/partial'});
      dom = template.render({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div>bar</div>', 'Block If helper without else block - true');



      template = compiler.compile('<div>{{#if bool}}{{foo}}{{else}}{{bar}}{{/if}}</div>', {name: 'test/partial'});
      dom = template.render({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div>bar</div>', 'Block If helper with else block - true');



      template = compiler.compile('<div>{{#if bool}}{{foo}}{{/if}}</div>', {name: 'test/partial'});
      data = {foo:'bar', bar:'foo', bool: false};
      dom = template.render(data);
      data.bool = true;
      notify(data, 'bool');
      equalTokens(dom, '<div>bar</div>', 'Block If helper is data bound');



      template = compiler.compile('<div>{{if bool foo}}</div>', {name: 'test/partial'});
      dom = template.render({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div>bar</div>', 'Inline If helper in content without else term - true');



      template = compiler.compile('<div>{{if bool foo bar}}</div>', {name: 'test/partial'});
      dom = template.render({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div>bar</div>', 'Inline If helper in content with else term - true');



      template = compiler.compile('<div>{{if bool foo}}</div>', {name: 'test/partial'});
      dom = template.render({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div><!----></div>', 'Inline If helper in content without else term - false');



      template = compiler.compile('<div>{{if bool foo bar}}</div>', {name: 'test/partial'});
      dom = template.render({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div>foo</div>', 'Inline If helper in content without else term - true');



      template = compiler.compile('<div class={{if bool foo}}>test</div>', {name: 'test/partial'});
      dom = template.render({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div class="bar">test</div>', 'Inline If helper in element without else term - true');



      template = compiler.compile('<div class={{if bool foo bar}}>test</div>', {name: 'test/partial'});
      dom = template.render({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div class="bar">test</div>', 'Inline If helper in element with else term - true');



      template = compiler.compile('<div class={{if bool foo}}>test</div>', {name: 'test/partial'});
      dom = template.render({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div>test</div>', 'Inline If helper in element without else term - false');



      template = compiler.compile('<div class={{if bool foo bar}}>test</div>', {name: 'test/partial'});
      dom = template.render({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div class="foo">test</div>', 'Inline If helper in element without else term - true');



      template = compiler.compile('<div>{{if bool foo bar}}</div>', {name: 'test/partial'});
      data = {foo:'bar', bar:'foo', bool: false};
      dom = template.render(data);
      data.bool = true;
      notify(data, 'bool');
      equalTokens(dom, '<div>bar</div>', 'Inline If helper is data bound');


      // Nexted Block IFs
      template = compiler.compile('<div>{{#if bool}}{{#if bool}}{{val}}{{else}}{{val2}}{{/if}}{{else}}{{val2}}{{/if}}</div>', {name: 'test/partial'});
      data = new Model({bool: true, val: 'true', val2: 'false'});
      dom = template.render(data);
      equal(dom.firstChild.innerHTML, 'true', 'If helpers that are the immediate children of if helpers render on first run.');
      data.set('bool', false);
      notify(data, 'bool');
      equal(dom.firstChild.innerHTML, 'false', 'If helpers that are the immediate children of if helpers re-render successfully on change.');



      /*******************************************************************/
      /**                Clean up our object prototype hack             **/

          delete Object.prototype.get;
          delete Object.prototype.set;

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
      dom = template.render({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div>bar</div>', 'Block Unless helper in content without else block - false');



      template = compiler.compile('<div>{{#unless bool}}{{foo}}{{else}}{{bar}}{{/unless}}</div>', {name: 'test/partial'});
      dom = template.render({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div>bar</div>', 'Block Unless helper in content with else block - false');



      template = compiler.compile('<div>{{#unless bool}}{{foo}}{{/unless}}</div>', {name: 'test/partial'});
      dom = template.render({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div>bar</div>', 'Block Unless helper in content without else block - false');



      template = compiler.compile('<div>{{#unless bool}}{{foo}}{{else}}{{bar}}{{/unless}}</div>', {name: 'test/partial'});
      dom = template.render({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div>foo</div>', 'Block Unless helper in content with else block - true');



      template = compiler.compile('<div>{{#unless bool}}{{foo}}{{else}}{{bar}}{{/unless}}</div>', {name: 'test/partial'});
      data = {foo:'bar', bar:'foo', bool: false};
      dom = template.render(data);
      data.bool = true;
      notify(data, 'bool');
      equalTokens(dom, '<div>foo</div>', 'Block Unless helper is data bound');



      template = compiler.compile('<div>{{unless bool foo}}</div>', {name: 'test/partial'});
      dom = template.render({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div><!----></div>', 'Inline Unless helper in content without else term - true');



      template = compiler.compile('<div>{{unless bool foo bar}}</div>', {name: 'test/partial'});
      dom = template.render({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div>foo</div>', 'Inline Unless helper in content with else term - true');



      template = compiler.compile('<div>{{unless bool foo}}</div>', {name: 'test/partial'});
      dom = template.render({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div>bar</div>', 'Inline Unless helper in content without else term - false');



      template = compiler.compile('<div>{{unless bool foo bar}}</div>', {name: 'test/partial'});
      dom = template.render({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div>bar</div>', 'Inline Unless helper in content without else term - true');



      template = compiler.compile('<div class={{unless bool foo}}>test</div>', {name: 'test/partial'});
      dom = template.render({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div>test</div>', 'Inline Unless helper in element without else term - true');



      template = compiler.compile('<div class={{unless bool foo bar}}>test</div>', {name: 'test/partial'});
      dom = template.render({foo:'bar', bar:'foo', bool: true});
      equalTokens(dom, '<div class="foo">test</div>', 'Inline Unless helper in element with else term - true');



      template = compiler.compile('<div class={{unless bool foo}}>test</div>', {name: 'test/partial'});
      dom = template.render({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div class="bar">test</div>', 'Inline Unless helper in element without else term - false');



      template = compiler.compile('<div class={{unless bool foo bar}}>test</div>', {name: 'test/partial'});
      dom = template.render({foo:'bar', bar:'foo', bool: false});
      equalTokens(dom, '<div class="bar">test</div>', 'Inline Unless helper in element with else term - true');



      template = compiler.compile('<div>{{unless bool foo bar}}</div>', {name: 'test/partial'});
      data = {foo:'bar', bar:'foo', bool: false};
      dom = template.render(data);
      data.bool = true;
      notify(data, 'bool');
      equalTokens(dom, '<div>foo</div>', 'Inline Unless helper is data bound');


      /*******************************************************************/
      /**                Clean up our object prototype hack             **/

      delete Object.prototype.get;
      delete Object.prototype.set;

      /*******************************************************************/

    });

    QUnit.test('Rebound Helpers - On', function() {

      /*******************************************************************/
      /** The only interface these helpers should need is get and set.  **/
      /**      Augment the object prototype to provide this api         **/

      Object.prototype.get = function(key){ return this[key]; };
      Object.prototype.set = function(key, val){ this[key] = val; };

      /*******************************************************************/


      var template, data, dom;


      template = compiler.compile('<div {{on "click" "callback"}}>Test</div>', {name: 'test/partial'});
      data = {el: dom, __root__: this, callback: function(){
        equal(1, 1, 'Events are triggered on the element');

      }};
      dom = template.render(data, {helpers: {__callOnComponent: function(name, event){
        return data[name].call(data, event);
      }}});
      $(dom.firstChild).trigger('click');


      /*******************************************************************/
      /**                Clean up our object prototype hack             **/

      delete Object.prototype.get;
      delete Object.prototype.set;

      /*******************************************************************/
    });

    // TODO: Add each helper tests

    QUnit.test('Rebound Helpers - Each', function() {

      var template, data, dom;

      // End Modifications

      template = compiler.compile('<div>{{#each arr}}{{val}}{{/each}}</div>', {name: 'test/partial'});
      data = new Model({arr: [{val: 1}, {val: 2}, {val: 3}]});
      dom = template.render(data);
      equal(dom.firstChild.innerHTML, '123', 'Each helper will render a list of values.');

      data.get('arr').add({val: 4});
      notify(data, 'arr');
      equal(dom.firstChild.innerHTML, '1234', 'Each helper will re-render on add to end.');

      data.get('arr').pop();
      notify(data, 'arr');
      equal(dom.firstChild.innerHTML, '123', 'Each helper will re-render on remove from end.');


      data.get('arr').add([{val: 4}, {val: 5}]);
      notify(data, 'arr');
      equal(dom.firstChild.innerHTML, '12345', 'Each helper will re-render on multiple add to end.');

      var removeArr = [];
      removeArr.push(data.get('arr[3]'));
      removeArr.push(data.get('arr[4]'))

      data.get('arr').remove(removeArr);
      notify(data, 'arr');
      equal(dom.firstChild.innerHTML, '123', 'Each helper will re-render on multiple remove from end.');

      // Begining Modification

      data.get('arr').unshift({val: 4});
      notify(data, 'arr');
      equal(dom.firstChild.innerHTML, '4123', 'Each helper will re-render on add to begining.');

      data.get('arr').shift();
      notify(data, 'arr');
      equal(dom.firstChild.innerHTML, '123', 'Each helper will re-render on remove from begining.');


      data.get('arr').unshift([{val: 4}, {val: 5}]);
      notify(data, 'arr');
      equal(dom.firstChild.innerHTML, '45123', 'Each helper will re-render on multiple add to begining.');

      removeArr = [];
      removeArr.push(data.get('arr[0]'));
      removeArr.push(data.get('arr[1]'))

      data.get('arr').remove(removeArr);
      notify(data, 'arr');
      equal(dom.firstChild.innerHTML, '123', 'Each helper will re-render on multiple remove from begining.');

      // Middle Modifications

      data.get('arr').add({val: 4}, {at: 2});
      notify(data, 'arr');
      equal(dom.firstChild.innerHTML, '1243', 'Each helper will re-render on add to middle.');

      data.get('arr').remove(data.get('arr[2]'));
      notify(data, 'arr');
      equal(dom.firstChild.innerHTML, '123', 'Each helper will re-render on remove from middle.');


      data.get('arr').add([{val: 4}, {val: 5}], {at: 2});
      notify(data, 'arr');
      equal(dom.firstChild.innerHTML, '12453', 'Each helper will re-render on multiple add to middle.');

      removeArr = [];
      removeArr.push(data.get('arr[2]'));
      removeArr.push(data.get('arr[3]'))

      data.get('arr').remove(removeArr);
      notify(data, 'arr');
      equal(dom.firstChild.innerHTML, '123', 'Each helper will re-render on multiple remove from middle.');

      // Multiple Modifications

      data.get('arr').add({val: 'a'}, {at: 0});
      data.get('arr').add({val: 'b'}, {at: 3});
      data.get('arr').add({val: 'c'}, {at: 5});

      notify(data, 'arr');
      equal(dom.firstChild.innerHTML, 'a12b3c', 'Each helper will re-render after multiple adds.');

      data.get('arr').remove(data.get('arr[0]'));
      data.get('arr').remove(data.get('arr[2]'));
      data.get('arr').remove(data.get('arr[3]'));

      notify(data, 'arr');
      equal(dom.firstChild.innerHTML, '123', 'Each helper will re-render after multiple removes.');


    });

    // TODO: Add with helper tests

    // TODO: Add length helper tests

});
