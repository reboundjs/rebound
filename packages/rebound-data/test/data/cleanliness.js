import { Data } from "rebound-data/rebound-data";

class Protected extends Data(Object) {
  [Data.get](key){ return super.cache[key]; }
  [Data.set](key, val){ super.cache[key] = val; return true; }
  [Data.delete](key){ return delete super.cache[key]; }
}

// Expose protected properties to the public for testing
class Test extends Data(Object) {
  dirty(){ return super.dirty.apply(this, arguments); }
  clean(){ return super.clean.apply(this, arguments); }
  get state(){ return this[Object.getOwnPropertySymbols(this).filter((sym) => { return !!~sym.toString().indexOf("<data>"); })[0]]; }
  [Data.get](key){ return super.cache[key]; }
  [Data.set](key, val){ super.cache[key] = val; return true; }
  [Data.delete](key){ return delete super.cache[key]; }
}

export default function tests(){

  QUnit.module("Cleanliness", function(){


    QUnit.test("The `dirty` Method is Protected", function(assert) {

      // Protection Tests
      var protect = new Protected();
      var child = new Test();
      assert.equal(protect.dirty, void 0, "The `dirty` method is protected by default and is undefined on a new Data instance.");
      protect.dirty = 1;
      assert.equal(protect.dirty, void 0, "The `dirty` method is protected by default and is not able to be set on the instance.");
      assert.throws(function(){
        delete protect.dirty;
      }, "The `dirty` method is protected by default and is not able to be deleted on the instance.");

      assert.equal(typeof child.dirty, 'function', "Extensions of Data are able to re-define the dirty method, and call the protected method internally.");

    });


    QUnit.test("The `clean` Method is Protected", function(assert) {

      // Protection Tests
      var protect = new Protected();
      var child = new Test();
      assert.equal(protect.clean, void 0, "The `clean` method is protected by default and is undefined on a new Data instance.");
      protect.clean = 1;
      assert.equal(protect.clean, void 0, "The `clean` method is protected by default and is not able to be set on the instance.");
      assert.throws(function(){
        delete protect.clean;
      }, "The `clean` method is protected by default and is not able to be deleted on the instance.");

      assert.equal(typeof child.clean, 'function', "Extensions of Data are able to re-define the clean method, and call the protected method internally.");

    });

    QUnit.test("Dirty returns incrementing dirtiness level", function(assert){
      assert.expect(4);
      var data = new Test();
      var level = data.dirty();
      assert.equal(level, 1);
      level = data.dirty();
      assert.equal(level, 2);
      level = data.dirty();
      assert.equal(level, 3);
      level = data.dirty();
      assert.equal(level, 4);
    });

    QUnit.test("Clean returns decrementing dirtiness level", function(assert){
      assert.expect(6);
      var data = new Test();
      var level = data.dirty();
      level = data.dirty();
      level = data.dirty();
      level = data.dirty();
      assert.equal(level, 4);
      level = data.clean();
      assert.equal(level, 3);
      level = data.clean();
      assert.equal(level, 2);
      level = data.clean();
      assert.equal(level, 1);
      level = data.clean();
      assert.equal(level, 0);
      level = data.clean();
      assert.equal(level, 0);
    });


    QUnit.test("Clean will not go below zero", function(assert){
      assert.expect(1);
      var data = new Test();
      var level = data.dirty();
      level = data.clean();
      level = data.clean();
      level = data.clean();
      assert.equal(level, 0);
    });

    QUnit.test("Dirty level is propagated up to parent", function(assert){
      assert.expect(16);
      var child = new Test();
      var parent = new Test();
      var grandparent = new Test();

      parent.set('child', child);
      grandparent.set('parent', parent);

      var level = child.dirty();
      assert.equal(level, 1, "Dirty state increased on child");
      assert.equal(parent.state.dirty_count, 1, "Dirty state propagated up one level");
      assert.equal(grandparent.state.dirty_count, 1, "Dirty state propagated up n levels");

      level = child.dirty();
      assert.equal(level, 2, "Dirty actor's dirty state increased on multiple dirty call");
      assert.equal(parent.state.dirty_count, 2, "Dirty state propagated up one level");
      assert.equal(grandparent.state.dirty_count, 2, "Dirty state propagated up n levels");

      level = parent.dirty();
      assert.equal(parent.state.dirty_count, 3, "Dirty state increased on actor");
      assert.equal(grandparent.state.dirty_count, 3, "Dirty state propagated up 1 levels");
      assert.equal(child.state.dirty_count, 2, "Dirty state only propagated up, children are uneffected.");

      level = child.clean();
      level = child.clean();
      assert.equal(level, 0, "Dirty state decreased on child");
      assert.equal(child.state.dirty_count, 0, "Dirty state decreased on child in private state");
      assert.equal(parent.state.dirty_count, 1, "Dirty state decrease propagated up one level");
      assert.equal(grandparent.state.dirty_count, 1, "Dirty state decrease propagated up n levels");

      level = child.clean();
      assert.equal(level, 0, "When clean actor is marked clean, it is a no-op");
      assert.equal(parent.state.dirty_count, 1, "When clean actor is marked clean, it is a no-op and not propagated up.");
      assert.equal(grandparent.state.dirty_count, 1, "When clean actor is marked clean, it is a no-op and not propagated up.");

    });

  });
}
