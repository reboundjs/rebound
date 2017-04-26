import { Events } from "rebound-data/rebound-data";

function size(obj){
  if (obj == null) return 0;
  return Array.isArray(obj) ? obj.length : Object.keys(obj).length;
}

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
      return this[Object.getOwnPropertySymbols(this).filter((sym) => { return !!~sym.toString().indexOf("<events>"); })[0]];
    }
  }

  QUnit.module("Off", function() {

    QUnit.test('off unbinds functions of a specific name', function(assert) {
      assert.expect(1);
      var obj = new TestObject();

      var callback = function() { obj.counter += 1; };
      obj.on('event', callback);
      obj.trigger('event');
      obj.off('event');
      obj.trigger('event');
      assert.equal(obj.counter, 1, 'counter should have only been incremented once.');
    });

    QUnit.test('bind two callbacks, unbind only one', function(assert) {
      assert.expect(2);
      var obj = new TestObject();

      var callback = function() { obj.counterA += 1; };
      obj.on('event', callback);
      obj.on('event', function() { obj.counterB += 1; });
      obj.trigger('event');
      obj.off('event', callback);
      obj.trigger('event');
      assert.equal(obj.counterA, 1, 'counterA should have only been incremented once.');
      assert.equal(obj.counterB, 2, 'counterB should have been incremented twice.');
    });

    QUnit.test('unbind a callback in the midst of it firing', function(assert) {
      assert.expect(1);
      var obj = new TestObject();

      var callback = function() {
        obj.counter += 1;
        obj.off('event', callback);
      };
      obj.on('event', callback);
      obj.trigger('event');
      obj.trigger('event');
      obj.trigger('event');
      assert.equal(obj.counter, 1, 'the callback should have been unbound.');
    });

    QUnit.test('two binds that unbind themeselves', function(assert) {
      assert.expect(2);
      var obj = new TestObject();

      var incrA = function(){ obj.counterA += 1; obj.off('event', incrA); };
      var incrB = function(){ obj.counterB += 1; obj.off('event', incrB); };
      obj.on('event', incrA);
      obj.on('event', incrB);
      obj.trigger('event');
      obj.trigger('event');
      obj.trigger('event');
      assert.equal(obj.counterA, 1, 'counterA should have only been incremented once.');
      assert.equal(obj.counterB, 1, 'counterB should have only been incremented once.');
    });

    QUnit.test('remove all events for a specific context', function(assert) {
      assert.expect(4);
      var obj = new TestObject();
      obj.on('x y all', function() { assert.ok(true); });
      obj.on('x y all', function() { assert.ok(false); }, obj);
      obj.off(null, null, obj);
      obj.trigger('x y');
    });

    QUnit.test('remove all events for a specific callback', function(assert) {
      assert.expect(4);
      var obj = new TestObject();
      var success = function() { assert.ok(true); };
      var fail = function() { assert.ok(false); };
      obj.on('x y all', success);
      obj.on('x y all', fail);
      obj.off(null, fail);
      obj.trigger('x y');
    });

    QUnit.test('#1310 - off does not skip consecutive events', function(assert) {
      assert.expect(0);
      var obj = new TestObject();
      obj.on('event', function() { assert.ok(false); }, obj);
      obj.on('event', function() { assert.ok(false); }, obj);
      obj.off(null, null, obj);
      obj.trigger('event');
    });

    QUnit.test('listenTo and off cleaning up references', function(assert) {
      assert.expect(8);
      var a = new TestObject();
      var b = new TestObject();
      var fn = function() {};
      a.listenTo(b, 'event', fn);
      b.off();
      assert.equal(size(a._events.listeningTo), 0);
      assert.equal(size(b._events.listeners), 0);
      a.listenTo(b, 'event', fn);
      b.off('event');
      assert.equal(size(a._events.listeningTo), 0);
      assert.equal(size(b._events.listeners), 0);
      a.listenTo(b, 'event', fn);
      b.off(null, fn);
      assert.equal(size(a._events.listeningTo), 0);
      assert.equal(size(b._events.listeners), 0);
      a.listenTo(b, 'event', fn);
      b.off(null, null, a);
      assert.equal(size(a._events.listeningTo), 0);
      assert.equal(size(b._events.listeners), 0);
    });


    QUnit.test('off cleans up delegated event listeners', function(assert) {
      assert.expect(9);
      var a = new TestObject();
      var b = new TestObject();

      b.on('event:@all', function() {});
      a.listenTo(b, 'event:@all', function() {});
      assert.equal(b._events.delegateCount, 1);
      assert.equal(Object.keys(b._events.delegates).length, 1);
      assert.equal(b._events.cache['event:@all'].length, 2);
      assert.equal(size(a._events.listeningTo), 1);
      b.off();
      assert.equal(size(a._events.listeningTo), 0);
      assert.equal(size(b._events.cache['event:@all']), 0);
      assert.equal(size(b._events.listeners), 0);
      assert.equal(b._events.delegateCount, 0);
      assert.equal(Object.keys(b._events.delegates).length, 0);
    });

  });
}