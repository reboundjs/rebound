import { Model, Collection } from "rebound-data/rebound-data";

QUnit.test("[Rebound Data] Collection – ToJSON", function(assert) {

  var collection = new Collection();

  collection.set([{'test2': [{'test3': 'foo'}]}, {str: 'foo', obj: {bool: true}}]);

  deepEqual(collection.toJSON(), [{'test2': [{'test3': 'foo'}]}, {str: 'foo', obj: {bool: true}}], 'Collection\'s toJSON method is recursive');
  assert.ok(collection.toJSON() !== collection.models, "Collection's toJSON response is not the same object as its attributes hash.'");

  assert.throws(function(){
    collection.at(0).get('test2').at(0).set('test3', collection);
  }, "Attempting to set a recursive dependancy in a Collection throws an error.");


});
