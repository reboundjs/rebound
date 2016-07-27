import { Model, Collection } from "rebound-data/rebound-data";

export default function tests(){

  QUnit.module("Get", function(){
    QUnit.test("Model.get works 1 level deep", function(assert) {
      assert.expect(1);
      var model = new Model({
        test: "foo"
      });
      assert.equal(model.get("test"), "foo", "Model.get works 1 level deep");
    });

    QUnit.test("Model.get works n levels deep", function(assert) {
      assert.expect(1);
      var model = new Model({
        test: {
          test2: {
            test3: "foo"
          }
        }
      });
      assert.equal(model.get("test.test2.test3"), "foo", "Model.get works n levels deep");
    });

    QUnit.test("Model.get works n levels deep through collections", function(assert) {
      assert.expect(1);
      var model = new Model({
        test: {
          test2: [
            { test3: "foo" }
          ]
        }
      });
      assert.equal(model.get("test.test2[0].test3"), "foo", "Model.get works n levels deep - Collections included");
    });

  });

}

  // TODO: Re-add computed property model get tests
  //
  // var NewModel = Model.extend({
  //   defaults: {
  //     val: "foo",
  //     get prop(){
  //       return this.get("val");
  //     }
  //   }
  // });
  //
  // model = new NewModel();
  //
  // assert.equal(model.get("prop"), model.get("val"), "Extended Rebound models with a computed property in its defaults hash are parsed succesfully.");
  //
  // var ContainerModel = Model.extend({
  //   defaults: {
  //     obj: new NewModel()
  //   }
  // });
  //
  // model = new ContainerModel({
  //   biz: "baz",
  //   obj2: new NewModel({foo: "bar"})
  // });
  // model2 = new ContainerModel({});
  //
  // assert.equal(model.get("obj.val"), "foo", "Rebound Models with other extended Models in their defaults hash preserve the default class properties.");
  // assert.equal(model.get("obj.prop"), "foo", "Rebound Models with other extended Models in their defaults hash preserve the default class computed properties.");
  //
  // assert.equal(model.get("obj2.val"), "foo", "Rebound Models taking other extended Models in their instance hash preserve the default class properties.");
  // assert.equal(model.get("obj2.prop"), "foo", "Rebound Models taking other extended Models in their instance hash preserve the default class computed properties.");
  //
  // model.set("obj3", new NewModel({foo: "bar"}));
  //
  // assert.equal(model.get("obj3.val"), "foo", "Rebound Models taking other extended Models in their set method preserve the default class properties.");
  // assert.equal(model.get("obj3.prop"), "foo", "Rebound Models taking other extended Models in their set method preserve the default class computed properties.");
