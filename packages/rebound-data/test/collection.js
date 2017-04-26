import { Collection } from "rebound-data/rebound-data";

import add from "rebound-data/test/collection/add";
import at from "rebound-data/test/collection/at";
import constructor from "rebound-data/test/collection/constructor";
import create from "rebound-data/test/collection/create";
import findWhere from "rebound-data/test/collection/findWhere";
import get from "rebound-data/test/collection/get";
import has from "rebound-data/test/collection/has";
import modelId from "rebound-data/test/collection/modelId";
import pluck from "rebound-data/test/collection/pluck";
import remove from "rebound-data/test/collection/remove";
import reset from "rebound-data/test/collection/reset";
import set from "rebound-data/test/collection/set";
import shift from "rebound-data/test/collection/shift";
import sort from "rebound-data/test/collection/sort";
import toJSON from "rebound-data/test/collection/toJSON";
import unshift from "rebound-data/test/collection/unshift";
import where from "rebound-data/test/collection/where";

export default function (){

  QUnit.module("Collection", function(){

    constructor();

    get();
    remove();
    reset();
    set();

    QUnit.test("IsCollection", function(assert) {
      assert.expect(2);

      var data = new Collection();

      assert.ok(data.isCollection, "A Collection has a truthy `isCollection` property.");
      assert.throws(function(){
        data.isCollection = false;
      }, "Attempting to set a Collection's `isCollection` property throws.");

    });

    QUnit.test("Constructor with no ", function(assert) {
      assert.expect(2);

      var data = new Collection();

      assert.ok(data.isCollection, "A Collection has a truthy `isCollection` property.");
      assert.throws(function(){
        data.isCollection = false;
      }, "Attempting to set a Collection's `isCollection` property throws.");

    });

  }); // End: Collection Module

};