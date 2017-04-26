import { Model, Collection } from "rebound-data/rebound-data";

export default function tests(){
  QUnit.module("Set", function(){

    QUnit.test('set', function(assert) {
      var m1 = new Model();
      var m2 = new Model({id: 2});
      var m3 = new Model();
      var collection = new Collection([m1, m2]);

      // Test add/change/remove events
      collection.on('add', function(model) {
        assert.strictEqual(model, m3, 'Add event receives model on set');
      });
      collection.on('change', function(model) {
        assert.strictEqual(model, m2, 'Change event receives model on set');
      });
      collection.on('remove', function(model) {
        assert.strictEqual(model, m1, 'Remove event receives model on set');
      });

      collection.set([], {remove: false});
      assert.strictEqual(collection.length, 2, 'Remove: false doesn\'t remove any models');

      collection.set([m1, m2, m3], {add: false});
      assert.strictEqual(collection.length, 2, "Add: false doesn't add any models");

      collection.set([m1, {id: 2, a: 1}], {merge: false});
      assert.strictEqual(m2.get('a'), void 0), "Merge: false doesn't change any models";

      window.foo = true;
      collection.set([m1, {id: 2, a: 0}, m3, {id: 4}], {add: false, remove: false});
      assert.strictEqual(collection.length, 2, "Add: false, remove: false only merges existing models – length");
      assert.strictEqual(m2.get('a'), 0, "Add: false, remove: false only merges existing models – content");

      collection.set([{id: 2, a: 1}, m3]);
      assert.strictEqual(collection.length, 2, "Default options add/remove/merge as appropriate – length");
      assert.strictEqual(m2.get('a'), 1, "Default options add/remove/merge as appropriate – content");

      collection.off('remove').on('remove', function(model) {
        assert.ok(model === m2 || model === m3, "Set with empty array removes all models and triggers `remove`");
      });
      collection.set([]);
      assert.strictEqual(collection.length, 0, "Set with empty array removes all models");

      collection.off();
      collection.set([{id: 1}]);
      collection.set();
      assert.strictEqual(collection.length, 1, "Null models on set doesn't clear collection");
    });
    //
    // QUnit.test('set with only cids', function(assert) {
    //   assert.expect(3);
    //   var m1 = new Model;
    //   var m2 = new Model;
    //   var collection = new Collection;
    //   collection.set([m1, m2]);
    //   assert.equal(collection.length, 2);
    //   collection.set([m1]);
    //   assert.equal(collection.length, 1);
    //   collection.set([m1, m1, m1, m2, m2], {remove: false});
    //   assert.equal(collection.length, 2);
    // });
    //
    // QUnit.test('set with only idAttribute', function(assert) {
    //   assert.expect(3);
    //   var m1 = {_id: 1};
    //   var m2 = {_id: 2};
    //   var Col = Collection.extend({
    //     model: Model.extend({
    //       idAttribute: '_id'
    //     })
    //   });
    //   var collection = new Col;
    //   collection.set([m1, m2]);
    //   assert.equal(collection.length, 2);
    //   collection.set([m1]);
    //   assert.equal(collection.length, 1);
    //   collection.set([m1, m1, m1, m2, m2], {remove: false});
    //   assert.equal(collection.length, 2);
    // });
    //
    // QUnit.test('set + merge with default values defined', function(assert) {
    //   var Model = Model.extend({
    //     defaults: {
    //       key: 'value'
    //     }
    //   });
    //   var m = new Model({id: 1});
    //   var collection = new Collection([m], {model: Model});
    //   assert.equal(collection.first().get('key'), 'value');
    //
    //   collection.set({id: 1, key: 'other'});
    //   assert.equal(collection.first().get('key'), 'other');
    //
    //   collection.set({id: 1, other: 'value'});
    //   assert.equal(collection.first().get('key'), 'other');
    //   assert.equal(collection.length, 1);
    // });
    //
    // QUnit.test('merge without mutation', function(assert) {
    //   var Model = Model.extend({
    //     initialize: function(attrs, options) {
    //       if (attrs.child) {
    //         this.set('child', new Model(attrs.child, options), options);
    //       }
    //     }
    //   });
    //   var Collection = Collection.extend({model: Model});
    //   var data = [{id: 1, child: {id: 2}}];
    //   var collection = new Collection(data);
    //   assert.equal(collection.first().id, 1);
    //   collection.set(data);
    //   assert.equal(collection.first().id, 1);
    //   collection.set([{id: 2, child: {id: 2}}].concat(data));
    //   assert.deepEqual(collection.pluck('id'), [2, 1]);
    // });
    //
    // QUnit.test('`set` and model level `parse`', function(assert) {
    //   var Model = Model.extend({});
    //   var Collection = Collection.extend({
    //     model: Model,
    //     parse: function(res) { return _.map(res.models, 'model'); }
    //   });
    //   var model = new Model({id: 1});
    //   var collection = new Collection(model);
    //   collection.set({models: [
    //     {model: {id: 1}},
    //     {model: {id: 2}}
    //   ]}, {parse: true});
    //   assert.equal(collection.first(), model);
    // });
    //
    // QUnit.test('`set` data is only parsed once', function(assert) {
    //   var collection = new Collection();
    //   collection.model = Model.extend({
    //     parse: function(data) {
    //       assert.equal(data.parsed, void 0);
    //       data.parsed = true;
    //       return data;
    //     }
    //   });
    //   collection.set({}, {parse: true});
    // });
    //
    // QUnit.test('`set` matches input order in the absence of a comparator', function(assert) {
    //   var one = new Model({id: 1});
    //   var two = new Model({id: 2});
    //   var three = new Model({id: 3});
    //   var collection = new Collection([one, two, three]);
    //   collection.set([{id: 3}, {id: 2}, {id: 1}]);
    //   assert.deepEqual(collection.models, [three, two, one]);
    //   collection.set([{id: 1}, {id: 2}]);
    //   assert.deepEqual(collection.models, [one, two]);
    //   collection.set([two, three, one]);
    //   assert.deepEqual(collection.models, [two, three, one]);
    //   collection.set([{id: 1}, {id: 2}], {remove: false});
    //   assert.deepEqual(collection.models, [two, three, one]);
    //   collection.set([{id: 1}, {id: 2}, {id: 3}], {merge: false});
    //   assert.deepEqual(collection.models, [one, two, three]);
    //   collection.set([three, two, one, {id: 4}], {add: false});
    //   assert.deepEqual(collection.models, [one, two, three]);
    // });
    //
    // QUnit.test("Set", function(assert) {
    //   var model, collection, events;
    //
    // // Normal Set
    //   events = [];
    //   model = new Model();
    //   collection = new Collection();
    //   model.set('coll', collection);
    //   model.on('all', function(type, a1, a2={}, a3={}){
    //     events.push(type);
    //   });
    //
    //   collection.set({a: true, obj: { str: 'foo' }});
    //   equal(collection.length, 1, 'Collection.set sets the collection length');
    //   equal(collection.models[0].isModel, true, 'Collection.set promotes vanilla objects to Models');
    //   deepEqual(collection.toJSON(), [{a: true, obj: {str: 'foo'}}], 'Collection.set retains vanilla object content when added');
    //
    //   deepEqual(collection.changed(), {
    //     '[0]': collection.at(0),
    //     '[0].a': true,
    //     '[0].obj': collection.get('[0].obj'),
    //     '[0].obj.str': 'foo'
    //   }, 'Collection.set has the correct changed after add of nested vanilla object');
    //   deepEqual(events, [
    //     "dirty",
    //     "change:coll[0].obj.str",
    //     "change:coll[0].a",
    //     "change:coll[0].obj",
    //     "update:coll[0]",
    //     "add:coll[0]",
    //     "add:coll",
    //     "update:coll",
    //     "clean"
    //   ], "Events are triggered in the right order when vanilla object is added");
    //
    //   collection.set({obj3:{a:true}});
    //   equal(collection.length, 2, 'Collection.set increments the collection length');
    //   deepEqual(collection.toJSON(), [{a:true, obj: { str: 'foo' }}, {obj3:{a:true}}], 'Collection.set adds to the end of list by default');
    //   deepEqual(collection.changed(), {
    //     '[1]': collection.at(1),
    //     '[1].obj3': collection.get('[1].obj3'),
    //     '[1].obj3.a': true
    //   }, 'Collection.set has the correct changed after add of nested vanilla object');
    //
    // // Set with internal Collections
    //   collection = new Collection();
    //   collection.set({obj2:[{a:1}]});
    //   equal(collection.models[0].attributes.obj2.isCollection, true, 'Collection.set promotes nested vanilla arrays to Collections');
    //   deepEqual(collection.changed(), {
    //     '[0]': collection.at(0),
    //     '[0].obj2': collection.get('[0].obj2'),
    //     '[0].obj2[0]': collection.get('[0].obj2[0]'),
    //     '[0].obj2[0].a': 1
    //   }, 'Collection.set has the correct changed after set of nested vanilla arrays');
    //
    // // Deep path set
    //   collection = new Collection([{str: 'foo'}]);
    //   collection.set('[0].str', 'bar');
    //   deepEqual(collection.toJSON(), [{str: 'bar'}], 'Collection.set can accept a path to call the .set at');
    //
    // // Across Collections
    //   collection = new Collection([{arr: [{ str: 'foo'}] }]);
    //   collection.set('[0].arr[0].str', 'bar');
    //   deepEqual(collection.toJSON(), [{arr: [{ str: 'bar'}] }], 'Collection.set can accept a path to call the .set at and works across internal collections');
    //
    // // Set, add=false
    //   events = [];
    //   collection = new Collection([{id: 1}, {id: 2}]);
    //   debugger;
    //   collection.set([{id: 1, str: 'foo'}, {id: 3}], {add: false});
    //   collection.on('all', function(type){ events.push(type); });
    //   deepEqual(collection.toJSON(), [{id: 1, str: 'foo'}, {id: 2}], 'Collection.set correctly sets (merges objects and adds, does not remove) with options.add=false');
    //   deepEqual(events, [], 'Events are triggered correctly for set with add=false');
    //
    // // Set, remove=true
    //   collection = new Collection([{id: 1}, {id: 2}]);
    //   collection.set([{id: 1, str: 'foo'}, {id: 3}], {remove: true});
    //   deepEqual(collection.toJSON(), [{id: 1, str: 'foo'}, {id: 3}], 'Collection.set correctly sets (merges objects, adds and removes) with options.remove=true');
    //
    //   events = [];
    //   collection = new Collection([{id: 1}, {id: 2}, {str: 'bar'}]);
    //   collection.on('all', function(type){ events.push(type); });
    //   collection.set([{id: 1, str: 'foo'}, {id: 3}], {remove: true});
    //   deepEqual(collection.toJSON(), [{id: 1, str: 'foo'}, {id: 3}], 'Collection.set correctly sets (merges objects, adds and removes) with options.remove=true, including models with no id');
    //   deepEqual(events, [
    //     "dirty",
    //     "change:[0].str",
    //     "update:[0]",
    //     "remove:[1]",
    //     "remove",
    //     "remove:[2]",
    //     "remove",
    //     "change:[1].id",
    //     "update:[1]",
    //     "add:[1]",
    //     "add",
    //     "sort",
    //     "update",
    //     "clean"
    //   ], 'Events are triggered correctly for set with remove=true');
    //
    // // Set, merge=false
    //   events = [];
    //   collection = new Collection([{id: 1}, {id: 2}]);
    //   collection.on('all', function(type){ events.push(type); });
    //   collection.set([{id: 1, str: 'foo'}, {id: 3}], {merge: false});
    //   deepEqual(collection.toJSON(), [{id: 1}, {id: 2}, {id: 3}], 'Collection.set correctly sets (adds, does not remove or merge) with options.merge=false');
    //   deepEqual(events, [
    //     "dirty",
    //     "change:[2].id",
    //     "update:[2]",
    //     "add:[2]",
    //     "add",
    //     "update",
    //     "clean"
    //   ], 'Events are triggered correctly for set with merge=false');
    //
    // // Set, parse=true
    //   events = [];
    //   collection = new Collection([{id: 1}, {id: 2}]);
    //   collection.on('all', function(type){ events.push(type); });
    //   collection.parse = function(models){ models.forEach(function(model){ model.parsed = true}); return models;  }
    //   collection.set([{id: 1, str: 'foo'}, {id: 3}], {parse: true});
    //   deepEqual(collection.toJSON(), [{id: 1, str: 'foo', parsed: true}, {id: 2}, {id: 3, parsed: true}], 'Collection.set calls the parse function on merged and added models with options.parse=true');
    //   deepEqual(events, [
    //     "dirty",
    //     "change:[0].str",
    //     "change:[0].parsed",
    //     "update:[0]",
    //     "change:[2].id",
    //     "change:[2].parsed",
    //     "update:[2]",
    //     "add:[2]",
    //     "add",
    //     "update",
    //     "clean"
    //   ], 'Events are triggered correctly for set with parse=true');
    //
    // // Set, with comparator
    //   events = [];
    //   collection = new Collection([{id: 1, order: 3}, {id: 2, order: 2}]);
    //   collection.on('all', function(type){ events.push(type); });
    //   collection.comparator = 'order';
    //   collection.set([{id: 3, order: 1}]);
    //   deepEqual(collection.toJSON(), [{id: 3, order: 1}, {id: 2, order: 2}, {id: 1, order: 3}], 'Collection.set, when called on a Collection with a comparator, stays in sorded order on set');
    //   deepEqual(events, [
    //     "dirty",
    //     "change:[2].id",
    //     "change:[2].order",
    //     "update:[2]",
    //     "add:[2]",
    //     "add",
    //     "sort",
    //     "update",
    //     "clean"
    //   ], 'Events are triggered correctly for set with sort');
    //
    //
    // // Set, silent=true
    //   events = [];
    //   collection = new Collection([{id: 1, order: 3}, {id: 2, order: 2}]);
    //   collection.on('all', function(type){ events.push(type); });
    //   collection.comparator = 'order';
    //   collection.set([{id: 3, order: 1}], {silent: true});
    //   deepEqual(events, [], 'No events are triggered when options.silent=true');
    //
    //
    // // Custom Model Constructors, without clone=false
    //   var CustomModel = Model.extend({
    //     toJSON: function(){
    //       return 'works';
    //     },
    //     idAttribute: 'foo.bar'
    //   });
    //
    //   model = new CustomModel({foo: {bar: 123}});
    //   collection = new Collection();
    //   collection.set({id: 1});
    //   collection.set(model);
    //   deepEqual(collection.toJSON(), [{id: 1}, 'works'], 'Customized models added to a collection retain their custom attributes when added to the collection');
    //   equal(model.cid, collection._byId[123].cid, 'Collections defer to the custom Model\'s id attribute when getting Model ids.');
    //   assert.ok(collection.at(1) === model, 'By default, set will not clone data objects added to Collections');
    //
    // // Custom Model Constructors, clone=true
    //   model = new CustomModel({foo: {bar: 123}});
    //   collection = new Collection();
    //   collection.set({id: 1});
    //   collection.set(model, {clone: true});
    //   deepEqual(collection.toJSON(), [{id: 1}, 'works'], 'When options.clone, customized models added to a collection retain their custom attributes when added to the collection');
    //   equal(model.cid, collection._byId[123].cid, 'When options.clone, collections defer to the custom Model\'s id attribute when getting Model ids.');
    //   assert.ok(collection.at(1) !== model, 'When options.clone is true, set will clone data objects added to Collections');
    //
    //
    // });

  });
};
