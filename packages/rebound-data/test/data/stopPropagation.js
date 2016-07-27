import { Data } from "rebound-data/rebound-data";

export default function tests(){

  class TestObject extends Data {
    constructor(){
      super();
      this.counter = 0;
    }
  }

  QUnit.module("StopPropagation", function(assert) {

    QUnit.skip('TODO: Stop Propagation Tests', function(assert) {

    });

  });

}