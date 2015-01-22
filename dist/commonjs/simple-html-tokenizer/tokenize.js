"use strict";
var Tokenizer = require("./tokenizer")["default"];
var EntityParser = require("./entity-parser")["default"];
var namedCodepoints = require("./char-refs/full")["default"];

exports["default"] = function tokenize(input) {
  var tokenizer = new Tokenizer(input, new EntityParser(namedCodepoints));
  return tokenizer.tokenize();
}