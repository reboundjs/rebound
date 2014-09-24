require(['rebound-data/rebound-data'], function(reboundData, tokenizer){
    var Model = window.Rebound.Model = reboundData.Model,
        Collection =  window.Rebound.Collection = reboundData.Collection;

    QUnit.test('Reboudn Data - Model', function() {
      var model, collection;

      model = new Model();
      model.set('str', 'test');
      model.set('int', 1);
      model.set('bool', false);
      deepEqual( model.attributes, {str: 'test', int: 1, bool: false}, 'Model.set works with primitive values at top level' );



      model = new Model();
      model.set('obj', {a:1});
      equal(model.attributes.obj.isModel, true, 'Model.set promotes vanilla objects to Models');



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

      equal(model.get('test').__parent.cid, model.cid, 'Model\'s ancestery is set when child of a Model');
      deepEqual(model.get('test.test2[0]').__parent, model.get('test.test2'), 'Model\'s ancestry is set when child of a Collection');


      model.on('change', function(model, options){
        deepEqual(model.changedAttributes(), {test3: 'foo'}, 'Events are propagated up to parent');
      });
      model.set('test.test2.[0].test3', 'foo');

    });
});
