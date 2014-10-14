require(['rebound-data/rebound-data'], function(reboundData, tokenizer){
    var Model = window.Rebound.Model = reboundData.Model,
        Collection =  window.Rebound.Collection = reboundData.Collection;

    QUnit.test('Reboudnd Data - Collection', function() {
      var model, collection;


      collection = new Collection();
      collection.set({a:1});
      equal(collection.models[0].isModel, true, 'Collection.set promotes vanilla objects to Models');



      collection = new Collection();
      collection.set({obj2:{a:1}});
      equal(collection.models[0].attributes.obj2.isModel, true, 'Collection.set promotes nested vanilla objects to Models');



      collection = new Collection();
      collection.set({obj2:[{a:1}]});
      equal(collection.models[0].attributes.obj2.isCollection, true, 'Collection.set promotes nested vanilla arrays to Collections');


      collection = new Collection();

      collection.set({'test2': [{'test3': 'foo'}]});
      equal(collection.models[0].attributes.test2.models[0].__path(), '[0].test2[0]', 'Nested Models inherit path of parents');
      equal(collection.models[0].attributes.test2.__path(), '[0].test2', 'Nested Collections inherit path of parents');

      deepEqual(collection.toJSON(), [{'test2': [{'test3': 'foo'}]}], 'Collection\'s toJSON method is recursive');
      collection.at(0).get('test2').at(0).set('test3', collection);
      deepEqual(collection.toJSON(), [{'test2': [{'test3': [collection.at(0).cid]}]}], 'Collection\'s toJSON handles cyclic dependancies');

      equal(collection.at(0).__parent__.cid, collection.cid, 'Model\'s ancestry is set when child of a Collection');

      collection.on('change', function(model, options){
        deepEqual(model.changedAttributes(), {test2: 'foo'}, 'Events are propagated up to parent');
      });
      collection.at(0).set('test2', 'foo');

    });
});
