import { Model, Collection } from "rebound-data/rebound-data";


export default function tests(){

  QUnit.module("Remove", function(){
    QUnit.test("remove", function(assert) {
      //
      // var collection = new Collection([
      //   {id: 1, str: 'foo'},
      //   {id: 2, bool: true},
      //   {id: 3, int: 1},
      //   {id: 4 }
      // ]);

      var model = new Model({
        arr: [
          {id: 1, str: 'foo'},
          {id: 2, bool: true},
          {id: 3, int: 1},
          {id: 4 }
        ]
      })

      model.get('arr').remove(model.get('arr').at(1));
      assert.deepEqual(Object.keys(model.changed()), ['arr[1]', 'arr'], "Remove propagates changed values up to parent");

    });
  });

}