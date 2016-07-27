import { Model, Collection } from "rebound-data/rebound-data";

export default function tests(){
  QUnit.module("Defaults", function(){

    var Shallow = Model.extend( {
      defaults: {
        foo: 'bar',
        bool: true,
        int: 1
      }
    });

    var Deep = Model.extend({
      defaults: {
        obj: {
          foo: 'bar',
          bool: true,
          int: 1
        }
      }
    });

    QUnit.test('Reserved native methods are set as attributes, not overridden on Model', function(assert) {
      var Defaulted = Backbone.Model.extend({
        defaults: {hasOwnProperty: true}
      });
      var model = new Defaulted();
      assert.equal(model.get('hasOwnProperty'), true);
      model = new Defaulted({hasOwnProperty: undefined});
      assert.equal(model.get('hasOwnProperty'), true);
      model = new Defaulted({hasOwnProperty: false});
      assert.equal(model.get('hasOwnProperty'), false);
    });

    QUnit.test("Shallow Defaults", function(assert) {
      assert.expect(3)

      var model = new Shallow();
      assert.deepEqual(model.toJSON(), model.defaults, "Model extended with defaults are set correctly on instantiation");
      var model = new Shallow({foo: undefined});
      assert.deepEqual(model.toJSON(), model.defaults, "When undefined is passed as a defaulted property's initial value, it is set to default still");
      var model = new Shallow({foo: 'baz'});
      assert.deepEqual(model.toJSON(), {
        foo: 'baz',
        bool: true,
        int: 1
      }, "When a non-undefined value is passed as a defaulted property's initial state, it is set.");

    });

    QUnit.test("Shallow Defaults and Set", function(assert) {
      assert.expect(2);

      var model = new Shallow();

      model.set('foo', 'baz');
      assert.deepEqual(model.toJSON(), {
        foo: 'baz',
        bool: true,
        int: 1
      }, "Model extended with defaults are overwritten on set");


      model.set('foo', undefined);
      assert.deepEqual(model.toJSON(), model.defaults, "When set to undefined, it is set back to default");

    });

    QUnit.test("Shallow Defaults and Unset", function(assert){
      assert.expect(1);

      var model = new Shallow();
      model.unset('foo');
      assert.deepEqual(model.toJSON(), {
        bool: true,
        int: 1
      }, "Model extended with defaults are unset, not reset to default, on unset");
    });

    QUnit.test("Deep Defaults Initialize", function(assert){
      assert.expect(7);

      var model = new Deep();
      assert.deepEqual(model.toJSON(), model.defaults, "Model extended with deep defaults are set on initialization.");
      assert.ok(model.attributes.obj.isModel, "Objects provided in defaults hash are promoted to models.");

      model = new Deep({obj: {foo: undefined}});
      assert.deepEqual(model.toJSON(), {
        obj: {
          foo: 'bar',
          bool: true,
          int: 1
        }
      }, "Model extended with deep defaults are merged with deep initial values and undefined is set to default");

      model = new Deep({obj: {foo: 'baz'}});
      assert.deepEqual(model.toJSON(), {
        obj: {
          foo: 'baz',
          bool: true,
          int: 1
        }
      }, "Model extended with deep defaults are merged with initial provided values");

      model = new Deep({obj: true});
      assert.deepEqual(model.toJSON(), {
        obj: true
      }, "Models with default values that that are objects are overridden by a provided initial value");

      model = new Deep({obj: [{id: 1}]});
      assert.ok(model.attributes.obj.isCollection);
      assert.deepEqual(model.toJSON(), {
        obj: [{id: 1}]
      }, "Models with default values that that are objects are overridden by a provided incompatable data object");

    });


    QUnit.test("Deep Defaults and Set", function(assert){
      assert.expect(2);

      var model = new Deep();

      model.set('obj.foo', 'baz');
      assert.deepEqual(model.toJSON(), {
        obj: {
          foo: 'baz',
          bool: true,
          int: 1
        }
      }, "Model extended with deep defaults are overwritten on set");

      model.set('obj.foo', undefined);
      assert.deepEqual(model.toJSON(), {
        obj: {
          foo: 'bar',
          bool: true,
          int: 1
        }
      }, "Model extended with deep defaults is returnd to default when set to undefined");

    });


    QUnit.test("Deep Defaults and Unset", function(assert){
      assert.expect(1);

      var model = new Deep();

      model.unset('obj.foo');
      assert.deepEqual(model.toJSON(), {
        obj: {
          bool: true,
          int: 1
        }
      }, "Model extended with deep defaults are removed on unset");

    });

    QUnit.test("Models with defaults inside of collections", function(assert) {

      var collection = Collection.extend({
        model: Model.extend({
          defaults: {
            test: true
          }
        })
      });
      var model = new Model({
        arr: (new collection([{id: 1}, {id: 2}]))
      });
      assert.deepEqual(model.toJSON(), {
        "arr": [
          {id: 1, test: true},
          {id: 2, test: true}
        ]
      }, "Defaults set in a Collection's Model are set correctly");
    });

    // QUnit.test("Models with computed property defaults", function(assert) {
    //
    //
    //   model = new NewModel();
    //
    //   assert.equal(model.get("prop"), model.get("val"), "Extended Rebound models with a computed property in its defaults hash are parsed succesfully.");
    //
    //   var ContainerModel = Model.extend({
    //     defaults: {
    //       obj: new NewModel()
    //     }
    //   });
    //
    //   model = new ContainerModel({
    //     biz: "baz",
    //     obj2: new NewModel({foo: "bar"})
    //   });
    //   model2 = new ContainerModel({});
    //
    //   assert.equal(model.get("obj.val"), "foo", "Rebound Models with other extended Models in their defaults hash preserve the default class properties.");
    //   assert.equal(model.get("obj.prop"), "foo", "Rebound Models with other extended Models in their defaults hash preserve the default class computed properties.");
    //
    //   assert.equal(model.get("obj2.val"), "foo", "Rebound Models taking other extended Models in their instance hash preserve the default class properties.");
    //   assert.equal(model.get("obj2.prop"), "foo", "Rebound Models taking other extended Models in their instance hash preserve the default class computed properties.");
    //
    //   model.set("obj3", new NewModel({foo: "bar"}));
    //
    //   assert.equal(model.get("obj3.val"), "foo", "Rebound Models taking other extended Models in their set method preserve the default class properties.");
    //   assert.equal(model.get("obj3.prop"), "foo", "Rebound Models taking other extended Models in their set method preserve the default class computed properties.");
    // });
  })
}

