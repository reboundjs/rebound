import { Data } from "rebound-data/rebound-data";

export default function tests(){

  QUnit.module("Root", function(){

    QUnit.test("Initial State", function(assert) {
      assert.expect(1);
      var obj = new Data();
      assert.equal(obj.root.cid, obj.cid, "Datum with no parent returns itself as root.");
    });

    QUnit.test("Depth = 1 State", function(assert) {
      assert.expect(1);

      var parent = new Data();
      var child = new Data();

      child.parent = parent;
      assert.equal(child.root.cid, parent.cid, "Datum with parent returns deepest parent as root.");

    });

    QUnit.test("Depth = n State", function(assert) {
      assert.expect(4);

      var grandparent = new Data();
      var parent = new Data();
      var child = new Data();
      var grandchild = new Data();

      child.parent = parent;
      assert.equal(child.root.cid, parent.cid, "Datum with parent returns deepest parent as root.");

      grandchild.parent = child;
      assert.equal(grandchild.root.cid, parent.cid, "Datum with grandparent returns deepest parent as root.");

      parent.parent = grandparent;
      assert.equal(parent.root.cid, grandparent.cid, "Datum with children returns deepest parent as root when new ancestry is added.");
      assert.equal(grandchild.root.cid, grandparent.cid, "Datum's children return new deepest parent as root when a parent get new ancestry is added.");

    });

    QUnit.test("Setting `root` throws an error", function(assert) {
      assert.expect(2);
      var parent = new Data();
      var child = new Data();

      assert.throws(function(){
        child.root = parent;
      }, "Attempting to set `root` manually throws an error.");
      assert.equal(child.root.cid, child.cid, "Setting root manually is a no-op.");

    });

  });

}
