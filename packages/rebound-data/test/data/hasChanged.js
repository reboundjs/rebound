import { Data } from "rebound-data/rebound-data";

class Test extends Data {
  change(){
    super.change.apply(this, arguments);
  }
  dirty(){
    super.dirty.apply(this, arguments);
  }
  clean(){
    super.clean.apply(this, arguments);
  }
}

export default function tests(){
  QUnit.module("HasChanged", function(){

    QUnit.test("Initial State is False", function(assert) {
      assert.expect(1);
      var data = new Test();
      assert.equal(data.hasChanged(), false, 'On initial object creation, hasChanged returns false.');
    });

    QUnit.test("Works for Self ", function(assert) {
      assert.expect(3);
      var data = new Test();

      data.dirty();
      data.change('foo');

      assert.equal(data.hasChanged(), true, 'After changed attributes have been added, hasChanged returns true.');
      assert.equal(data.hasChanged('bar'), false, 'When passed a path that has not changed, hasChanged returns false.');
      assert.equal(data.hasChanged('foo'), true, 'When passed a path that has changed, hasChanged returns true.');

    });

    QUnit.test("Works for Children ", function(assert) {
      assert.expect(3);

      var data = new Test();

      data.dirty();
      data.change('foo');

      var parent = new Data();
      parent.location = function(){ return 'parent'; }
      data.parent = parent;

      assert.equal(parent.hasChanged(), true, "After a child object's changed attribute has been added, parents' hasChanged returns true.");
      assert.equal(parent.hasChanged('parent.foo'), true, "After a child object's changed attribute has been added, parents' hasChanged returns true at that path.");
      assert.equal(parent.hasChanged('parent.bar'), false, "Parents' hasChanged returns true at a path that has not changed.");

    });

  });
};
