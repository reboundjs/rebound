import { Model, Collection } from "rebound-data/rebound-data";

export default function tests(){

  QUnit.module("Set", function(){
    QUnit.test("Shallow primitive values", function(assert) {
      assert.expect(4);
      var model = new Model();
      model.set("str", "test");
      assert.deepEqual( model.attributes.str, "test", "Model.set works with string values at top level" );
      model.set("int", 1);
      assert.deepEqual( model.attributes.int, 1, "Model.set works with interger values at top level" );
      model.set("bool", false);
      assert.deepEqual( model.attributes.bool, false, "Model.set works with boolean values at top level" );
      assert.deepEqual( model.attributes, {str: "test", int: 1, bool: false}, "Model.set works with primitive values at top level" );
    });

    QUnit.test("Shallow primitive values from Constructors", function(assert) {
      assert.expect(4);
      var model = new Model();
      model.set("str", new String("test")); // jshint ignore:line
      assert.deepEqual( model.attributes.str, "test", "Model.set works with string values at top level" );
      model.set("int", new Number(1)); // jshint ignore:line
      assert.deepEqual( model.attributes.int, 1, "Model.set works with interger values at top level" );
      model.set("bool", new Boolean(false)); // jshint ignore:line
      assert.deepEqual( model.attributes.bool, false, "Model.set works with boolean values at top level" );
      assert.deepEqual( model.attributes, {str: "test", int: 1, bool: false}, "Model.set works with primitive values at top level" );
    });

    QUnit.test("Shallow complex objects", function(assert) {
      assert.expect(2);
      var model = new Model();
      model.set("obj", {a:1});
      assert.equal(model.attributes.obj.isModel, true, "Model.set promotes vanilla objects to Models");
      model.set("obj", {bool:false});
      assert.deepEqual(model.attributes.obj.attributes, {a:1, bool:false}, "Model.set sets values to existing models when passed vanilla objects");
    });

    QUnit.test("Deep primitive values", function(assert) {
      assert.expect(2);
      var model = new Model();
      model.set("obj.a", 2);
      assert.ok(model.attributes.obj.isModel, "Model.set automatically creates extra models where needed");
      assert.equal(model.attributes.obj.attributes.a, 2, "Model.set properly assigns values to deeply set objects");
    });

    QUnit.test("Deep complex values", function(assert) {
      assert.expect(2);
      var model = new Model({obj: {a: 2}});
      model.set("obj", {b: 3});
      assert.deepEqual(model.attributes.obj.attributes.b, 3, "Model.set correctly modifies deep models");
      assert.deepEqual(model.attributes.obj.attributes.a, 2, "Model.set does not destroy existing values");
    });

    QUnit.test("Auto object creation", function(assert) {
      assert.expect(1);
      var model = new Model();
      model.set("depth.test", 1);
      assert.deepEqual(model.attributes.depth.attributes.test, 1, "Model.set automatically creates extra models where needed");
    });

    QUnit.test("Passing a Model", function(assert) {
      assert.expect(3);
      var model = new Model();
      var model2 = new Model({b:2});
      model.set("obj", model2);
      assert.deepEqual(model2.toJSON(), model.attributes.obj.toJSON(), "Model.set, when passed another model, clones the values.");
      assert.equal(model2.cid, model.attributes.obj.cid, "Model.set, when passed another model, clones that model and they have the same cid.");
      assert.ok(model2 === model.attributes.obj, "Model.set, when passed another model, inserts that model and they are the same object.");
    });

    QUnit.test("Passing a Model already in the same data tree", function(assert) {
      assert.expect(2);
      var model = new Model();
      var model2 = new Model({b:2});
      model.set("obj", model2);
      model.set("foo", model2);
      assert.deepEqual(model.toJSON(), {foo: {b: 2}}, "Model.set, when passed a model already in a data tree, moves it to the new position, removing it from the old location");
      assert.ok(model2 === model.attributes.foo, "Model.set, when passed a model already in a data tree, inserts that model and they are the same object.");
    });

    QUnit.test("Passing a Model in a different data tree", function(assert) {
      assert.expect(3);
      var tree1 = new Model();
      var tree2 = new Model();
      var model = new Model({b:2});
      tree1.set("obj", model);
      tree2.set("obj", model);
      assert.deepEqual(tree2.toJSON(), {obj: {b: 2}}, "Model.set, when passed a model already in a data tree, moves it to the new position");
      assert.deepEqual(tree1.toJSON(), {}, "Model.set, when passed a model already in a data tree removes it from the old location");
      assert.ok(model === tree2.attributes.obj, "Model.set, when passed a model already in a data tree, inserts that model and they are the same object.");
    });


    QUnit.test("Passing a Model in a different data tree", function(assert) {
      assert.expect(2);
      var root = new Model();
      var model1 = new Model({b:2});
      var model2 = new Model({c:3});
      root.set("foo", model1);
      root.set("foo", model2);
      assert.deepEqual(root.attributes.foo.attributes, {b: 2, c: 3}, "Model.set, when passed another model, merges their attributes.");
      assert.equal(root.attributes.foo.cid, model1.cid, "Model.set, when passed another model, does not change the existing model's cid.");
    });

    QUnit.test("Promoting Arrays", function(assert) {
      assert.expect(1);
      var model = new Model();
      model.set("arr", [{a:1}]);
      assert.ok(model.attributes.arr.isCollection, "Model.set promotes vanilla arrays to Collections");
    });

    QUnit.test("Promoting Objects", function(assert) {
      assert.expect(1);
      var model = new Model();
      model.set("arr", {obj2: {a:1}});
      assert.ok(model.attributes.arr.attributes.obj2.isModel, "Model.set promotes an object's nested objects to Models");
    });

    QUnit.test("Passing collections", function(assert) {
      assert.expect(4);
      var collection = new Collection([{id: 1}]);
      var model = new Model();
      model.set("arr", collection);
      assert.ok(model.attributes.arr.isCollection, "Model.set when passed a Collection, set it.");
      assert.deepEqual(model.toJSON(), {arr: [{id: 1}]}, "Model.set when passed a Collection, clones its values.");
      assert.equal(model.attributes.arr.cid, collection.cid, "Model.set when passed a Collection, preserves its cid.");
      assert.ok(collection === model.attributes.arr, "Model.set, when passed a Collection, does not clone that Collection and they are the same object.");
    });

    QUnit.test("Overwriting primitives with a model", function(assert) {
      assert.expect(2);
      var model = new Model({a: {b: 1 }});
      model.set("a.b", {c: 1});
      assert.ok(model.attributes.a.attributes.b.isModel, "Model.set when passed a Model to overwrite a primitive, sets.");
      assert.deepEqual(model.toJSON(), {a: {b: {c: 1}}}, "Model.set when passed a Collection, sets its values.");
    });

    QUnit.test("Overwriting primitives with a collection", function(assert) {
      assert.expect(2);
      var model = new Model({a: {b: 1 }});
      model.set("a.b", [{c: 1}]);
      assert.ok(model.attributes.a.attributes.b.isCollection, "Model.set when passed a Collection to overwrite a primitive, sets.");
      assert.deepEqual(model.toJSON(), {a: {b: [{c: 1}]}}, "Model.set when passed a Collection, sets its values.");
    });

    QUnit.test("Overwriting model with primitives", function(assert) {
      assert.expect(1);
      var model = new Model({a: {b: {c: 1} }});
      model.set("a.b", 1);
      assert.deepEqual(model.toJSON(), {a: {b: 1}}, "Model.set when passed a value to overwrite a Model, sets the value.");
    });

    QUnit.test("Overwriting collection with primitives", function(assert) {
      assert.expect(1);
      var model = new Model({a: {b: [{c: 1}] }});
      model.set("a.b", 1);
      assert.deepEqual(model.toJSON(), {a: {b: 1}}, "Model.set when passed a value to overwrite a Collection, sets the value.");
    });

    QUnit.test("Events triggered are correctly propagated up", function(assert) {
      assert.expect(8);
      var   model = new Model({
          a: {
            b: {
              c: {
                d: 0
              }
            }
          }
        });
      var count = 0;
      model.get("a.b.c").on("change:d", function(model, key, value, options){
        assert.equal(model.get("d"), value, "Change events propagated with proper name on the object that changed");
        assert.equal(count++, 0, "Change events propagated with proper name on the object that changed in the right order");
      });
      model.get("a.b").on("change:c.d", function(model, key, value, options){
        assert.equal(model.get("d"), value, "Change events propagated with proper name 1 layer up");
        assert.equal(count++, 1, "Change events propagated with proper name 1 layer up in the right order");
      });
      model.get("a").on("change:b.c.d", function(model, key, value, options){
        assert.equal(model.get("d"), value, "Change events propagated with proper name 2 layers up");
        assert.equal(count++, 2, "Change events propagated with proper name 2 layers up in the right order");
      });
      model.on("change:a.b.c.d", function(model, key, value, options){
        assert.equal(model.get("d"), value, "Change events propagated with proper name on root");
        assert.equal(count++, 3, "Change events propagated with proper name on root in the right order");
      });
      model.set("a.b.c.d", 1);
    });
  });

}
