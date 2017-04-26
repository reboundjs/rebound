import { Data } from "rebound-data/rebound-data";

// Make protected methods public

class Test extends Data(Object) {
  constructor(){ super(); }
  [Data.get](key){ return super.cache[key]; }
  [Data.set](key, val){ super.cache[key] = val; return true; }
  [Data.delete](key){ return delete super.cache[key]; }
}

export default function tests(){

  QUnit.module("Parent", function(){

    QUnit.test("Default value is NULL", function(assert) {
      assert.expect(1);
      var obj = new Test();
      assert.equal(obj.parent, null, "Default state for Data without parent is NULL.");
    });


    QUnit.test("Deleting the parent property has no effect", function(assert) {
      assert.expect(1);
      var obj = new Test();
      var parent = new Test();
      parent.set('obj', obj);
      delete obj.parent;
      assert.equal(obj.parent, parent, "Deleting the parent property has no effect");
    });


    QUnit.test("Setting parent directly is a no-op", function(assert) {
      assert.expect(6);
      var obj = new Test();
      var parent = new Test();

      assert.throws(()=>{
        obj.parent = false;
      }, /read-only property "parent"./, "Setting parent directly throws.");
      assert.equal(obj.parent, null, "Setting parent to a non-object value is a keeps `parent` NULL.");

      assert.throws(()=>{
        obj.parent = {};
      }, /read-only property "parent"./, "Setting parent directly throws.");
      assert.equal(obj.parent, null, "Setting parent to a non-data object is a keeps `parent` NULL.");

      assert.throws(()=>{
        obj.parent = parent;
      }, /read-only property "parent"./, "Setting parent directly throws.");
      assert.equal(obj.parent, null, "Setting parent to a non-data object is a keeps `parent` NULL.");

    });


    QUnit.test("Setting and changing parents", function(assert) {
      assert.expect(6);

      var model = new Test();
      var parent1 = new Test();
      var parent2 = new Test();

      parent1.set('key', model);
      assert.equal(model.parent.cid, parent1.cid, "Assigning parent to a data object works and returns the data object when accessed.");
      assert.equal(parent1.get('key'), model, "Value is placed in parent.");

      parent2.set('key', model);
      assert.equal(parent1.get('key'), void 0, "When moved to new object, value is removed from previous parent.");
      assert.equal(model.parent.cid, parent2.cid, "Re-assigning parent to a differeent data object works and returns the new parent when accessed.");

      parent2.delete('key');
      assert.equal(parent2.get('key'), void 0, "When deleted from an object, value is removed from parent.");
      assert.equal(model.parent, null, "Setting parent to a non-data object sets `parent` to NULL.");

    });

    QUnit.test("Setting to different values removes previous value's parent", function(assert){
      assert.expect(2);

      var model = new Test();
      var parent = new Test();

      parent.set('key', model);
      assert.equal(model.parent, parent, "Parent set");debugger;
      parent.set('key', true);
      assert.equal(model.parent, null, "Setting parent to a boolean value is a sets `parent` to NULL.");

    });

    QUnit.test("Shallow Cyclic Dependancies Throw", function(assert){
      assert.expect(1);

      var model = new Test();
      var parent = new Test();

      assert.throws(function(){
        parent.set('key', model);
        model.set('key', parent);
      }, "Setting `parent` throws when it would create a shalow cyclic ancestry chain.");

    });


    QUnit.test("Deep Cyclic Dependancies Throw", function(assert){
      assert.expect(1);

      var model = new Test();
      var parent = new Test();
      var grandparent = new Test();

      parent.set('model', model);
      grandparent.set('parent', parent);
      assert.throws(function(){
        model.set('err', grandparent);
      }, "Setting `parent` throws when it would create a deep cyclic ancestry chain.");

    });

  });

}
