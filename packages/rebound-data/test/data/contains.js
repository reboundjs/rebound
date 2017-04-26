import { Data } from "rebound-data/rebound-data";

class Test extends Data{
  constructor(){ super(); this._value = {}; }
  [Data.get](key){ return this._value[key]; }
  [Data.set](key, val){ this._value[key] = val; return true; }
  [Data.delete](key){ return delete this._value[key]; }
}

export default function tests(){
  QUnit.module("Contains", function(){

    QUnit.test("Shallow Functionality – data object", function(assert) {
      assert.expect(4);

      var parent = new Test();
      var child = new Test();

      assert.ok(parent.contains(child) === false, "Before being added as a child, contains returns false");

      parent.set('child', child);
      assert.ok(parent.contains(child) === true, "After being added as a child, contains returns true");
      assert.ok(parent.contains(child, true) === true, "Even with deep set to true, contains returns true for a shallow search");

      parent.delete('child');
      assert.ok(parent.contains(child) === false, "After being removed as a child, contains returns false");

    });


    QUnit.test("Shallow Functionality – value", function(assert) {
      assert.expect(4);

      var obj = new Test();

      assert.ok(obj.contains(1) === false, "Before value is added, contains returns false");
      obj.set('foo', 1);
      assert.ok(obj.contains(1) === true, "After value is added, contains returns true");
      assert.ok(obj.contains(true) === false, "Value comparisons are type-safe");

      obj.delete('foo');
      assert.ok(obj.contains(1) === false, "After being removed, contains returns false");

    });

    QUnit.test("Deep Functionality – data object", function(assert) {
      assert.expect(5);

      var grandparent = new Test();
      var parent = new Test();
      var child = new Test();

      parent.set('child', child);
      assert.ok(grandparent.contains(child) === false, "Before being added as a grandchild, contains returns false");

      grandparent.set('parent', parent);
      assert.ok(grandparent.contains(child) === false, "Without deep attribute passed, defaults to shallow lookup");
      assert.ok(grandparent.contains(child, true) === true, "After being added as a grandchild, contains returns false");

      parent.delete('child');
      assert.ok(parent.contains(child) === false, "After being removed as a child, contains returns false");
      assert.ok(grandparent.contains(child) === false, "After being removed as a grandchild, contains returns false");

    });


    QUnit.test("Deep Functionality – value", function(assert) {
      assert.expect(6);

      var grandparent = new Test();
      var parent = new Test();
      var child = new Test();

      child.set('foo', 1);
      parent.set('child', child);
      assert.ok(grandparent.contains(1) === false, "Before being added to dependancy tree, contains returns false");

      grandparent.set('parent', parent);
      assert.ok(grandparent.contains(1) === false, "Without deep attribute passed, defaults to shallow lookup, returns false");
      assert.ok(grandparent.contains(1, true) === true, "After being added as a grandchild, and with deep attribute set to true, contains returns true");
      assert.ok(grandparent.contains(true, true) === false, "Deep value searches are type-safe");

      parent.delete('child');
      assert.ok(parent.contains(child) === false, "After being removed as a child, contains returns false");
      assert.ok(grandparent.contains(child) === false, "After being removed as a grandchild, contains returns false");

    });

    QUnit.test("No Arguments Returns False ", function(assert) {
      assert.expect(1);
      var obj = new Test();
      assert.ok(obj.contains() === false, "When no argument is passed, returns false");
    });

    QUnit.test("Invalid Arguments Returns False ", function(assert) {
      assert.expect(1);
      var obj = new Test();
      assert.ok(obj.contains('foobar') === false, "When invalid argument is passed, returns false");
    });

  });
}
