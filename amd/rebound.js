define("rebound", 
  ["rebound/compiler","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var compile = __dependency1__.compile;
    var LazyValue = __dependency1__.LazyValue;
    var registerHelper = __dependency1__.registerHelper;
    var notify = __dependency1__.notify;

    // TODO: Add Backbone Integration Code Here

    __exports__.compile = compile;
    __exports__.LazyValue = LazyValue;
    __exports__.registerHelper = registerHelper;
    __exports__.notify = notify;
  });