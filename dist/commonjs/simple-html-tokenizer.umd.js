"use strict";
/* global define:false, module:false */
var Tokenizer = require("./simple-html-tokenizer").Tokenizer;
var tokenize = require("./simple-html-tokenizer").tokenize;
var Generator = require("./simple-html-tokenizer").Generator;
var generate = require("./simple-html-tokenizer").generate;
var StartTag = require("./simple-html-tokenizer").StartTag;
var EndTag = require("./simple-html-tokenizer").EndTag;
var Chars = require("./simple-html-tokenizer").Chars;
var Comment = require("./simple-html-tokenizer").Comment;

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.HTML5Tokenizer = factory();
  }
}(this, function () {
  return {
    Tokenizer: Tokenizer,
    tokenize: tokenize,
    Generator: Generator,
    generate: generate,
    StartTag: StartTag,
    EndTag: EndTag,
    Chars: Chars,
    Comment: Comment
  };
}));