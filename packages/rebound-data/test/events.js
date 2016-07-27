import { Events } from "rebound-data/rebound-data";

import events_on from "rebound-data/test/events/on";
import events_once from "rebound-data/test/events/once";
import events_listenTo from "rebound-data/test/events/listenTo";
import events_listenToOnce from "rebound-data/test/events/listenToOnce";
import events_off from "rebound-data/test/events/off";
import events_stopListening from "rebound-data/test/events/stopListening";
import events_trigger from "rebound-data/test/events/trigger";

export default function (){

  class TestObject extends Events {
    constructor(){
      super();
      this.counter = 0;
      this.counterA = 0;
      this.counterB = 0;
    }
  }

  QUnit.module("Events", function(){

    events_on();
    events_once();
    events_listenTo();
    events_listenToOnce();
    events_off();
    events_stopListening();
    events_trigger();

    QUnit.test('event functions are chainable', function(assert) {
      var obj = new TestObject();
      var obj2 = new TestObject();
      var fn = function() {};
      assert.equal(obj, obj.trigger('noeventssetyet'));
      assert.equal(obj, obj.off('noeventssetyet'));
      assert.equal(obj, obj.stopListening(obj2));
      assert.equal(obj, obj.on('a', fn));
      assert.equal(obj, obj.once('c', fn));
      assert.equal(obj, obj.trigger('a'));
      assert.equal(obj, obj.listenTo(obj2, 'a', fn));
      assert.equal(obj, obj.listenToOnce(obj2, 'b', fn));
      assert.equal(obj, obj.off('a c'));
      assert.equal(obj, obj.stopListening(obj2, 'a'));
      assert.equal(obj, obj.stopListening());
    });

  });
}
