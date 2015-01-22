"use strict";
function escapeString(str) {
  str = str.replace(/\\/g, "\\\\");
  str = str.replace(/"/g, '\\"');
  str = str.replace(/\n/g, "\\n");
  return str;
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

function hash(pairs) {
  return "{" + pairs.join(", ") + "}";
}

exports.hash = hash;function repeat(chars, times) {
  var str = "";
  while (times--) {
    str += chars;
  }
  return str;
}

exports.repeat = repeat;