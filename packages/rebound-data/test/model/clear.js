import { Model, Collection } from 'rebound-data/rebound-data';

export default function clear(){
  QUnit.module("Clear", function(){

    QUnit.test('Shallow Clear', function(assert) {
      assert.expect(4)
      var model = new Model({
        undef: undefined,
        str: 'foo',
        bool: false,
        int: 0
      });
      model.count = 0;
      var events = [];
      model.on('all', function(name){
        events.push(name);
      });
      model.on('change:@all', function(name){
        this.count++
      });
      model.clear();

      assert.deepEqual(model.toJSON(), {}, 'Clears all primitive values in a model.');
      assert.deepEqual(model.count, 4, 'A change event is triggered for each value cleared');
      assert.deepEqual(events, [
        "dirty",
        "change:undef",
        "change:str",
        "change:bool",
        "change:int",
        "update",
        "clean"
      ], 'Correct events triggered');
      assert.deepEqual(model.changed(), {
        str: undefined,
        bool: undefined,
        int: undefined,
        undef: undefined
      }, 'Clearing all primitive values in a model sets proper changed values.');

    });

    QUnit.test('Deep Clear', function(assert) {
      assert.expect(3)
      var model = new Model({
        undef: undefined,
        str: 'foo',
        bool: false,
        int: 0,
        obj: {
          foo: 'bar',
          obj: {
            biz: 'baz'
          }
        },
        arr: [{id: 1}]
      });
      var events = []
      model.on('all', function(name){
        events.push(name);
      });

      model.clear();

      assert.deepEqual(model.toJSON(), {}, 'Clears all primitive and complex values in a model.');
      assert.deepEqual(events, [
        'dirty',
        'change:str',
        'change:bool',
        'change:int',
        'change:obj',
        'change:arr',
        'update',
        'clean'
      ], 'A change event is triggered for each value cleared, update is called at end.');
      assert.deepEqual(model.changed(), {
        str: undefined,
        bool: undefined,
        int: undefined,
        obj: undefined,
        'obj.foo': undefined,
        'obj.obj': undefined,
        'obj.obj.biz': undefined,
        arr: undefined,
        'arr[0]': undefined,
        'arr[0].id': undefined
      }, 'Clearing all primitive values in a model sets proper changed values.');

    });

    QUnit.test('Shallow Clear with defaults', function(assert) {
      assert.expect(2)
      var model = new Model({
        undef: undefined,
        str: 'foo',
        bool: false,
        int: 0
      }, {
        defaults: {
          str: 'bar'
        }
      });

      model.clear();

      assert.deepEqual(model.toJSON(), {}, 'Clears all primitive values in a model.');
      assert.deepEqual(model.changed(), {
        str: undefined,
        bool: undefined,
        int: undefined
      }, 'Clearing all primitive values in a model sets proper changed values.')

    });


  });
}
