"use strict";
var Generator = require("./generator")["default"];

exports["default"] = function generate(tokens) {
  var generator = new Generator();
  return generator.generate(tokens);
}