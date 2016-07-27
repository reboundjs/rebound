import { Model, Collection } from 'rebound-data/rebound-data';

export default function tests(){

  QUnit.module("Toggle", function(){

    QUnit.test('Toggle works on shallow boolean values', function(assert) {
      var model = new Model({bool: false});
      model.toggle('bool');
      assert.deepEqual( model.toJSON(), {bool: true}, 'Model.toggle works with falsy boolean values at top level' );
      model.toggle('bool');
      assert.deepEqual( model.toJSON(), {bool: false}, 'Model.toggle works with truthy boolean values at top level' );
    });

    QUnit.test('Toggle works on deep boolean values', function(assert) {
      var model = new Model({obj: {bool: false}});
      model.toggle('obj.bool');
      assert.deepEqual(model.toJSON(), {obj: {bool:true}}, 'Model.toggle works with falsy nested boolean values in a Model');
      model.toggle('obj.bool');
      assert.deepEqual(model.toJSON(), {obj: {bool:false}}, 'Model.toggle works with truthy nested boolean values in a Model');
    });

    QUnit.test('Toggle works on deep boolean values across collections', function(assert) {
      var model = new Model({arr: [{bool: false}]});
      model.toggle('arr[0].bool');
      assert.deepEqual(model.toJSON(), {arr: [{bool:true}]}, 'Model.toggle works with falsy nested boolean values in a Collection');
      model.toggle('arr[0].bool');
      assert.deepEqual(model.toJSON(), {arr: [{bool:false}]}, 'Model.toggle works with truthy nested boolean values in a Collection');
    });

  });

}