import { Model, Collection } from 'rebound-data/rebound-data';

window.Rebound.Model = Model;
window.Rebound.Collection = Collection;

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

QUnit.test('Rebound Data - Model', function() {
  var model, collection, model2, model3;

// Shallow Set - Primitive Values
  model = new Model();
  model.set('str', 'test');
  model.set('int', 1);
  model.set('bool', false);
  deepEqual( model.attributes, {str: 'test', int: 1, bool: false}, 'Model.set works with primitive values at top level' );

// Shallow Set - Primitive Value Constructors
  model = new Model();
  model.set('str', new String('test')); // jshint ignore:line
  model.set('int', new Number(1)); // jshint ignore:line
  model.set('bool', new Boolean(false)); // jshint ignore:line
  deepEqual( model.attributes, {str: 'test', int: 1, bool: false}, 'Model.set works with primitive values created by primitive contructors' );



// Shallow Toggle Boolean Values
  model.toggle('bool');
  deepEqual( model.attributes, {str: 'test', int: 1, bool: true}, 'Model.toggle works with boolean values at top level' );

// Shallow Set - Complex Objects
  model = new Model();
  model.set('obj', {a:1});
  equal(model.attributes.obj.isModel, true, 'Model.set promotes vanilla objects to Models');
  model.set('obj', {bool:false});
  deepEqual(model.attributes.obj.attributes, {a:1, bool:false}, 'Model.set adds to existing models when passed vanilla objects');

// Deep Set - Primitive Values
  model.set('obj.a', 2);
  deepEqual(model.attributes.obj.attributes.a, 2, 'Model.set automatically creates extra models where needed');

// Deep Set - Complex Objects
  model.set('obj', {b: 3});
  deepEqual(model.attributes.obj.attributes.b, 3, 'Model.set automatically creates extra models where needed');
  deepEqual(model.attributes.obj.attributes.a, 2, 'Model.set does not destroy existing values');

// Deep Set - Auto Object Creation
  model.set('depth.test', 1);
  deepEqual(model.attributes.depth.attributes.test, 1, 'Model.set automatically creates extra models where needed');

// Deep Toggle
  model.toggle('obj.bool');
  deepEqual(model.attributes.obj.attributes, {a:2, b:3, bool:true}, 'Model.toggle works with nested boolean values');



  model = new Model();
  model2 = new Model({b:2});
  model.set('obj', model2);
  equal('c' + ((parseInt(model2.cid.replace('c', ''))) + 1), model.attributes.obj.cid, 'Model.set, when passed another model, clones that model.');
  model3 = new Model({c:3});
  var cid = model.attributes.obj.cid;
  model.set('obj', model3);
  equal(model.attributes.obj.cid, cid, 'Model.set, when passed another model, merges with the existing model.');
  deepEqual(model.attributes.obj.attributes, {b: 2, c: 3}, 'Model.set, when passed another model, merges their attributes.');



  model = new Model();
  model.set('arr', [{a:1}]);
  equal(model.attributes.arr.isCollection, true, 'Model.set promotes vanilla arrays to Collections');



  model = new Model();
  model.set('obj', {obj2:{a:1}});
  equal(model.attributes.obj.attributes.obj2.isModel, true, 'Model.set promotes nested vanilla objects to Models');



  model = new Model();
  model.set('test', 'foo');
  equal(model.get('test'), 'foo', 'Model.get works 1 level deep');



  model = new Model();
  model.set('test', {'test2': {'test3': 'foo'}});
  equal(model.get('test.test2.test3'), 'foo', 'Model.get works n levels deep - Models only');

  model = new Model();
  model.set('test', {'test2': [{'test3': 'foo'}]});
  equal(model.get('test.test2[0].test3'), 'foo', 'Model.get works n levels deep - Collections included');
  equal(model.get('test.test2').__path(), 'test.test2', 'Nested Models inherit path of parents');
  equal(model.get('test.test2[0]').__path(), 'test.test2[0]', 'Nested Collections inherit path of parents');
  deepEqual(model.toJSON(), {'test': {'test2': [{'test3': 'foo'}]}}, 'Model\'s toJSON method is recursive');

  model.set('test.test2.[0].test3', model);
  deepEqual(model.toJSON(), {'test': {'test2': [{'test3': model.cid}]}}, 'Model\'s toJSON handles cyclic dependancies');

  equal(model.get('test').__parent__.cid, model.cid, 'Model\'s ancestery is set when child of a Model');
  deepEqual(model.get('test.test2[0]').__parent__, model.get('test.test2'), 'Model\'s ancestry is set when child of a Collection');


  model.on('change', function(model, options){
    deepEqual(model.changedAttributes(), {test3: 'foo'}, 'Events are propagated up to parent');
  });
  model.set('test.test2.[0].test3', 'foo');


  collection = Collection.extend({
    model: Model.extend({
      defaults: {
        test: true
      }
    })
  });
  model = new Model({
    prop: true,
    arr: (new collection()),
    obj: { foo: {bar: 'bar'} },
    get func(){
      return this.get('obj');
    }
  });
  model.set('arr', [{foo: 'bar'}, {biz: 'baz'}, {test: false}]);
  deepEqual(model.toJSON(), {prop: true, 'arr': [{foo: 'bar', test: true}, {biz: 'baz', test: true}, {test: false}], obj: {foo: {bar: 'bar'}}, func: {foo: {bar: 'bar'}}}, 'Defaults set in a component are retained');

  model.reset({prop: false, arr: [{id: 1}], obj: {foo: {test: true}}});
  notify(model, 'obj');
  deepEqual(model.toJSON(), {prop: false, arr: [{id: 1, test: true}], obj: {foo: {test: true}}, func: {foo: {test: true}}}, 'Calling reset() with new values on a model resets it with these new values');
  deepEqual(model.changed, {prop: false, arr: [{id: 1}], obj: {foo: {bar: undefined, test: true}}, func: {foo: {bar: undefined}}}, 'Calling reset() with new values on a model resets it with these new values and properly sets its changed property.');

  model.reset();
  notify(model, 'obj');
  deepEqual(model.toJSON(), {arr: [], obj: {foo: {}}, func: {foo: {}}}, 'Calling reset() on a model resets all of its properties and children');


  model = new Model({foo: {bar: 1}});
  model.set('foo.bar', {a:1});
  deepEqual(model.toJSON(), {foo: {bar: {a: 1}}}, 'Setting a deep existing value to a complex object with .set results in the correct object.');
  deepEqual(model.get('foo.bar').__parent__.cid, model.get('foo').cid, 'Setting a deep existing value to a complex object with .set results in the correct object.');


  model = new Model();
  model.set('a.b.c', {d: 1});
  deepEqual(model.toJSON(), {a: {b: {c: {d: 1}}}}, 'Calling set on a deep object that does not exist creates it.');
  equal(model.get('a.b.c').__parent__.cid, model.get('a.b').cid, 'Deep Models\' ancestery is set when automatically generating objects.');
  equal(model.get('a.b').__parent__.cid, model.get('a').cid, 'Deep Models\' ancestery is set when automatically generating objects.');
  equal(model.get('a').__parent__.cid, model.cid, 'Deep Models\' ancestery is set when automatically generating objects.');


  model = new Model({
    a: {
      b: {
        c: {
          d: 0
        }
      }
    }
  });

  model.get('a.b.c').on('change:d', function(model, value, options){
    equal(model.get('d'), value, 'Change events propagated with proper name on the object that changed');
  });
  model.get('a.b').on('change:c.d', function(model, value, options){
    equal(model.get('d'), value, 'Change events propagated with proper name 1 layer up');
  });
  model.get('a').on('change:b.c.d', function(model, value, options){
    equal(model.get('d'), value, 'Change events propagated with proper name 2 layers up');
  });
  model.on('change:a.b.c.d', function(model, value, options){
    equal(model.get('d'), value, 'Change events propagated with proper name on root');
  });
  model.set('a.b.c.d', 1);


  var NewModel = Model.extend({
    defaults: {
      val: 'foo',
      get prop(){
        return this.get('val');
      }
    }
  });

  model = new NewModel();

  equal(model.get('prop'), model.get('val'), 'Extended Rebound models with a computed property in its defaults hash are parsed succesfully.');




});

// When set is called with option: {defaults: true}, it sets the defaults object to the property passed.
