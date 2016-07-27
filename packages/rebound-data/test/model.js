import { Model } from "rebound-data/rebound-data";

import changed from "rebound-data/test/model/changed";
import clear from "rebound-data/test/model/clear";
import defaults from "rebound-data/test/model/defaults";
import destroy from "rebound-data/test/model/destroy";
import escape from "rebound-data/test/model/escape";
import fetch from "rebound-data/test/model/fetch";
import get from "rebound-data/test/model/get";
import has from "rebound-data/test/model/has";
import isNew from "rebound-data/test/model/isNew";
import isValid from "rebound-data/test/model/isValid";
import reset from "rebound-data/test/model/reset";
import save from "rebound-data/test/model/save";
import set from "rebound-data/test/model/set";
import toggle from "rebound-data/test/model/toggle";
import toJSON from "rebound-data/test/model/toJSON";
import unset from "rebound-data/test/model/unset";
import url from "rebound-data/test/model/url";

export default function (){

  QUnit.module("Model", function(){

    changed();
    clear();
    defaults();
    get();
    reset();
    set();
    toggle();
    toJSON();

  }); // End: Model Module

};