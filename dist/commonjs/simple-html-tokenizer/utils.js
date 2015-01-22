"use strict";
function isSpace(char) {
  return (/[\t\n\f ]/).test(char);
}

exports.isSpace = isSpace;function isAlpha(char) {
  return (/[A-Za-z]/).test(char);
}

exports.isAlpha = isAlpha;function preprocessInput(input) {
  return input.replace(/\r\n?/g, "\n");
}

exports.preprocessInput = preprocessInput;