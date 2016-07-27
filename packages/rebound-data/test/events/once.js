import { Events } from "rebound-data/rebound-data";

export default function tests(){

  class TestObject extends Events {
    constructor(){
      super();
      this.counter = 0;
      this.counterA = 0;
      this.counterB = 0;
    }
  }

  QUnit.module("Once", function(){

    QUnit.test('variant one', function(assert) {
      assert.expect(2);
      // Same as the previous test, but we use once rather than having to explicitly unbind
      var obj = new TestObject();
      var incrA = function(){ obj.counterA += 1; obj.trigger('event'); };
      var incrB = function(){ obj.counterB += 1; };
      obj.once('event', incrA);
      obj.once('event', incrB);
      obj.trigger('event');
      assert.equal(obj.counterA, 1, 'counterA should have only been incremented once.');
      assert.equal(obj.counterB, 1, 'counterB should have only been incremented once.');
    });

    QUnit.test('variant two', function(assert) {
      assert.expect(3);
      var f = function(){ assert.ok(true); };

      var a = new TestObject();
      var b = new TestObject();

      a.once('event', f);
      b.on('event', f);

      a.trigger('event');

      b.trigger('event');
      b.trigger('event');
    });

    QUnit.test('variant three', function(assert) {
      assert.expect(3);
      var f = function(){ assert.ok(true); };
      var obj = new TestObject();

      obj
        .once('event', f)
        .on('event', f)
        .trigger('event')
        .trigger('event');
    });

    QUnit.test('once with off', function(assert) {
      assert.expect(0);
      var f = function(){ assert.ok(true); };
      var obj = new TestObject();

      obj.once('event', f);
      obj.off('event', f);
      obj.trigger('event');
    });

    QUnit.test('once accepts event maps', function(assert) {
      var obj = new TestObject();

      var increment = function() {
        this.counter += 1;
      };

      obj.once({
        a: increment,
        b: increment,
        c: increment
      }, obj);

      obj.trigger('a');
      assert.equal(obj.counter, 1);

      obj.trigger('a b');
      assert.equal(obj.counter, 2);

      obj.trigger('c');
      assert.equal(obj.counter, 3);

      obj.trigger('a b c');
      assert.equal(obj.counter, 3);
    });

    QUnit.test('bind a callback with a supplied context with object notation', function(assert) {
      assert.expect(1);
      var obj = new TestObject();
      var context = {};

      obj.once({
        a: function() {
          assert.strictEqual(this, context, 'defaults `context` to `callback` param');
        }
      }, context).trigger('a');
    });

    QUnit.test('once with off only by context', function(assert) {
      assert.expect(0);
      var context = {};
      var obj = new TestObject();
      obj.once('event', function(){ assert.ok(false); }, context);
      obj.off(null, null, context);
      obj.trigger('event');
    });


    QUnit.test('once with asynchronous events', function(assert) {
      var done = assert.async();
      assert.expect(1);
      var func = _.debounce(function() { assert.ok(true); done(); }, 50);
      var obj = new TestObject();

      obj.once('async', func);

      obj.trigger('async');
      obj.trigger('async');
    });

    QUnit.test('once with multiple events.', function(assert) {
      assert.expect(2);
      var obj = new TestObject();
      obj.once('x y', function() { assert.ok(true); });
      obj.trigger('x y');
    });

    QUnit.test('off during iteration with once.', function(assert) {
      assert.expect(2);
      var obj = new TestObject();
      var f = function(){ this.off('event', f); };
      obj.on('event', f);
      obj.once('event', function(){});
      obj.on('event', function(){ assert.ok(true); });

      obj.trigger('event');
      obj.trigger('event');
    });

    QUnit.test('`once` on `all` should work as expected', function(assert) {
      assert.expect(1);
      var obj = new TestObject();

      obj.once('all', function() {
        assert.ok(true);
        obj.trigger('all');
      });
      obj.trigger('all');
    });

    QUnit.test('once without a callback is a noop', function(assert) {
      assert.expect(0);
      var obj = new TestObject();
      obj.once('event').trigger('event');
    });

    
    QUnit.test('if callback is truthy but not a function, `on` should throw an error just like jQuery', function(assert) {
      assert.expect(1);
      var obj = new TestObject();
      obj.once('test', 'noop');
      assert.raises(function() {
        obj.trigger('test');
      });
    });
  });
}