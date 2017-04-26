import { Data } from "rebound-data/rebound-data";

export default function tests(){
  QUnit.module("Delete", function() {

    QUnit.test("Proxy Delete Default Data", function(assert) {
      assert.expect(3);
      var data = new Data();

      assert.equal(data.valueOf(), void 0, 'Starts undefined.');
      data.set(1);
      assert.equal(data.valueOf(), 1, 'Set.');
      data.delete();
      assert.equal(data.valueOf(), void 0, 'After delete, value is undefined.');

    });

    QUnit.test("Proxy Delete Custom Data", function(assert) {
      assert.expect(4);

      class Test extends Data {
        [Data.get](){ return super.cache; }
        [Data.set](val){ super.cache = val; return true; }
        [Data.delete](){
          assert.ok(1, 'Delete proxies to custom implementation.');
          super.cache = void 0;
          return true;
        }
      }

      var data = new Test();

      assert.equal(data.valueOf(), void 0, 'Starts undefined.');
      data.set(1);
      assert.equal(data.valueOf(), 1, 'Set.');
      data.delete();
      assert.equal(data.valueOf(), void 0, 'After delete, value is undefined.');

    });

    QUnit.test("Store Delete Custom Data", function(assert) {
      assert.expect(5);

      class Test extends Data(Object) {
        [Data.get](key){ return super.cache[key]; }
        [Data.set](key, val){ super.cache[key] = val; return true; }
        [Data.delete](key){
          assert.ok(1, 'Delete proxies to custom implementation.');
          assert.equal(key, 'foo', 'Delete receives key to delete.');
          return delete super.cache[key];
        }
      }

      var data = new Test();

      assert.equal(data.get('foo'), void 0, 'Starts undefined.');
      data.set('foo', 'bar');
      assert.equal(data.get('foo'), 'bar', 'Set.');
      data.delete('foo');
      assert.equal(data.get('foo'), void 0, 'After delete, value is undefined.');

    });


    QUnit.test("Delete handles remove loops in Proxy", function(assert) {
      assert.expect(3);

      class Test extends Data {
        [Data.get](){ return super.cache; }
        [Data.set](val){ super.cache = val; return true; }
        [Data.delete](){
          this.delete(); // Would infinite loop if recursive deletes are not handled
          super.cache = void 0;
          return true;
        }
      }

      var data = new Test();

      assert.equal(data.valueOf(), void 0, 'Starts undefined.');
      data.set(1);
      assert.equal(data.valueOf(), 1, 'Set.');
      data.delete();
      assert.equal(data.valueOf(), void 0, 'After delete, value is undefined.');

    });

    QUnit.test("Delete handles remove loops in Store", function(assert) {
      assert.expect(3);

      class Test extends Data(Object) {
        [Data.get](key){ return super.cache[key]; }
        [Data.set](key, val){ super.cache[key] = val; return true; }
        [Data.delete](key){
          this.delete('foo'); // Would infinite loop if recursive deletes are not handled
          return delete super.cache[key];
        }
      }

      var data = new Test();

      assert.equal(data.get('foo'), void 0, 'Starts undefined.');
      data.set('foo', 'bar');
      assert.equal(data.get('foo'), 'bar', 'Set.');
      data.delete('foo');
      assert.equal(data.get('foo'), void 0, 'After delete, value is undefined.');

    });


    QUnit.test("Datum removed from internal caches on delete", function(assert) {
      assert.expect(13);

      class Test extends Data(Object){
        constructor(){ super(); }
        [Data.get](key){ return super.cache[key]; }
        [Data.set](key, val){ super.cache[key] = val; return true; }
        [Data.delete](key){ return delete super.cache[key]; }
        get CACHE(){ return this[Object.getOwnPropertySymbols(this).filter((sym) => { return !!~sym.toString().indexOf("<data>"); })[0]]; }
      }

      var data = new Test();

      assert.equal(data.get('foo'), void 0, 'Starts undefined.');
      data.set('foo', 'bar');
      var child = data.get('foo', {raw: true});
      assert.equal(data.get('foo'), 'bar', 'Set.');

      assert.deepEqual(data.CACHE.byId[child.cid], {key: 'foo', value: child}, 'Child added to cache object byId.');
      assert.equal(data.CACHE.children[0], child, 'Child added to cache object children.');
      assert.equal(data.CACHE.keysHash['foo'], child, 'Child is in keys hash at key.');
      assert.equal(data.CACHE.keysList[0], 'foo', 'Key is in keys list.');
      assert.equal(child.parent, data, 'Object added as child parent');

      data.delete('foo');
      assert.equal(data.get('foo'), void 0, 'After delete, value is undefined.');
      assert.equal(data.CACHE.byId[child.cid], void 0, 'Child removed from cache object byId.');
      assert.equal(data.CACHE.children[0], void 0, 'Child removed from cache object children.');
      assert.equal(data.CACHE.keysHash['foo'], void 0, 'Child is not in keys hash at key.');
      assert.equal(data.CACHE.keysList[0], void 0, 'Key is removed from keys list.');
      assert.equal(child.parent, void 0, 'Object removed as child parent');

    });

    QUnit.test("Datum not removed from internal caches on failed delete", function(assert) {
      assert.expect(12);

      class Test extends Data(Object){
        constructor(){ super(); }
        [Data.get](key){ return super.cache[key]; }
        [Data.set](key, val){ super.cache[key] = val; return true; }
        [Data.delete](){ return false; }
        get CACHE(){ return this[Object.getOwnPropertySymbols(this).filter((sym) => { return !!~sym.toString().indexOf("<data>"); })[0]]; }
      }

      var data = new Test();

      assert.equal(data.get('foo'), void 0, 'Starts undefined.');
      data.set('foo', 'bar');
      var child = data.get('foo', {raw: true});
      assert.equal(data.get('foo'), 'bar', 'Set.');

      assert.deepEqual(data.CACHE.byId[child.cid], {key: 'foo', value: child}, 'Child added to cache object byId.');
      assert.equal(data.CACHE.children[0], child, 'Child added to cache object children.');
      assert.equal(data.CACHE.keysHash['foo'], child, 'Child is in keys hash at key.');
      assert.equal(data.CACHE.keysList[0], 'foo', 'Key is in keys list.');
      assert.equal(child.parent, data, 'Object added as child parent');

      data.delete('foo');
      assert.deepEqual(data.CACHE.byId[child.cid], {key: 'foo', value: child}, 'Child still in cache object byId.');
      assert.equal(data.CACHE.children[0], child, 'Child still in cache object children.');
      assert.equal(data.CACHE.keysHash['foo'], child, 'Child still in keys hash at key.');
      assert.equal(data.CACHE.keysList[0], 'foo', 'Key still in keys list.');
      assert.equal(child.parent, data, 'Object still child parent');

    });

    QUnit.test("Internal cache in good state when set called during delete", function(assert) {
      assert.expect(13);

      class Test extends Data(Object){
        constructor(){ super(); }
        [Data.get](key){ return super.cache[key]; }
        [Data.set](key, val){ super.cache[key] = val; return true; }
        [Data.delete](key){ this.set(key, 'baz'); return true; }
        get CACHE(){ return this[Object.getOwnPropertySymbols(this).filter((sym) => { return !!~sym.toString().indexOf("<data>"); })[0]]; }
      }

      var data = new Test();

      assert.equal(data.get('foo'), void 0, 'Starts undefined.');
      data.set('foo', 'bar');
      var child = data.get('foo', {raw: true});
      assert.equal(data.get('foo'), 'bar', 'Set.');

      assert.deepEqual(data.CACHE.byId[child.cid], {key: 'foo', value: child}, 'Child added to cache object byId.');
      assert.equal(data.CACHE.children[0], child, 'Child added to cache object children.');
      assert.equal(data.CACHE.keysHash['foo'], child, 'Child is in keys hash at key.');
      assert.equal(data.CACHE.keysList[0], 'foo', 'Key is in keys list.');
      assert.equal(child.parent, data, 'Object added as child parent');

      data.delete('foo');
      assert.equal(data.get('foo'), 'baz', 'Set to new value.');
      assert.deepEqual(data.CACHE.byId[child.cid], {key: 'foo', value: child}, 'Child still in cache object byId.');
      assert.equal(data.CACHE.children[0], child, 'Child still in cache object children.');
      assert.equal(data.CACHE.keysHash['foo'], child, 'Child still in keys hash at key.');
      assert.equal(data.CACHE.keysList[0], 'foo', 'Key still in keys list.');
      assert.equal(child.parent, data, 'Object still child parent');

    });



  });
}