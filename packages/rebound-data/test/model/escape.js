import { Model, Collection } from 'rebound-data/rebound-data';

QUnit.test('[Rebound Data] Model – Escape', function(assert) {
  var model;

// Shallow Toggle Boolean Values
  model = new Model({
    unsafe: '<oohlook&atme foo="bar">',
    deep: {
      unsafe: '<oohlook&atme foo="bar">'
    },
    str: 'foo',
    bool: false,
    int: 1
  });

  assert.equal(model.escape('str'), 'foo', 'Model.escape works with regular strings.');
  assert.equal(model.escape('bool'), false, 'Model.escape works with booleans');
  assert.equal(model.escape('int'), 1, 'Model.escape works with ints');
  assert.deepEqual(model.escape('deep'), model.get('deep'), 'Model.escape works with data objects');
  assert.equal(model.escape('unsafe'), "&lt;oohlook&amp;atme foo=&quot;bar&quot;&gt;", 'Model.escape works with unsafe strings');
  assert.equal(model.escape('deep.unsafe'), "&lt;oohlook&amp;atme foo=&quot;bar&quot;&gt;", 'Model.escape works with deep selectors');

});
