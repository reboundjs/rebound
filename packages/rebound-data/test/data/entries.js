import { Data } from "rebound-data/rebound-data";

export default function tests(){
  QUnit.skip("Entries", function() {

    QUnit.test("Data returns a usable iterator", function(assert) {
      var obj = {
        _value: {},
        [Data.get](key){ return this._value[key]; },
        [Data.set](key, val){ this._value[key] = val; return true; },
        [Data.delete](key){ return delete this._value[key]; }
      };

      var entries = new Data(obj);
      entries.set('foo', 'bar');
      entries.set('biz', 'baz');
      entries.set('wee', 'woo');

      var entry, count = 0, iter = entries.entries();
      while((entry = iter.next()) && !entry.done){
        assert.equal(entry.value, entries.get(entry.key), 'Value matches iterater entry');
        count++;
      }

      assert.equal(count, 3, 'Iterates over everything before done.');

    });

    QUnit.test("Multiple iterators are independant", function(assert) {
      var obj = {
        _value: {},
        [Data.get](key){ return this._value[key]; },
        [Data.set](key, val){ this._value[key] = val; return true; },
        [Data.delete](key){ return delete this._value[key]; }
      };

      var entries = new Data(obj);
      entries.set('foo', 'bar');
      entries.set('biz', 'baz');
      entries.set('wee', 'woo');

      var entry, count = 0, iter1 = entries.entries(), iter2 = entries.entries();
      while((entry = iter1.next()) && !entry.done){
        assert.equal(entry.value, entries.get(entry.key), 'Value matches iterater entry');
        count++;
      }

      while((entry = iter2.next()) && !entry.done){
        assert.equal(entry.value, entries.get(entry.key), 'Value matches iterater entry');
        count++;
      }

      assert.equal(count, 6, 'Iterates over everything before done, including entries added while iterating.');

    });

    QUnit.test("Mutations during iteration", function(assert) {
      var obj = {
        _value: {},
        [Data.get](key){ return this._value[key]; },
        [Data.set](key, val){ this._value[key] = val; return true; },
        [Data.delete](key){ return delete this._value[key]; }
      };

      var entries = new Data(obj);
      entries.set('foo', 'bar');
      entries.set('biz', 'baz');
      entries.set('wee', 'woo');

      var entry, count = 0, iter = entries.entries();
      while((entry = iter.next()) && !entry.done){
        assert.equal(entry.value, entries.get(entry.key), 'Value matches iterater entry');
        entries.set('wee', count);
        if (count === 0) entries.set('test', 'test');
        if (entries.key === 'wee') assert.equal(entry.value, 2, 'Changes to value during iteration are reflected');
        count++;
      }

      assert.equal(count, 4, 'Iterates over everything before done, including entries added while iterating.');

    });

  });
}