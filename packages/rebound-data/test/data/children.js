import { Data } from "rebound-data/rebound-data";

export default function tests(){
  QUnit.module("Children", function(){

    QUnit.test("Default Return", function(assert) {
      assert.expect(2);
      var obj = new Data();
      assert.equal(obj.children().length, 0, "A datum's children method returns an empty array by default.");
      assert.ok(Object.isFrozen(obj.children()), "Default Object returned from children() is frozen");
    });

    QUnit.test("On Parent Modifications", function(assert) {
      assert.expect(10);

      var parent = new Data();
      var model1 = new Data();
      var model2 = new Data();

      model1.parent = parent;

      assert.equal(parent.children().length, 1, "After being added as a parent, the datum's children model returns one object.")
      assert.equal(parent.children()[0], model1, "After being added as a parent, the datum's children model contains the child.")
      assert.equal(parent.children()[model1.cid], model1, "After being added as a parent, the datum's children model contains the child at the child's cid.")

      model2.parent = parent;

      assert.equal(parent.children().length, 2, "After being added as a second item's parent, the datum's children model returns both objects.")
      assert.equal(parent.children()[1], model2, "After being added as a second item's parent, the datum's children model contains the child in the order added.")
      assert.equal(parent.children()[model2.cid], model2, "After being added as a parent, the datum's children model contains the second child at the child's cid.")

      model1.parent = void 0;

      assert.equal(parent.children().length, 1, "After being removed as an item's parent, the datum's children are correct");
      assert.equal(parent.children()[0], model2, "After being removed as an item's parent, the datum's children model contains the children in the order added.")
      assert.equal(parent.children().hasOwnProperty(model1.cid), false, "After being added as a parent, the datum's children model no longer contains the second child at the child's cid.")

      assert.ok(Object.isFrozen(parent.children()), "Object returned from children() is frozen");

    });
  });
};
