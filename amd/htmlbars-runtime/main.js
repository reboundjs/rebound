define("htmlbars-runtime/main", 
  ["./dom_helpers","./morph","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var domHelpers = __dependency1__.domHelpers;
    var Morph = __dependency2__.Morph;

    function hydrate(spec, options) {
      return spec(domHelpers(options && options.extensions), Morph);
    }

    __exports__.hydrate = hydrate;
  });