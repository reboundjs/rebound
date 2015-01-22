"use strict";
function StartTag(tagName, attributes, selfClosing) {
  this.type = 'StartTag';
  this.tagName = tagName || '';
  this.attributes = attributes || [];
  this.selfClosing = selfClosing === true;
}

exports.StartTag = StartTag;function EndTag(tagName) {
  this.type = 'EndTag';
  this.tagName = tagName || '';
}

exports.EndTag = EndTag;function Chars(chars) {
  this.type = 'Chars';
  this.chars = chars || "";
}

exports.Chars = Chars;function Comment(chars) {
  this.type = 'Comment';
  this.chars = chars || '';
}

exports.Comment = Comment;