import { Model, Collection } from 'rebound-data/rebound-data';

QUnit.skip('[Rebound Data] Model – Fetch', function(assert) {
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

});
