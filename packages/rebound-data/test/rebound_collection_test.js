import reboundData from 'rebound-data/rebound-data';

var Model = window.Rebound.Model = reboundData.Model,
    Collection =  window.Rebound.Collection = reboundData.Collection;

QUnit.test('Reboudnd Data - Collection', function() {
  var model, collection;


  collection = new Collection();
  collection.set({a:true});
  equal(collection.models[0].isModel, true, 'Collection.set promotes vanilla objects to Models');



  collection = new Collection();
  collection.set({obj2:{a:true}});
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
  collection.off();

  collection.set('[0].test2', 'bar');
  deepEqual(collection.toJSON(), [{test2: 'bar'}], 'Collection.set can accept a path to call the .set at');

  // Custom Model Constructors
  var CustomModel = Model.extend({
    toJSON: function(){
      return 'works';
    }
  });

  model = new CustomModel();
  collection = new Collection();
  collection.add(model);


  deepEqual(['works'], collection.toJSON(), 'Customized models added to a collection retain their custom attributes when added to the collection');



  // Collections With Primitives
  collection = new Collection();
  collection.add('asdf');
    equal(collection.length, 1, 'Collections are able to add an individual primitive value');
    equal(collection.models[0].get('value'), 'asdf', 'Primitive values in collections have their raw values available in their value attribute');
    deepEqual(collection._byValue.asdf, [collection.models[0]], 'Collections keep track of their primitive values in a _byValue cache.');

  collection.add(['asdf', 1, 2, true, false]);
    equal(collection.models[3].get('value'), 2, 'Collections are able to add an multiple primitives values');
    deepEqual(collection.toJSON(), ['asdf', 'asdf', 1, 2, true, false], 'Collections\' toJSON method outputs primitive values for primitive objects in the order added.');
    equal(collection.at(4), true, 'Collection.at returns the primitive value at the index specified.');
    equal(collection.get('asdf'), 'asdf', 'Collection.get returns the first primitive value of the same value specified when only primitives are available.');
    deepEqual(collection._byValue.asdf, [collection.models[0], collection.models[1]], 'Collections\' _byValue cache is updated on primitive add.');

  collection.push({id: 'asdf', secret: 'bar'});
    equal(collection.at(6).get('secret'), 'bar', 'Collections are able to have both primitives and models coexist in harmony.');
    equal(collection.get('asdf'), 'asdf', 'Collection.get returns the first primitive or model whos value/id is the same as the value specified - primitive first.');

  collection.unshift({id: 1, secret: 'foo'});
    equal(collection.get(1).get('secret'), 'foo', 'Collection.get returns the first primitive or model whos value/id is the same as the value specified - model first.');

  collection.shift();
  collection.pop();
  collection.shift();
    deepEqual(collection.toJSON(), ['asdf', 1, 2, true, false], 'Collection.shift and pop work with mixed primitives and models and remove both from the models array.');
    deepEqual(collection._byValue.asdf.length, 1, 'Collections\' _byValue cache is updated on primitive pop and shift.');

  collection.remove('asdf');
    deepEqual(collection.toJSON(), [1, 2, true, false], 'Collection.remove works with primitives and removes them from the models array.');
    deepEqual(collection._byValue.asdf.length, 0, 'Collections\' _byValue cache is updated on primitive remove.');

  var tmp = collection.slice(1, 3);
    deepEqual(tmp, [2, true], 'Collection.slice works with primitives and returns copies of primitive values in a new array.');


});
