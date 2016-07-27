import { Model, Collection } from "rebound-data/rebound-data";

QUnit.test("[Rebound Data] Collection – Get", function(assert) {
  var collection;

  collection = new Collection([
    {id: 1, str: 'foo'},
    {id: 2, bool: true},
    {id: 3, int: 1},
    {id: 4, obj: {
      val: 'bar'
    }}
  ]);

  // Shallow Get
  assert.equal(collection.get(), collection, "Collection.get without values passed returns the collection");
  assert.equal(collection.get("1").id, 2, "Collection.get works to fetch a single model with string number syntax");
  assert.equal(collection.get("[1]").id, 2, "Collection.get works to fetch a single model with bracket syntax");
  assert.equal(collection.get(1).id, 2, "Collection.get works to fetch a single model with string interger syntax");

  // Deep Get
  assert.equal(collection.get("[0].str"), "foo", "Collection.get works on nested string values");
  assert.equal(collection.get("[1].bool"), true, "Collection.get works on nested boolean values");
  assert.equal(collection.get("[2].int"), 1, "Collection.get works on nested interger values");
  assert.equal(collection.get("[3].obj.val"), "bar", "Collection.get works on deep nested values");

});
