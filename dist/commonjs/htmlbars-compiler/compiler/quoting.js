"use strict";
function escapeString(str) {
  return str.replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

exports.escapeString = escapeString;

function string(str) {
  return '"' + escapeString(str) + '"';
}

exports.string = string;

function array(a) {
  return "[" + a + "]";
}

exports.array = array;

function quotedArray(list) {
  return array(list.map(string).join(", "));
}

exports.quotedArray = quotedArray;function hash(pairs) {
  return "{" + pairs.join(",") + "}";
}

exports.hash = hash;