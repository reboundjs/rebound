import { Data } from "rebound-data/rebound-data";

export default function tests(){
  QUnit.skip("Has", function() {

    QUnit.test("Set tracks keys and has returns appropreately", function(assert) {
      var obj = {
        _value: {},
        [Entries.get](key){ return this._value[key]; },
        [Entries.set](key, val){ this._value[key] = val; return true; },
        [Entries.delete](key){ return delete this._value[key]; }
      };

      var entries = new Entries(obj);
      entries.set('foo', 'bar');
      assert.deepEqual(entries.has('foo'), true, 'Setting value tracks key on entries object');

      entries.set('biz', 'baz');
      assert.deepEqual(entries.has('biz'), true, 'Setting value tracks multiple key on entries object');

      entries.set('foo', 'baz');
      assert.deepEqual(entries.has('foo'), true, 'Re-setting still returns true.');

      entries.delete('biz');
      assert.deepEqual(entries.has('biz'), false, 'Deleting value does removes key from list.');

      entries.set('foo', 'baz');
      assert.deepEqual(entries.has('foo'), true, 'After delete, re-setting value does not add a second key to the list.');

    });


    QUnit.test("If set fails, keys list is rolled back and has returns appropreately", function(assert) {
      var obj = {
        _value: {},
        [Entries.get](key){ return this._value[key]; },
        [Entries.set](key, val){
          assert.equal(entries.has('foo'), true, 'Is present in soon-to-fail set');
          this._value[key] = val;
          return false;
        },
        [Entries.delete](key){ return delete this._value[key]; }
      };

      var entries = new Entries(obj);
      try { entries.set('foo', 'bar'); } catch(err){}
      assert.equal(entries.has('foo'), false, 'Not added');

    });

  });
};