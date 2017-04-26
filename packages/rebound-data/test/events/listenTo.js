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

  QUnit.module("ListenTo", function(){

    QUnit.test('listenTo and stopListening', function(assert) {
      assert.expect(1);
      var a = new TestObject();
      var b = new TestObject();
      a.listenTo(b, 'all', function(){ assert.ok(true); });
      b.trigger('anything');
      a.listenTo(b, 'all', function(){ assert.ok(false); });
      a.stopListening();
      b.trigger('anything');
    });

    QUnit.test('listenTo and stopListening with event maps', function(assert) {
      assert.expect(4);
      var a = new TestObject();
      var b = new TestObject();
      var cb = function(){ assert.ok(true); };
      a.listenTo(b, {event: cb});
      b.trigger('event');
      a.listenTo(b, {event2: cb});
      b.on('event2', cb);
      a.stopListening(b, {event2: cb});
      b.trigger('event event2');
      a.stopListening();
      b.trigger('event event2');
    });

    QUnit.test('listenTo yourself', function(assert) {
      assert.expect(1);
      var e = new TestObject();
      e.listenTo(e, 'foo', function(){ assert.ok(true); });
      e.trigger('foo');
    });

    QUnit.test("listenTo with empty callback doesn't throw an error", function(assert) {
      assert.expect(1);
      var e = new TestObject();
      e.listenTo(e, 'foo', null);
      e.trigger('foo');
      assert.ok(true);
    });

    QUnit.test('if callback is truthy but not a function, `on` should throw an error just like jQuery', function(assert) {
      assert.expect(1);
      var a = new TestObject();
      var b = new TestObject();

      a.listenTo(b, 'test', 'noop');
      assert.raises(function() {
        b.trigger('test');
      });
    });

  });
}