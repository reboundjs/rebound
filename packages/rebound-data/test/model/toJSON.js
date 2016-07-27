import { Model } from "rebound-data/rebound-data";

export default function tests(){
  QUnit.module("ToJSON", function(){

    QUnit.test("Shallow toJSON", function(assert) {
      assert.expect(2);

    // Shallow toJSON
      var model = new Model({
        int: 1,
        bool: true,
        str: "string"
      });
      assert.deepEqual(model.toJSON(), {int: 1, bool: true, str: "string"}, "Model's toJSON method works with shallow assorted values.");
      assert.ok(model.toJSON() !== model.attributes, "Model's toJSON response is not the same object as its attributes hash.'");
    });

    QUnit.test("Deep toJSON", function(assert) {
      assert.expect(2);

    // Deep toJSON – With Collection
      var model = new Model({
        test: {
          test2: [
            {
              int: 1,
              bool: true,
              str: "string"
            }
          ]
        }
      });

      assert.deepEqual(model.toJSON(), {"test": {"test2": [{int: 1, bool: true, str: "string"}]}}, "Model's toJSON method is recursive.");
      assert.ok(model.toJSON() !== model.attributes, "Model's toJSON response is not the same object as its attributes hash.'");
    });

    QUnit.test("Recursive toJSON", function(assert) {
      assert.expect(1);

      var model = new Model({
        test: {
          test2: [
            {
              int: 1,
              bool: true,
              str: "string"
            }
          ]
        }
      });

      assert.throws(function(){
        model.set("test.test2.[0].obj", model);
      }, "Attempting to set a recursive dependancy in a Model throws an error.");

    });
  });
}

