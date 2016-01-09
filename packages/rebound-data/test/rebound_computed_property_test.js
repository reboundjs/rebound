import reboundData from 'rebound-data/rebound-data';

var Model = reboundData.Model,
    Collection = reboundData.Collection;

QUnit.test('Rebound Data - Computed Properties', function( assert ) {
  var model, collection, model2, model3;


/*****************************

          GET Tests

*****************************/

// Basic get and recompute
  model = new Model({
    a: 1,
    b: 1,
    get prop(){
      return this.get('a') + this.get('b');
    }
  });
  equal(2, model.get('prop'), 'Getting a computed property from a model returns its value.');
  model.set('b', 2);
  equal(3, model.get('prop'), 'Changing a computed property\'s dependancy effects its resulting value.');


// Returning vanilla objects
  model = new Model({
    get objProp(){
      return {a: 1, b: 2};
    },
    get arrProp(){
      return [{a: 1, b: 2}];
    }
  });
  equal(true, model.get('objProp').isModel, 'Returning a vanilla object gives you a Rebound Model on get.');
  deepEqual(model, model.get('objProp').__parent__, 'Returning a vanilla object gives you a Rebound Model with its ancestry set.');
  deepEqual('objProp', model.get('objProp').__path(), 'Returning a vanilla object gives you a Rebound Model with its path set.');

  equal(true, model.get('arrProp').isCollection, 'Returning a vanilla array gives you a Rebound Collection on get.');
  deepEqual(model, model.get('arrProp').__parent__, 'Returning a vanilla object gives you a Rebound Collection with its ancestry set.');
  deepEqual('arrProp', model.get('arrProp').__path(), 'Returning a vanilla object gives you a Rebound Collection with its path set.');



// Returning Complex Objects
  model = new Model({

    arr: [{val: 1}, {val: 2, obj: {a: 1}}, {val: 3}, {val:4}, {val:5}, {val:6}],

    obj: {
      a: 1,
      b: 2,
      c: {
        a:1
      },
      arr: [{val: 1}, {val: 2}]
    },

    get objProp(){
      return this.get('obj');
    },
    get arrProp(){
      return this.get('arr');
    }
  });

  deepEqual(model.get('objProp').toJSON(), model.get('obj').toJSON(), 'Returning a Model gives you the same Rebound Model on get.');
  deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Returning a Collection gives you the same Rebound Collection on get.');

// Keeping computed complex objects in sync
  // Model -> Computed Model
  model.set('obj.a', 4);
  deepEqual(model.get('objProp').toJSON(), model.get('obj').toJSON(), 'Modifying a Model that is a dependancy modifies the computed Model.');
  model.set('obj.c.a', 4);
  deepEqual(model.get('objProp').toJSON(), model.get('obj').toJSON(), 'Modifying a deep Model in a dependancy modifies the computed Model.');
  model.get('obj.arr').add({val: 2});
  deepEqual(model.get('objProp').toJSON(), model.get('obj').toJSON(), 'Adding to a collection deep inside a model updates the computed model.');
  model.set('obj.arr[1].val', 3);
  deepEqual(model.get('objProp').toJSON(), model.get('obj').toJSON(), 'Changing a model in a collection deep inside a model updates the computed model.');
  model.get('obj.arr').pop();
  deepEqual(model.get('objProp').toJSON(), model.get('obj').toJSON(), 'Removing from a collection deep inside a model updates the computed model.');
  model.get('obj.c').reset();
  deepEqual(model.get('objProp').toJSON(), model.get('obj').toJSON(), 'Resetting a Model that is deep inside a dependancy resets that model in the computed Model.');
  model.get('obj').reset();
  deepEqual(model.get('objProp').toJSON(), model.get('obj').toJSON(), 'Resetting a Model that is a dependancy resets the computed Model.');

  // Computed Model -> Model
  model.set('objProp.a.a', 1);
  model.set('objProp.a.b', {a: 1});
  deepEqual(model.get('objProp').toJSON(), model.get('obj').toJSON(), 'Modifying a Model returned from a computed property modifies the original.');
  model.set('objProp.a.a', 2);
  deepEqual(model.get('objProp').toJSON(), model.get('obj').toJSON(), 'Modifying a deep Model returned from a computed property modifies the original.');
  model.get('objProp.arr').add({val: 1});
  deepEqual(model.get('objProp').toJSON(), model.get('obj').toJSON(), 'Adding to a collection deep inside a model returned from a computed property updates the original.');
  model.set('objProp.arr[0].val', 2);
  deepEqual(model.get('objProp').toJSON(), model.get('obj').toJSON(), 'Changing a model in a collection deep inside a computed model updates the original.');
  model.get('objProp.arr').pop();
  deepEqual(model.get('objProp').toJSON(), model.get('obj').toJSON(), 'Removing from a collection deep inside a model returned from a computed property updates the original.');
  model.get('objProp.a.b').reset();
  deepEqual(model.get('objProp').toJSON(), model.get('obj').toJSON(), 'Resetting a Model that is deep inside a returned Model from a computed property modifies the original.');
  model.get('objProp').reset();
  deepEqual(model.get('objProp').toJSON(), model.get('obj').toJSON(), 'Resetting a Model returned from a computed property modifies the original.');

  // Collection -> Computed Collection
  model.get('arr').add({val: 7});
  deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Adding to a Collection that is a dependancy modifies the computed Collection.');
  model.get('arr').pop();
  deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Removing from a Collection that is a dependancy modifies the computed Collection.');
  model.set('arr[0].val', 7);
  deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Modifying a Model inside a collection that is a dependancy modifies the computed Model.');
  model.set('arr[1].obj.a', 2);
  deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Modifying a Model deep inside a collection that is a dependancy modifies the computed Model.');
  model.get('arr').reset({test: 'foo'});
  deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Resetting a Collection that is a dependancy modifies the computed Collection.');
  model.get('arrProp').add([{val: 1}, {val: 2}, {val: 3}, {val:4}, {val:5}, {val:6}]);

  // Computed Collection -> Collection
  deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Adding to a Collection returned from a computed property modifies the original.');
  model.get('arrProp').pop();
  deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Removing from a Collection returned from a computed property modifies the original.');
  model.get('arrProp').reset([{val: 1}, {val: {a: 1}}]);
  deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Resetting a computed Collection resets the original');
  model.set('arrProp[0].val', 2);
  deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Modifying a Model inside a collection returned from a computed property modifies the original.');
  model.set('arrProp[1].val.a', 2);
  deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Modifying a Model deep inside a collection returned from a computed property modifies the original.');
  model.get('arrProp[1].val').reset();
  deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Resetting a Model deep inside a collection returned from a computed property resets the original.');



// Deep Model Dependancy Re-compute
  model = new Model({

    obj: {
      a: 1,
      b: {
        c: {
          d: 2
        }
      }
    },

    get deep(){
      return (this.get('obj.a') || 0) + (this.get('obj.b.c.d') || 0);
    }

  });
  // Change
  equal(model.get('deep'), 3, 'Computed properties with deep dependancies inside object compute on first run.');
  model.set('obj.a', 2);
  equal(model.get('deep'), 4, 'Computed properties with deep dependancies inside objects recompute on change 1 level deep.');
  model.set('obj.b.c.d', 3);
  equal(model.get('deep'), 5, 'Computed properties with deep dependancies inside objects recompute on change n levels deep.');
  // Reset
  model.get('obj.b.c').reset();
  equal(model.get('deep'), 2, 'Computed properties with deep dependancies inside objects recompute on reset n levels deep.');
  model.get('obj').reset();
  equal(model.get('deep'), 0, 'Computed properties with deep dependancies inside objects recompute on reset 1 level deep.');


// Deep Collection Dependancy Re-compute
  model = new Model({

    arr: [{a:1}, {b: {c: {d: 2}}}],

    get sum(){
      return (this.get('arr[0].a') || 0) + (this.get('arr[1].b.c.d') || 0) + (this.get('arr[2].e') || 0);
    }

  });

  // Change
  equal(model.get('sum'), 3, 'Computed properties with deep dependancies inside collections compute on first run.');
  model.set('arr[0].a', 2);
  equal(model.get('sum'), 4, 'Computed properties with deep dependancies inside collections recompute on model change 1 level deep.');
  model.set('arr[1].b.c.d', 3);
  equal(model.get('sum'), 5, 'Computed properties with deep dependancies inside collections recompute on model change n levels deep.');
  // Add/Remove
  model.get('arr').add({e: 3});
  equal(model.get('sum'), 8, 'Computed properties with deep dependancies inside collections recompute on model add.');
  model.get('arr').pop();
  equal(model.get('sum'), 5, 'Computed properties with deep dependancies inside collections recompute on model remove.');
  // Reset
  model.get('arr[1].b.c').reset();
  equal(model.get('sum'), 2, 'Computed properties with deep dependancies inside collections recompute on model reset');
  model.get('arr').reset();
  equal(model.get('sum'), 0, 'Computed properties with deep dependancies inside collections recompute on collection reset.');


// Depending on other computed properties - Value
  model = new Model({
    foo: 1,
    bar: 1,
    get sum(){
      return this.get('foo') + this.get('bar');
    },
    get sumProxy(){
      return this.get('sum');
    }
  });
  equal(model.get('sumProxy'), 2, 'Computed properties depending on other computed properties evaluate on first run.');
  model.set('bar', 2);
  equal(model.get('sumProxy'), 3, 'Computed properties depending on other computed properties re-evaluate on base-dependancy change.');
  model.set('sum', 5);
  equal(model.get('sumProxy'), 5, 'Computed properties depending on other computed properties re-evaluate on mid-dependancy change.');
  model.set('foo', 2);
  equal(model.get('sumProxy'), 4, 'Computed properties re-evaluate after a mid-dependancy change when their dependancies change.');
  equal(model.get('sumProxy'), 4, 'Computed properties depending on other computed properties re-evaluate on base-dependancy change after a mid-dependancy change.');


// Depending on other computed properties - Model
  model = new Model({
    obj: {
      foo: 1,
      bar: 2
    },
    get objProxy(){
      return this.get('obj');
    },
    get objValue(){
      return this.get('objProxy.foo') || 0;
    },
    get objSum(){
      return (this.get('objProxy.foo') || 0) + (this.get('objProxy.bar') || 0);
    }
  });
  equal(model.get('objValue'), 1, 'Computed properties depending on other computed properties that rely on objects evaluate on first run.');
  equal(model.get('objSum'), 3, 'Computed properties depending on other computed properties that rely on objects evaluate on first run.');
  model.set('obj.foo', 2);
  equal(model.get('objValue'), 2, 'Computed properties depending on other computed properties that rely on objects re-evaluate on base dependancy change.');
  equal(model.get('objSum'), 4, 'Computed properties depending on other computed properties that rely on objects re-evaluate on base dependancy change.');
  model.get('obj').reset();
  equal(model.get('objValue'), 0, 'Computed properties depending on other computed properties that rely on objects re-evaluate on base dependancy reset.');


// Returning Modified Model & Recompute
  model = new Model({
    obj: {
      foo: 1,
      bar: 2,
      baz: {
        test: true
      }
    },
    get objAbuse(){
      var attrs = this.get('obj').attributes;
      attrs.test = false;
      return attrs;
    }
  });
  deepEqual(model.get('objAbuse').toJSON(), model.get('obj').toJSON(), 'Computed properties that return a modified Model return the modified Model');
  model.get('objAbuse').custom = true;
  model.get('objAbuse.baz').custom = true;
  model.set('obj.foo', 2);
  deepEqual(model.get('objAbuse').toJSON(), model.get('obj').toJSON(), 'Computed properties depending on other computed properties that rely on objects re-evaluate on base dependancy change.');
  equal(model.get('objAbuse').custom, true, 'Custom attributes set on 1st level Computed Property Models are retained after re-evaluation.');
  equal(model.get('objAbuse.baz').custom, true, 'Custom attributes set on a deep Computed Property Models are retained after re-evaluation.');

// Returning Modified Collection & Recompute
  model = new Model({
    arr: [{val: 1}, {val: 2}, {val: 3}, {val: 4}, {val: 5}],
    get even(){
      return this.get('arr').filter(function(obj){ return obj.get('val') % 2 === 0; });
    },
    get firstEven(){
      return this.get('even[0]');
    }
  });
  model.get('arr').custom = true;
  model.get('arr[0]').custom = true;
  deepEqual(model.get('even').length, 2, 'Computed properties that return a modified Collection return the correctly modified Collection on first run');
  deepEqual(model.get('firstEven.val'), 2, 'Computed properties depending on other computed properties that depend on a collection evaluate correctly on first run.');
  model.get('arr').unshift({val: 6});
  equal(model.get('arr').custom, true, 'Custom attributes set on Computed Collections are retained after dependancy add.');
  equal(model.get('arr[1]').custom, true, 'Custom attributes set on Models in Computed Collections are retained after dependancy add.');
  model.get('arr[0]').custom = true;
  deepEqual(model.get('even').length, 3, 'Computed properties that return a modified Collection re-evaluate on dependancy add.');
  deepEqual(model.get('firstEven.val'), 6, 'Computed properties depending on other computed properties that depend on a collection re-evaluate on base dependancy add.');
  model.set('arr[0].val', 8);
  equal(model.get('arr').custom, true, 'Custom attributes set on Computed Collections are retained after Model change.');
  equal(model.get('arr[0]').custom, true, 'Custom attributes set on Models in Computed Collections are retained after Model change.');
  deepEqual(model.get('firstEven.val'), 8, 'Computed properties depending on other computed properties that depend on a collection re-evaluate on base dependancy change.');
  model.get('arr').shift();
  deepEqual(model.get('even').length, 2, 'Computed properties that return a modified Collection re-evaluate on dependancy remove.');
  deepEqual(model.get('firstEven.val'), 2, 'Computed properties depending on other computed properties that depend on a collection re-evaluate on base dependancy remove.');
  model.set('even[0].val', 6);
  deepEqual(model.get('arr[1].val'), 6, 'Setting a Model in a Computed property that return a modified Collection modifies the original.');



// @parent Recompute
  model = new Model({
    foo: 1,
    bar: 2,

    arr: [
      {
        get func(){
          return this.get('@parent.@parent.foo') + this.get('@parent.@parent.bar');
        }
      }

    ]
  });
  // Change parent attribute
  equal(model.get('arr.0.func'), 3, 'Computed properties with @parent dependancies compute on first run.');
  model.set('foo', 2);
  equal(model.get('arr.0.func'), 4, 'Computed properties with @parent dependancies compute on change.');



// Complex Dependancy Chain Test
//
//      foo     bar ------
//       |       |       |
//       |       v       |
//       -----> sum      |
//       |     / |       |
//       |    /  v       |
//       |   | barsum <---
//       |   \   |
//       |    v  v
//       |   sumbarsum
//       |       |
//       v       v
//      foosumbarsum
//

  model = new Model({

    foo: 1,

    bar: 2,

    get sum(){
      return this.get('foo') + this.get('bar');
    },

    get barsum(){
      return this.get('sum') + this.get('bar');
    },

    get sumbarsum(){
      return this.get('sum') + this.get('barsum');
    },

    get foosumbarsum(){
      return this.get('foo') + this.get('sumbarsum');
    }

  });

  equal(model.get('sumbarsum'), 8, 'Computed properties with complex dependancy trees compute on first run.');
  model.set('bar', 3);
  equal(model.get('sumbarsum'), 11, 'Computed properties with complex dependancy trees recompute on change.');
  equal(model.get('foosumbarsum'), 12, 'Computed properties with complex dependancy trees recompute on change.');


// Complex Dependancy Chain Tests
  model = new Model({

    get one(){
      return this.get('three');
    },

    get two(){
      return this.get('one.foo');
    },

    get three(){
      return {foo: 'bar'};
    }

  });
  equal(model.get('two'), 'bar', 'Computed properties wire themselves correctly regardless of set order.');



// Dependancies Deep Inside Multiple Collection
  model = new Model({

    arr: [
      {
        arr: [{val: 1}]
      }
    ],

    get proxy(){
      return this.get('arr[0].arr[0].val');
    }

  });
  equal(model.get('proxy'), 1, 'Computed properties with dependancies in two collections deep evaluate on first run.');
  model.set('arr[0].arr[0].val', 2);
  equal(model.get('proxy'), 2, 'Computed properties with dependancies in two collections deep re-evaluates on dependancy change.');


/*****************************

          SET Tests

*****************************/

// Basic set
  model = new Model({
    a: 1,
    set proxy(val){ // jshint ignore:line
      this.set('a', val);
    }
  });
  equal(undefined, model.get('proxy'), 'Computed proeprties with only a set function return undefined when accessed the first time.');
  model.set('proxy', 2);
  equal(2, model.get('a'), 'Computed proerties with only a set value can be used to set a simple value.');
  equal(2, model.get('proxy'), 'Computed properties with only a set value return the newly set value after set.');
  model.set('a', 3);
  equal(2, model.get('proxy'), 'Computed properties with only a set value do not re-evaluate when values it sets change.');

// Basic get, set and recompute
  model = new Model({
    a: 1,
    get proxy(){
      return this.get('a');
    },
    set proxy(val){
      this.set('a', val);
    }
  });
  equal(1, model.get('proxy'), 'Computed proeprties with a get and set function can be gotten before setting a value.');
  model.set('proxy', 2);
  equal(2, model.get('a'), 'Computed proerties with a set value can be used to set a simple value.');
  equal(2, model.get('proxy'), 'Computed properties with a set value return the newly set value after set changes dependancies.');
  model.set('a', 3);
  equal(3, model.get('proxy'), 'Computed properties with a set value return the newly set value after a dependancy changes.');


// Model set
  // model = new Model({
  //   a: {
  //     foo: 'bar'
  //   },
  //   set proxy(val){
  //     this.set('a', val);
  //   }
  // });
  // equal(undefined, model.get('proxy'), 'Computed properties with only a set function, setting a models, return undefined when accessed the first time.');
  // window.now = true;
  // model.set('proxy', {biz: 'baz'});
  // equal({foo: 'bar', biz: 'baz'}, model.get('a').toJSON(), 'Computed proerties with only a set value, setting a model, can be used to set a model\'s value.');
  // equal({biz: 'baz'}, model.get('proxy'), 'Computed properties with only a set value return only the newly set value after set.');



/********************************

 Execution and Concurrency Tests

********************************/

  window.count2 = 0;
  model = new Model({

    arr: [
      {val: 1},{val: 2},{val: 3},{val: 4},{val: 5}
    ],

    get callback(){
      window.count++;
      return this.get('arr');
    }

  });


  window.count = 0;
  model.get('arr').each(function(obj){
    obj.set('val', 6);
    model.get('callback');
  });
  equal(window.count, 5, 'Computed Property changes that would normally be pushed to the end of the callstack are called immediately when retreiving the Computed Property\'s value.');


  window.count = 0;
  model.get('arr').each(function(obj){
    obj.set('val', 7);
  });
  stop();
  setTimeout(function(){
    start();
    equal(window.count, 1, 'Repetitive changes to a Collection recompute a Computed Property that depends on it only once after all changes are made.');
  }, 0);



});
