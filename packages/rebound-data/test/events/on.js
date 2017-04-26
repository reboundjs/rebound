import { Events } from "rebound-data/rebound-data";

export default function (){

  class TestObject extends Events {
    constructor(){
      super();
      this.counter = 0;
      this.counterA = 0;
      this.counterB = 0;
    }
  }

  QUnit.module('On', function(){

    QUnit.test('Single Events', function(assert) {
      assert.expect(2);
      var obj = new TestObject();

      obj.on('event', function() { obj.counter += 1; });
      obj.trigger('event');
      assert.equal(obj.counter, 1, 'On and Trigger calls the callback.');
      obj.trigger('event');
      obj.trigger('event');
      obj.trigger('event');
      obj.trigger('event');
      assert.equal(obj.counter, 5, 'On and Trigger calls the callback multiple times.');
    });

    QUnit.test('Multiple Events', function(assert) {
      assert.expect(4);
      var obj = new TestObject();

      obj.on('a b c', function() { obj.counter += 1; });

      obj.trigger('a');
      assert.equal(obj.counter, 1, "On will bind the first of multiple space seperated events");

      obj.trigger('a b');
      assert.equal(obj.counter, 3, "On and Trigger both work with multiple space seperated events");

      obj.trigger('c');
      assert.equal(obj.counter, 4, "On approprately binds all space seperated events");

      obj.off('a c');
      obj.trigger('a b c');
      assert.equal(obj.counter, 5, "On approprately binds all space seperated events");
    });

    QUnit.test('Event Maps', function(assert) {
      var obj = new TestObject();

      var increment = function() {
        this.counter += 1;
      };

      obj.on({
        a: increment,
        b: increment,
        c: increment
      }, obj);

      obj.trigger('a');
      assert.equal(obj.counter, 1);

      obj.trigger('a b');
      assert.equal(obj.counter, 3);

      obj.trigger('c');
      assert.equal(obj.counter, 4);

      obj.off({
        a: increment,
        c: increment
      }, obj);
      obj.trigger('a b c');
      assert.equal(obj.counter, 5);
    });

    QUnit.test('Triggering Multiple Events with Event Maps', function(assert) {
      var obj = new TestObject();

      var increment = function() {
        this.counter += 1;
      };

      obj.on({
        'a b c': increment
      });

      obj.trigger('a');
      assert.equal(obj.counter, 1);

      obj.trigger('a b');
      assert.equal(obj.counter, 3);

      obj.trigger('c');
      assert.equal(obj.counter, 4);

      obj.off({
        'a c': increment
      });
      obj.trigger('a b c');
      assert.equal(obj.counter, 5);
    });

    QUnit.test('binding and trigger with event maps context', function(assert) {
      assert.expect(2);
      var obj = new TestObject();
      var context = {};

      obj.on({
        a: function() {
          assert.strictEqual(this, context, 'defaults `context` to `callback` param');
        }
      }, context).trigger('a');

      obj.off().on({
        a: function() {
          assert.strictEqual(this, context, 'will not override explicit `context` param');
        }
      }, this, context).trigger('a');
    });


    QUnit.test('bind a callback with a default context when none supplied', function(assert) {
      assert.expect(1);

      class TestClass extends Events {
        assertTrue() {
          assert.equal(this, obj, '`this` was bound to the callback');
        }
      }

      var obj = new TestClass();

      obj.on('event', obj.assertTrue);
      obj.trigger('event');
    });

    QUnit.test('bind a callback with a supplied context', function(assert) {
      assert.expect(1);

      class TestClass extends Events {
        assertTrue() {
          assert.ok(true, '`this` was bound to the callback');
        }
      }

      var obj = new TestClass();

      obj.on('event', function() { this.assertTrue(); }, obj);
      obj.trigger('event');
    });

    QUnit.test('if no callback is provided, `on` is a noop', function(assert) {
      assert.expect(0);
      var obj = new TestObject();
      obj.on('test').trigger('test');
    });

    QUnit.test('if callback is truthy but not a function, `on` should throw an error just like jQuery', function(assert) {
      assert.expect(1);
      var obj = new TestObject();
      obj.on('test', 'noop');
      assert.raises(function() {
        obj.trigger('test');
      });
    });

    QUnit.test('Event Delgation: single @each', function(assert) {
      assert.expect(1);
      var obj = new TestObject();
      obj.on('test:foo.@each', function(){
        assert.ok(true, 'Delegated callback called');
      });
      obj.trigger('test');
      obj.trigger('test:foo');
      obj.trigger('test:foo.bar');
      obj.trigger('test:foo.bar.baz');
      obj.trigger('test2:foo.bar');
      obj.trigger('test2:foo.bar.baz');
    });

    QUnit.test('Event Delgation: multiple @each', function(assert) {
      assert.expect(2);
      var obj = new TestObject();
      obj.on('test:foo.@each.biz.@each', function(){
        assert.ok(true, 'Delegated callback called');
      });
      obj.trigger('test');
      obj.trigger('test:foo.');
      obj.trigger('test:foo.bar');
      obj.trigger('test:foo.bar.biz');
      obj.trigger('test:foo.bar.biz.baz');
      obj.trigger('test:foo.baz.biz.bar');
      obj.trigger('test:foo.baz.biz.bar.asdf');
    });

    QUnit.test('Event Delgation: @each with bracket notation', function(assert) {
      assert.expect(3);
      var obj = new TestObject();
      obj.on('test:foo.@each[10]', function(){
        assert.ok(true, 'Delegated callback called with value in brackets');
      });
      obj.on('test:foo.bar[@each]', function(){
        assert.ok(true, 'Delegated callback called with `@each` in brackets was not called like a wildcard');
      });
      obj.trigger('test');
      obj.trigger('test:foo.');
      obj.trigger('test:foo.bar');
      obj.trigger('test:foo[12][10]');
      obj.trigger('test:foo.baz[10]');
      obj.trigger('test:foo.bar[11]');
      obj.trigger('test:foo.bar.biz');
      obj.trigger('test:foo.bar[@each]');
    });

    QUnit.test('Event Delgation: @all', function(assert) {
      assert.expect(3);
      var obj = new TestObject();
      obj.on('test:foo.@all', function(){
        assert.ok(true, 'Delegated callback called');
      });
      obj.trigger('test');
      obj.trigger('test:foo');
      obj.trigger('test:foo.bar');
      obj.trigger('test:foo.bar.baz');
    });

    QUnit.test('Event Delgation: @all with no path', function(assert) {
      assert.expect(5);
      var obj = new TestObject();
      obj.on('test', function(){
        assert.ok(true, 'Non-delegated callback called');
      });
      obj.on('test:@all', function(){
        assert.ok(true, 'Delegated callback called');
      });
      obj.trigger('test');
      obj.trigger('test:foo');
      obj.trigger('test:foo.bar');
      obj.trigger('test:foo.bar.baz');
    });

    QUnit.test('Event Delgation: @each and @all', function(assert) {
      assert.expect(2);
      var obj = new TestObject();
      obj.on('test:foo.@each.biz.@all', function(){
        assert.ok(true, 'Delegated callback called');
      });
      obj.trigger('test');
      obj.trigger('test:foo');
      obj.trigger('test:foo.bar');
      obj.trigger('test:foo.bar.biz'); // triggers
      obj.trigger('test:foo.bar.baz');
      obj.trigger('test:foo.bar.biz.baz'); // triggers

    });

  });
}
