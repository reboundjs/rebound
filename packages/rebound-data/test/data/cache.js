import { Data } from "rebound-data/rebound-data";

export default function tests(){

  QUnit.module("Cache", function(){

    QUnit.module("Value", function(){

      class Test extends Data {
        [Data.get](){ return super.cache; }
        [Data.set](val){ return super.cache = val; }
        [Data.delete](){ return super.cache = void 0; }
        cache(){ return super.cache; }
      }

      QUnit.test("Cache is undefined by default", function(assert) {
        assert.expect(1);

        var obj = new Test();
        assert.equal(obj.cache(), undefined, 'cache is undefined for basic Data instance');

      });

      QUnit.test("Cache is modified on set", function(assert) {
        assert.expect(3);
        var obj = new Test();

        assert.equal(obj.cache(), undefined, 'cache is undefined for basic Data instance');

        obj.set(true);
        assert.equal(obj.cache(), true, 'cache is set for basic Data instance');

        obj.set('str');
        assert.equal(obj.cache(), 'str', 'cache is set for basic Data instance');

      });


      QUnit.test("Cache is cleared on delete", function(assert) {
        assert.expect(2);
        var obj = new Test();

        obj.set('str');
        assert.equal(obj.cache(), 'str', 'cache is set for basic Data instance');

        obj.delete();
        assert.equal(obj.cache(), undefined, 'cache is deleted for basic Data instance');

      });

    });


    QUnit.module("Store", function(){

      class Collection extends Data(Array) {
        [Data.get](key){ return super.cache[key]; }
        [Data.set](key, val){ super.cache[key] = val; return true; }
        [Data.delete](key){ return delete super.cache[key]; }
        cache(){ return super.cache; }
      }

      class Model extends Data(Object) {
        [Data.get](key){ return super.cache[key]; }
        [Data.set](key, val){ super.cache[key] = val; return true; }
        [Data.delete](key){ return delete super.cache[key]; }
        cache(){ return super.cache; }
      }

      class SetData extends Data(Set) {
        [Data.get](key){ return super.cache[key]; }
        [Data.set](key, val){ super.cache[key] = val; return true; }
        [Data.delete](key){ return delete super.cache[key]; }
        cache(){ return super.cache; }
      }

      class MapData extends Data(Map) {
        [Data.get](key){ return super.cache[key]; }
        [Data.set](key, val){ super.cache[key] = val; return true; }
        [Data.delete](key){ return delete super.cache[key]; }
        cache(){ return super.cache; }
      }

      QUnit.test("Model Cache Initializer", function(assert) {
        assert.expect(3);

        var m1 = new Model();
        var m2 = new Model();

        assert.equal(m1.cache().constructor, Object, 'Caches are of correct type for Object');
        assert.equal(m2.cache().constructor, Object, 'Caches are of correct type for Object');
        assert.ok(m1.cache() !== m2.cache(), 'Caches are unique between instances');

      });


      QUnit.test("Collection Cache Initializer", function(assert) {
        assert.expect(3);

        var c1 = new Collection();
        var c2 = new Collection();

        assert.equal(c1.cache().constructor, Array, 'Caches are of correct type for Array');
        assert.equal(c2.cache().constructor, Array, 'Caches are of correct type for Array');
        assert.ok(c1.cache() !== c2.cache(), 'Caches are unique between instances');

      });


      QUnit.test("Map Cache Initializer", function(assert) {
        assert.expect(3);

        var c1 = new MapData();
        var c2 = new MapData();

        assert.equal(c1.cache().constructor, Map, 'Caches are of correct type for Map');
        assert.equal(c2.cache().constructor, Map, 'Caches are of correct type for Map');
        assert.ok(c1.cache() !== c2.cache(), 'Caches are unique between instances');

      });

      QUnit.test("Set Cache Initializer", function(assert) {
        assert.expect(3);

        var c1 = new SetData();
        var c2 = new SetData();

        assert.equal(c1.cache().constructor, Set, 'Caches are of correct type for Set');
        assert.equal(c2.cache().constructor, Set, 'Caches are of correct type for Set');
        assert.ok(c1.cache() !== c2.cache(), 'Caches are unique between instances');

      });

      QUnit.test("Generic iterator constructors are extensible", function(assert) {
        assert.expect(3);

        function Foo(){}
        Foo.prototype[Symbol.iterator] = function(){};

        class Test extends Data(Foo) {
          [Data.get](key){ return super.cache[key]; }
          [Data.set](key, val){ super.cache[key] = val; return true; }
          [Data.delete](key){ return delete super.cache[key]; }
          cache(){ return super.cache; }
        }

        var c1 = new Test();
        var c2 = new Test();

        assert.equal(c1.cache().constructor, Foo, 'Caches are of correct type for generic iterable');
        assert.equal(c2.cache().constructor, Foo, 'Caches are of correct type for generic iterable');
        assert.ok(c1.cache() !== c2.cache(), 'Caches are unique between instances');

      });


      QUnit.test("Setting cache directly in value store throws.", function(assert) {
        assert.expect(1);

        class Test extends Data(Object) {
          [Data.get](key){ return super.cache[key]; }
          [Data.set](key, val){ super.cache = val; return true; }
          [Data.delete](key){ return delete super.cache[key]; }
          cache(){ return super.cache; }
        }

        var c1 = new Test();

        assert.throws(function(){
          c1.set('test', 1);
        }, "Setting cache directly in 1:many data object throws.");

      });

      QUnit.test("String Cache Initializer Fails", function(assert) {
        assert.expect(1);

        assert.throws(function(){
          class Test extends Data(String) {} // eslint-disable-line no-unused-vars
        }, /Can not use constructor String as a default cache constructor/, "Setting cache to String constructor fails even though its iterable.");

      });

      QUnit.test("Primitive and other non-iterable Cache Initializers Fail", function(assert) {
        assert.expect(3);

        assert.throws(function(){
          class Test extends Data(Number) {} // eslint-disable-line no-unused-vars
        }, /Can not use constructor Number as a default cache constructor/, "Setting cache to Number constructor fails.");

        assert.throws(function(){
          class Test extends Data(Boolean) {} // eslint-disable-line no-unused-vars
        }, /Can not use constructor Boolean as a default cache constructor/, "Setting cache to Boolean constructor fails.");

        assert.throws(function(){
          class Test extends Data(Date) {} // eslint-disable-line no-unused-vars
        }, /Can not use constructor Date as a default cache constructor/, "Setting cache to Date constructor fails.");

      });

    }); // End Store Tests

  });

}
