import { Data } from "rebound-data/data";

// Set override testing utility
class TestModel extends Data {

  constructor(){
    super();
    this._values = {};
  }
  [Data.get](key){
    return this._values[key];
  }
  [Data.set](key, val){
    this._values[key] = val;
    return true;
  }
  [Data.delete](key){
    return delete this._values[key];
  }

}

TestModel.config('Object', TestModel);

export default function tests(){

  QUnit.module("Ensure", function(){


    QUnit.test("Data.Ensure handles invalid input gracefully", function(assert) {
      assert.expect(3);

      var obj = new TestModel();
      assert.equal(obj.ensure(), obj, "Undefined returns same object");
      assert.equal(obj.ensure(false), obj, "Non-string returns same object");
      assert.equal(obj.ensure(''), obj, "Empty string returns same object");

    });

    QUnit.test("Data.Ensure handles shallow paths", function(assert) {
      assert.expect(2);

      var obj = new TestModel(),
          res = obj.ensure('foo');

      assert.equal(res.cid, obj.get('foo').cid, "Single path creates Object at that location");

      res = obj.ensure('123');
      assert.equal(res.cid, obj.get('[123]').cid, "Single invalid path creates Object at that location");

    });

    QUnit.test("Data.Ensure handles deep paths", function(assert) {
      assert.expect(4);

      var obj = new TestModel(),
          res = obj.ensure('bar.baz[123].biz');

      assert.ok(Data.isData(obj.get('bar')), "Multi path creates Object at level 1");
      assert.ok(Data.isData(obj.get('bar.baz')), "Multi path creates Object at level 2");
      assert.ok(Data.isData(obj.get('bar.baz[123]')), "Multi path creates Object at level 3, with escaped path");
      assert.equal(res.cid, obj.get('bar.baz[123].biz').cid, "Multi path creates Object at level 4");

    });

  });

}
