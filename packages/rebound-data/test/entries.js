import { Data } from "rebound-data/rebound-data";

import entries_value from "rebound-data/test/entries/value";
import entries_key_value from "rebound-data/test/entries/key-value";

export default function (){


  QUnit.module("Entries", function(){

    entries_value();
    entries_key_value();

    QUnit.test('entries delivers static properties on constructor for private subclass implementation methods', function(assert) {
      assert.equal(Data.get.constructor.name, 'Symbol', 'Get symbol is delivered.');
      assert.equal(Data.set.constructor.name, 'Symbol', 'Set symbol is delivered.');
      assert.equal(Data.delete.constructor.name, 'Symbol', 'Delete symbol is delivered.');
    });

    QUnit.test('constructor throws if not extended', function(assert) {
      assert.throws(function(){
        new Data();
      }, /Data type Data does not implement the required data persistance methods/, 'Throws.');
    });

    QUnit.test('constructor throws if no data persistance methods passed', function(assert) {
      class Test extends Data {}
      assert.throws(function(){
        new Test({});
      }, /does not implement the required data persistance methods/, 'Throws.');
    });

    QUnit.test('constructor throws if subset of persistance methods are present', function(assert) {
      class TestGet extends Data {
        [Data.get](key){ return key; }
      }
      class TestSet extends Data {
        [Data.set](key){ return key; }
      }
      class TestDelete extends Data {
        [Data.delete](key){ return key; }
      }
      assert.throws(function(){
        new TestGet();
      }, /Data type TestGet does not implement the required data persistance methods/, 'Throws for get.');
      assert.throws(function(){
        new TestSet();
      }, /Data type TestSet does not implement the required data persistance methods/, 'Throws for set.');
      assert.throws(function(){
        new TestDelete();
      }, /Data type TestDelete does not implement the required data persistance methods/, 'Throws for delete.');

    });


    QUnit.test('constructor passes if all key value methods are present', function(assert) {
      class Test extends Data {
        [Data.get](){}
        [Data.set](){}
        [Data.delete](){}
      }
      var obj = new Test();
      assert.ok(obj instanceof Data, "Object successfully created.");
    });

    QUnit.test('hidden value cache is placed on all instances', function(assert) {
      class Test extends Data {
        [Data.get](){}
        [Data.set](){}
        [Data.delete](){}
      }
      var obj = new Test();
      assert.ok(obj[Data._cache], "Cache object is present.");
    });


  });
}
