import utils from "rebound-utils/test/rebound-utils";

import propertyCompiler from "property-compiler/test/property_compiler_test";

import compiler from "rebound-compiler/test/rebound_compiler_test";
import precompiler from "rebound-compiler/test/rebound_precompiler_test";

import component from "rebound-component/test/rebound_component_test";
import services from "rebound-component/test/rebound_services_test";


import helpers_attribute from "rebound-htmlbars/test/rebound_helpers_attribute_test";
import helpers_each from "rebound-htmlbars/test/rebound_helpers_each_test";
import helpers_if from "rebound-htmlbars/test/rebound_helpers_if_test";
import helpers_on from "rebound-htmlbars/test/rebound_helpers_on_test";
import helpers_partials from "rebound-htmlbars/test/rebound_helpers_partials_test";
import helpers_register from "rebound-htmlbars/test/rebound_helpers_register_test";
import helpers_unless from "rebound-htmlbars/test/rebound_helpers_unless_test";


import events from "rebound-data/test/events";
import data from "rebound-data/test/data";
import model from "rebound-data/test/model";

QUnit.module("[Rebound Data]", function(){
  events();
  data();
  model();
});

import collection_add from "rebound-data/test/collection/add";
import collection_at from "rebound-data/test/collection/at";
import collection_create from "rebound-data/test/collection/create";
import collection_findWhere from "rebound-data/test/collection/findWhere";
import collection_get from "rebound-data/test/collection/get";
import collection_has from "rebound-data/test/collection/has";
import collection_modelId from "rebound-data/test/collection/modelId";
import collection_pluck from "rebound-data/test/collection/pluck";
import collection_remove from "rebound-data/test/collection/remove";
import collection_reset from "rebound-data/test/collection/reset";
import collection_set from "rebound-data/test/collection/set";
import collection_shift from "rebound-data/test/collection/shift";
import collection_slice from "rebound-data/test/collection/slice";
import collection_sort from "rebound-data/test/collection/sort";
import collection_toJSON from "rebound-data/test/collection/toJSON";
import collection_unshift from "rebound-data/test/collection/unshift";
import collection_where from "rebound-data/test/collection/where";

import computedProperty from "rebound-data/test/rebound_computed_property_test";
import events_test from "rebound-data/test/rebound_events_test";

import router from "rebound-router/test/rebound_router_test";

QUnit.start();
