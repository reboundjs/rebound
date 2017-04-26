import { Data } from "rebound-data/rebound-data";

class Test extends Data(Object){
  constructor(){ super(); }
  [Data.get](key){ return super.cache[key]; }
  [Data.set](key, val){ super.cache[key] = val; return true; }
  [Data.delete](key){ return delete super.cache[key]; }
  get CACHE(){ return this[Object.getOwnPropertySymbols(this).filter((sym) => { return !!~sym.toString().indexOf("<data>"); })[0]]; }
}

export default function tests(){
  QUnit.module("Children", function(){

    QUnit.test("Default Return", function(assert) {
      assert.expect(2);
      var obj = new Test();
      assert.equal(obj.children().length, 0, "A datum's children method returns an empty array by default.");
      assert.ok(Object.isFrozen(obj.children()), "Default Object returned from children() is frozen");
    });

    QUnit.test("Parent Modifications", function(assert) {
      assert.expect(7);

      var parent = new Test();
      var model1 = new Test();
      var model2 = new Test();

      parent.set('model1', model1);

      assert.equal(parent.children().length, 1, "After being added as a parent, the datum's children model returns one object.");
      assert.equal(parent.children()[0], model1, "After being added as a parent, the datum's children model contains the child.");

      parent.set('model2', model2);

      assert.equal(parent.children().length, 2, "After being added as a second item's parent, the datum's children model returns both objects.");
      assert.equal(parent.children()[1], model2, "After being added as a second item's parent, the datum's children model contains the child in the order added.");

      parent.delete('model1');

      assert.equal(parent.children().length, 1, "After being removed as an item's parent, the datum's children are correct");
      assert.equal(parent.children()[0], model2, "After being removed as an item's parent, the datum's children model contains the children in the order added.");

      assert.ok(Object.isFrozen(parent.children()), "Object returned from children() is frozen");

    });


    QUnit.test("Internal state sanity check", function(assert) {
      assert.expect(6);

      var parent = new Test();
      var model1 = new Test();
      var model2 = new Test();

      parent.set('model1', model1);

      assert.deepEqual(parent.CACHE.keysHash, {'model1': model1}, "Parent's internal cache contains new key in internal keys hash");
      assert.deepEqual(parent.CACHE.keysList, ['model1'], "Parent's internal cache contains new key in internal keys hash");

      parent.set('model2', model2);

      assert.deepEqual(parent.CACHE.keysHash, {'model1': model1, 'model2': model2}, "Parent's internal cache contains new key in internal keys hash");
      assert.deepEqual(parent.CACHE.keysList, ['model1', 'model2'], "Parent's internal cache contains new key in internal keys hash");

      parent.delete('model1');

      assert.deepEqual(parent.CACHE.keysHash, {'model2': model2}, "Parent's internal cache contains new key in internal keys hash");
      assert.deepEqual(parent.CACHE.keysList, ['model2'], "Parent's internal cache contains new key in internal keys hash");

    });
  });
}
