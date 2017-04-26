import { Data } from "rebound-data/rebound-data";

class Test extends Data{
  constructor(){ super(); this._values = {}; }
  [Data.get](key){ return this._values[key]; }
  [Data.set](key, val){ this._values[key] = val; return true; }
  [Data.delete](key){ return delete this._values[key]; }
}

export default function tests(){

  QUnit.module("Root", function(){

    QUnit.test("Initial State", function(assert) {
      assert.expect(1);
      var obj = new Test();
      assert.equal(obj.root.cid, obj.cid, "Datum with no parent returns itself as root.");
    });

    QUnit.test("Depth = 1 State", function(assert) {
      assert.expect(1);

      var parent = new Test();
      var child = new Test();

      parent.set('child', child);
      assert.equal(child.root.cid, parent.cid, "Datum with parent returns deepest parent as root.");

    });

    QUnit.test("Depth = n State", function(assert) {
      assert.expect(4);

      var grandparent = new Test();
      var parent = new Test();
      var child = new Test();
      var grandchild = new Test();

      parent.set('child', child);
      assert.equal(child.root.cid, parent.cid, "Datum with parent returns deepest parent as root.");

      child.set('grandchild', grandchild);
      assert.equal(grandchild.root.cid, parent.cid, "Datum with grandparent returns deepest parent as root.");

      grandparent.set('parent', parent);
      assert.equal(parent.root.cid, grandparent.cid, "Datum with children returns deepest parent as root when new ancestry is added.");
      assert.equal(grandchild.root.cid, grandparent.cid, "Datum's children return new deepest parent as root when a parent get new ancestry is added.");

    });

    QUnit.test("Setting `root` throws an error", function(assert) {
      assert.expect(2);
      var parent = new Test();
      var child = new Test();

      assert.throws(function(){
        child.root = parent;
      }, "Attempting to set `root` manually throws an error.");
      assert.equal(child.root.cid, child.cid, "Setting root manually is a no-op.");

    });

  });

}
