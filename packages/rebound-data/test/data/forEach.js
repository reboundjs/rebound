import { Data } from "rebound-data/data";

export default function tests(){
  QUnit.skip("ForEach", function() {

    QUnit.test("ForEach iterates over passed function", function(assert) {
      var obj = {
        _value: {},
        [Entries.get](key){ return this._value[key]; },
        [Entries.set](key, val){ this._value[key] = val; return true; },
        [Entries.delete](key){ return delete this._value[key]; }
      };

      var entries = new Entries(obj);
      entries.set('foo', 'bar');
      entries.set('biz', 'baz');
      entries.set('wee', 'woo');


      var count = 0;
      entries.forEach(function(key, value){
        assert.equal(this, obj, 'Called in scope of the data object');
        assert.equal(value, entries.get(key), 'Value matches iterater entry');
        count++;
      });

      assert.equal(count, 3, 'Iterates over everything before done.');

    });

    QUnit.test("ForEach iterates over passed function", function(assert) {
      var obj = {
        _value: {},
        [Entries.get](key){ return this._value[key]; },
        [Entries.set](key, val){ this._value[key] = val; return true; },
        [Entries.delete](key){ return delete this._value[key]; }
      };

      var scope = {foo: 'bar'};

      var entries = new Entries(obj);
      entries.set('foo', 'bar');
      entries.set('biz', 'baz');
      entries.set('wee', 'woo');


      var count = 0;
      entries.forEach(function(key, value){
        assert.equal(this, scope, 'Called in scope of the passed scope object');
        assert.equal(value, entries.get(key), 'Value matches iterater entry');
        count++;
      }, scope);

      assert.equal(count, 3, 'Iterates over everything before done.');

    });

    QUnit.test("Mutations during iteration", function(assert) {
      var obj = {
        _value: {},
        [Entries.get](key){ return this._value[key]; },
        [Entries.set](key, val){ this._value[key] = val; return true; },
        [Entries.delete](key){ return delete this._value[key]; }
      };

      var entries = new Entries(obj);
      entries.set('foo', 'bar');
      entries.set('biz', 'baz');
      entries.set('wee', 'woo');

      var count = 0;
      entries.forEach(function(key, value){
        assert.equal(value, entries.get(key), 'Value matches iterater entry');
        entries.set('wee', count);
        if (count === 0) entries.set('test', 'test');
        if (entries.key === 'wee') assert.equal(value, 2, 'Changes to value during iteration are reflected');
        count++;
      });

      assert.equal(count, 4, 'Iterates over everything before done, including entries added while iterating.');

    });

  });
};