import { Data, Model } from "rebound-data/rebound-data";

class Test extends Data{
  constructor(){ super(); this._values = {}; }
  [Data.get](key){ return this._values[key]; }
  [Data.set](key, val){ this._values[key] = val; return true; }
  [Data.delete](key){ return delete this._values[key]; }
}

export default function tests(){
    QUnit.module("Path", function(){

      QUnit.test("Default Value", function(assert) {
        assert.expect(1);
        var obj = new Test();
        assert.equal(obj.path, "", "Default value is empty string.");
      });

      QUnit.test("Shallow path", function(assert) {
        assert.expect(1);
        var child = new Test();
        var parent = new Test();
        parent.set('foo', child);
        assert.equal(child.path, "foo", "Path returns proper value for shallow trees");
      });

      QUnit.test("Deep path constructed properly", function(assert) {
        assert.expect(1);
        var child = new Test();
        var parent = new Test();
        var grandparent = new Test();

        parent.set('foo', child);
        grandparent.set('bar', parent);

        assert.equal(child.path, "bar.foo", "Path returns proper values for deep trees.");
      });


      QUnit.test("Path properly escapes path segments", function(assert) {
        assert.expect(2);
        var child = new Test();
        var parent = new Test();
        var grandparent = new Test();
        var greatgrandparent = new Test();

        parent.set('foo', child);
        grandparent.set(1, parent);

        assert.equal(child.path, "[1].foo", "Path returns proper values for deep trees.");

        greatgrandparent.set('bar', grandparent);

        assert.equal(child.path, "bar[1].foo", "Path returns proper values for deep trees when ancester's parent is set.");

      });

      // TODO: Move to Model tests
      QUnit.test("Models and Path", function(assert) {
        assert.expect(7);

        var model;

        // Construction
        model = new Model({
          obj1: {
            obj2: {
              str: 'foo',
              int: 1,
              arr1: [
                { val: 1 },
                { val: 2 }
              ]
            }
          },
          obj3: {
            arr2: [
              { arr3: [
                  { val: 1 },
                  { val: 2 },
                  { val: 3 }
                ]
              },
              { arr4: [
                  { val: 1 },
                  { val: 2 },
                  { val: 3 }
                ]
              }
            ]
          }
        });

        // With Model as Root
        assert.equal(model.get('obj1').path, "obj1", "First level Model paths are resolved correctly from initial construction.");
        assert.equal(model.get('obj1.obj2').path, "obj1.obj2", "Second level Model paths are resolved correctly from initial construction.");
        assert.equal(model.get('obj1.obj2.arr1[0]').path, "obj1.obj2.arr1[0]", "Third level Model paths are resolved correctly through an Collection from initial construction.");
        assert.equal(model.get('obj1.obj2.arr1[1]').path, "obj1.obj2.arr1[1]", "Third level Model paths are resolved correctly through an Collection with correct Collection index from initial construction.");


        // Adding a top level Model
          model = new Model();
          model.set('addedModel', {
            foo: 1,
            obj1: {
              foo: 1
            }
          });
          assert.equal(model.get('addedModel').path, "addedModel", "First level Model paths are resolved correctly when added after construction.");
          assert.equal(model.get('addedModel.obj1').path, "addedModel.obj1", "Nested level Model paths are resolved correctly when added after construction.");

        // Adding a deep Model
        model = new Model();
        model.set('addedModel', {});
        model.get('addedModel').set('obj1', {foo: 1});
        assert.equal(model.get('addedModel.obj1').path, "addedModel.obj1", "Nested level Model paths are resolved correctly when added after construction.");

      });

    // TODO: Move to Collection tests
    QUnit.test("Collections and Path", function(assert) {
      assert.expect(10);
      var model;

      // Construction
      model = new Model({
        obj1: {
          obj2: {
            str: 'foo',
            int: 1,
            arr1: [
              { val: 1 },
              { val: 2 }
            ]
          }
        },
        obj3: {
          arr2: [
            { arr3: [
                { val: 1 },
                { val: 2 },
                { val: 3 }
              ]
            },
            { arr4: [
                { val: 1 },
                { val: 2 },
                { val: 3 }
              ]
            }
          ]
        }
      });

    // With Collection as Root
      assert.equal(model.get('obj3').path, "obj3", "First level Collection paths are resolved correctly from initial construction.");
      assert.equal(model.get('obj3.arr2').path, "obj3.arr2", "Models's paths inside Collections are resolved correctly from initial construction.");
      assert.equal(model.get('obj3.arr2[0].arr3[1]').path, "obj3.arr2[0].arr3[1]", "Model paths are resolved correctly through multiple Collections from initial construction.");
      assert.equal(model.get('obj3.arr2[1].arr4[2]').path, "obj3.arr2[1].arr4[2]", "Model paths are resolved correctly through multiple Collections with correct Collection indicies from initial construction.");

    // Adding a top level Collection with Models
      model = new Model();
      model.set('addedCollection', [{
          obj1: {
            foo: 1
          }
        },
        {
          obj2: {
            bar: 1
          }
        }
      ]);
      assert.equal(model.get('addedCollection').path, "addedCollection", "First level Collection paths are resolved correctly when added after construction.");
      assert.equal(model.get('addedCollection[0]').path, "addedCollection[0]", "Models inside of a Collection's paths are resolved correctly when added after construction.");
      assert.equal(model.get('addedCollection[0].obj1').path, "addedCollection[0].obj1", "Nested Model paths inside of a Collection are resolved correctly when added after construction.");
      assert.equal(model.get('addedCollection[1].obj2').path, "addedCollection[1].obj2", "Nested Model paths inside of a Collection, not at a zero index, are resolved correctly when added after construction.");

    // Adding Models to Collection
      model = new Model();
      model.set('addedCollection', []);
      model.get('addedCollection').push({obj1: { foo: 1}});
      assert.equal(model.get('addedCollection[0]').path, "addedCollection[0]", "Model paths inside a collection are resolved correctly when added to an existing collection after construction.");
      assert.equal(model.get('addedCollection[0].obj1').path, "addedCollection[0].obj1", "Nested Models' paths inside a collection are resolved correctly when added to an existing collection after construction.");


    });

  });
}
