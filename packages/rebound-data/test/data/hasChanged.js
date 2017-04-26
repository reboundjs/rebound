import { Data } from "rebound-data/rebound-data";

// 1:1 key-value relationship, no path side effects on `set`
class Store extends Data(Object) {
  [Data.get](key){ return super.cache[key]; }
  [Data.set](key, val){ super.cache[key] = val; return true; }
  [Data.delete](key){ return delete super.cache[key]; }
}

// Has key changing side-effects after any `set`
class VariableStore extends Data(Array) {
  [Data.get](key){ return super.cache[key]; }
  [Data.set](key, val){
    super.cache.unshift(val);
    for (let i=1;i<super.cache.length;i++) this.touch(i, super.cache[i]);
    return true;
  }
  [Data.delete](key){ return delete super.cache[key]; }
}

export default function tests(){
  QUnit.module("HasChanged", function(){

    QUnit.module("Value", function(){

      QUnit.test("Initial State is False", function(assert) {
        assert.expect(1);
        var data = new Data();
        assert.equal(data.hasChanged(), false, 'On initial object creation, hasChanged returns false.');
      });

      QUnit.test("Returns true for new value", function(assert) {
        assert.expect(1);
        var data = new Data();
        data.set(1);
        assert.equal(data.hasChanged(), true, 'When new value is set, returns true.');
      });

      QUnit.test("Returns false after no-op set", function(assert) {
        assert.expect(1);
        var data = new Data();
        data.set(1);
        data.set(1);
        assert.equal(data.hasChanged(), false, 'After no-op, returns false.');
      });

      QUnit.test("Returns false at any path", function(assert) {
        assert.expect(4);
        var data = new Data();
        assert.equal(data.hasChanged('foo'), false, 'Returns false.');
        assert.equal(data.hasChanged('bar'), false, 'Returns false.');
        data.set(1);
        assert.equal(data.hasChanged('foo'), false, 'Returns false.');
        assert.equal(data.hasChanged('bar'), false, 'Returns false.');

      });

    });

    QUnit.module("Static Store", function(){

      QUnit.test("Initial State is False", function(assert) {
        assert.expect(1);
        var data = new Store();
        assert.equal(data.hasChanged(), false, 'On initial object creation, hasChanged returns false.');
      });

      QUnit.test("Returns true for new attribute on self", function(assert) {
        assert.expect(3);
        var data = new Store();

        data.set('foo', true);
        assert.equal(data.hasChanged(), true, 'After changed attributes have been added, hasChanged returns true.');
        assert.equal(data.hasChanged('bar'), false, 'When passed a path that has not changed, hasChanged returns false.');
        assert.equal(data.hasChanged('foo'), true, 'When passed a path that has changed, hasChanged returns true.');

      });

      QUnit.test("Returns false after no-op on attribute on self", function(assert) {
        assert.expect(3);
        var data = new Store();

        data.set('foo', true);
        data.set('foo', true);
        assert.equal(data.hasChanged(), false, 'After no-op, hasChanged returns false.');
        assert.equal(data.hasChanged('bar'), false, 'After no-op, hasChanged returns false for path that hasn\'t been touched.');
        assert.equal(data.hasChanged('foo'), false, 'After no-op, hasChanged returns false for path that has been touched.');

      });

      QUnit.test("Returns true after modify attribute on self", function(assert) {
        assert.expect(3);
        var data = new Store();

        data.set('foo', true);
        data.set('foo', false);
        assert.equal(data.hasChanged(), true, 'After attributes have been modified, hasChanged returns true.');
        assert.equal(data.hasChanged('bar'), false, 'When passed a path that has not changed, hasChanged returns false.');
        assert.equal(data.hasChanged('foo'), true, 'When passed a path that has changed, hasChanged returns true.');

      });


      QUnit.test("Works for Children Modified While Already In Parent", function(assert) {
        assert.expect(3);
        var parent = new Store();
        var data = new Store();
        parent.set('parent', data);
        data.set('foo', true);

        assert.equal(parent.hasChanged(), true, "After a child object's changed attribute has been added, parents' hasChanged returns true.");
        assert.equal(parent.hasChanged('parent.foo'), true, "After a child object's changed attribute has been added, parents' hasChanged returns true at that path.");
        assert.equal(parent.hasChanged('parent.bar'), false, "Parents' hasChanged returns true at a path that has not changed.");

      });


      QUnit.test("Works for Children Added to Parent With Existing Values", function(assert) {
        assert.expect(3);

        var data = new Store();

        data.set('foo', true);

        var parent = new Store();
        parent.set('parent', data);

        assert.equal(parent.hasChanged(), true, "After a child object's changed attribute has been added, parents' hasChanged returns true.");
        assert.equal(parent.hasChanged('parent.foo'), true, "After a child object's changed attribute has been added, parents' hasChanged returns true at that path.");
        assert.equal(parent.hasChanged('parent.bar'), false, "Parents' hasChanged returns true at a path that has not changed.");

      });

    }); // End Static Store Tests


    QUnit.module("Variable Store", function(){

      QUnit.test("Initial State is False", function(assert) {
        assert.expect(1);
        var data = new VariableStore();
        assert.equal(data.hasChanged(), false, 'On initial object creation, hasChanged returns false.');
      });

      QUnit.test("Returns true for new attribute on self", function(assert) {
        assert.expect(3);
        var data = new VariableStore();

        data.set('foo', true);
        assert.equal(data.hasChanged(), true, 'After changed attributes have been added, hasChanged returns true.');
        assert.equal(data.hasChanged('bar'), false, 'When passed a path that has not changed, hasChanged returns false.');
        assert.equal(data.hasChanged('foo'), true, 'When passed a path that has changed, hasChanged returns true.');

      });

      QUnit.test("Returns false after no-op on attribute on self", function(assert) {
        assert.expect(3);
        var data = new VariableStore();

        data.set('foo', true);
        data.set('foo', true);
        assert.equal(data.hasChanged(), false, 'After no-op, hasChanged returns false.');
        assert.equal(data.hasChanged('bar'), false, 'After no-op, hasChanged returns false for path that hasn\'t been touched.');
        assert.equal(data.hasChanged('foo'), false, 'After no-op, hasChanged returns false for path that has been touched.');

      });

      QUnit.test("Returns true after modify attribute on self", function(assert) {
        assert.expect(3);
        var data = new VariableStore();

        data.set('foo', true);
        data.set('foo', false);
        assert.equal(data.hasChanged(), true, 'After attributes have been modified, hasChanged returns true.');
        assert.equal(data.hasChanged('bar'), false, 'When passed a path that has not changed, hasChanged returns false.');
        assert.equal(data.hasChanged('foo'), true, 'When passed a path that has changed, hasChanged returns true.');

      });


      QUnit.test("Works for Children Modified While Already In Parent", function(assert) {
        assert.expect(3);
        var parent = new VariableStore();
        var data = new VariableStore();
        parent.set('parent', data);
        data.set('foo', true);

        assert.equal(parent.hasChanged(), true, "After a child object's changed attribute has been added, parents' hasChanged returns true.");
        assert.equal(parent.hasChanged('parent.foo'), true, "After a child object's changed attribute has been added, parents' hasChanged returns true at that path.");
        assert.equal(parent.hasChanged('parent.bar'), false, "Parents' hasChanged returns true at a path that has not changed.");

      });


      QUnit.test("Works for Children Added to Parent With Existing Values", function(assert) {
        assert.expect(3);

        var data = new VariableStore();

        data.set('foo', true);

        var parent = new VariableStore();
        parent.set('parent', data);

        assert.equal(parent.hasChanged(), true, "After a child object's changed attribute has been added, parents' hasChanged returns true.");
        assert.equal(parent.hasChanged('parent.foo'), true, "After a child object's changed attribute has been added, parents' hasChanged returns true at that path.");
        assert.equal(parent.hasChanged('parent.bar'), false, "Parents' hasChanged returns true at a path that has not changed.");

      });

    }); // End Variable Store Tests


  });
}
