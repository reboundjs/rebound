import compiler from 'rebound-compiler/compile';
import { tokenize } from 'simple-html-tokenizer/index';
import reboundData from 'rebound-data/rebound-data';

var Model = reboundData.Model,
    Collection = reboundData.Collection;

function equalTokens(fragment, html, message) {
  var div = document.createElement("div");

  div.appendChild(fragment.cloneNode(true));

  var fragTokens = tokenize(div.innerHTML);
  var htmlTokens = tokenize(html);

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

QUnit.test('Rebound Helpers - Each', function(assert) {

  var template, data, dom = document.createDocumentFragment();


  template = compiler.compile('<div>{{#each arr as | obj |}}{{obj.val}}{{/each}}</div>', {name: 'test/partial'});

  // Empty Data
  data = new Model();
  template.render(dom, data);
  equal(dom.firstChild.innerHTML, '<!---->', 'Each helper will render nothing for an undefined list.');


  // Modifications to the end
  data = new Model({arr: [{val: 1}, {val: 2}, {val: 3}]});
  template.render(dom, data);
  equal(dom.firstChild.innerHTML, '123', 'Each helper will render a list of values.');

  data.get('arr').add({val: 4});
  equal(dom.firstChild.innerHTML, '1234', 'Each helper will re-render on add to end.');

  data.get('arr').pop();
  equal(dom.firstChild.innerHTML, '123', 'Each helper will re-render on remove from end.');


  data.get('arr').add([{val: 4}, {val: 5}]);
  equal(dom.firstChild.innerHTML, '12345', 'Each helper will re-render on multiple add to end.');

  var removeArr = [];
  removeArr.push(data.get('arr[3]'));
  removeArr.push(data.get('arr[4]'));

  data.get('arr').remove(removeArr);
  equal(dom.firstChild.innerHTML, '123', 'Each helper will re-render on multiple remove from end.');

  // Modification to the Begining

  data.get('arr').unshift({val: 4});
  equal(dom.firstChild.innerHTML, '4123', 'Each helper will re-render on add to begining.');

  data.get('arr').shift();
  equal(dom.firstChild.innerHTML, '123', 'Each helper will re-render on remove from begining.');


  data.get('arr').unshift([{val: 4}, {val: 5}]);
  equal(dom.firstChild.innerHTML, '45123', 'Each helper will re-render on multiple add to begining.');

  removeArr = [];
  removeArr.push(data.get('arr[0]'));
  removeArr.push(data.get('arr[1]'));

  data.get('arr').remove(removeArr);
  equal(dom.firstChild.innerHTML, '123', 'Each helper will re-render on multiple remove from begining.');

  // Modifications to the Middle

  data.get('arr').add({val: 4}, {at: 2});
  equal(dom.firstChild.innerHTML, '1243', 'Each helper will re-render on add to middle.');

  data.get('arr').remove(data.get('arr[2]'));
  equal(dom.firstChild.innerHTML, '123', 'Each helper will re-render on remove from middle.');


  data.get('arr').add([{val: 4}, {val: 5}], {at: 2});
  equal(dom.firstChild.innerHTML, '12453', 'Each helper will re-render on multiple add to middle.');

  removeArr = [];
  removeArr.push(data.get('arr[2]'));
  removeArr.push(data.get('arr[3]'));

  data.get('arr').remove(removeArr);
  equal(dom.firstChild.innerHTML, '123', 'Each helper will re-render on multiple remove from middle.');

  // Multiple Modifications

  data.get('arr').add({val: 'a'}, {at: 0});
  data.get('arr').add({val: 'b'}, {at: 3});
  data.get('arr').add({val: 'c'}, {at: 5});

  equal(dom.firstChild.innerHTML, 'a12b3c', 'Each helper will re-render after multiple adds.');

  data.get('arr').remove(data.get('arr[0]'));
  data.get('arr').remove(data.get('arr[2]'));
  data.get('arr').remove(data.get('arr[3]'));

  equal(dom.firstChild.innerHTML, '123', 'Each helper will re-render after multiple removes.');

  template = compiler.compile('<div>{{#each arr as | obj |}}{{#each obj.list as | obj |}}{{obj.val}}{{/each}}{{/each}}</div>', {name: 'test/partial'});
  data = new Model({arr: [{list: [{val: 1}]}, {list: [{val: 2}]}, {list: [{val: 3}]}]});
  template.render(dom, data);
  equal(dom.firstChild.innerHTML, '123', 'Nested Each helpers with conflicting block param names will render using the innermost block param.');

  data.get('arr').add({list: [{val:4}]});
  equal(dom.firstChild.innerHTML, '1234', 'Nested Each helpers with conflicting block param names will re-render using the innermost block param.');

  template = compiler.compile('<div>{{#each arr as | obj1 |}}{{#each obj1.list as | obj2 |}}{{obj1.list.0.val}}{{/each}}{{/each}}</div>', {name: 'test/partial'});
  data = new Model({arr: [{list: [{val: 1}]}, {list: [{val: 2}]}, {list: [{val: 3}]}]});
  template.render(dom, data);
  equal(dom.firstChild.innerHTML, '123', 'Nested Each helpers with block param names keep block params defined in higher contexts available to child contexts.');

  data.get('arr').add({list: [{val:4}]});
  equal(dom.firstChild.innerHTML, '1234', 'Block params defined in higher contexts available to child contexts and re-render.');

  // Empty -> Not-Empty -> Empty
  template = compiler.compile('<div>{{#each arr as | obj1 |}}Template{{else}}Inverse{{/each}}</div>', {name: 'test/partial'});
  data = new Model({arr: []});
  template.render(dom, data);
  equal(dom.firstChild.innerHTML, 'Inverse', 'If Each has an inverse template, it is rendered when the list is empty');

  data.get('arr').add({val:1});
  equal(dom.firstChild.innerHTML, 'Template', 'If Each has an inverse template, the normal template is rendered instead when an item is added.');

  data.get('arr').pop();
  equal(dom.firstChild.innerHTML, 'Inverse', 'If Each has an inverse template, the Inverse template is rendered when list lengths drops back to zero.');

  // Not-Empty -> Empty -> Not-Empty
  template = compiler.compile('<div>{{#each arr as | obj1 |}}Template{{else}}Inverse{{/each}}</div>', {name: 'test/partial'});
  data = new Model({arr: [{val:1}]});
  template.render(dom, data);
  equal(dom.firstChild.innerHTML, 'Template', 'The normal template is rendered when an item is added.');

  data.get('arr').pop();
  equal(dom.firstChild.innerHTML, 'Inverse', 'If Each has an inverse template, the Inverse template is rendered when list lengths drops to zero.');

  data.get('arr').add({val:1});
  equal(dom.firstChild.innerHTML, 'Template', 'List is re-rendered again when length goes back up from zero.');



  // Re-rendering
  (function(){
    var rerendering = assert.async(2);
    var template = compiler.compile('<div>{{#each arrProxy as | item |}}{{item.val}}{{/each}}</div>', {name: 'test/partial'});
    var data = new Model({
      show: true,
      get arrProxy(){
        if(this.get('show')){
          return this.get('arr');
        }
        return [];
      },
      arr: [
        {val:'1'},
        {val:'2'},
        {val:'3'}
      ]
    });

    new Promise(function(resolve) {
      var dom = document.createDocumentFragment();
      template.render(dom, data);
      data.set('arr[2].val', '4');
      resolve(dom);
    })
    .then(function(dom){
      return new Promise(function(resolve) {
        window.setTimeout(function(){
          equal(dom.firstChild.innerHTML, '124', 'Each blocks\' yielded templates that are databound');
          console.log('-----------------------')
          data.set('show', false);
          data.set('show', true);
          data.set('arr[2].val', '5');
          console.log('-----------------------')
          rerendering();
          resolve(dom);
        }, 10);
      });
    })
    .then(function(dom){
      return new Promise(function(resolve) {
        window.setTimeout(function(){
          equal(dom.firstChild.innerHTML, '125', 'Each blocks\' yielded templates that re-render are still databound');
          rerendering();
          resolve(dom);
        }, 10);
      });
    });
  })();


  // Scoping
    template = compiler.compile('<div>{{#each arr as | local |}}{{local.val}} {{parent}}{{/each}}</div>', {name: 'test/partial'});
    data = new Model({parent: 'bar', arr: [{val:'foo'}]});
    template.render(dom, data);
    equal(dom.firstChild.innerHTML, 'foo bar', 'Inside each blocks have access to both block and parent scopes');
    data.set('parent', 'foo');
    equal(dom.firstChild.innerHTML, 'foo foo', 'Each blocks are bound to parent scope args');
    data.set('arr[0].val', 'bar');
    equal(dom.firstChild.innerHTML, 'bar foo', 'Each blocks are bound to block scope args');


  // Block Scoped Bound Attributes
    template = compiler.compile('<div>{{#each arr as | local |}}<div class="{{local.val}}"></div>{{/each}}</div>', {name: 'test/partial'});
    data = new Model({parent: 'bar', arr: [{val:'foo'}]});
    template.render(dom, data);
    equal(dom.firstChild.firstChild.className, 'foo', 'Inside each blocks have access to both block scopes for attribute values');
    data.set('arr[0].val', 'bar');
    equal(dom.firstChild.firstChild.className, 'bar', 'Block scoped values used as attribute values are data bound');

  // Boolean Block Scoped Bound Attributes
    template = compiler.compile('<div>{{#each arr as | local |}}<input type="checkbox" checked="{{local.val}}">{{/each}}</div>', {name: 'test/partial'});
    data = new Model({parent: 'bar', arr: [{val: true}]});
    template.render(dom, data);
    equal(dom.firstChild.firstChild.checked, true, 'Inside each blocks have access to both block scopes for boolean attribute values');
    data.set('arr[0].val', false);
    equal(dom.firstChild.firstChild.checked, false, 'Block scoped values used as boolean attribute values are data bound');


  // Nested Model Itertion
    template = compiler.compile('<div>{{#each obj as | local |}}{{local.value}}{{/each}}</div>', {name: 'test/partial'});
    data = new Model({obj: {foo: {value: 1}, biz: {value: 2}}});
    template.render(dom, data);
    equal(dom.firstChild.innerHTML, '12', 'Each helper iterates over properties in an object');
    data.set('obj.baz', {value: 3});
    equal(dom.firstChild.innerHTML, '123', 'Additions to a model re-computes each helper');
    data.unset('obj.foo');
    equal(dom.firstChild.innerHTML, '23', 'Removals from a model re-computes each helper');



  // TODO: Model Property Itertion
    // template = compiler.compile('<div>{{#each obj as | local |}}{{local}}{{/each}}</div>', {name: 'test/partial'});
    // data = new Model({obj: {foo: 'bar', biz: 'baz'}});
    // template.render(dom, data);
    // equal(dom.firstChild.innerHTML, 'bar baz', 'Each helper iterates over properties in an object');
    // data.set('obj.firstName', 'Adam');
    // equal(dom.firstChild.innerHTML, 'bar baz Adam', 'Additions to a model re-computes each helper');
    // data.unset('obj.foo');
    // equal(dom.firstChild.innerHTML, 'baz Adam', 'Removals from a model re-computes each helper');

});
