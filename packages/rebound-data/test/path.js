import { Path } from "rebound-data/rebound-data";

import first from "rebound-data/test/path/first";
import hasWildcard from "rebound-data/test/path/hasWildcard";
import isValid from "rebound-data/test/path/isValid";
import join from "rebound-data/test/path/join";
import last from "rebound-data/test/path/last";
import matches from "rebound-data/test/path/matches";
import pop from "rebound-data/test/path/pop";
import push from "rebound-data/test/path/push";
import shift from "rebound-data/test/path/shift";
import split from "rebound-data/test/path/split";
import toString from "rebound-data/test/path/toString";
import unshift from "rebound-data/test/path/unshift";

export default function (){

  QUnit.module("Path", function(){

    QUnit.test('Path handles invalid inputs', function(assert) {

      assert.equal(new Path().isValid(), false, "No input without sanatization fail");
      assert.equal(new Path(12345).toString(), '', "Non string values without sanatization result in empty path");
      assert.equal(new Path(undefined, {sanatize: true}).toString(), 'undefined', "No input with sanatization results in stringified input");

      assert.equal(new Path(12345).isValid(), false, "Non string values without sanatization fail");
      assert.equal(new Path(12345).toString(), '', "Non string values without sanatization result in empty path");
      assert.equal(new Path(12345, {sanatize: true}).toString(), '[12345]', "Non string values with sanatization results in stringified input");

    });

    first();
    hasWildcard();
    isValid();
    join();
    last();
    matches();
    pop();
    push();
    shift();
    split();
    toString();
    unshift();

  }); // End: Path Module

}