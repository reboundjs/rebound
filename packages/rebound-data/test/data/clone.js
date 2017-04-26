import { Data } from "rebound-data/rebound-data";

export default function tests(){

  QUnit.module("Clone", function(){

    class Collection extends Data(Array) {
      [Data.get](key){ return super.cache[key]; }
      [Data.set](key, val){ super.cache[key] = val; return true; }
      [Data.delete](key){ return delete super.cache[key]; }
    }

    class Model extends Data(Object) {
      [Data.get](key){ return super.cache[key]; }
      [Data.set](key, val){ super.cache[key] = val; return true; }
      [Data.delete](key){ return delete super.cache[key]; }
    }

    QUnit.test("Value Clone", function(assert) {
      assert.expect(3);

      var obj = new Data();
      obj.set(1);

      var clone = obj.clone();

      assert.ok(obj !== clone, "Clone returns a unique object");
      assert.equal(obj.get(), clone.get(), "Cloned object has the same value");
      assert.equal(obj.cid, clone.cid, "Cloned objects have the same cid");

    });

    QUnit.test("Store Deep Clone", function(assert) {
      assert.expect(9);

      var obj = new Model();
      var m0 = new Model();
      var m1 = new Model();
      var c0 = new Collection();
      obj.set('col', c0);
      c0.set('0', m0);
      c0.set('1', m1);
      m0.set('str', 'str');
      m0.set('int', 1);
      m0.set('bool', true);
      m1.set('foo', 'bar');
      m1.set('biz', 'baz');

      var clone = obj.clone();

      assert.ok(obj !== clone, "Clone returns a unique object");

      assert.equal(clone.get('col[0].str'), obj.get('col[0].str'), "Shallow cloned objects has the same values set");
      assert.equal(clone.get('col[0].int'), obj.get('col[0].int'), "Shallow cloned objects has the same values set");
      assert.equal(clone.get('col[0].bool'), obj.get('col[0].bool'), "Shallow cloned objects has the same values set");
      assert.equal(clone.get('col[1].foo'), obj.get('col[1].foo'), "Shallow cloned objects has the same values set");

      assert.ok(clone.get('col', {raw: true}) !== obj.get('col', {raw: true}), "Shallow cloned objects' direct children are not the same object");
      assert.ok(clone.get('col[0].str', {raw: true}) !== obj.get('col[0].str', {raw: true}), "Shallow cloned objects' deep children are not the same object");

      assert.equal(clone.get('col', {raw: true}).cid, obj.get('col', {raw: true}).cid, "Shallow cloned objects' direct children have the same cids");
      assert.equal(clone.get('col[0].str', {raw: true}).cid, obj.get('col[0].str', {raw: true}).cid, "Shallow cloned objects' deep children have the same cids");

    });


  });

}
