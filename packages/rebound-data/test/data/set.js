import { Data } from "rebound-data/data";

// Set override testing utility
class Model extends Data(Object) {
  get CACHE(){ return this[Object.getOwnPropertySymbols(this).filter((sym) => { return !!~sym.toString().indexOf("<data>"); })[0]]; }
  constructor(data){
    super();
    data && this.set(data);
  }
  [Data.get](key){ return super.cache[key]; }
  [Data.set](key, val){
    super.cache[key] = val;
    return true;
  }
  [Data.delete](key){ return delete super.cache[key]; }
  toJSON(){
    var obj = {};
    this.forEach((key, value) => { obj[key] = Data.isData(value) ? value.toJSON() : value; });
    return obj;
  }
}
class Collection extends Data(Array) {
  constructor(data){
    super();
    data && this.set(data);
  }
  [Data.get](key){ return super.cache[key]; }
  [Data.set](key, val){
    super.cache[key] = val;
    return true;
  }
  [Data.delete](key){ return delete super.cache[key]; }
  toJSON(){
    var arr = [];
    this.forEach((key, value) => { arr[key] = Data.isData(value) ? value.toJSON() : value; });
    return arr;
  }
}
class ProxyTest extends Data(Object) {

  constructor(assert){
    super();
    this.assert = assert;
    this.isProxyTest = true;
  }
  [Data.get](key){ return super.cache[key]; }
  [Data.set](key, val){
    super.cache[key] = val;
    this.assert.equal(key, this.extKey, "Key value is passed to internal set.");
    this.assert.equal(val.isData, true, "Value passed to set is upgraded to a data object.");
    this.assert.deepEqual(val.toJSON(), this.extVal, "Key value is passed to internal set.");
    this.assert.equal(this.isProxyTest, true, "Set is called in scope of the object instance.");
    return true;
  }
  [Data.delete](key){ return delete super.cache[key]; }
  get _values(){ return super.cache; }
}

ProxyTest.config('Object', Model);
ProxyTest.config('Array', Collection);
Model.config('Object', Model);
Model.config('Array', Collection);
Collection.config('Object', Model);
Collection.config('Array', Collection);

