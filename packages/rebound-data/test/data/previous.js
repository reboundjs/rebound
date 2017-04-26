import { Data } from "rebound-data/rebound-data";

// Simple hash map proxy for previous testing.

class Test extends Data(Object) {

  constructor(data){
    super();
    data && this.set(data);
  }

  [Data.get](key){ return super.cache[key]; }
  [Data.set](key, val){ super.cache[key] = val; return true; }
  [Data.delete](key){ return delete super.cache[key]; }

  toJSON() {
    var ret = {};
    this.forEach((key, value) => (ret[key] = value && value.toJSON ? value.toJSON() : value) );
    return ret;
  }

}

export default function tests(){
  QUnit.module("Previous", function() {

    QUnit.test("Initial State", function(assert){
      assert.expect(1);

      var model = new Test({
        foo: 'bar'
      });

      assert.deepEqual(model.previous(), {}, "Default state for previous() after creation is an empty object.");

    });


    QUnit.test("Shallow Previous State", function(assert) {
      assert.expect(3);

      var model = new Test({
        foo: 'bar'
      });

      model.set('obj', {val: 1});
      assert.deepEqual(model.previous(), {foo: 'bar'}, "After set, previous() is the toJSON value of data before set.");
      assert.ok(Object.isFrozen(model.previous()), "JSON value from previous() is frozen and immutable..");
      assert.deepEqual(model.previous('foo'), 'bar', "Previous can take a path and return the value at that path.");

    });


    QUnit.test("Deep Previous State", function(assert) {
      assert.expect(5);
      var model = new Test({
        foo: 'bar'
      });debugger;
      model.set('obj', {val: 1});      
      model.set('foo', 'baz');debugger;
      assert.deepEqual(model.previous(), {foo: 'bar', obj: {val: 1}}, "After second set, previous() is the toJSON value of data before set, with deep values.");
      assert.deepEqual(model.previous('obj.val'), 1, "Previous can take a deep path and return the value at that path.");
      assert.ok(Object.isFrozen(model.previous('obj')), "JSON values returned from previous() are deeply frozen and immutable..");
      assert.throws(function(){
        model.previous().foo = 'test';
      }, "In strict mode, attempting to modify the object returned from previous() throws.");
      assert.deepEqual(model.previous(), {foo: 'bar', obj: {val: 1}}, "Modifying the object returned from previous() fails and will not change previous state.");

    });


  });

}