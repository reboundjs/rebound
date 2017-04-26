import { Data } from "rebound-data/rebound-data";

export default function tests(){
  QUnit.module("Value Proxy", function() {

    QUnit.test("Value proxies call through to private persistance implementaiton", function(assert) {

      class Test extends Data {

        constructor(val){
          super(val);
          this._value = val;
        }

        // Value Proxy Methods
        [Data.get](){ return this._value; }
        [Data.set](val){ this._value = val; return true; }
        [Data.delete](){ return delete this._value; }

      }

      Test.config('Value', Test);

      var obj = new Test('success');

      assert.equal(obj.get(), 'success', "Get proxies the private get implementation.");
      obj.set('extreme-success');
      console.log(obj, obj[Data._cache]);
      debugger;
      assert.equal(obj.get(), 'extreme-success', "Set proxies to the private set implementation.");
      obj.delete();
      assert.equal(obj.get(), void 0, "Delete proxies to the private delete implementation");

    });

  });
}