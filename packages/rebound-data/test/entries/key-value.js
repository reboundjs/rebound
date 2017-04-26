import { Entries } from "rebound-data/entries";

export default function tests(){
  QUnit.module("Key Value", function() {

    QUnit.test("Value property implements no-op key value methods", function(assert) {
      var obj = {
        _value: 'success',

        // Value Proxy Methods
        [Entries.get](){ return this._value; },
        [Entries.set](val){ return this._value = val; }

      };

      var entries = new Entries(obj);

      assert.equal(entries.get('foobar'), void 0, "Calling `.get` on proxy entries object returns undefined.");
      assert.equal(entries.set('foo', 'bar'), 'bar', "Calling `.set` on proxy entries object returns the value set.");
      assert.equal(entries.delete('foo'), true, "Calling `.delete` on proxy entries object returns true.");
      assert.equal(obj._value, 'success', "No side effect have been had.");

    });


    QUnit.test("Basic value storage in key-value data store", function(assert) {
      var obj = {
        _value: {},
        [Entries.get](key){ return this._value[key]; },
        [Entries.set](key, val){ this._value[key] = val; return true; },
        [Entries.delete](key){ return delete this._value[key]; }
      };

      var entries = new Entries(obj);

      assert.equal(entries.get('foo'), void 0, "Get on non-stored value returns undefined.");
      assert.equal(entries.set('foo', 'bar'), 'bar', "Set always returns the value set.");
      assert.deepEqual(obj._value, {'foo':'bar'}, "Set proxies to custom implementation.");
      assert.equal(entries.get('foo'), 'bar', "Get on stored value returns value by proxying to cutom implemention.");
      assert.equal(entries.delete('foo'), true, "Delete may be called and it proxies return value from custom implementation.");
      assert.equal(entries.get('foo'), void 0, "Get on non-stored value returns undefined.");
      assert.deepEqual(obj._value, {}, "Delete proxies to custom implementation.");

    });


    QUnit.test("Set returning something other than true", function(assert) {
      var obj = {
        _value: {},
        [Entries.get](key){ return this._value[key]; },
        [Entries.set](key, val){ this._value[key] = val; return false; },
        [Entries.delete](key){ return delete this._value[key]; }
      };

      assert.throws(function(){
        var entries = new Entries(obj);
        entries.set('foo', 'bar');
      }, /Cannot set value 'bar' at key 'foo'/, 'When return is false, throws.');


      var obj = {
        _value: {},
        [Entries.get](key){ return this._value[key]; },
        [Entries.set](key, val){ this._value[key] = val; return 'bla'; },
        [Entries.delete](key){ return delete this._value[key]; }
      };

      assert.throws(function(){
        var entries = new Entries(obj);
        entries.set('foo', 'bar');
      }, /Cannot set value 'bar' at key 'foo'/, 'When return is non-boolean, throws.');


    });

  });
};