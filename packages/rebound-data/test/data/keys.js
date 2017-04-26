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
    return "0";
  }
  [Data.delete](key){ return delete super.cache[key]; }
}

export default function tests(){
  QUnit.module("Keys", function() {

    QUnit.module("Static Store", function() {

      QUnit.test("Set tracks keys in 1:1 store", function(assert) {

        var entries = new Store();
        entries.set('foo', 'bar');
        assert.deepEqual(entries.keys(), ['foo'], 'Setting value tracks key on entries object');

        entries.set('biz', 'baz');
        assert.deepEqual(entries.keys(), ['foo', 'biz'], 'Setting value tracks multiple key on entries object');

        entries.set('foo', 'baz');
        assert.deepEqual(entries.keys(), ['foo', 'biz'], 'Re-setting value does not add a duplicate key to the list or re-order.');

        entries.delete('biz');
        assert.deepEqual(entries.keys(), ['foo'], 'Deleting value does removes key from list.');

        entries.set('foo', 'baz');
        assert.deepEqual(entries.keys(), ['foo'], 'After delete, re-setting value does not add a second key to the list.');

      });


      QUnit.test("Returned keys array is immutable", function(assert) {

        var entries = new Store();
        entries.set('foo', 'bar');
        var keys = entries.keys();
        assert.throws(function(){
          keys[1] = 'blah';
        }, 'Attempts to modify keys array throws an error.');

        assert.deepEqual(keys, ['foo'], 'Attempt to modify keys directly is a no-op');

      });

      QUnit.test("If set fails, keys list is rolled back", function(assert) {
        var call_count = 0;
        // 1:1 key-value relationship, no path side effects on `set`
        class Test extends Data(Object) {
          [Data.get](key){ return super.cache[key]; }
          [Data.set](key, val){ // eslint-disable-line
            if      (call_count === 0) assert.deepEqual(entries.keys(), [], 'Keys are not present during set call');
            else if (call_count === 1) assert.deepEqual(entries.keys(), [], 'Keys are not during unset call');
            call_count++;
            return false;
          }
          [Data.delete](key){ delete super.cache[key]; }
        }

        var entries = new Test();
        try { entries.set('foo', 'bar'); } catch(err){1;}
        var keys = entries.keys();
        assert.deepEqual(keys, [], 'Keys are rolled back after failed set');

      });

    });

    QUnit.module("Variable Store", function() {

      QUnit.test("Set tracks keys in variable key store", function(assert) {

        var entries = new VariableStore();
        entries.set('foo', 'bar');
        assert.deepEqual(entries.keys(), ['0'], 'Setting value tracks key on entries object');

        entries.set('biz', 'baz');
        assert.deepEqual(entries.keys(), ['0', '1'], 'Setting value tracks multiple key on entries object');

        entries.set('foo', 'baz');
        assert.deepEqual(entries.keys(), ['0', '1', '2'], 'Custom key returns ignore duplicate keys passed to set and add keys correctly still');

        entries.delete('0');
        assert.deepEqual(entries.keys(), ['1', '2'], 'Deleting value does removes key from list.');

      });


      QUnit.test("Returned keys array is immutable", function(assert) {

        var entries = new Store();
        entries.set('foo', 'bar');
        var keys = entries.keys();
        assert.throws(function(){
          keys[1] = 'blah';
        }, 'Attempts to modify keys array throws an error.');

        assert.deepEqual(keys, ['foo'], 'Attempt to modify keys directly is a no-op');

      });

      QUnit.test("If set fails, keys list is rolled back", function(assert) {
        var call_count = 0;
        // 1:1 key-value relationship, no path side effects on `set`
        class Test extends Data(Object) {
          [Data.get](key){ return super.cache[key]; }
          [Data.set](key, val){ // eslint-disable-line
            if      (call_count === 0) assert.deepEqual(entries.keys(), [], 'Keys are not present during set call');
            else if (call_count === 1) assert.deepEqual(entries.keys(), [], 'Keys are not during unset call');
            call_count++;
            return false;
          }
          [Data.delete](key){ delete super.cache[key]; }
        }

        var entries = new Test();
        try { entries.set('foo', 'bar'); } catch(err){1;}
        var keys = entries.keys();
        assert.deepEqual(keys, [], 'Keys are rolled back after failed set');

      });

    });

  });
}