import { Data } from "rebound-data/rebound-data";

import changed from "rebound-data/test/data/changed";
import children from "rebound-data/test/data/children";
import clone from "rebound-data/test/data/clone";
import contains from "rebound-data/test/data/contains";
import haschanged from "rebound-data/test/data/hasChanged";
import key from "rebound-data/test/data/key";
import parent from "rebound-data/test/data/parent";
import path from "rebound-data/test/data/path";
import pausePropagation from "rebound-data/test/data/pausePropagation";
import previous from "rebound-data/test/data/previous";
import root from "rebound-data/test/data/root";
import stopPropagation from "rebound-data/test/data/stopPropagation";
import trigger from "rebound-data/test/data/trigger";

export default function (){

  QUnit.module("Ancestry", function(){

    children();
    changed();
    clone();
    contains();
    haschanged();
    key();
    parent();
    path();
    pausePropagation();
    previous();
    root();
    stopPropagation();
    trigger();

    QUnit.test("IsData", function(assert) {
      assert.expect(2);

      var data = new Data()

      assert.ok(data.isData, "A datum's has a truthy `isData` property.");
      assert.throws(function(){
        data.isData = false;
      }, "Attempting to set a datum's `isData` property throws.");

    });

    QUnit.test("ToString", function(assert) {
      assert.expect(1);

      var data = new Data()

      if (typeof Symbol.toStringTag !== 'string'){
        assert.equal(String(data), `[object ${data.cid}]`, "Symbol.toStringTag outputs the object's cid.");
      }

      else {
        assert.equal(true, true, "This environment does not support Symbol.toStringTag.");
      }

    });

    QUnit.test("User Provided Methods", function(assert) {
      assert.expect(10);

      var data = new Data()

      assert.ok(data.initialize, "Data provides a default implementation of initialize for consumers to override.")
      assert.ok(data.get, "Data provides a default implementation of get for consumers to override.")
      assert.ok(data.set, "Data provides a default implementation of set for consumers to override.")
      assert.ok(data.remove, "Data provides a default implementation of remove for consumers to override.")
      assert.ok(data.location, "Data provides a default implementation of location for consumers to override.")
      assert.ok(data.fetch, "Data provides a default implementation of fetch for consumers to override.")
      assert.ok(data.save, "Data provides a default implementation of save for consumers to override.")
      assert.ok(data.destroy, "Data provides a default implementation of destroy for consumers to override.")
      assert.ok(data.parse, "Data provides a default implementation of parse for consumers to override.")
      assert.ok(data.toJSON, "Data provides a default implementation of toJSON for consumers to override.")

    });

  }); // End: Data Module

};