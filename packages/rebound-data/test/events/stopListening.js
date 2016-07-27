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

  QUnit.module("StopListening", function() {

    QUnit.test('listenTo yourself cleans yourself up with stopListening', function(assert) {
      assert.expect(1);
      var e = new TestObject();
      e.listenTo(e, 'foo', function(){ assert.ok(true); });
      e.trigger('foo');
      e.stopListening();
      e.trigger('foo');
    });

    QUnit.test('stopListening cleans up references', function(assert) {
      assert.expect(12);
      var a = new TestObject();
      var b = new TestObject();
      var fn = function() {};
      b.on('event', fn);
      a.listenTo(b, 'event', fn).stopListening();
      assert.equal(_.size(a._events.listeningTo), 0);
      assert.equal(_.size(b._events.cache.event), 1);
      assert.equal(_.size(b._listeners), 0);
      a.listenTo(b, 'event', fn).stopListening(b);
      assert.equal(_.size(a._events.listeningTo), 0);
      assert.equal(_.size(b._events.cache.event), 1);
      assert.equal(_.size(b._events.listeners), 0);
      a.listenTo(b, 'event', fn).stopListening(b, 'event');
      assert.equal(_.size(a._events.listeningTo), 0);
      assert.equal(_.size(b._events.cache.event), 1);
      assert.equal(_.size(b._events.listeners), 0);
      a.listenTo(b, 'event', fn).stopListening(b, 'event', fn);
      assert.equal(_.size(a._events.listeningTo), 0);
      assert.equal(_.size(b._events.cache.event), 1);
      assert.equal(_.size(b._events.listeners), 0);
    });

    QUnit.test('stopListening cleans up named references', function(assert) {
      assert.expect(2);
      var a = new TestObject();
      var b = new TestObject();
      a.listenTo(b, 'all', function(){ assert.ok(true); });
      b.trigger('anything');
      a.listenTo(b, 'other', function(){ assert.ok(false); });
      a.stopListening(b, 'other');
      a.stopListening(b, 'all');
      assert.equal(_.size(a._events.listeningTo), 0);
    });

    QUnit.test('listenToOnce and stopListening', function(assert) {
      assert.expect(1);
      var a = new TestObject();
      var b = new TestObject();
      a.listenToOnce(b, 'all', function() { assert.ok(true); });
      b.trigger('anything');
      b.trigger('anything');
      a.listenToOnce(b, 'all', function() { assert.ok(false); });
      a.stopListening();
      b.trigger('anything');
    });

    QUnit.test('stopListening cleans up references from listenToOnce', function(assert) {
      assert.expect(12);
      var a = new TestObject();
      var b = new TestObject();
      var fn = function() {};
      b.on('event', fn);
      a.listenToOnce(b, 'event', fn).stopListening();
      assert.equal(_.size(a._events.listeningTo), 0);
      assert.equal(_.size(b._events.cache.event), 1);
      assert.equal(_.size(b._events.listeners), 0);
      a.listenToOnce(b, 'event', fn).stopListening(b);
      assert.equal(_.size(a._events.listeningTo), 0);
      assert.equal(_.size(b._events.cache.event), 1);
      assert.equal(_.size(b._events.listeners), 0);
      a.listenToOnce(b, 'event', fn).stopListening(b, 'event');
      assert.equal(_.size(a._events.listeningTo), 0);
      assert.equal(_.size(b._events.cache.event), 1);
      assert.equal(_.size(b._events.listeners), 0);
      a.listenToOnce(b, 'event', fn).stopListening(b, 'event', fn);
      assert.equal(_.size(a._events.listeningTo), 0);
      assert.equal(_.size(b._events.cache.event), 1);
      assert.equal(_.size(b._events.listeners), 0);
    });

    QUnit.test('stopListening cleans up delegated event listeners', function(assert) {
      assert.expect(9);
      var a = new TestObject();
      var b = new TestObject();
      var fn = function() {};
      b.on('event:@all', fn);
      a.listenTo(b, 'event:@all', fn);
      assert.equal(_.size(a._events.listeningTo), 1);
      assert.equal(_.size(b._events.listeners), 1);
      assert.equal(b._events.delegateCount, 1);
      assert.equal(_.size(b._events.cache['event:@all']), 2);
      a.stopListening();
      assert.equal(_.size(a._events.listeningTo), 0);
      assert.equal(_.size(b._events.listeners), 0);
      assert.equal(b._events.delegateCount, 1);
      assert.equal(Object.keys(b._events.delegates).length, 1);
      assert.equal(_.size(b._events.cache['event:@all']), 1);
    });

    QUnit.test('stopListening with omitted args', function(assert) {
      assert.expect(2);
      var a = new TestObject();
      var b = new TestObject();
      var cb = function() { assert.ok(true); };
      a.listenTo(b, 'event', cb);
      b.on('event', cb);
      a.listenTo(b, 'event2', cb);
      a.stopListening(null, {event: cb});
      b.trigger('event event2');
      b.off();
      a.listenTo(b, 'event event2', cb);
      a.stopListening(null, 'event');
      a.stopListening();
      b.trigger('event2');
    });

    QUnit.test('listenTo and stopListening', function(assert) {
      assert.expect(0);
      var a = new TestObject();
      var b = new TestObject();
      a.listenTo(b, 'all', function() { assert.ok(false); });
      a.stopListening();
      b.trigger('anything');
    });

    QUnit.test('listenTo and stopListening with event maps', function(assert) {
      assert.expect(1);
      var a = new TestObject();
      var b = new TestObject();
      a.listenTo(b, {change: function(){ assert.ok(true); }});
      b.trigger('change');
      a.listenTo(b, {change: function(){ assert.ok(false); }});
      a.stopListening();
      b.trigger('change');
    });

  });
};