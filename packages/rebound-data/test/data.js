import { Data } from "rebound-data/rebound-data";

class Test extends Data {
  constructor(){ super(); this._value = {}; }
  [Data.get](key){ return this._value[key]; }
  [Data.set](key, val){ this._value[key] = val; return true; }
  [Data.delete](key){ return delete this._value[key]; }
}

import cache from "rebound-data/test/data/cache";
import changed from "rebound-data/test/data/changed";
import children from "rebound-data/test/data/children";
import cleanliness from "rebound-data/test/data/cleanliness";
import clone from "rebound-data/test/data/clone";
import contains from "rebound-data/test/data/contains";
import data_delete from "rebound-data/test/data/delete";
import ensure from "rebound-data/test/data/ensure";
import entries from "rebound-data/test/data/entries";
import forEach from "rebound-data/test/data/forEach";
import get from "rebound-data/test/data/get";
import has from "rebound-data/test/data/has";
import hasChanged from "rebound-data/test/data/hasChanged";
import key from "rebound-data/test/data/key";
import keys from "rebound-data/test/data/keys";
import location from "rebound-data/test/data/location";
import parent from "rebound-data/test/data/parent";
import path from "rebound-data/test/data/path";
import previous from "rebound-data/test/data/previous";
import remove from "rebound-data/test/data/remove";
import root from "rebound-data/test/data/root";
import set from "rebound-data/test/data/set";
import touch from "rebound-data/test/data/touch";
import trigger from "rebound-data/test/data/trigger";
import validate from "rebound-data/test/data/validate";
import valueOf from "rebound-data/test/data/valueOf";

export default function (){

  QUnit.module("Core", function(){

    cache();
    changed();
    children();
    cleanliness();
    clone();
    contains();
    data_delete();
    ensure();
    entries();
    forEach();
    get();
    has();
    hasChanged();
    key();
    keys();
    location();
    parent();
    path();
    previous();
    remove();
    root();
    set();
    touch();
    trigger();
    validate();
    valueOf();

    QUnit.test("Private Data Cache", function(assert) {
      assert.expect(1);
      var test = new Test();
      var sym = Object.getOwnPropertySymbols(test).filter((sym) => { return !!~sym.toString().indexOf("<data>"); })[0];
      assert.equal(sym.toString(), 'Symbol(<data>)', "Base class instances have a private metadata object");
    });

    QUnit.test("CID", function(assert) {
      assert.expect(5);

      var test1 = new Test();
      var test2 = new Test();
      var data1 = new Data();
      var data2 = new Data();

      assert.ok(!!~data1.cid.indexOf("Data"), "All datum receive a unique cid value.");
      assert.ok(parseInt(data1.cid.indexOf("Data", "")) < parseInt(data2.cid.replace("Data", "")), "All datum receive a unique cid value via incrementing id numbers.");
      assert.ok(!!~test1.cid.indexOf("Test"), "A datum's cid value is determined by its constructor name.");
      assert.ok(parseInt(test1.cid.indexOf("Test", "")) < parseInt(test2.cid.replace("Test", "")), "Custom constructor cid values' number increments.");
      assert.throws(function(){
        test1.cid = "foo";
      }, /Cannot set value foo to read-only property "cid"/, "The `cid` property is read-only.");
    });

    QUnit.test("IsData", function(assert) {
      assert.expect(2);

      var data = new Test();

      assert.ok(data.isData, "A datum's has a truthy `isData` property.");
      assert.throws(function(){
        data.isData = false;
      }, "Attempting to set a datum's `isData` property throws.");

    });

    QUnit.test("ToString", function(assert) {
      assert.expect(1);

      var data = new Test();

      if (typeof Symbol.toStringTag !== 'string'){
        assert.equal(String(data), `[object ${data.cid}]`, "Symbol.toStringTag outputs the object's cid.");
      }

      else {
        assert.equal(true, true, "This environment does not support Symbol.toStringTag.");
      }

    });

    QUnit.test("User Provided Methods", function(assert) {
      assert.expect(14);

      var data = new Test();

      assert.ok(Data.get, "Constructor provides internal Symmbol to override implementation of GET");
      assert.ok(Data.set, "Constructor provides internal Symmbol to override implementation of SET");
      assert.ok(Data.delete, "Constructor provides internal Symmbol to override implementation of DELETE");
      assert.ok(Data.validate, "Constructor provides internal Symmbol to override implementation of VALIDATE");
      assert.ok(Data.path, "Constructor provides entire path parsing library to consumers");

      assert.ok(data.get, "Data provides a default implementation of get for consumers to override.");
      assert.ok(data.set, "Data provides a default implementation of set for consumers to override.");
      assert.ok(data.remove, "Data provides a default implementation of remove for consumers to override.");
      assert.ok(data.validate, "Data provides a default implementation of validate for consumers to override.");
      assert.ok(data.fetch, "Data provides a default implementation of fetch for consumers to override.");
      assert.ok(data.save, "Data provides a default implementation of save for consumers to override.");
      assert.ok(data.destroy, "Data provides a default implementation of destroy for consumers to override.");
      assert.ok(data.parse, "Data provides a default implementation of parse for consumers to override.");
      assert.ok(data.toJSON, "Data provides a default implementation of toJSON for consumers to override.");

    });

  }); // End: Data Module

}