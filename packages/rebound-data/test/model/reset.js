import { Model, Collection } from "rebound-data/rebound-data";

export default function tests(){

  QUnit.module("Reset", function(){

    QUnit.test("Model.reset successfully resets primitive values to defaults", function(assert) {
      assert.expect(2);
      var model = new class Test extends Model {
        get defaults(){
          return {
            val: 'val',
            int: 0,
            bool: false,
            str: ''
          };
        }
      }({
        int: 1,
        bool: true,
        str: "string"
      });
      debugger;
      model.reset();
      assert.deepEqual(model.toJSON(), { val: 'val', int: 0, bool: false, str: '' }, "Primitive values are reset to defaults on model.reset");
      assert.deepEqual(model.changed(), { int: 0, bool: false, str: '' }, "Primitive values reset to defaults on model.reset have the appropreate changed");
    });

    QUnit.test("Model.reset with passed value hash", function(assert) {
      assert.expect(2);
      var model = new class Test extends Model {
        get defaults(){
          return {
            val: 'val',
            int: 0,
            bool: false,
            str: ''
          };
        }
      }({
        int: 1,
        bool: true,
        str: "string"
      });
      model.reset({int: 2});
      assert.deepEqual(model.toJSON(), { val: 'val', int: 2, bool: false, str: '' }, "Primitive values are reset to defaults with specific modifications on model.reset");
      assert.deepEqual(model.changed(), { int: 2, bool: false, str: '' }, "Primitive values reset to defaults with specific modifications on model.reset have the appropreate changed");
    });

    QUnit.test("Model.reset with empty complex objects as default", function(assert) {
      assert.expect(2);
      var model = new class Test extends Model {
        get defaults(){
          return {
            val: 'val',
            obj: {},
            arr: []
          };
        }
      }({
        obj: { foo: 'bar' },
        arr: [{ biz: 'baz'}]
      });
      model.reset();
      assert.deepEqual(model.toJSON(), { val: 'val', obj: {}, arr: [] }, "Complex values are reset to empty defaults on model.reset");
      assert.deepEqual(model.changed(), {
        "obj.foo": undefined,
        "obj": model.get('obj'),
        "arr[0].biz": undefined ,
        "arr[0]": undefined,
        "arr": model.get('arr')
      }, "Complex values reset to empty defaults on model.reset have the appropreate changed");
    });

    QUnit.test("Model.reset with complex objects with state as default", function(assert) {
      assert.expect(2);

      var model = new class Test extends Model {
        get defaults(){
          return {
            val: 'val',
            obj: { biz: 'baz' },
            arr: [{ foo: 'bar' }]
          };
        }
      }({
        obj: { foo: 'bar' },
        arr: [{ biz: 'baz'}]
      });

      model.reset();
      assert.deepEqual(model.toJSON(), { val: 'val', obj: {biz: 'baz'}, arr: [{foo: 'bar'}] }, "Complex values are reset to filled defaults on model.reset");
      assert.deepEqual(model.changed(), {
        "obj.foo": undefined,
        "obj": model.get('obj'),
        "arr[0].biz": undefined,
        "arr[0].foo": "bar",
        "arr[0]": model.get('arr[0]'),
        "arr": model.get('arr')
      }, "Complex values reset to filled defaults on model.reset have the appropreate changed");

    });

    QUnit.test("Model.reset with empty complex objects as default with modification", function(assert) {
      assert.expect(1);
      var model = new class Test extends Model {
        get defaults(){
          return {
            obj: {},
            arr: []
          };
        }
      }({
        obj: { foo: 'bar' },
        arr: [{ biz: 'baz'}]
      });
      model.reset({obj: {biz: 'baz'}, arr: [{foo: 'bar'}]});
      assert.deepEqual(model.toJSON(), { obj: {biz: 'baz'}, arr: [{foo: 'bar'}] }, "Complex values are reset to empty defaults with modifications on model.reset");

    });

    QUnit.test("Model.reset with complex objects as default wtih state, with modification", function(assert) {
      assert.expect(1);
      var model = new class Test extends Model {
        get defaults(){
          return {
            obj: { no: 'op'},
            arr: [{ no: 'op' }]
          };
        }
      }({
        obj: { foo: 'bar' },
        arr: [{ biz: 'baz'}]
      });
      model.reset({obj: {biz: 'baz'}, arr: [{foo: 'bar'}]});
      assert.deepEqual(model.toJSON(), { obj: {biz: 'baz', no: 'op'}, arr: [{foo: 'bar'}] }, "Complex values are reset to filled defaults with modifications on model.reset");
    });


    QUnit.test("Model.reset with collection in defaults wtih state custom model with modification", function(assert) {
      assert.expect(2);
      class TestColl extends Collection {}
      class TestModel extends Model {
        get defaults(){
          return { test: true };
        }
      }
      TestColl.prototype.model = TestModel;

      var model = new Model({
        bool: true,
        arr: (new TestColl([{id: 2}, {id: 3}])),
        obj: { foo: { bar: "bar" } }
      });
      model.defaults = { prop: true };
      model.reset({
        prop: false,
        arr: [{id: 1}],
        obj: {foo: {test: true}}
      });
      assert.deepEqual(model.toJSON(), {
        prop: false,
        arr: [{id: 1, test: true}],
        obj: {foo: { test: true }}
      }, "Calling reset() with new values on a model resets it with these new values");
      assert.deepEqual(model.changed(), {
        prop: false,
        bool: undefined,
        obj: model.get('obj'),
        "obj.foo": model.get('obj.foo'),
        "obj.foo.bar": undefined,
        "obj.foo.test": true,
        arr: model.get('arr'),
        "arr[0]": model.get('arr[0]'),
        "arr[0].id": 1,
        "arr[0].test": true,
        "arr[1]": undefined,
        "arr[1].id": undefined,
        "arr[1].test": undefined
      }, "Calling reset() with new values on a model resets it with these new values and properly sets its changed");
    });

    QUnit.test("Model.reset triggers `reset` event", function(assert) {
      assert.expect(1);
      var model = new Model({val: 2});
      model.defaults = {val: 1};
      model.once("reset", function(){
        assert.ok(true, "Reset event is triggered on a model that changes on reset");
      });

      model.reset();
    });

    QUnit.test("If no changes are made, Model.reset does not trigger a `reset` event", function(assert) {
      assert.expect(2)
      var model = new Model({val: 1});
      model.defaults = {val: 1};
      model.once("reset", function(){
        assert.ok(false, "A reset that results in no changes does not trigger an event - direct properties");
      });
      model.reset();
      assert.deepEqual(model.changed(), {}, "A reset that results in no changes has an empty changed hash - direct properties");

      model = new Model({val: {val: 1}});
      model.defaults = {val: {val: 1}};
      model.once("reset", function(){
        assert.ok(false, "A reset that results in no changes does not trigger an event - decendant Model properties");
      });
      model.reset();
      assert.deepEqual(model.changed(), {}, "A reset that results in no changes has an empty changed hash - decendant Model properties");

    });

  });
}
