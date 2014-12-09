require(['rebound-data/rebound-data'], function(reboundData, tokenizer){
    var Model = window.Rebound.Model = reboundData.Model,
        Collection =  window.Rebound.Collection = reboundData.Collection;

    QUnit.test('Rebound Data - Model', function() {
      var model, collection, model2, model3;

      model = new Model();
      model.set('str', 'test');
      model.set('int', 1);
      model.set('bool', false);
      deepEqual( model.attributes, {str: 'test', int: 1, bool: false}, 'Model.set works with primitive values at top level' );

      model.toggle('bool');
      deepEqual( model.attributes, {str: 'test', int: 1, bool: true}, 'Model.toggle works with boolean values at top level' );




      model = new Model();
      model.set('obj', {a:1});
      equal(model.attributes.obj.isModel, true, 'Model.set promotes vanilla objects to Models');
      model.set('obj', {bool:false});
      deepEqual(model.attributes.obj.attributes, {a:1, bool:false}, 'Model.set adds to existing models when passed vanilla objects');

      model.toggle('obj.bool');
      deepEqual(model.attributes.obj.attributes, {a:1, bool:true}, 'Model.toggle works with nested boolean values');




      model = new Model();
      model2 = new Model({b:2});
      model.set('obj', model2);
      equal('c' + ((parseInt(model2.cid.replace('c', ''))) + 1), model.attributes.obj.cid, 'Model.set, when passed another model, clones that model.');
      model3 = new Model({c:3});
      var cid = model.attributes.obj.cid;
      model.set('obj', model3);
      equal(model.attributes.obj.cid, cid, 'Model.set, when passed another model, merges with the existing model.');
      deepEqual(model.attributes.obj.attributes, {b: 2, c: 3}, 'Model.set, when passed another model, merges their attributes.');




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


      collection = Collection.extend({
        model: Model.extend({
          defaults: {
            test: true
          }
        })
      });
      model = new Model({
        prop: true,
        arr: (new collection()),
        obj: { foo: {bar: 'bar'} },
        func: function(){
          return this.get('obj');
        }
      });
      model.set('arr', [{foo: 'bar'}, {biz: 'baz'}, {test: false}]);
      deepEqual(model.toJSON(), {prop: true, 'arr': [{foo: 'bar', test: true}, {biz: 'baz', test: true}, {test: false}], obj: {foo: {bar: 'bar'}}, func: {foo: {bar: 'bar'}}}, 'Defaults set in a component are retained');

      model.reset();
      deepEqual(model.toJSON(), {arr: [], obj: {foo: {}}, func: {foo: {}}}, 'Calling reset() on a model resets all of its properties and children');

      model.reset({prop: false, arr: [{id: 1}]});
      deepEqual(model.toJSON(), {prop: false, arr: [{id: 1, test: true}], obj: {foo: {}}, func: {foo: {}}}, 'Calling reset() with new values on a model resets it with these new values');



    });
});
