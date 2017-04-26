import { Data, Model, Collection } from "rebound-data/rebound-data";

class Test extends Data{
  constructor(){ super(); this._value = {}; }
  [Data.get](key){ return this._value[key]; }
  [Data.set](key, val){ this._value[key] = val; return true; }
  [Data.delete](key){ return delete this._value[key]; }
}

export default function tests(){
  QUnit.module("Key", function(){

    QUnit.test("Initial State is Empty String", function(assert){
      assert.expect(1);
      var obj = new Test();
      assert.equal(obj.key, "", "Accessing `key` on a parentless object returns an empty string.");
    });

    QUnit.test("Proxies to User Defined `location` Method", function(assert){
      assert.expect(1);
      var child = new Test();
      var parent = new Test();

      parent.set('foo', child);
      assert.equal(child.key, parent.location(child), "Accessing `key` on a child object returns the value from parent's `location` method.");
    });

    QUnit.test("Caches Previous Values Until Parent Changed", function(assert){
      assert.expect(3);
      var child = new Test();
      var parent = new Test();
      parent.set('foo', child);
      assert.equal(child.key, "foo", "Accessing `key` on a child object returns the value from parent's `location` method.");
      assert.equal(child.key, "foo", "The `key` accessor is cached and will always return the same value until `parent` is changed.");
      parent.set('bar', child);
      assert.equal(child.key, "bar", "When `parent` is changed the key cache is busted and will re-compute.");
    });

    QUnit.test("Casts as String", function(assert){
      assert.expect(1);
      var child = new Test();
      var parent = new Test();
      parent.set(12345, child);
      assert.equal(child.key, "12345", "`key` will return the String cast version of what is returned from `location`");
    });

    QUnit.test("Key and Models", function(assert){
      assert.expect(7);

      // Models
        var model = new Model({
          obj: {
            key: 'val',
            obj2: {
              key: 'val2'
            }
          }
        });

        assert.equal(model.get('obj').key, "obj", "Key for model created on instantiation is correct.");
        assert.equal(model.get('obj.obj2').key, "obj2", "Key for deep model created on instantiation is correct.");

        model = new Model({});
        model.set('obj', {key: 'val'});
        assert.equal(model.get('obj').key, "obj", "Key for model promoted on shallow set is correct.");

        model.set('obj.obj2.obj3', {key: 'val3'});
        assert.equal(model.get('obj.obj2.obj3').key, "obj3", "Key for model promoted on deep set is correct.");

        model = new Model({});
        model.set('obj', new Model({key: 'val3'}));
        assert.equal(model.get('obj').key, "obj", "Key for existing model on shallow set is correct.");

        model.set('obj.obj2.obj3', new Model({key: 'val3'}));
        assert.equal(model.get('obj.obj2.obj3').key, "obj3", "Key for existing model on deep set is correct.");

        model.set('moved', model.get('obj'));
        assert.equal(model.get('moved').key, "moved", "Key for existing model moved to new location is correct.");

    });

    QUnit.test("Key and Collections", function(assert){
      assert.expect(7);

      var collection = new Collection([{val: 1}, {val: 2}, {val: 3}]);

      assert.equal(collection.at(0).key, 0, "Key for model in collection created on instantiation is correct.");
      assert.equal(collection.at(2).key, 2, "Key for model in collection created on instantiation is correct for indicies > 0.");

      collection = new Collection();
      collection.add({val: 1});
      collection.add({val: 2});
      collection.add({val: 3});
      assert.equal(collection.at(0).key, 0, "Key for model in collection promoted on add is correct.");
      assert.equal(collection.at(2).key, 2, "Key for model in collection promoted on add is correct for indicies > 0.");

      collection = new Collection();

      var a = new Model({val: 1});
      collection.add(a);
      collection.add(new Model({val: 2}));
      collection.add(new Model({val: 3}));
      assert.equal(collection.at(0).key, 0, "Key for existing model added to collection is correct.");
      assert.equal(collection.at(2).key, 2, "Key for existing model added to collection is correct for indicies > 0.");

      var model = collection.at(2);
      collection.add(model, {at: 0});
      assert.equal(model.key, 2, "Key for model moved within collection is correct.");
    });


    QUnit.test("Key cache Invalidation", function(assert){
      assert.expect(5);

      class Test extends Data(Array) {
        [Data.get](key){ return super.cache[key]; }
        [Data.set](key, val){
          super.cache.unshift(val);
          for (let i=1;i<super.cache.length;i++) this.touch(i, super.cache[i]);
          return true;
        }
        [Data.delete](key){ return delete super.cache[key]; }
      }

      var test = new Test();
      var a = new Data('a');
      var b = new Data('b');
      var c = new Data('c');

      test.set(0, a);
      test.set(0, b);

      assert.equal(a.key, '1');
      assert.equal(b.key, '0');

      test.set(0, c);

      assert.equal(a.key, '2');
      assert.equal(b.key, '1');
      assert.equal(c.key, '0');

    });


  });
}
