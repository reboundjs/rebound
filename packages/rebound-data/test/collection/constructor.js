import { Model, Collection } from "rebound-data/rebound-data";

export default function tests(){

  QUnit.module("Constructor", function(){

    QUnit.test("Constructor with no initial state", function(assert) {

      var collection = new Collection();

      assert.equal(collection.length, 0, "Has correct length set.");
      assert.deepEqual(collection.toJSON(), [], "ToJSON is correct.");
      assert.deepEqual(collection.changed(), {}, "Changed values are set correctly");

    });


    QUnit.test("Constructor with initial state", function(assert) {

      var json = [
        {id: 0},
        {id: 1},
        {id: 2}
      ];
      var collection = new Collection(json);

      assert.equal(collection.length, 3, "Has correct length set.");
      assert.deepEqual(collection.toJSON(), json, "ToJSON is correct.");
      assert.deepEqual(collection.changed(), {
        "[0]": collection.get(0),
        "[0].id": 0,
        "[1]": collection.get(1),
        "[1].id": 1,
        "[2]": collection.get(2),
        "[2].id": 2,
      }, "Changed values are set correctly");

    });


    QUnit.test("Constructor with deferred hydration", function(assert) {

      var json = [
        {id: 0},
        {id: 1},
        {id: 2}
      ];
      var events = [];
      var collection = new Collection(json, {hydrate: false});
      collection.on('all', function(name){ events.push(name); })

      assert.equal(collection.length, 0, "Pre-hydration has correct length set.");
      assert.deepEqual(collection.toJSON(), [], "Pre-hydration toJSON is correct.");
      assert.deepEqual(collection.changed(), {}, "Pre-hydration changed values are set correctly");

      collection.hydrate();

      assert.equal(collection.length, 3, "Post-hydration has correct length set.");
      assert.deepEqual(collection.toJSON(), json, "Post-hydration toJSON is correct.");
      assert.deepEqual(collection.changed(), {
        "[0]": collection.get(0),
        "[0].id": 0,
        "[1]": collection.get(1),
        "[1].id": 1,
        "[2]": collection.get(2),
        "[2].id": 2,
      }, "Post-hydration changed values are set correctly");

      assert.deepEqual(events, [
        "dirty",
        "change:[0].id",
        "update:[0]",
        "add:[0]",
        "add",
        "change:[1].id",
        "update:[1]",
        "add:[1]",
        "add",
        "change:[2].id",
        "update:[2]",
        "add:[2]",
        "add",
        "sort",
        "update",
        "clean"
      ], "Correct events are triggered post-hydration.");


    });

  });

}