"use strict";
var parse = require("./handlebars/compiler/base").parse;
var Tokenizer = require("../simple-html-tokenizer").Tokenizer;
var nodeHandlers = require("./html-parser/node-handlers")["default"];
var tokenHandlers = require("./html-parser/token-handlers")["default"];

function preprocess(html, options) {

  var ast = parse(html);

  var combined = new HTMLProcessor(html, options).acceptNode(ast);

  if (options && options.plugins && options.plugins.ast) {
    for (var i = 0, l = options.plugins.ast.length; i < l; i++) {
      combined = options.plugins.ast[i](combined);
    }
  }

  return combined;
}

exports.preprocess = preprocess;function HTMLProcessor(source, options) {
  this.options = options || {};
  this.elementStack = [];
  this.tokenizer = new Tokenizer('');
  this.nodeHandlers = nodeHandlers;
  this.tokenHandlers = tokenHandlers;
  this.source = source.split(/(?:\r\n?|\n)/g);
}

HTMLProcessor.prototype.acceptNode = function(node) {
  return this.nodeHandlers[node.type].call(this, node);
};

HTMLProcessor.prototype.acceptToken = function(token) {
  if (token) {
    return this.tokenHandlers[token.type].call(this, token);
  }
};

HTMLProcessor.prototype.currentElement = function() {
  return this.elementStack[this.elementStack.length - 1];
};

HTMLProcessor.prototype.sourceForMustache = function(mustache) {
  var firstLine = mustache.loc.start.line - 1;
  var lastLine = mustache.loc.end.line - 1;
  var currentLine = firstLine - 1;
  var firstColumn = mustache.loc.start.column + 2;
  var lastColumn = mustache.loc.end.column - 2;
  var string = [];
  var line;

  while (currentLine < lastLine) {
    currentLine++;
    line = this.source[currentLine];

    if (currentLine === firstLine) {
      if (firstLine === lastLine) {
        string.push(line.slice(firstColumn, lastColumn));
      } else {
        string.push(line.slice(firstColumn));
      }
    } else if (currentLine === lastLine) {
      string.push(line.slice(0, lastColumn));
    } else {
      string.push(line);
    }
  }

  return string.join('\n');
};