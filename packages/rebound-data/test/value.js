import { Value } from "rebound-data/rebound-data";

export default function (){

  QUnit.module("Value", function(){

    QUnit.test("IsValue", function(assert) {
      assert.expect(2);

      var data = new Value();

      assert.ok(data.isValue, "A model has a truthy `isValue` property.");
      assert.throws(function(){
        data.isValue = false;
      }, "Attempting to set a datum's `isValue` property throws.");

    });

    QUnit.test("Put and Value", function(assert) {
      assert.expect(3);

      var data = new Value();

      assert.equal(data.value(), void 0, "Initial value is undefined.");
      data.put(1);
      assert.equal(data.value(), 1, "Value can be set to Number");
      data.put('foo', 2);
      assert.equal(data.value(), 2, "Value.put takes second argument if two are passed");

    });

    QUnit.test("Put Objects", function(assert) {
      assert.expect(3);

      var data = new Value();
      var regexp = /^regexp$/;
      var obj = {};

      data.put(new String('foo'));
      assert.equal(data.value(), 'foo', "Value takes string objects.");
      data.put(regexp);
      assert.equal(data.value(), regexp, "Value can be set to Regexp");
      data.put(obj);
      assert.ok(data.value() === obj, "Value can be set to generic object and is same object referance");

    });

    QUnit.test("Initial Values", function(assert) {
      assert.expect(1);

      var data = new Value('foo');
      assert.equal(data.value(), 'foo', "Value can take initial value.");

    });

    QUnit.test("Change Events", function(assert) {
      assert.expect(4);

      var data = new Value(1, {hydrate: false});
      var events = [];
      data.on('all', (type)=>{
        events.push(type);
      });
      assert.equal(data.value(), void 0, "Hydrate false prevents data initialization.");

      data.hydrate();
      assert.equal(data.value(), 1, "Hydrate false prevents data initialization.");
      assert.deepEqual(events, ['dirty', 'change', 'clean'], "Initial hydration events are triggered correctly.");

      data.off();
      data.on('change', (value)=>{
        assert.equal(value, 2, "Change event is passed new value.");
      });
      data.put(2);

    });

    QUnit.test("ToJSON", function(assert) {
      assert.expect(2);

      var data = new Value(1);
      assert.equal(data.toJSON(), 1, "ToJSON returns value.");

      data.put(2);
      assert.equal(data.toJSON(), 2, "ToJSON returns latest value.");

    });

  }); // End: Value Module

};