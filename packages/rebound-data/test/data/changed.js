import { Data } from "rebound-data/rebound-data";

class Test extends Data {

  // Dummy `get` method in liu of proper child value management
  get(key){
    return key + ' getter';
  }

  // Expose protected properties to the public for testing
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
  QUnit.module("Changed", function() {

    QUnit.test("The `change` Method is Protected", function(assert) {

      // Protection Tests
      var protect = new Data();
      var child = new Test();
      assert.equal(protect.change, void 0, "The `change` method is protected by default and is undefined on a new Data instance.");
      protect.change = 1;
      assert.equal(protect.change, void 0, "The `change` method is protected by default and is not able to be set on the instance.");
      assert.throws(function(){
        delete protect.change;
      }, "The `change` method is protected by default and is not able to be deleted on the instance.")

      assert.equal(typeof child.change, 'function', "Extensions of Data are able to re-define the change method, and call the protected method internally.");

    });

    QUnit.test("Initial state is empty", function (assert){
      var obj = new Test();
      assert.deepEqual(obj.changed(), {}, "Initial state for changed hash is empty object");
    });

    QUnit.test("Calling Change While Data is Clean is a No-op", function(assert){
      var obj = new Test();

      obj.change("biz");
      assert.deepEqual(obj.changed(), {});

      obj.dirty();
      obj.change("foo");
      obj.clean();
      obj.change("bar");

      assert.deepEqual(obj.changed(), {
        'foo': 'foo getter',
      });

    });

    QUnit.test("Passing change single string", function(assert) {
      var obj = new Test();

      obj.dirty();
      obj.change("foo");
      assert.deepEqual(obj.changed(), { foo: 'foo getter' }, "Setting changed to a string adds it as a property to the changed hash.");
      assert.deepEqual(obj.changed('foo'), 'foo getter', "Accessing a changed value calls `get` on the object at that path.");
      assert.deepEqual(obj.changed('bar'), undefined, "Attempting to access a value not defined on `changed` returns unefined.");
    });

    QUnit.test("Unsetting change with a single string", function(assert) {
      var obj = new Test();

      obj.dirty();
      obj.change("foo");
      obj.change("foo", false);
      assert.deepEqual(obj.changed(), { }, "Unsetting changed with a string removes it as a property from the changed hash.");
      assert.deepEqual(obj.changed('foo'), undefined, "Accessing a removed changed value calls `get` on the object at that path.");
    });

    QUnit.test("Passing change a hash", function(assert) {
      var obj = new Test();
      obj.dirty();
      obj.change({ bar: 'val', biz: 'baz' });
      assert.deepEqual(obj.changed(), {
        bar: 'bar getter',
        biz: 'biz getter'
      }, "Setting changed to an object adds all of its properties as a properties on the changed hash.");
      assert.equal(obj.changed('bar'), 'bar getter', "Accessing a changed value calls `get` on the object at that path.");
      assert.deepEqual(obj.changed('foo'), undefined, "Attempting to access a value not defined on `changed` returns unefined.");
    });


    QUnit.test("Unsetting change with a hash", function(assert) {
      var obj = new Test();

      obj.dirty();
      obj.change({ bar: 'val', biz: 'baz' });
      obj.change({ bar: 'val', biz: 'baz' }, false);
      assert.deepEqual(obj.changed(), { }, "Unsetting changed with a hash removes all keys as a property from the changed hash.");
      assert.deepEqual(obj.changed('bar'), undefined, "Accessing a removed changed value calls `get` on the object at that path.");
      assert.deepEqual(obj.changed('biz'), undefined, "Accessing a removed changed value calls `get` on the object at that path.");

    });

    QUnit.test("Change with Dirty and Clean", function(assert) {
      var obj = new Test();
      obj.dirty();
      obj.change('foo');
      obj.change({ bar: 'val', biz: 'baz' });
      assert.deepEqual(obj.changed(), {
        foo: 'foo getter',
        bar: 'bar getter',
        biz: 'biz getter'
      }, "Multiple changes while dirty result in accumalted changed values");

      obj.clean();
      assert.deepEqual(obj.changed(), {
        foo: 'foo getter',
        bar: 'bar getter',
        biz: 'biz getter'
      }, "After marked clean, changed values are still present");

      obj.dirty();
      assert.deepEqual(obj.changed(), {}, "Once marked as dirty again, changes hash is re-set");
      obj.change('foo');
      assert.deepEqual(obj.changed(), {foo: 'foo getter'}, "Changes made after being re-set are logged");

    });

    QUnit.test("Propagating Changes Up Ancestry", function(assert){
      var child = new Test();
      var parent = new Test();
      var grandparent = new Test();

      // Set up ancestry
      grandparent.location = function(){ return 'parent'; }
      parent.parent = grandparent;
      parent.location = function(){ return 'child'; }
      child.parent = parent;

      child.dirty();
      child.change("foo");
      assert.deepEqual(child.changed(), {
        foo: 'foo getter'
      }, "Setting changed to an object with ancestry data successfully adds.");
      assert.deepEqual(parent.changed(), {
        'child': 'child getter',
        'child.foo': 'child.foo getter'
      }, "Setting changed to an object with ancestry data propagates the change up to its parent with the right path.");
      assert.deepEqual(grandparent.changed(), {
        'parent': 'parent getter',
        'parent.child': 'parent.child getter',
        'parent.child.foo': 'parent.child.foo getter'
      }, "Setting changed to an object with ancestry data successfully adds propagates the change up n layers with the right path.");

    });


    QUnit.test("Propagating Changes Up New Ancestry", function(assert){
      var child = new Test();
      var parent = new Test();
      var grandparent = new Test();

      // Set up ancestry
      grandparent.location = function(){ return 'parent'; }
      parent.location = function(){ return 'child'; }

      child.dirty();
      child.change("foo");

      assert.deepEqual(child.changed(), {
        foo: 'foo getter'
      }, "Setting changed to an object no ancestry data successfully adds.");

      child.parent = parent;
      assert.deepEqual(parent.changed(), {
        'child': 'child getter',
        'child.foo': 'child.foo getter'
      }, "Setting parent to an object with change data propagates the change up to its parent with the right path.");

      parent.parent = grandparent;
      assert.deepEqual(grandparent.changed(), {
        'parent': 'parent getter',
        'parent.child': 'parent.child getter',
        'parent.child.foo': 'parent.child.foo getter'
      }, "Setting parent to an object with change data from a new child successfully adds propagates the change up n layers with the right path.");

    });

    QUnit.test("Dirty State is Inherited", function(assert){
      var child = new Test();
      var parent = new Test();
      parent.location = function(){ return 'child'; }
      child.dirty();
      child.parent = parent;
      child.change("foo");

      parent.dirty();
      assert.deepEqual(parent.changed(), {
        'child': 'child getter',
        'child.foo': 'child.foo getter'
      }, "Parents added inside of a child's transaction inherit their dirty degree and are not cleared of session state if modified.");

    });

    QUnit.test("Dirty State is Propagated and Resets Parent's Change", function(assert){
      var child = new Test();
      var parent = new Test();
      parent.location = function(){ return 'child'; }

      child.parent = parent;
      child.dirty();
      child.change("foo");
      child.clean();

      child.dirty();
      child.change("bar");
      child.clean();

      assert.deepEqual(parent.changed(), {
        'child': 'child getter',
        'child.bar': 'child.bar getter'
      }, "Parents added inside of a child's transaction inherit their dirty degree and are not cleared of session state if modified.");

    });


  });
};