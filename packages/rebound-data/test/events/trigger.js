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

  QUnit.module("Trigger", function(assert) {

    QUnit.test('trigger all for each event', function(assert) {
      assert.expect(3);
      var a, b, obj = new TestObject();

      obj.on('all', function(event) {
        obj.counter++;
        if (event === 'a') a = true;
        if (event === 'b') b = true;
      })
      .trigger('a b');
      assert.ok(a);
      assert.ok(b);
      assert.equal(obj.counter, 2);
    });

    QUnit.test("#1282 - 'all' callback list is retrieved after each event.", function(assert) {
      assert.expect(1);
      var counter = 0;
      var obj = new TestObject();
      var incr = function(){ counter++; };
      obj.on('x', function() {
        obj.on('y', incr).on('all', incr);
      })
      .trigger('x y');
      assert.strictEqual(counter, 2);
    });

    QUnit.test('callback list is not altered during trigger', function(assert) {
      assert.expect(2);
      var counter = 0, obj = new TestObject();
      var incr = function(){ counter++; };
      var incrOn = function(){ obj.on('event all', incr); };
      var incrOff = function(){ obj.off('event all', incr); };

      obj.on('event all', incrOn).trigger('event');
      assert.equal(counter, 0, 'on does not alter callback list');

      obj.off().on('event', incrOff).on('event all', incr).trigger('event');
      assert.equal(counter, 2, 'off does not alter callback list');
    });

    QUnit.test('nested trigger with unbind', function(assert) {
      assert.expect(1);
      var obj = new TestObject();

      var incr1 = function(){ obj.counter += 1; obj.off('event', incr1); obj.trigger('event'); };
      var incr2 = function(){ obj.counter += 1; };
      obj.on('event', incr1);
      obj.on('event', incr2);
      obj.trigger('event');
      assert.equal(obj.counter, 3, 'counter should have been incremented three times');
    });

  });
};