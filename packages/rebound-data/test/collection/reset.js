import { Model, Collection } from "rebound-data/rebound-data";

export default function tests(){

  QUnit.module("Reset", function(){

    QUnit.test('reset', function(assert) {
      assert.expect(17);
      var a = new Model({id: 3, label: 'a'}),
          b = new Model({id: 2, label: 'b'}),
          c = new Model({id: 1, label: 'c'}),
          d = new Model({id: 0, label: 'd'}),
          col = new Collection([a, b, c, d]);
      var resetCount = 0;
      var models = col.models;
      col.on('reset', function() { resetCount += 1; });
      col.reset([]);
      assert.equal(resetCount, 1);
      assert.equal(col.length, 0);
      assert.equal(col.last(), null);
      col.reset(models);
      assert.equal(resetCount, 2);
      assert.equal(col.length, 4);
      assert.deepEqual(col.last().toJSON(), d.toJSON());
      assert.equal(col.last().cid, d.cid);
      col.reset(_.map(models, function(m){ return m.attributes; }));
      assert.equal(resetCount, 3);
      assert.equal(col.length, 4);
      assert.ok(col.last() !== d);
      assert.ok(_.isEqual(col.last().attributes, d.attributes));
      col.reset();
      assert.equal(col.length, 0);
      assert.equal(resetCount, 4);

      var f = new Model({id: 20, label: 'f'});
      col.reset([undefined, f]);
      assert.equal(col.length, 2);
      assert.equal(resetCount, 5);

      col.reset(new Array(4));
      assert.equal(col.length, 4);
      assert.equal(resetCount, 6);
    });

    QUnit.test("Reset on empty collection with array", function(assert) {
      assert.expect(4);

      var collection = new Collection();
      var json = [
        {id: 0},
        {id: 1},
        {id: 2}
      ];
      var events = [];

      collection.on('all', function(name){
        events.push(name);
      });

      collection.reset(json);

      assert.equal(collection.length, 3, "Length is correct");
      assert.deepEqual(collection.toJSON(), json, "Contents set correctly");
      assert.deepEqual(collection.changed(), {
        "[0]": collection.at(0),
        "[0].id": 0,
        "[1]": collection.at(1),
        "[1].id": 1,
        "[2]": collection.at(2),
        "[2].id": 2
      }, "Changed values set correctly");

      assert.deepEqual(events, [
        "dirty",
        "reset",
        "clean"
      ], "Triggers correct events in order");


    });

    QUnit.test("Reset on shorter collection with array", function(assert) {
      assert.expect(4);

      var collection = new Collection([ {val: 1} ]);
      var json = [
        {id: 0},
        {id: 1},
        {id: 2}
      ];
      var events = [];

      collection.on('all', function(name){
        events.push(name);
      });

      collection.reset(json);

      assert.equal(collection.length, 3, "Length is correct");
      assert.deepEqual(collection.toJSON(), json, "Contents set correctly");
      assert.deepEqual(collection.changed(), {
        "[0]": collection.at(0),
        "[0].id": 0,
        "[0].val": undefined,
        "[1]": collection.at(1),
        "[1].id": 1,
        "[2]": collection.at(2),
        "[2].id": 2
      }, "Changed values set correctly");

      assert.deepEqual(events, [
        "dirty",
        "reset",
        "clean"
      ], "Triggers correct events in order");

    });


    QUnit.test("Reset on longer collection with array", function(assert) {
      assert.expect(4);

      var collection = new Collection([ {val: 1}, {val: 2}, {val: 3} ]);
      var json = [
        {id: 0},
        {id: 1},
      ];
      var events = [];

      collection.on('all', function(name){
        events.push(name);
      });

      collection.reset(json);

      assert.equal(collection.length, 2, "Length is correct");
      assert.deepEqual(collection.toJSON(), json, "Contents set correctly");
      assert.deepEqual(collection.changed(), {
        "[0]": collection.at(0),
        "[0].id": 0,
        "[0].val": undefined,
        "[1]": collection.at(1),
        "[1].id": 1,
        "[1].val": undefined,
        "[2]": undefined,
        "[2].val": undefined,
      }, "Changed values set correctly");

      assert.deepEqual(events, [
        "dirty",
        "reset",
        "clean"
      ], "Triggers correct events in order");

    });

    QUnit.test("Reset on collection with collection", function(assert) {
      assert.expect(4);

      var collection = new Collection([ {val: 1}, {val: 2} ]);
      var collection2 = new Collection([ {id: 1}, {id: 2}, {id: 3} ]);

      var events = [];

      collection.on('all', function(name){
        events.push(name);
      });

      collection.reset(collection2);

      assert.equal(collection.length, 3, "Length is correct");
      assert.deepEqual(collection.toJSON(), collection2.toJSON(), "Contents set correctly");
      assert.deepEqual(collection.changed(), {
        "[0]": collection.at(0),
        "[0].id": 1,
        "[0].val": undefined,
        "[1]": collection.at(1),
        "[1].id": 2,
        "[1].val": undefined,
        "[2]": collection.at(2),
        "[2].id": 3,
      }, "Changed values set correctly");

      assert.deepEqual(events, [
        "dirty",
        "reset",
        "clean"
      ], "Triggers correct events in order");

    });


    QUnit.test("Reset on collection with defaults with no value passed is set to defaults", function(assert) {
      assert.expect(4);

      var collection = new Collection([], {
        defaults: [{val: 1}]
      });

      var events = [];

      collection.on('all', function(name){
        events.push(name);
      });

      collection.reset();

      assert.equal(collection.length, 1, "Length is correct");
      assert.deepEqual(collection.toJSON(), [{val: 1}], "Contents set correctly");
      assert.deepEqual(collection.changed(), {
        "[0]": collection.at(0),
        "[0].val": 1
      }, "Changed values set correctly");

      assert.deepEqual(events, [
        "dirty",
        "reset",
        "clean"
      ], "Triggers correct events in order");

    });


    QUnit.test("Reset on collection with defaults with values passed is set to input", function(assert) {
      assert.expect(4);

      var collection = new Collection([], {
        defaults: [{val: 1}]
      });

      var events = [];

      collection.on('all', function(name){
        events.push(name);
      });

      collection.reset([ {id: 1} ]);

      assert.equal(collection.length, 1, "Length is correct");
      assert.deepEqual(collection.toJSON(), [{id: 1}], "Contents set correctly");
      assert.deepEqual(collection.changed(), {
        "[0]": collection.at(0),
        "[0].id": 1
      }, "Changed values set correctly");

      assert.deepEqual(events, [
        "dirty",
        "reset",
        "clean"
      ], "Triggers correct events in order");

    });


    QUnit.test("When called with invalid input, reset throws", function(assert) {
      assert.expect(1);
      assert.throws(function(){
        new Collection().reset('asdf');
      });
    });

    QUnit.test('Reset does not alter options by reference', function(assert) {
      assert.expect(2);
      var collection = new Collection([{id: 1}]);
      var origOpts = {};
      collection.on('reset', function(coll, opts){
        debugger;
        assert.equal(origOpts.previousModels, undefined);
        assert.equal(opts.previousModels[0].id, 1);
      });
      collection.reset([], origOpts);
    });

    QUnit.test('#1407 parse option on reset parses collection and models', function(assert) {
      assert.expect(2);
      var model = {
        namespace: [{id: 1}, {id: 2}]
      };
      class SubModel extends Model{
        parse(m) {
          m.name = 'test';
          return m;
        }
      }
      class SubCollection extends Collection {
        parse(m) {
          return m.namespace;
        }
      }
      SubCollection.prototype.model = SubModel;
      var collection = new SubCollection();
      collection.reset(model, {parse: true});

      assert.equal(collection.length, 2);
      assert.equal(collection.at(0).get('name'), 'test');
    });


    QUnit.test('Reset includes previous models in triggered event.', function(assert) {
      assert.expect(1);
      var model = new Model();
      var collection = new Collection([model]);
      collection.on('reset', function(coll, options) {
        assert.deepEqual(options.previousModels, [model]);
      });
      collection.reset([]);
    });

  });

}