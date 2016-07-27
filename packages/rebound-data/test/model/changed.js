import { Model, Collection } from "rebound-data/rebound-data";

QUnit.assert.shallowEqual = function( value, expected, message ) {
    var key, res = true;
    for(key in value){
      res = (res && value[key] === expected[key]) || false;
    }
    for(key in expected){
      res = (res && value[key] === expected[key]) || false;
    }
    this.push( res, value, expected, message );
};


export default function tests(){
  QUnit.module("Changed", function(){

    QUnit.test("[Rebound Data] Model – Changed", function(assert) {
      var model, collection, model2, model3;

      // Construction
      model = new Model({
        str: 'foo',
        int: 0,
        bool: false
      });
      assert.shallowEqual(model.changed(), {str: 'foo', int: 0, bool: false}, "Model.changed returns correct information after construction" );

      // Single change
      model.set('str', 'bar');
      assert.shallowEqual(model.changed(), {str: 'bar'}, "Model.changed returns correct information after single attribute set" );

      // Multi change
      model.set({'int': 1, bool: true});
      assert.shallowEqual(model.changed(), {int: 1, bool: true}, "Model.changed returns correct information after multi attribute set" );

      model.unset('str');
      assert.shallowEqual(model.changed(), {str: undefined}, "Model.changed returns correct information after single attribute unset" );

      // Deep Objects
      model = new Model({
        str: 'foo',
        int: 0,
        bool: false,
        obj: {
          str: 'foo',
          obj: {
            str: 'foo'
          }
        }
      });

      assert.shallowEqual(model.changed(), {
        str: 'foo',
        int: 0,
        bool: false,
        obj: model.get('obj'),
        'obj.str': 'foo',
        'obj.obj': model.get('obj.obj'),
        'obj.obj.str': 'foo'
      }, "Model.changed returns correct information after construction for deeply nested object values, models only" );

      // Deep Object Single Change
      model.set('obj.obj.str', 'bar');
      assert.shallowEqual(model.changed(), {
        'obj': model.get('obj'),
        'obj.obj': model.get('obj.obj'),
        'obj.obj.str': 'bar'
      }, "Model.changed returns correct information after single change for deeply nested object values, models only" );

      // Deep Object Multi Change
      model.set({
        'obj.obj.str': 'baz',
        'obj.str': 'bar',
        'int': 1
      });
      assert.shallowEqual(model.changed(), {
        'obj.obj.str': 'baz',
        'obj.obj': model.get('obj.obj'),
        'obj.str': 'bar',
        'obj': model.get('obj'),
        'int': 1
      }, "Model.changed returns correct information after multi change for deeply nested object values, models only" );

debugger;
      // Deep Objects and Collections
      model = new Model({
        str: 'foo',
        int: 0,
        bool: false,
        arr: [
          { str: 'foo' },
          { arr: [{ obj: { str: 'foo' } }] }
        ]
      });
      debugger;
      assert.shallowEqual(model.changed(), {
        str: 'foo',
        int: 0,
        bool: false,
        arr: model.get('arr'),
        'arr[0]': model.get('arr[0]'),
        'arr[0].str': 'foo',
        'arr[1]': model.get('arr[1]'),
        'arr[1].arr': model.get('arr[1].arr'),
        'arr[1].arr[0]': model.get('arr[1].arr[0]'),
        'arr[1].arr[0].obj': model.get('arr[1].arr[0].obj'),
        'arr[1].arr[0].obj.str': 'foo'
      }, "Model.changed returns correct information after construction for deeply nested object values – including collections" );

      model.set('arr[1].arr[0].obj.str', 'bar');

      assert.shallowEqual(model.changed(), {
        'arr': model.get('arr'),
        'arr[1]': model.get('arr[1]'),
        'arr[1].arr': model.get('arr[1].arr'),
        'arr[1].arr[0]': model.get('arr[1].arr[0]'),
        'arr[1].arr[0].obj': model.get('arr[1].arr[0].obj'),
        'arr[1].arr[0].obj.str': 'bar'
      }, "Model.changed returns correct information after single set for deeply nested object values – including collections" );


    });

  });
}