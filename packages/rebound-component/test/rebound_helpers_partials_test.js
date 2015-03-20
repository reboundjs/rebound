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
});
