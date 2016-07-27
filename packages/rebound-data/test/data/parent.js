import { Data } from "rebound-data/rebound-data";

// Make protected methods public
class Test extends Data {

  dirty(){
    return super.dirty.apply(this, arguments);
  }
  clean(){
    return super.clean.apply(this, arguments);
  }
  change(){
    return super.change.apply(this, arguments);
  }

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
      obj.parent = parent;
      delete obj.parent;
      assert.equal(obj.parent, parent, "Deleting the parent property has no effect");
    });


    QUnit.test("Setting to invalid values on data with no parent is a no-op", function(assert) {
      assert.expect(2);
      var obj = new Test();

      obj.parent = false;
      assert.equal(obj.parent, null, "Setting parent to a non-object value is a keeps `parent` NULL.")

      obj.parent = {};
      assert.equal(obj.parent, null, "Setting parent to a non-data object is a keeps `parent` NULL.")
    });


    QUnit.test("Setting and changing parent", function(assert) {
      assert.expect(5);

      var model = new Test();
      var parent1 = new Test();
      var parent2 = new Test();

      model.parent = parent1;
      assert.equal(model.parent.cid, parent1.cid, "Assigning parent to a data object works and returns the data object when accessed.");

      parent1.remove = function(){
        assert.ok(1, "Changing parents calles `remove` on old parent.");
      }
      model.parent = parent2;
      assert.equal(model.parent.cid, parent2.cid, "Re-assigning parent to a differeent data object works and returns the new parent when accessed.")

      parent2.remove = function(el){
        assert.equal(el, model, "Unsetting a data object's parent value removes it from its previous parent.");
      }
      model.parent = void 0;
      assert.equal(model.parent, null, "Setting parent to a non-data object sets `parent` to NULL.")

    });

    QUnit.test("Setting to invalid values removes parent value", function(assert){
      assert.expect(3);

      var model = new Test();
      var parent = new Test();

      model.parent = parent;
      model.parent = true;
      assert.equal(model.parent, null, "Setting parent to a boolean value is a sets `parent` to NULL.");

      model.parent = parent;
      model.parent = '';
      assert.equal(model.parent, null, "Setting parent to a string value is a sets `parent` to NULL.");

      model.parent = parent;
      model.parent = {};
      assert.equal(model.parent, null, "Setting parent to an object value is a sets `parent` to NULL.");

    });

    QUnit.test("Shallow Cyclic Dependancies Throw", function(assert){
      assert.expect(1);

      var model = new Test();
      var parent = new Test();

      assert.throws(function(){
        model.parent = parent;
        parent.parent = model;
      }, "Setting `parent` throws when it would create a shalow cyclic ancestry chain.");

    });


    QUnit.test("Deep Cyclic Dependancies Throw", function(assert){
      assert.expect(1);

      var model = new Test();
      var parent = new Test();
      var grandparent = new Test();

      model.parent = parent;
      parent.parent = grandparent;
      assert.throws(function(){
        grandparent.parent = model;
      }, "Setting `parent` throws when it would create a deep cyclic ancestry chain.");

    });

  });

};
