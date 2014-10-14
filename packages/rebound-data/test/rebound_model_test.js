require(['rebound-data/rebound-data'], function(reboundData, tokenizer){
    var Model = window.Rebound.Model = reboundData.Model,
        Collection =  window.Rebound.Collection = reboundData.Collection;

    QUnit.test('Reboudn Data - Model', function() {
      var model, collection, model2, model3;

      model = new Model();
      model.set('str', 'test');
      model.set('int', 1);
      model.set('bool', false);
      deepEqual( model.attributes, {str: 'test', int: 1, bool: false}, 'Model.set works with primitive values at top level' );



      model = new Model();
      model.set('obj', {a:1});
      equal(model.attributes.obj.isModel, true, 'Model.set promotes vanilla objects to Models');
      model.set('obj', {b:2});
      deepEqual(model.attributes.obj.attributes, {a:1, b:2}, 'Model.set adds to existing models when passed vanilla objects');


      model = new Model();
      model2 = new Model({b:2});
      model.set('obj', model2);
      equal(model.attributes.obj.cid, model2.cid, 'Model.set, when passed another model, adds that exact model.');
      model3 = new Model({c:3});
      model.set('obj', model3);
      equal(model.attributes.obj.cid, model3.cid, 'Model.set, when passed another model, replaces the existing model.');



      model = new Model();
      model.set('arr', [{a:1}]);
      equal(model.attributes.arr.isCollection, true, 'Model.set promotes vanilla arrays to Collections');



      model = new Model();
      model.set('obj', {obj2:{a:1}});
      equal(model.attributes.obj.attributes.obj2.isModel, true, 'Model.set promotes nested vanilla objects to Models');



      model = new Model();
      model.set('test', 'foo');
      equal(model.get('test'), 'foo', 'Model.get works 1 level deep');



      model = new Model();
      model.set('test', {'test2': {'test3': 'foo'}});
      equal(model.get('test.test2.test3'), 'foo', 'Model.get works n levels deep - Models only');

      model = new Model();
      model.set('test', {'test2': [{'test3': 'foo'}]});
      equal(model.get('test.test2[0].test3'), 'foo', 'Model.get works n levels deep - Collections included');
      equal(model.get('test.test2').__path(), 'test.test2', 'Nested Models inherit path of parents');
      equal(model.get('test.test2[0]').__path(), 'test.test2[0]', 'Nested Collections inherit path of parents');
      deepEqual(model.toJSON(), {'test': {'test2': [{'test3': 'foo'}]}}, 'Model\'s toJSON method is recursive');

      model.set('test.test2.[0].test3', model);
      deepEqual(model.toJSON(), {'test': {'test2': [{'test3': model.cid}]}}, 'Model\'s toJSON handles cyclic dependancies');

      equal(model.get('test').__parent__.cid, model.cid, 'Model\'s ancestery is set when child of a Model');
      deepEqual(model.get('test.test2[0]').__parent__, model.get('test.test2'), 'Model\'s ancestry is set when child of a Collection');


      model.on('change', function(model, options){
        deepEqual(model.changedAttributes(), {test3: 'foo'}, 'Events are propagated up to parent');
      });
      model.set('test.test2.[0].test3', 'foo');



      model = new Model();
      collection = Collection.extend({
        model: Model.extend({
          defaults: {
            test: true
          }
        })
      });
      model.set('test', new collection());
      model.set('test', [{foo: 'bar'}, {biz: 'baz'}, {test: false}]);
      deepEqual(model.toJSON(), {'test': [{foo: 'bar', test: true}, {biz: 'baz', test: true}, {test: false}]}, 'Defaults set in a component are retained');

    });
});
