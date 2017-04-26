import { Model, Collection } from "rebound-data/rebound-data";

QUnit.skip("[Rebound Data] Collection – At", function(assert) {
  var collection;

  collection = new Collection([
    {id: 1, str: 'foo'},
    {id: 2, bool: true},
    {id: 3, int: 1},
    {id: 4, obj: {
      val: 'bar'
    }}
  ]);

  assert.equal(collection.at("1").id, 2, "Collection.get works to fetch a single model with string number syntax");
  assert.equal(collection.at("[1]").id, 2, "Collection.get works to fetch a single model with bracket syntax");
  assert.equal(collection.at(1).id, 2, "Collection.get works to fetch a single model with string interger syntax");

});
