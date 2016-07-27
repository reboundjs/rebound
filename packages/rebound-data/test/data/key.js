import { Data, Model, Collection } from "rebound-data/rebound-data";

export default function tests(){
  QUnit.module("Key", function(){

    QUnit.test("Initial State is Empty String", function(assert){
      assert.expect(1);
      var obj = new Data();
      assert.equal(obj.key, "", "Accessing `key` on a parentless object returns an empty string.");
    });

    QUnit.test("Proxies to User Defined `location` Method", function(assert){
      assert.expect(2);
      var child = new Data();
      var parent = new Data();
      parent.location = function(obj){
        assert.equal(obj.cid, child.cid, "Accessing `key` on a child object calls `location` on its parent and passes the child object.");
        return "foo";
      }
      child.parent = parent;
      assert.equal(child.key, "foo", "Accessing `key` on a child object returns the value from parent's `location` method.");
    });

    QUnit.test("Caches Previous Values Until Parent Changed", function(assert){
      assert.expect(3);
      var child = new Data();
      var parent = new Data();
      parent.location = function(obj){ return "foo"; }
      child.parent = parent;
      assert.equal(child.key, "foo", "Accessing `key` on a child object returns the value from parent's `location` method.");
      parent.location = function(obj){ return "bar"; }
      assert.equal(child.key, "foo", "The `key` accessor is cached and will always return the same value until `parent` is changed.");
      child.parent = null;
      child.parent = parent;
      assert.equal(child.key, "bar", "When `parent` is changed the key cache is busted and will re-compute.");
    });

    QUnit.test("Casts as String", function(assert){
      assert.expect(1);
      var child = new Data();
      var parent = new Data();
      child.parent = parent;
      parent.location = function(obj){ return 12345; }
      assert.ok(child.key === "12345", "`key` will return the String cast version of what is returned from `location`");
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
      debugger;
      var a = new Model({val: 1});
      collection.add(a);
      collection.add(new Model({val: 2}));
      collection.add(new Model({val: 3}));
      assert.equal(collection.at(0).key, 0, "Key for existing model added to collection is correct.");
      assert.equal(collection.at(2).key, 2, "Key for existing model added to collection is correct for indicies > 0.");
debugger;
      var model = collection.at(2);
      collection.add(model, {at: 0});
      assert.equal(model.key, 2, "Key for model moved within collection is correct.");
    });

  });
};
