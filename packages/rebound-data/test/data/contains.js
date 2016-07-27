import { Data } from "rebound-data/rebound-data";

export default function tests(){
  QUnit.module("Contains", function(){

    QUnit.test("Basic Functionality", function(assert) {
      assert.expect(3);

      var parent = new Data()
      var child = new Data()

      assert.ok(parent.contains(child) === false, "Before being added as a child, contains returns false");

      child.parent = parent;
      assert.ok(parent.contains(child) === true, "After being added as a child, contains returns true");

      child.parent = void 0;
      assert.ok(parent.contains(child) === false, "After being removed as a child, contains returns false");

    });

    QUnit.test("Deep Functionality", function(assert) {
      assert.expect(4);

      var grandparent = new Data()
      var parent = new Data()
      var child = new Data()

      child.parent = parent;
      assert.ok(grandparent.contains(child) === false, "Before being added as a grandchild, contains returns false");

      parent.parent = grandparent;
      assert.ok(grandparent.contains(child) === true, "After being added as a grandchild, contains returns false");

      child.parent = void 0;
      assert.ok(parent.contains(child) === false, "After being removed as a child, contains returns false");
      assert.ok(grandparent.contains(child) === false, "After being removed as a grandchild, contains returns false");

    });

    QUnit.test("No Arguments Returns False ", function(assert) {
      assert.expect(1);
      var obj = new Data()
      assert.ok(obj.contains() === false, "When no argument is passed, returns false");
    });

    QUnit.test("Invalid Arguments Returns False ", function(assert) {
      assert.expect(1);
      var obj = new Data()
      assert.ok(obj.contains('foobar') === false, "When invalid argument is passed, returns false");
    });

  });
};
