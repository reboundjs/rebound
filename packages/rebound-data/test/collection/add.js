import { Model, Collection } from "rebound-data/rebound-data";

QUnit.skip("[Rebound Data] Collection – Add", function(assert) {
  var collection;

  collection = new Collection([]);

  assert.equal(collection.add("1").id, 2, "Collection.get works to fetch a single model with string number syntax");

});
