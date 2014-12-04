"use strict";
function __es6_transpiler_warn__(warning) {
  if (typeof console === 'undefined') {
  } else if (typeof console.warn === "function") {
    console.warn(warning);
  } else if (typeof console.log === "function") {
    console.log(warning);
  }
}
function __es6_transpiler_build_module_object__(name, imported) {
  var moduleInstanceObject = Object.create ? Object.create(null) : {};
  if (typeof imported === "function") {
    __es6_transpiler_warn__("imported module '"+name+"' exported a function - this may not work as expected");
  }
  for (var key in imported) {
    if (Object.prototype.hasOwnProperty.call(imported, key)) {
      moduleInstanceObject[key] = imported[key];
    }
  }
  if (Object.freeze) {
    Object.freeze(moduleInstanceObject);
  }
  return moduleInstanceObject;
}
var parser = require("./parser")["default"];
var AST = require("./ast")["default"];
var WhitespaceControl = require("./whitespace-control")["default"];
var Helpers = __es6_transpiler_build_module_object__("Helpers", require("./helpers"));
var extend = require("../utils").extend;

exports.parser = parser;

var yy = {};
extend(yy, Helpers, AST);

function parse(input, options) {
  // Just return if an already-compile AST was passed in.
  if (input.type === 'Program') { return input; }

  parser.yy = yy;

  // Altering the shared object here, but this is ok as parser is a sync operation
  yy.locInfo = function(locInfo) {
    return new yy.SourceLocation(options && options.srcName, locInfo);
  };

  var strip = new WhitespaceControl();
  return strip.accept(parser.parse(input));
}

exports.parse = parse;