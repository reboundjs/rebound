import { Events } from "rebound-data/rebound-data";

export default function tests(){

  class TestObject extends Events {
    constructor(){
      super();
      this.counter = 0;
      this.counterA = 0;
      this.counterB = 0;
    }

    // Expose the private events channel for testing
    get _events(){
      return this[Object.getOwnPropertySymbols(this).filter((sym) => { return !!~sym.toString().indexOf("Rebound-Events"); })[0]];
    }
  }

  QUnit.module("ListenToOnce", function(){

    QUnit.test('listenToOnce', function(assert) {
      assert.expect(2);
      // Same as the previous test, but we use once rather than having to explicitly unbind
      var obj = new TestObject();

      var incrA = function(){ obj.counterA += 1; obj.trigger('event'); };
      var incrB = function(){ obj.counterB += 1; };
      obj.listenToOnce(obj, 'event', incrA);
      obj.listenToOnce(obj, 'event', incrB);
      obj.trigger('event');
      assert.equal(obj.counterA, 1, 'counterA should have only been incremented once.');
      assert.equal(obj.counterB, 1, 'counterB should have only been incremented once.');
    });

    QUnit.test('listenToOnce without context cleans up references after the event has fired', function(assert) {
      assert.expect(2);
      var a = new TestObject();
      var b = new TestObject();
      a.listenToOnce(b, 'all', function(){ assert.ok(true); });
      b.trigger('anything');
      assert.equal(_.size(a._events.listeningTo), 0);
    });

    QUnit.test('listenToOnce with event maps cleans up references', function(assert) {
      assert.expect(2);
      var a = new TestObject();
      var b = new TestObject();
      a.listenToOnce(b, {
        one: function() { assert.ok(true); },
        two: function() { assert.ok(false); }
      });
      b.trigger('one');
      assert.equal(_.size(a._events.listeningTo), 1);
    });

    QUnit.test('listenToOnce with event maps binds the correct `this`', function(assert) {
      assert.expect(1);
      var a = new TestObject();
      var b = new TestObject();
      a.listenToOnce(b, {
        one: function() { assert.ok(this === a); },
        two: function() { assert.ok(false); }
      });
      b.trigger('one');
    });

    QUnit.test('listenToOnce without a callback is a noop', function(assert) {
      assert.expect(0);
      var obj = new TestObject();
      obj.listenToOnce(obj, 'event').trigger('event');
    });

    QUnit.test('#3448 - listenToOnce with space-separated events', function(assert) {
      assert.expect(2);
      var one = new TestObject();
      var two = new TestObject();
      var count = 1;
      one.listenToOnce(two, 'x y', function(n) { assert.ok(n === count++); });
      two.trigger('x', 1);
      two.trigger('x', 1);
      two.trigger('y', 2);
      two.trigger('y', 2);
    });

    QUnit.test('if callback is truthy but not a function, `on` should throw an error just like jQuery', function(assert) {
      assert.expect(1);
      var a = new TestObject();
      var b = new TestObject();

      a.listenToOnce(b, 'test', 'noop');
      assert.raises(function() {
        b.trigger('test');
      });
    });

  });
}