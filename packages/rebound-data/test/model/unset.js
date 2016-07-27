import { Model, Collection } from 'rebound-data/rebound-data';

QUnit.test('[Rebound Data] Model – Unset', function(assert) {
  var model;

// Shallow Toggle Boolean Values
  model = new Model({
    deep: {
      str: 'foo'
    },
    undef: undefined,
    str: 'foo',
    bool: false,
    int: 0
  });

  model.unset();
  assert.deepEqual(model.toJSON(), {
    deep: {
      str: 'foo'
    },
    undef: undefined,
    str: 'foo',
    bool: false,
    int: 0
  }, 'Model.unset when called with no parameters, makes no changes.');

  model.unset('str');
  assert.notOk(model.attributes.hasOwnProperty('str'), 'Model.unset unsets strings.');

  model.unset('bool');
  assert.notOk(model.attributes.hasOwnProperty('bool'), 'Model.unset unsets strings.');

  model.unset('int');
  assert.notOk(model.attributes.hasOwnProperty('int'), 'Model.unset unsets ints.');

  model.unset('deep.str');
  assert.notOk(model.attributes.deep.attributes.hasOwnProperty('str'), 'Model.unset unsets deep values.');

  model.unset('deep');
  assert.notOk(model.attributes.hasOwnProperty('deep'), 'Model.unset unsets data objects.');

});
