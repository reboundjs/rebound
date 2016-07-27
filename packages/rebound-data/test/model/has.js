import { Model, Collection } from 'rebound-data/rebound-data';

QUnit.test('[Rebound Data] Model – Has', function(assert) {
  var model;

// Shallow Toggle Boolean Values
  model = new Model({
    deep: {
      str: '',
      undefMiss: undefined,
      nullMiss: null
    },
    str: '',
    bool: false,
    int: 0,
    undefMiss: undefined,
    nullMiss: null
  });

  assert.equal(model.has('str'), true, 'Model.has works with falsy strings.');
  assert.equal(model.has('bool'), true, 'Model.has works falsy booleans');
  assert.equal(model.has('int'), true, 'Model.has works with falsy ints');
  assert.equal(model.has('deep'), true, 'Model.has works with data objects');
  assert.equal(model.has('deep.str'), true, 'Model.has works with deep values');

  assert.equal(model.has('undefMiss'), false, 'Model.escape works with values set to undefined');
  assert.equal(model.has('notDefined'), false, 'Model.escape works with undefined values');
  assert.equal(model.has('deep.undefMiss'), false, 'Model.escape works with deep values set to undefined');
  assert.equal(model.has('nullMiss'), false, 'Model.escape works with values set to null');
  assert.equal(model.has('deep.nullMiss'), false, 'Model.escape works with deep values set to null');
  assert.equal(model.has('deep.notDefined'), false, 'Model.escape works with deep undefined values');

});
