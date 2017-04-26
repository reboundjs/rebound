import { Model, Collection } from 'rebound-data/rebound-data';

export default function computedProperties(){
  QUnit.module("Computed Property", function(){

    /*****************************

              GET Tests

    *****************************/

    QUnit.test('Basic get and recompute', function( assert ){
      assert.expect(2);

      var model = new Model({
        a: 1,
        b: 1,
        get prop(){
          return this.get('a') + this.get('b');
        }
      });

      equal(model.get('prop'), 2, 'Getting a computed property from a model returns its value.');
      model.set('b', 2);
      equal(model.get('prop'), 3, 'Changing a computed property\'s dependancy effects its resulting value.');

    });

    QUnit.test('Returning vanilla objects', function( assert ){
      assert.expect(3);

      var model = new Model({
        get objProp(){
          return {a: 1, b: 2};
        }
      });

      equal(model.get('objProp').isModel, true, 'Returning a vanilla object gives you a Rebound Model on get.');
      deepEqual(model.get('objProp').parent, model, 'Returning a vanilla object gives you a Rebound Model with its ancestry set.');
      deepEqual(model.get('objProp').path, 'objProp', 'Returning a vanilla object gives you a Rebound Model with its path set.');

    });

    QUnit.test('Returning vanilla arrays', function( assert ){
      assert.expect(3);

      var model = new Model({
        get arrProp(){
          return [{a: 1, b: 2}];
        }
      });

      equal(model.get('arrProp').isCollection, true,'Returning a vanilla array gives you a Rebound Collection on get.');
      deepEqual(model.get('arrProp').parent, model, 'Returning a vanilla object gives you a Rebound Collection with its ancestry set.');
      deepEqual(model.get('arrProp').path, 'arrProp', 'Returning a vanilla object gives you a Rebound Collection with its path set.');

    });

    QUnit.test('Returning complex objects', function( assert ){
      assert.expect(2);

      var model = new Model({

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

    });


    QUnit.test('Keeping computed complex objects in sync: Model -> Computed Model', function( assert ){
      assert.expect(7);

      var model = new Model({

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
        }

      });

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

    });


    QUnit.test('Keeping computed complex objects in sync: Computed Model -> Model', function( assert ){
      assert.expect(14);

      var model = new Model({

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
        }

      });

      var tmpObj = model.get('obj.c');
      var tmpArr = model.get('obj.arr');
      assert.equal(model.get('obj.c'), tmpObj, "Before set internal objects of the source are the same.");

      model.set('objProp.a', 1);
      model.set('objProp.b', {a: 1});
      assert.deepEqual(model.get('objProp').toJSON(), model.get('obj').toJSON(), 'Modifying a Model returned from a computed property modifies the original.');
      assert.equal(model.get('obj.c'), tmpObj, "After shallow set internal objects of the source are the same.");

      model.set('objProp.c.a', 2);
      assert.deepEqual(model.get('objProp').toJSON(), model.get('obj').toJSON(), 'Modifying a deep Model returned from a computed property modifies the original.');
      assert.equal(model.get('obj.c'), tmpObj, "After deep set internal objects of the source are the same.");

      model.set('objProp.a.a', 2);
      assert.deepEqual(model.get('objProp').toJSON(), model.get('obj').toJSON(), 'Modifying a Model returned from a computed property so we need to generate the path modifies the original.');

      model.get('objProp.arr').add({val: 1});
      assert.deepEqual(model.get('objProp').toJSON(), model.get('obj').toJSON(), 'Adding to a collection deep inside a model returned from a computed property updates the original.');
      assert.equal(model.get('obj.arr'), tmpArr, "After internal array add, internal collection of the source is the same.");

      model.set('objProp.arr[0].val', 2);
      assert.deepEqual(model.get('objProp').toJSON(), model.get('obj').toJSON(), 'Changing a model in a collection deep inside a computed model updates the original.');

      model.get('objProp.arr').pop();
      assert.deepEqual(model.get('objProp').toJSON(), model.get('obj').toJSON(), 'Removing from a collection deep inside a model returned from a computed property updates the original.');
      assert.equal(model.get('obj.arr'), tmpArr, "After internal array remove, internal collection of the source is the same.");

      model.get('objProp.c').reset();
      assert.deepEqual(model.get('objProp').toJSON(), model.get('obj').toJSON(), 'Resetting a Model that is deep inside a returned Model from a computed property modifies the original.');
      assert.equal(model.get('obj.c'), tmpObj, "After internal reset, internal objects of the source are the same.");

      model.get('objProp').reset();
      assert.deepEqual(model.get('objProp').toJSON(), model.get('obj').toJSON(), 'Resetting a Model returned from a computed property modifies the original.');

    });


    QUnit.test('Keeping computed complex objects in sync: Collection -> Computed Collection', function( assert ){
      assert.expect(14);

      var model = new Model({

        arr: [{val: 1}, {val: 2, obj: {a: 1}}, {val: 3}, {val:4}, {val:5}, {val:6}],

        get arrProp(){
          return this.get('arr');
        }
      });

      var tmpArr = model.get('arrProp');
      var tmpObj = model.get('arrProp[0]');


      assert.ok(model.get('arrProp') === tmpArr, "Before set internal objects of the source are the same.");

      model.get('arr').add({val: 7});
      assert.deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Adding to a Collection that is a dependancy modifies the computed Collection.');
      assert.equal(model.get('arrProp').length, 7, 'Removing from a Collection that is a dependancy modifies the computed Collection length.');
      assert.equal(model.get('arrProp'), tmpArr, "After add internal object of the property is the same.");

      model.get('arr').pop();
      assert.deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Removing from a Collection that is a dependancy modifies the computed Collection.');
      assert.equal(model.get('arrProp').length, 6, 'Removing from a Collection that is a dependancy modifies the computed Collection length.');
      assert.equal(model.get('arrProp'), tmpArr, "After remove internal object of the property is the same.");

      model.set('arr[0].val', 7);
      assert.deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Modifying a Model inside a collection that is a dependancy modifies the computed Model.');
      assert.equal(model.get('arrProp[0].val'), 7, 'Modifying a Model inside a collection that is a dependancy modifies the computed Model value.');
      assert.notEqual(model.get('arrProp[0]'), tmpObj, "After modification, internal object of the property are different, having been reset.");
      assert.equal(model.get('arrProp[0]').cid, tmpObj.cid, "After modification, internal object of the property has the same cid.");

      model.set('arr[1].obj.a', 2);
      assert.deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Modifying a Model deep inside a collection that is a dependancy modifies the computed Model.');

      model.get('arr').reset([{test: 'foo'}]);
      assert.deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Resetting a Collection that is a dependancy modifies the computed Collection.');
      assert.equal(model.get('arrProp').length, 1, 'Removing from a Collection that is a dependancy modifies the computed Collection length.');

    });


    QUnit.test('Keeping computed complex objects in sync: Computed Collection -> Collection', function( assert ){
      assert.expect(17);

      var model = new Model({

        arr: [{val: 1}],

        get arrProp(){
          return this.get('arr');
        }
      });

      var tmpArr = model.get('arr');
      var tmpObj = model.get('arr[0]');

      model.get('arrProp').add([{val: 2}, {val: 3}, {val:4}, {val:5}, {val:6}]);
      assert.deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Adding to a Collection returned from a computed property modifies the original.');
      assert.equal(model.get('arr').length, 6, 'Adding to a Collection returned from a computed property modifies the source Collection length.');
      assert.ok(model.get('arr') === tmpArr, "After add internal source object is the same.");
      assert.ok(model.get('arr[0]') === tmpObj, "After add, internal model objects are the same.");

      model.get('arrProp').pop();
      assert.deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Removing from a Collection returned from a computed property modifies the original.');
      assert.equal(model.get('arr').length, 5, 'Removing to a Collection returned from a computed property modifies the source Collection length.');
      assert.ok(model.get('arr') === tmpArr, "After remove internal source object is the same.");
      assert.ok(model.get('arr[0]') === tmpObj, "After remove, internal model objects are the same.");

      model.set('arrProp[0].val', 2);
      assert.deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Modifying a Model inside a collection returned from a computed property modifies the original.');
      assert.equal(model.get('arr[0].val'), 2, 'Modifying a model in a Collection returned from a computed property modifies the source Model value.');
      assert.ok(model.get('arr[0]') === tmpObj, "After change, internal source model object is the same.");

      model.get('arrProp').reset([{val: 1}, {val: {a: 1}}]);
      assert.deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Resetting a computed Collection resets the original');
      assert.equal(model.get('arr').length, 2, 'Resetting to a Collection returned from a computed property modifies the source Collection length.');
      assert.ok(model.get('arr') === tmpArr, "After reset internal source object is the same.");

      model.set('arrProp[0].val', 2);
      assert.deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Modifying a Model inside a collection returned from a computed property modifies the original.');
      model.set('arrProp[1].val.a', 2);
      assert.deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Modifying a Model deep inside a collection returned from a computed property modifies the original.');
      model.get('arrProp[1].val').reset();
      assert.deepEqual(model.get('arrProp').toJSON(), model.get('arr').toJSON(), 'Resetting a Model deep inside a collection returned from a computed property resets the original.');

    });


    QUnit.test('Deep model dependancy re-compute', function( assert ){
      assert.expect(5);

      var model = new Model({

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
      assert.equal(model.get('deep'), 3, 'Computed properties with deep dependancies inside object compute on first run.');

      model.set('obj.a', 2);
      assert.equal(model.get('deep'), 4, 'Computed properties with deep dependancies inside objects recompute on change 1 level deep.');

      model.set('obj.b.c.d', 3);
      assert.equal(model.get('deep'), 5, 'Computed properties with deep dependancies inside objects recompute on change n levels deep.');

      // Reset
      model.get('obj.b.c').reset();
      assert.equal(model.get('deep'), 2, 'Computed properties with deep dependancies inside objects recompute on reset n levels deep.');

      model.get('obj').reset();
      assert.equal(model.get('deep'), 0, 'Computed properties with deep dependancies inside objects recompute on reset 1 level deep.');

    });

    QUnit.test('Deep collection dependancy re-compute', function( assert ){
      assert.expect(7);

      var model = new Model({

        arr: [{a:1}, {b: {c: {d: 2}}}],

        get sum(){
          return (this.get('arr[0].a') || 0) + (this.get('arr[1].b.c.d') || 0) + (this.get('arr[2].e') || 0);
        }

      });

      // Change
      assert.equal(model.get('sum'), 3, 'Computed properties with deep dependancies inside collections compute on first run.');
      model.set('arr[0].a', 2);
      assert.equal(model.get('sum'), 4, 'Computed properties with deep dependancies inside collections recompute on model change 1 level deep.');
      model.set('arr[1].b.c.d', 3);
      assert.equal(model.get('sum'), 5, 'Computed properties with deep dependancies inside collections recompute on model change n levels deep.');
      // Add/Remove
      model.get('arr').add({e: 3});
      assert.equal(model.get('sum'), 8, 'Computed properties with deep dependancies inside collections recompute on model add.');
      model.get('arr').pop();
      assert.equal(model.get('sum'), 5, 'Computed properties with deep dependancies inside collections recompute on model remove.');
      // Reset
      model.get('arr[1].b.c').reset();
      assert.equal(model.get('sum'), 2, 'Computed properties with deep dependancies inside collections recompute on model reset');
      model.get('arr').reset();
      assert.equal(model.get('sum'), 0, 'Computed properties with deep dependancies inside collections recompute on collection reset.');

    });

    QUnit.test('Depending on other computed properties - Value', function( assert ){
      assert.expect(5);

      var model = new Model({
        foo: 1,
        bar: 1,
        get sum(){
          return this.get('foo') + this.get('bar');
        },
        get sumProxy(){
          return this.get('sum');
        }
      });
      assert.equal(model.get('sumProxy'), 2, 'Computed properties depending on other computed properties evaluate on first run.');
      model.set('bar', 2);
      assert.equal(model.get('sumProxy'), 3, 'Computed properties depending on other computed properties re-evaluate on base-dependancy change.');
      window.foo = true;
      debugger;
      model.set('sum', 5);
      assert.equal(model.get('sumProxy'), 5, 'Computed properties depending on other computed properties re-evaluate on mid-dependancy change.');
      model.set('foo', 2);
      assert.equal(model.get('sumProxy'), 4, 'Computed properties re-evaluate after a mid-dependancy change when their dependancies change.');
      assert.equal(model.get('sumProxy'), 4, 'Computed properties depending on other computed properties re-evaluate on base-dependancy change after a mid-dependancy change.');

    });

    QUnit.test('Depending on other computed properties - Model', function( assert ){
      assert.expect(5);

      var model = new Model({
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
      assert.equal(model.get('objValue'), 1, 'Computed properties depending on other computed properties that rely on objects evaluate on first run.');
      assert.equal(model.get('objSum'), 3, 'Computed properties depending on other computed properties that rely on objects evaluate on first run.');
      model.set('obj.foo', 2);
      assert.equal(model.get('objValue'), 2, 'Computed properties depending on other computed properties that rely on objects re-evaluate on base dependancy change.');
      assert.equal(model.get('objSum'), 4, 'Computed properties depending on other computed properties that rely on objects re-evaluate on base dependancy change.');
      model.get('obj').reset();
      assert.equal(model.get('objValue'), 0, 'Computed properties depending on other computed properties that rely on objects re-evaluate on base dependancy reset.');

    });

    QUnit.test('Returning modified models', function( assert ){
      assert.expect(6);

      var model = new Model({
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

      model.set('objAbuse.test', true);
      equal(model.get('objAbuse.test'), true, 'Setting a modified model will set value until dependancy re-compute.');
      equal(model.get('obj.test'), void 0, 'Setting a modified model will not set source model.');

    });

    QUnit.test('Returning modified collection', function( assert ){
      assert.expect(12);

      var model = new Model({
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

    });

    QUnit.test('Rebound Data - Computed Properties', function( assert ) {
      var model, collection, model2, model3;


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
        set proxy(val){ // eslint-disable-line
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


      /********************************

       Custom Model Constructor

       Models with custom constructors (specifically idAttributes) can cause issues
       when resetting a Computed Property's cache object. The internal _byId hash,
       without some custom methods, cannot get the unique id of the proxied models.
       The fix is to always get the model's id using the Model's specified idAttribute,
       not the Collection's template Model's idAttribute. This allows for mixed-type
       models in a Collection.

      ********************************/

      class Model0 extends Model {
        idAttribute = 'val';
      }
      class Collection0 extends Collection {
        get model(){ return Model0; }
      }

      model = new Model0({

        arr: new Collection0([
          {val: 1, test: 1},{val: 2, test: 2},{val: 3, test: 1},{val: 4, test: 2},{val: 5, test: 1}
        ]),

        test: 1,

        get proxy(){
          var test = this.get('test');
          return this.get('arr').where({test: test});
        }

      });

      equal(model.get('proxy').length, 3, 'Computed Properties returning models with a custom idAttribue work on first compute.');
      model.set('test', 2);
      equal(model.get('proxy').length, 2, 'Computed Properties returning models with a custom idAttribue work on condition re-compute.');
      model.get('arr').push({val: 6, test: 2});
      equal(model.get('proxy').length, 3, 'Computed Properties returning models with a custom idAttribue work on collection add.');
      model.set('arr[2].test', 2);
      equal(model.get('proxy').length, 4, 'Computed Properties returning models with a custom idAttribue work on internal collection change.');

      // Deep Custom idAttributes
      class Model1 extends Model {
        get idAttribute() { return 'val.id'; }
      }
      class Collection1 extends Collection {
        get model(){ return Model1; }
      }

      model = new Model1({

        arr: new Collection1([
          {val: {id: 1}, test: 1},
          {val: {id: 2}, test: 2},
          {val: {id: 3}, test: 1},
          {val: {id: 4}, test: 2},
          {val: {id: 5}, test: 1}
        ]),

        test: 1,

        get proxy(){
          var test = this.get('test');
          return this.get('arr').where({test: test});
        }

      });

      model.set('test', 2);
      equal(model.get('proxy[0]').id, 2, 'Custom deep idAttributes on Models are totally a thing. Collections will defer to the model for its idAttribute.');
      equal(model.get('proxy').length, 2, 'Computed Properties returning models with a custom deep idAttribues don\' screw up Collection cache re-compute.');

      // Proxied object uniqueness
      class Model2 extends Model {
        get defaults() { return {foo: 'bar'}; }
      }
      class Collection2 extends Collection {
        get model(){ return Model2; }
        custom = true;
      }

      model = new Model2({

        arr: new Collection2([{one: 1}, {two: 2}, {three: 3}]),

        get proxy(){
          return this.get('arr');
        }

      });

      assert.ok(model.get('proxy[0]') !== model.get('arr[0]'), 'Models returned from a proxied collection are not the same object.');
      equal(model.get('proxy[0]').cid, model.get('arr[0]').cid, 'Models returned from a proxied collection share a cid.');
      equal(model.get('proxy').custom, model.get('arr').custom, 'Proxied objects retain their constructor specific properties.');


    });
  });
};
