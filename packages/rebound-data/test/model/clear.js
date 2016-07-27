import { Model, Collection } from 'rebound-data/rebound-data';

export default function clear(){
  QUnit.module("Clear", function(){

    QUnit.test('Shallow Clear', function(assert) {
      assert.expect(3)
      var model = new Model({
        undef: undefined,
        str: 'foo',
        bool: false,
        int: 0
      });
      model.count = 0;
      model.on('change:@all update', function(name){
        this.count++
      });
      model.clear();

      assert.deepEqual(model.toJSON(), {}, 'Clears all primitive values in a model.');
      assert.deepEqual(model.count, 4, 'A change event is triggered for each value cleared');
      assert.deepEqual(model.changed(), {
        str: undefined,
        bool: undefined,
        int: undefined
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
      model.count = 0;
      model.on('all', function(name){
        console.log(name);
        this.count++
      });

      model.clear();

      assert.deepEqual(model.toJSON(), {}, 'Clears all primitive and complex values in a model.');
      assert.deepEqual(model.count, 6, 'A change event is triggered for each value cleared');
      assert.deepEqual(model.changed(), {
        str: undefined,
        bool: undefined,
        int: undefined,
        obj: undefined,
        arr: undefined
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
