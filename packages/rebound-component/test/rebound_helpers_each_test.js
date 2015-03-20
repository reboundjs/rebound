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



  // TODO: Add each helper tests

  QUnit.test('Rebound Helpers - Each', function() {

    var template, data, dom;

    // End Modifications

    template = compiler.compile('<div>{{#each arr as | obj |}}{{obj.val}}{{/each}}</div>', {name: 'test/partial'});
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

    template = compiler.compile('<div>{{#each arr as | obj |}}{{#each obj.list as | obj |}}{{obj.val}}{{/each}}{{/each}}</div>', {name: 'test/partial'});
    data = new Model({arr: [{list: [{val: 1}]}, {list: [{val: 2}]}, {list: [{val: 3}]}]});
    dom = template.render(data);
    equal(dom.firstChild.innerHTML, '123', 'Nested Each helpers with conflicting block param names will render using the innermost block param.');

    data.get('arr').add({list: [{val:4}]});
    notify(data, 'arr');
    equal(dom.firstChild.innerHTML, '1234', 'Nested Each helpers with conflicting block param names will re-render using the innermost block param.');

    template = compiler.compile('<div>{{#each arr as | obj1 |}}{{#each obj1.list as | obj2 |}}{{obj1.list.0.val}}{{/each}}{{/each}}</div>', {name: 'test/partial'});
    data = new Model({arr: [{list: [{val: 1}]}, {list: [{val: 2}]}, {list: [{val: 3}]}]});
    dom = template.render(data);
    equal(dom.firstChild.innerHTML, '123', 'Nested Each helpers with block param names keep block params defined in higher contexts available to child contexts.');

    data.get('arr').add({list: [{val:4}]});
    notify(data, 'arr');
    equal(dom.firstChild.innerHTML, '1234', 'Block params defined in higher contexts available to child contexts and re-render.');


  });
});
