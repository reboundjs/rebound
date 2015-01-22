"use strict";
// Statements

function buildMustache(sexpr, raw) {
  return {
    type: "MustacheStatement",
    sexpr: sexpr,
    escaped: !raw
  };
}

exports.buildMustache = buildMustache;function buildBlock(sexpr, program, inverse) {
  return {
    type: "BlockStatement",
    sexpr: sexpr,
    program: program || null,
    inverse: inverse || null
  };
}

exports.buildBlock = buildBlock;function buildPartial(sexpr, indent) {
  return {
    type: "PartialStatement",
    sexpr: sexpr,
    indent: indent
  };
}

exports.buildPartial = buildPartial;function buildComment(value) {
  return {
    type: "CommentStatement",
    value: value,
  };
}

exports.buildComment = buildComment;
function buildConcat(parts) {
  return {
    type: "ConcatStatement",
    parts: parts || []
  };
}

exports.buildConcat = buildConcat;// Nodes

function buildElement(tag, attributes, helpers, children) {
  return {
    type: "ElementNode",
    tag: tag,
    attributes: attributes || [],
    helpers: helpers || [],
    children: children || []
  };
}

exports.buildElement = buildElement;function buildComponent(tag, attributes, program) {
  return {
    type: "ComponentNode",
    tag: tag,
    attributes: attributes,
    program: program
  };
}

exports.buildComponent = buildComponent;function buildAttr(name, value) {
  return {
    type: "AttrNode",
    name: name,
    value: value
  };
}

exports.buildAttr = buildAttr;function buildText(chars) {
  return {
    type: "TextNode",
    chars: chars
  };
}

exports.buildText = buildText;// Expressions

function buildSexpr(path, params, hash) {
  return {
    type: "SubExpression",
    path: path,
    params: params || [],
    hash: hash || buildHash([])
  };
}

exports.buildSexpr = buildSexpr;function buildPath(original) {
  return {
    type: "PathExpression",
    original: original,
    parts: original.split('.')
  };
}

exports.buildPath = buildPath;function buildString(value) {
  return {
    type: "StringLiteral",
    value: value,
    original: value
  };
}

exports.buildString = buildString;function buildBoolean(value) {
  return {
    type: "BooleanLiteral",
    value: value,
    original: value
  };
}

exports.buildBoolean = buildBoolean;function buildNumber(value) {
  return {
    type: "NumberLiteral",
    value: value,
    original: value
  };
}

exports.buildNumber = buildNumber;// Miscellaneous

function buildHash(pairs) {
  return {
    type: "Hash",
    pairs: pairs || []
  };
}

exports.buildHash = buildHash;function buildPair(key, value) {
  return {
    type: "HashPair",
    key: key,
    value: value
  };
}

exports.buildPair = buildPair;function buildProgram(body, blockParams) {
  return {
    type: "Program",
    body: body || [],
    blockParams: blockParams || []
  };
}

exports.buildProgram = buildProgram;exports["default"] = {
  mustache: buildMustache,
  block: buildBlock,
  partial: buildPartial,
  comment: buildComment,
  element: buildElement,
  component: buildComponent,
  attr: buildAttr,
  text: buildText,
  sexpr: buildSexpr,
  path: buildPath,
  string: buildString,
  boolean: buildBoolean,
  number: buildNumber,
  concat: buildConcat,
  hash: buildHash,
  pair: buildPair,
  program: buildProgram
};