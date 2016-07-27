import { Data } from "rebound-data/rebound-data";

export default function tests(){

  class TestObject extends Data {
    constructor(){
      super();
      this.counter = 0;
    }
    dirty(){
      super.dirty();
    }
    clean(){
      super.clean();
    }
  }

  QUnit.module("PausePropagation", function(assert) {

    QUnit.test('basic puase propagation and resume propagation on self', function(assert) {
      var child = new TestObject();
      var parent = new TestObject();
      child.parent = parent;
      parent.location = function(){ return 'path'; }
      child.on('test', function(){
        this.counter++;
      });
      child.trigger('test');
      assert.equal(child.counter, 1, 'On initial creation, events are tiggerend on self normally');
      child.pausePropagation();
      child.trigger('test');
      child.trigger('test');
      assert.equal(child.counter, 3, 'When propagation is paused, events still triggered on child');
      child.resumePropagation();
      assert.equal(child.counter, 3, 'After resume, events are not re-triggered on self');
    });

    QUnit.test('basic puase propagation and resume propagation on parent', function(assert) {
      var child = new TestObject();
      var parent = new TestObject();
      child.parent = parent;
      parent.location = function(){ return 'path'; }
      parent.on('test:path', function(){
        this.counter++;
      });
      child.trigger('test');
      assert.equal(parent.counter, 1, 'On initial creation, events propagate normally');
      child.pausePropagation();
      child.trigger('test');
      child.trigger('test');
      assert.equal(parent.counter, 1, 'When propagation is paused, events are not triggered on parent');
      child.resumePropagation();
      assert.equal(parent.counter, 3, 'After resume, events are propagated up to parent successfully');
    });


    QUnit.test('puase propagation and dirty and clean', function(assert) {
      var child = new TestObject();
      var parent = new TestObject();
      child.parent = parent;
      parent.location = function(){ return 'path'; }
      parent.on('test:path', function(){
        this.counter++;
      });
      child.trigger('test');
      assert.equal(parent.counter, 1, 'On initial creation, events propagate normally');
      child.dirty();
      child.pausePropagation();
      child.trigger('test');
      child.clean()
      child.trigger('test');
      assert.equal(parent.counter, 1, 'Dirty and clean have no impact on preventing propagation');
      child.dirty();
      child.resumePropagation();
      assert.equal(parent.counter, 3, 'Dirty status has no impact on resuming propagation');
      child.clean();
    });

    QUnit.test('puase propagation during event', function(assert) {
      var child = new TestObject();
      var parent = new TestObject();
      child.parent = parent;
      parent.location = function(){ return 'path'; }
      child.on('test', function(){
        this.pausePropagation();
        this.counter++;
      });
      parent.on('test:path', function(){
        this.counter++;
      });
      child.trigger('test');
      assert.equal(child.counter, 1, 'Pause propagation called in an event still calls on self');
      assert.equal(parent.counter, 0, 'Pause propagation called in an event stops propagation to parent');
      child.trigger('test');
      assert.equal(child.counter, 2, 'Multiple calls to pause propagation called in an event still calls on self');
      assert.equal(parent.counter, 0, 'Multiple calls to pause propagation called in an event stops propagation to parent');
      child.resumePropagation();
      assert.equal(child.counter, 2, 'Releasing propagation from pause in event callback does not trigger on self');
      assert.equal(parent.counter, 2, 'Releasing propagation from pause in event callback triggers on parent');

    });

    QUnit.test('puase propagation and stop propagation 1', function(assert) {
      var child = new TestObject();
      var parent = new TestObject();
      child.parent = parent;
      parent.location = function(){ return 'path'; }
      parent.on('test:path', function(){
        this.counter++;
      });
      child.dirty();
      child.pausePropagation();
      child.trigger('test');
      child.trigger('test');
      child.stopPropagation();
      child.clean();
      child.resumePropagation();
      assert.equal(parent.counter, 0, 'When Stop Propagation is called while propagation is paused, the queue clears');
    });

    QUnit.test('puase propagation and stop propagation 1', function(assert) {
      var child = new TestObject();
      var parent = new TestObject();
      child.parent = parent;
      parent.location = function(){ return 'path'; }
      parent.on('test:path', function(){
        this.counter++;
      });
      child.dirty();
      child.pausePropagation();
      child.trigger('test');
      child.trigger('test');
      child.stopPropagation();
      child.pausePropagation();
      child.trigger('test');
      child.clean();
      child.resumePropagation();
      assert.equal(parent.counter, 0, 'Calling puase propagation on a stopped datum does not override stopped status');
    });

  });

}