import { Model } from 'rebound-data/rebound-data';

    // Notify all of a object's observers of the change, execute the callback
    function notify(obj, path) {
      // If path is not an array of keys, wrap it in array
      path = (_.isString(path)) ? [path] : path;

      // For each path, alert each observer and call its callback
      _.each(path, function(path){
        if(obj.__observers && _.isArray(obj.__observers[path])){
          _.each(obj.__observers[path], function(callback, index) {
            if(callback){ callback(); }
            else{ delete obj.__observers[path][index]; }
          });
        }
      });
    }

QUnit.test('Rebound Data - Events', function(assert) {
  var model, events = [];
  assert.expect(147);

// Deep Set - Primitive Values
  model = new Model({ a: { b: [[], [{c: {d: 1}}] ]}});

  var count = 0;

  model.get('a.b[1][0].c').on('change:d', function(model, value, options){
    var layerID = "[Layer 5, Path 0] ";
    equal(count++, 0, layerID + "Named change event is triggered in order." );
    equal(model.__path(), 'a.b[1][0].c', layerID + "Passed model's path is correct." );
    deepEqual(model.changedAttributes(), {d: 2}, layerID + "Passed model's changedAttributes are correct." );
    equal( value, 2, layerID + "Passed value is correct" );
  });


  model.get('a.b[1][0]').on('change:c.d', function(model, value, options){
    var layerID = "[Layer 4, Path 1] ";
    equal(count++, 1, layerID + "Named change event is triggered in order." );
    equal(model.__path(), 'a.b[1][0].c', layerID + "Passed model's path is correct." );
    deepEqual(model.changedAttributes(), {d: 2}, layerID + "Passed model's changedAttributes are correct." );
    equal( value, 2, layerID + "Passed value is correct" );
  });
  model.get('a.b[1][0]').on('change:c', function(model, value, options){
    var layerID = "[Layer 4, Path 0] ";
    equal(count++, 2, layerID + "Named change event is triggered in order." );
    equal(model.__path(), 'a.b[1][0]', layerID + "Passed model's path is correct." );
    deepEqual(model.changedAttributes(), {c: {d: 2}}, layerID + "Passed model's changedAttributes are correct." );
    equal(value.cid, model.get('c').cid, layerID + "Passed value is correct" );
  });

  model.get('a.b[1]').on('change:[0].c.d', function(model, value, options){
    var layerID = "[Layer 3, Path 2] ";
    equal(count++, 3, layerID + "Named change event is triggered in order." );
    equal(model.__path(), 'a.b[1][0].c', layerID + "Passed model's path is correct." );
    deepEqual(model.changedAttributes(), {d: 2}, layerID + "Passed model's changedAttributes are correct." );
    equal( value, 2, layerID + "Passed value is correct" );
  });
  model.get('a.b[1]').on('change:[0].c', function(model, value, options){
    var layerID = "[Layer 3, Path 1] ";
    equal(count++, 4, layerID + "Named change event is triggered in order." );
    equal(model.__path(), 'a.b[1][0]', layerID + "Passed model's path is correct." );
    deepEqual(model.changedAttributes(), {c: {d: 2}}, layerID + "Passed model's changedAttributes are correct." );
    equal(value.cid, model.get('c').cid, layerID + "Passed value is correct" );
  });
  model.get('a.b[1]').on('change:[0]', function(collection, value, options){
    var layerID = "[Layer 3, Path 0] ";
    equal(count++, 5, layerID + "Named change event is triggered in order." );
    equal( collection.__path(), 'a.b[1]', layerID + "Passed model's path is correct." );
    deepEqual( collection.changedAttributes(), {0: {c: {d: 2}}}, layerID + "Passed collection's changedAttributes are correct." );
    equal(value.cid, collection.at(0).cid, layerID + "Passed value is correct" );
  });


  model.get('a.b').on('change:[1][0].c.d', function(model, value, options){
    var layerID = "[Layer 2, Path 3] ";
    equal(count++, 6, layerID + "Named change event is triggered in order." );
    equal(model.__path(), 'a.b[1][0].c', layerID + "Passed model's path is correct." );
    deepEqual(model.changedAttributes(), {d: 2}, layerID + "Passed model's changedAttributes are correct." );
    equal( value, 2, layerID + "Passed value is correct" );
  });
  model.get('a.b').on('change:[1][0].c', function(model, value, options){
    var layerID = "[Layer 2, Path 2] ";
    equal(count++, 7, layerID + "Named change event is triggered in order." );
    equal(model.__path(), 'a.b[1][0]', layerID + "Passed model's path is correct." );
    deepEqual(model.changedAttributes(), {c: {d: 2}}, layerID + "Passed model's changedAttributes are correct." );
    equal(value.cid, model.get('c').cid, layerID + "Passed value is correct" );
  });
  model.get('a.b').on('change:[1][0]', function(collection, value, options){
    var layerID = "[Layer 2, Path 1] ";
    equal(count++, 8, layerID + "Named change event is triggered in order." );
    equal( collection.__path(), 'a.b[1]', layerID + "Passed model's path is correct." );
    deepEqual( collection.changedAttributes(), {0: {c: {d: 2}}}, layerID + "Passed collection's changedAttributes are correct." );
    equal(value.cid, collection.at(0).cid, layerID + "Passed value is correct" );
  });
  model.get('a.b').on('change:[1]', function(collection, value, options){
    var layerID = "[Layer 2, Path 0] ";
    equal(count++, 9, layerID + "Named change event is triggered in order." );
    equal( collection.__path(), 'a.b', layerID + "Passed model's path is correct." );
    deepEqual( collection.changedAttributes(), {1: {0: {c: {d: 2}}}}, layerID + "Passed collection's changedAttributes are correct." );
    equal(value.cid, collection.at(1).cid, layerID + "Passed value is correct" );
  });


  model.get('a').on('change:b[1][0].c.d', function(model, value, options){
    var layerID = "[Layer 1, Path 4] ";
    equal(count++, 10, layerID + "Named change event is triggered in order." );
    equal(model.__path(), 'a.b[1][0].c', layerID + "Passed model's path is correct." );
    deepEqual(model.changedAttributes(), {d: 2}, layerID + "Passed model's changedAttributes are correct." );
    equal( value, 2, layerID + "Passed value is correct" );
  });
  model.get('a').on('change:b[1][0].c', function(model, value, options){
    var layerID = "[Layer 1, Path 3] ";
    equal(count++, 11, layerID + "Named change event is triggered in order." );
    equal(model.__path(), 'a.b[1][0]', layerID + "Passed model's path is correct." );
    deepEqual(model.changedAttributes(), {c: {d: 2}}, layerID + "Passed model's changedAttributes are correct." );
    equal(value.cid, model.get('c').cid, layerID + "Passed value is correct" );
  });
  model.get('a').on('change:b[1][0]', function(collection, value, options){
    var layerID = "[Layer 1, Path 2] ";
    equal(count++, 12, layerID + "Named change event is triggered in order." );
    equal( collection.__path(), 'a.b[1]', layerID + "Passed model's path is correct." );
    deepEqual( collection.changedAttributes(), {0: {c: {d: 2}}}, layerID + "Passed collection's changedAttributes are correct." );
    equal(value.cid, collection.at(0).cid, layerID + "Passed value is correct" );
  });
  model.get('a').on('change:b[1]', function(collection, value, options){
    var layerID = "[Layer 1, Path 1] ";
    equal(count++, 13, layerID + "Named change event is triggered in order." );
    equal( collection.__path(), 'a.b', layerID + "Passed model's path is correct." );
    deepEqual( collection.changedAttributes(), {1: {0: {c: {d: 2}}}}, layerID + "Passed collection's changedAttributes are correct." );
    equal(value.cid, collection.at(1).cid, layerID + "Passed value is correct" );
  });
  model.get('a').on('change:b', function(model, value, options){
    var layerID = "[Layer 1, Path 0] ";
    equal(count++, 14, layerID + "Named change event is triggered in order." );
    equal(model.__path(), 'a', layerID + "Passed model's path is correct." );
    deepEqual(model.changedAttributes(), {b: {1: {0: {c: {d: 2}}}}}, layerID + "Passed collection's changedAttributes are correct." );
    equal(value.cid, model.get('b').cid, layerID + "Passed value is correct" );
  });


  model.on('change:a.b[1][0].c.d', function(model, value, options){
    var layerID = "[Layer 0, Path 5] ";
    equal(count++, 15, layerID + "Named change event is triggered in order." );
    equal(model.__path(), 'a.b[1][0].c', layerID + "Passed model's path is correct." );
    deepEqual(model.changedAttributes(), {d: 2}, layerID + "Passed model's changedAttributes are correct." );
    equal( value, 2, layerID + "Passed value is correct" );
  });
  model.on('change:a.b[1][0].c', function(model, value, options){
    var layerID = "[Layer 1, Path 4] ";
    equal(count++, 16, layerID + "Named change event is triggered in order." );
    equal(model.__path(), 'a.b[1][0]', layerID + "Passed model's path is correct." );
    deepEqual(model.changedAttributes(), {c: {d: 2}}, layerID + "Passed model's changedAttributes are correct." );
    equal(value.cid, model.get('c').cid, layerID + "Passed value is correct" );
  });
  model.on('change:a.b[1][0]', function(collection, value, options){
    var layerID = "[Layer 0, Path 3] ";
    equal(count++, 17, layerID + "Named change event is triggered in order." );
    equal( collection.__path(), 'a.b[1]', layerID + "Passed model's path is correct." );
    deepEqual( collection.changedAttributes(), {0: {c: {d: 2}}}, layerID + "Passed collection's changedAttributes are correct." );
    equal(value.cid, collection.at(0).cid, layerID + "Passed value is correct" );
  });
  model.on('change:a.b[1]', function(collection, value, options){
    var layerID = "[Layer 0, Path 2] ";
    equal(count++, 18, layerID + "Named change event is triggered in order." );
    equal( collection.__path(), 'a.b', layerID + "Passed model's path is correct." );
    deepEqual( collection.changedAttributes(), {1: {0: {c: {d: 2}}}}, layerID + "Passed collection's changedAttributes are correct." );
    equal(value.cid, collection.at(1).cid, layerID + "Passed value is correct" );
  });
  model.on('change:a.b', function(model, value, options){
    var layerID = "[Layer 0, Path 1] ";
    equal(count++, 19, layerID + "Named change event is triggered in order." );
    equal(model.__path(), 'a', layerID + "Passed model's path is correct." );
    deepEqual(model.changedAttributes(), {b: {1: {0: {c: {d: 2}}}}}, layerID + "Passed collection's changedAttributes are correct." );
    equal(value.cid, model.get('b').cid, layerID + "Passed value is correct" );
  });
  model.on('change:a', function(model, value, options){
    var layerID = "[Layer 1, Path 0] ";
    equal(count++, 20, layerID + "Named change event is triggered in order." );
    equal(model.__path(), '', layerID + "Passed model's path is correct." );
    deepEqual(model.changedAttributes(), {a: {b: {1: {0: {c: {d: 2}}}}}}, layerID + "Passed collection's changedAttributes are correct." );
    equal(value.cid, model.get('a').cid, layerID + "Passed value is correct" );
  });

  model.get('a.b[1][0].c').on('change', function(model, value, options){
    equal(count++, 21, "Deepest model's general change event is triggered sixth to last" );
  });
  model.get('a.b[1][0]').on('change', function(model, value, options){
    equal(count++, 22, "Layer n-1 model's unnamed change event is triggered fifth to last" );
  });
  model.get('a.b[1]').on('change', function(model, value, options){
    equal(count++, 23, "Layer n-2 model's unnamed change event is triggered fourth to last" );
  });
  model.get('a.b').on('change', function(model, value, options){
    equal(count++, 24, "Layer n-3 model's unnamed change event is triggered third to last" );
  });
  model.get('a').on('change', function(model, value, options){
    equal(count++, 25, "Layer n-4 model's unnamed change event is triggered second to last" );
  });
  model.on('change', function(model, value, options){
    equal(count++, 26, "Layer n-5 (root) model's unnamed change event is triggered last" );
  });

  model.set('a.b[1][0].c.d', 2);






  // Deep Set - Computed Values
    model = new Model({
      a: [{id: 1}],
      get computedProp(){
        return this.get('a[0].b');
      },
      get computedModel(){
        return this.get('a');
      }
    });

    count = 0;

    model.get('a[0]').on('change:b', function(model, value, options){
      var layerID = "[Layer 2, Path 0] ";
      equal(count++, 0, layerID + "Named change event is triggered in order." );
      equal(model.__path(), 'a[0]', layerID + "Passed model's path is correct." );
      deepEqual(model.changedAttributes(), {b: 2}, layerID + "Passed model's changedAttributes are correct." );
      equal( value, 2, layerID + "Passed value is correct" );
    });


    model.get('a').on('change:[0].b', function(model, value, options){
      var layerID = "[Layer 1, Path 1] ";
      equal(count++, 1, layerID + "Named change event is triggered in order." );
      equal(model.__path(), 'a[0]', layerID + "Passed model's path is correct." );
      deepEqual(model.changedAttributes(), {b: 2}, layerID + "Passed model's changedAttributes are correct." );
      equal( value, 2, layerID + "Passed value is correct" );
    });
    model.get('a').on('change:[0]', function(model, value, options){
      var layerID = "[Layer 1, Path 0] ";
      equal(count++, 2, layerID + "Named change event is triggered in order." );
      equal(model.__path(), 'a', layerID + "Passed model's path is correct." );
      deepEqual(model.changedAttributes(), {0: {b: 2}}, layerID + "Passed model's changedAttributes are correct." );
      equal( value.cid, model.at(0).cid, layerID + "Passed value is correct" );
    });

    model.on('change:a[0].b', function(model, value, options){
      var layerID = "[Layer 2, Path 2] ";
      equal(count++, 3, layerID + "Named change event is triggered in order." );
      equal(model.__path(), 'a[0]', layerID + "Passed model's path is correct." );
      deepEqual(model.changedAttributes(), {b: 2}, layerID + "Passed model's changedAttributes are correct." );
      equal( value, 2, layerID + "Passed value is correct" );
    });
    model.on('change:a[0]', function(model, value, options){
      var layerID = "[Layer 2, Path 1] ";
      equal(count++, 4, layerID + "Named change event is triggered in order." );
      equal(model.__path(), 'a', layerID + "Passed model's path is correct." );
      deepEqual(model.changedAttributes(), {0: {b: 2}}, layerID + "Passed model's changedAttributes are correct." );
      equal( value.cid, model.at(0).cid, layerID + "Passed value is correct" );
    });
    model.on('change:a', function(model, value, options){
      var layerID = "[Layer 2, Path 0] ";
      equal(count++, 5, layerID + "Named change event is triggered in order." );
      equal(model.__path(), '', layerID + "Passed model's path is correct." );
      deepEqual(model.changedAttributes(), {a: {0: {b: 2}}}, layerID + "Passed model's changedAttributes are correct." );
      equal( value.cid, model.get('a').cid, layerID + "Passed value is correct" );
    });

    var end = assert.async(12);

    model.on('change:computedProp', function(model, value, options){
      var layerID = "[Layer computedProp] ";
      equal(count++, 6, layerID + "Named change event is triggered in order." );
      equal(model.__path(), '', layerID + "Passed model's path is correct." );
      deepEqual(model.changedAttributes(), {a: {0: {b: 2}}, computedProp: 2}, layerID + "Passed model's changedAttributes are correct." );
      equal( value, 2, layerID + "Passed value is correct" );
      end();
    });


    model.get('computedModel[0]').on('change:b', function(model, value, options){
      var layerID = "[Layer computedModel2, Path 0] ";
      equal(count++, 7, layerID + "Named change event is triggered in order." );
      equal(model.__path(), 'computedModel[0]', layerID + "Passed model's path is correct." );
      deepEqual(model.changedAttributes(), {b: 2}, layerID + "Passed model's changedAttributes are correct." );
      equal( value, 2, layerID + "Passed value is correct" );
      end();
    });

    model.get('computedModel').on('change:[0].b', function(model, value, options){
      var layerID = "[Layer computedModel1, Path 1] ";
      equal(count++, 8, layerID + "Named change event is triggered in order." );
      equal(model.__path(), 'computedModel[0]', layerID + "Passed model's path is correct." );
      deepEqual(model.changedAttributes(), {b: 2}, layerID + "Passed model's changedAttributes are correct." );
      equal( value, 2, layerID + "Passed value is correct" );
      end();
    });
    model.get('computedModel').on('change:[0]', function(model, value, options){
      var layerID = "[Layer computedModel1, Path 0] ";
      equal(count++, 9, layerID + "Named change event is triggered in order." );
      equal(model.__path(), 'computedModel', layerID + "Passed model's path is correct." );
      deepEqual(model.changedAttributes(), {0: {b: 2}}, layerID + "Passed model's changedAttributes are correct." );
      equal( value.cid, model.at(0).cid, layerID + "Passed value is correct" );
      end();
    });


    model.on('change:computedModel[0].b', function(model, value, options){
      var layerID = "[Layer computedModel0, Path 2] ";
      equal(count++, 10, layerID + "Named change event is triggered in order." );
      equal(model.__path(), 'computedModel[0]', layerID + "Passed model's path is correct." );
      deepEqual(model.changedAttributes(), {b: 2}, layerID + "Passed model's changedAttributes are correct." );
      equal( value, 2, layerID + "Passed value is correct" );
      end();
    });
    model.on('change:computedModel[0]', function(model, value, options){
      var layerID = "[Layer computedModel0, Path 1] ";
      equal(count++, 11, layerID + "Named change event is triggered in order." );
      equal(model.__path(), 'computedModel', layerID + "Passed model's path is correct." );
      deepEqual(model.changedAttributes(), {0: {b: 2}}, layerID + "Passed model's changedAttributes are correct." );
      equal( value.cid, model.at(0).cid, layerID + "Passed value is correct" );
      end();
    });
    model.on('change:computedModel', function(model, value, options){
      var layerID = "[Layer computedModel0, Path 0] ";
      equal(count++, 12, layerID + "Named change event is triggered in order." );
      equal(model.__path(), '', layerID + "Passed model's path is correct." );
      deepEqual(model.changedAttributes(), {a: {0: {b: 2}}, computedModel: {0: {b: 2}}}, layerID + "Passed model's changedAttributes are correct." );
      equal( value.cid, model.get('computedModel').cid, layerID + "Passed value is correct" );
      end();
    });

    model.get('a[0]').on('change', function(model, value, options){
      assert.ok(true, "Deepest model's general change event is triggered seventh to last, after all computed properies are resolved" );
      end();
    });
    model.get('a').on('change', function(model, value, options){
      assert.ok(true, "Layer n-1 model's general change event is triggered eigth to last, after all computed properies are resolved" );
      end();
    });
    model.on('change', function(model, value, options){
      assert.ok(true, "Layer n-2 (root) model's general change event is triggered THREE times, once after data set, and once after each computed properiey resolution." );
      end();
    });

    model.set('a[0].b', 2);

    window.model = model;

});

// When set is called with option: {defaults: true}, it sets the defaults object to the property passed.
