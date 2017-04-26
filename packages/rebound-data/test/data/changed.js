import { Data } from "rebound-data/rebound-data";

class Test extends Data {
  constructor(values={}){
    super(values);
    this._value = {};
    this.set(values);
  }
  dirty(){ return super.dirty(); }
  clean(){ return super.clean(); }
  [Data.get](key){ return this._value[key]; }
  [Data.set](key, val){
    this._value[key] = val;
    this.trigger('change');
    return true;
  }
  [Data.delete](key){ return delete this._value[key]; }
}

export default function tests(){
  QUnit.module("Changed", function() {

    QUnit.test("Initial state is empty on basic data creation", function (assert){
      var obj = new Test();
      assert.deepEqual(obj.changed(), {}, "Initial state for changed hash is empty object");
    });


    QUnit.test("Initial state contains new values", function (assert){
      var obj = new Test({foo: 'bar'});
      assert.deepEqual(obj.changed(), {foo: 'bar'}, "Initial state for newly created data object has initial data");
    });

    QUnit.test("Calling Change While Data is Clean is a No-op", function(assert){
      var obj = new Test();
      obj.set("biz", 1);
      assert.deepEqual(obj.changed(), {biz: 1});


    });

    QUnit.test("Passing changed path string", function(assert) {
      var obj = new Test();

      obj.dirty();
      obj.set("foo", 'bar');
      assert.deepEqual(obj.changed(), { foo: 'bar' }, "Setting changed to a string adds it as a property to the changed hash.");
      assert.deepEqual(obj.changed('foo'), 'bar', "Accessing a changed value calls `get` on the object at that path.");
      assert.deepEqual(obj.changed('bar'), undefined, "Attempting to access a value not defined on `changed` returns unefined.");
      obj.clean();

    });

    QUnit.test("Changed hash is unset when value is set back to previous.", function(assert) {
      var obj = new Test({test: 0});
      obj.dirty();
      debugger;
      obj.set("test", 1);
      assert.deepEqual(obj.changed(), { test: 1 }, "Unsetting changed with a string removes it as a property from the changed hash.");
      assert.deepEqual(obj.changed('test'), 1, "Accessing a removed changed value calls `get` on the object at that path.");
      obj.set("test", 0);
      assert.deepEqual(obj.changed(), { }, "Unsetting changed with a string removes it as a property from the changed hash.");
      assert.deepEqual(obj.changed('foo'), void 0, "Accessing a removed changed value calls `get` on the object at that path.");
      obj.clean();
    });

    QUnit.test("Modifying multiple values in a hash", function(assert) {
      var obj = new Test();
      obj.set({ foo: 'bar', biz: 'baz' });
      assert.deepEqual(obj.changed(), {
        foo: 'bar',
        biz: 'baz'
      }, "Setting changed to an object adds all of its properties as a properties on the changed hash.");
      assert.equal(obj.changed('foo'), 'bar', "Accessing a changed value calls `get` on the object at that path.");
      assert.equal(obj.changed('biz'), 'baz', "Accessing a changed value calls `get` on the object at that path.");
      assert.deepEqual(obj.changed('test'), void 0, "Attempting to access a value not defined on `changed` returns unefined.");
    });

    QUnit.test("Propagating Changes Up Ancestry", function(assert){
      var child = new Test();
      var parent = new Test();
      var grandparent = new Test();

      // Set up ancestry
      grandparent.set('parent', parent);
      parent.set('child', child);
      child.set("foo", 1);

      assert.deepEqual(child.changed(), {
        foo: 1
      }, "Setting changed to an object with ancestry data successfully adds.");

      assert.deepEqual(parent.changed(), {
        'child': child,
        'child.foo': 1
      }, "Setting changed to an object with ancestry data propagates the change up to its parent with the right path.");

      assert.deepEqual(grandparent.changed(), {
        'parent': parent,
        'parent.child': child,
        'parent.child.foo': 1
      }, "Setting changed to an object with ancestry data successfully adds propagates the change up n layers with the right path.");

    });

    QUnit.test("Propagate unsetting change up ancestry mid change", function(assert){
      var child = new Test({"foo": 0});
      var parent = new Test();
      var grandparent = new Test();

      // Set up ancestry
      grandparent.set('parent', parent);
      parent.set('child', child);
      child.on('change', function(){
        if (this._hasrun) return;
        this._hasrun = true;
        this.set("foo", 0);
      });
      child.set("foo", 1);

      assert.deepEqual(child.changed(), {}, "Unsetting changed value on an object mid change is successful.");
      assert.deepEqual(child.changed(), {}, "Unsetting changed value on an object mid change is successful on parents.");
      assert.deepEqual(child.changed(), {}, "Unsetting changed value on an object mid change is successful on grandparents.");

    });

    QUnit.test("Propagate unsetting change up ancestry mid change with additional change", function(assert){
      var child = new Test({"foo": 0});
      var parent = new Test();
      var grandparent = new Test();

      // Set up ancestry
      grandparent.set('parent', parent);
      parent.set('child', child);
      child.on('change', function(){
        if (this._hasrun) return;
        this._hasrun = true;
        this.set("bar", 1);
        this.set("foo", 0);
      });
      child.set("foo", 1);

      assert.deepEqual(child.changed(), {
        'bar': 1
      }, "Unsetting and Setting changed to an object with ancestry data successfully updates changed.");

      assert.deepEqual(parent.changed(), {
        'child': child,
        'child.bar': 1
      }, "Unsetting and Setting changed to an object with ancestry data successfully updates changed on parents.");

      assert.deepEqual(grandparent.changed(), {
        'parent': parent,
        'parent.child': child,
        'parent.child.bar': 1
      }, "Unsetting and Setting changed to an object with ancestry data successfully updates changed on grandparent.");

    });


    QUnit.test("Removing children mid child change", function(assert){
      var child = new Test({"foo": 0});
      var parent = new Test();
      var grandparent = new Test();

      // Set up ancestry
      grandparent.set('parent', parent);
      parent.set('child', child);
      child.on('change', function(){
        this.parent.remove(this);
      });
      child.set("foo", 1);

      assert.deepEqual(child.changed(), {
        'foo': 1
      }, "Unsetting and Setting changed to an object with ancestry data successfully updates changed.");

      assert.deepEqual(parent.changed(), {
        'child': undefined
      }, "Unsetting and Setting changed to an object with ancestry data successfully updates changed on parents.");

      assert.deepEqual(grandparent.changed(), {
        'parent': parent,
        'parent.child': undefined
      }, "Unsetting and Setting changed to an object with ancestry data successfully updates changed on grandparent.");

    });

    QUnit.test("Swapping children mid child change", function(assert){
      var child1 = new Test({"foo": 0});
      var child2 = new Test({"bar": 0});
      var parent = new Test();
      var grandparent = new Test();

      // Set up ancestry
      grandparent.set('parent', parent);
      parent.set('child', child1);
      child1.on('change', function(){
        if (this._hasRan) return;
        this._hasRan = true;
        this.parent.set('child', child2);
      });
      child1.set("foo", 1);

      assert.deepEqual(child1.changed(), {
        'foo': 1
      }, "Changed values on previous changed object are left intact");

      assert.deepEqual(parent.changed(), {
        'child': child2
      }, "New child is on parent's changed values, old child's changed values have been removed.");

      assert.deepEqual(grandparent.changed(), {
        'parent': parent,
        'parent.child': child2
      }, "Those changes propagate up.");

    });


    QUnit.test("Dirty State is Inherited", function(assert){
      var child = new Test();
      var parent = new Test();
      parent.location = function(){ return 'child'; };
      child.dirty();
      parent.set('child', child);
      child.set("foo", 1);
      parent.dirty();
      assert.deepEqual(parent.changed(), {
        'child': child,
        'child.foo': 1
      }, "Parents receiving a dirty child inherit their dirty degree and are not cleared of session state children are further modified.");

    });

    QUnit.test("Dirty State is Propagated and Resets Parent's Change", function(assert){
      var child = new Test();
      var parent = new Test();
      parent.location = function(){ return 'child'; };

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
}