export default function tests(){

  QUnit.module("Set", function(){


    QUnit.test("Without Override, Set operates as a value store", function(assert) {
      assert.expect(10);

      var obj = new Data(),
          val = 'foo';

      assert.equal(obj.isData, true, "Value passed to set is upgraded to a data object.");
      assert.equal(obj.valueOf(), void 0, "Initial value of new vanilla data object is undefined");

      var res = obj.set(val);

      assert.equal(obj.valueOf(), val, "String values are stored.");
      assert.equal(res, obj, "Set returns the object instance for chaining.");

      val = 1;
      obj.set(val);
      assert.equal(obj.valueOf(), val, "Number values are stored.");


      val = true;
      obj.set(val);
      assert.equal(obj.valueOf(), val, "Boolean values are stored.");

      val = void 0;
      obj.set(val);
      assert.equal(obj.valueOf(), val, "Undefined values are stored.");

      val = null;
      obj.set(val);
      assert.equal(obj.valueOf(), val, "Null values are stored.");

      val = {};
      obj.set(val);
      assert.equal(obj.valueOf(), val, "Object values are stored.");

      val = [];
      obj.set(val);
      assert.equal(obj.valueOf(), val, "Array values are stored.");

    });

    QUnit.test("Set proxies to internal implementation – String", function(assert) {
      assert.expect(8);

      var obj = new ProxyTest(assert);
      obj.extKey = 'key1';
      obj.extVal = 'val1';
      obj.set(obj.extKey, obj.extVal);

      obj.extKey = 'key2';
      obj.extVal = 'val2';
      obj.set(obj.extKey, obj.extVal);

    });

    QUnit.test("Set proxies to internal implementation – Number", function(assert) {
      assert.expect(8);

      var obj = new ProxyTest(assert);
      obj.extKey = 'key1';
      obj.extVal = 1;
      obj.set(obj.extKey, obj.extVal);

      obj.extKey = 'key2';
      obj.extVal = 2;
      obj.set(obj.extKey, obj.extVal);

    });

    QUnit.test("Set proxies to internal implementation – Boolean", function(assert) {
      assert.expect(8);

      var obj = new ProxyTest(assert);
      obj.extKey = 'key1';
      obj.extVal = true;
      obj.set(obj.extKey, obj.extVal);

      obj.extKey = 'key2';
      obj.extVal = false;
      obj.set(obj.extKey, obj.extVal);

    });

    QUnit.test("Set proxies to internal implementation – Undefined and Null", function(assert) {
      assert.expect(8);

      var obj = new ProxyTest(assert);
      obj.extKey = 'key1';
      obj.extVal = undefined;
      obj.set(obj.extKey, obj.extVal);

      obj.extKey = 'key2';
      obj.extVal = null;
      obj.set(obj.extKey, obj.extVal);

    });

    QUnit.test("Set proxies to internal implementation – Symbol", function(assert) {
      assert.expect(8);

      var obj = new ProxyTest(assert);
      obj.extKey = 'key1';
      obj.extVal = Symbol('first');
      obj.set(obj.extKey, obj.extVal);

      obj.extKey = 'key2';
      obj.extVal = Symbol('second');
      obj.set(obj.extKey, obj.extVal);

    });

    QUnit.test("Set proxies to internal implementation – Object and Array", function(assert) {
      assert.expect(8);

      var obj = new ProxyTest(assert);
      obj.extKey = 'key1';
      obj.extVal = {foo: 'bar'};
      obj.set(obj.extKey, obj.extVal);

      obj.extKey = 'key2';
      obj.extVal = [1,2,3];
      obj.set(obj.extKey, obj.extVal);

    });

    QUnit.test("Set automatically creates non existant middle layers using default Object data type", function(assert) {
      assert.expect(3);

      // Set override testing utility
      class Test extends Data {

        constructor(){
          super();
          this._values = {};
        }
        [Data.get](key){ return this._values[key]; }
        [Data.set](key, val){
          this._values[key] = val;
          return true;
        }
        [Data.delete](key){ return delete this._values[key]; }
      }

      Test.config('Object', Test);

      var obj = new Test();
      obj.set('foo.bar.baz', 1);
      assert.ok(obj._values.foo instanceof Test , "Object at level 1 created");
      assert.ok(obj._values.foo._values.bar instanceof Test , "Object at level n created");
      assert.ok(obj._values.foo._values.bar._values.baz instanceof Data , "Value promoted at deep layer");

    });


    QUnit.test("Set automatically overrides invalid middle layers using default Object data type", function(assert) {
      assert.expect(3);

      // Set override testing utility
      class Test extends Data {

        constructor(){
          super();
          this._values = {};
        }
        [Data.get](key){ return this._values[key]; }
        [Data.set](key, val){
          this._values[key] = val;
          return true;
        }
        [Data.delete](key){ return delete this._values[key]; }
      }

      Test.config('Object', Test);

      var obj = new Test();
      obj.set('foo', 1);
      assert.ok(obj._values.foo instanceof Data , "Is Data instance");
      obj.set('foo.bar', 1);
      assert.ok(obj._values.foo instanceof Test , "Data instance replaced with Object");
      assert.ok(obj._values.foo._values.bar instanceof Data , "Value promoted at deep layer");

    });

    QUnit.test("Set automatically uses existing data objects for Values if data is compatible", function(assert) {
      assert.expect(3);

      // Set override testing utility
      class Test extends Data(Object) {
        [Data.get](key){ return super.cache[key]; }
        [Data.set](key, val){
          super.cache[key] = val;
          return true;
        }
        [Data.delete](key){ return delete super.cache[key]; }
      }
      Test.config('Object', Test);

      var obj = new Test();
      obj.set('foo', 'bar');
      var val = obj.get('foo', {raw: true});
      assert.ok(val instanceof Data , "Is Data instance");
      obj.set('foo', 'baz');
      assert.equal(val, obj.get('foo', {raw: true}), "When setting values data will re-use existing objects instead of making new instances.");

      obj.set('foo', {biz: 'baz'});

      assert.notEqual(val, obj.get('foo', {raw: true}), "When setting values data will create new object instances if target cannot accept incoming data type.");

    });

    QUnit.test("Set uses and merges with existing data objects for KeyValue Stores if input data is compatible", function(assert) {
      assert.expect(6);

      var obj = new Model();
      obj.set('obj', {foo: 'bar'});
      var val = obj.get('obj', {raw: true});
      assert.ok(val instanceof Model , "Is Data instance");

      obj.set('obj', {biz: 'baz'});
      assert.equal(val, obj.get('obj', {raw: true}), "When setting values data will re-use existing objects instead of making new instances.");
      assert.deepEqual(val.toJSON(), {foo: 'bar', biz: 'baz'}, "When setting values data will re-use existing objects instead of making new instances and merge the data.");

      obj.set('obj', ['foo', 'bar']);
      assert.notEqual(val, obj.get('obj', {raw: true}), "When setting values data will create new object instances if target cannot accept incoming data type.");

      val = obj.get('obj', {raw: true});
      obj.set('obj', ['biz']);
      assert.equal(val, obj.get('obj', {raw: true}), "When setting values data will re-use existing objects instead of making new instances.");
      assert.deepEqual(val.toJSON(), ['biz', 'bar'], "When setting values data will re-use existing objects instead of making new instances and merge the data.");

    });


    QUnit.test("Set properly updates the internal cache", function(assert) {
      assert.expect(18);

      Model.config('Object', Model);
      Model.config('Array', Collection);
      Collection.config('Object', Model);
      Collection.config('Array', Collection);

      var data = new Model();
      data.set('child', {foo: 'bar'});
      var child = data.get('child', {raw: true});

      // Initial value set
      assert.deepEqual(data.CACHE.byId[child.cid], {key: 'child', value: child}, 'Child added to cache object byId.');
      assert.equal(data.CACHE.children[0], child, 'Child added to cache object children.');
      assert.equal(data.CACHE.keysHash['child'], child, 'Child is in keys hash at key.');
      assert.equal(data.CACHE.keysList[0], 'child', 'Key is in keys list.');
      assert.equal(child.parent, data, 'Object added as child parent');

      // After value merge
      data.set('child', {biz: 'baz'});
      assert.deepEqual(data.CACHE.byId[child.cid], {key: 'child', value: child}, 'Child added to cache object byId.');
      assert.equal(data.CACHE.children[0], child, 'Child added to cache object children.');
      assert.equal(data.CACHE.keysHash['child'], child, 'Child is in keys hash at key.');
      assert.equal(data.CACHE.keysList[0], 'child', 'Key is in keys list.');
      assert.equal(child.parent, data, 'Object added as child parent');

      data.set('child', ['foo', 'bar']);
      child = data.get('child', {raw: true});

      // After value change
      assert.deepEqual(data.CACHE.byId[child.cid], {key: 'child', value: child}, 'Child added to cache object byId.');
      assert.deepEqual(Object.keys(data.CACHE.byId).length, 1, 'Previous child removed from byId cache.');
      assert.equal(data.CACHE.children[0], child, 'Child added to cache object children.');
      assert.equal(data.CACHE.children.length, 1, 'Only one child because previous was removed.');
      assert.equal(data.CACHE.keysHash['child'], child, 'Child is in keys hash at key.');
      assert.equal(data.CACHE.keysList[0], 'child', 'Key is in keys list.');
      assert.equal(data.CACHE.keysList.length, 1, 'Key is not duplicated in keys list.');
      assert.equal(child.parent, data, 'Object added as child parent');

    });

  });

}
