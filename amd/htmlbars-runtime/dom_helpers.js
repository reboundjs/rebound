define("htmlbars-runtime/dom_helpers", 
  ["./utils","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var merge = __dependency1__.merge;

    function domHelpers(extensions) {
      var base = {
        appendText: function(element, text) {
          element.appendChild(document.createTextNode(text));
        },

        appendChild: function(element, childElement) {
          element.appendChild(childElement);
        },

        setAttribute: function(element, name, value) {
          element.setAttribute(name, value);
        },

        createElement: function(tagName) {
          return document.createElement(tagName);
        },

        createDocumentFragment: function() {
          return document.createDocumentFragment();
        },

        createTextNode: function(text) {
          return document.createTextNode(text);
        },

        cloneNode: function(element) {
          return element.cloneNode(true);
        }
      };

      return extensions ? merge(extensions, base) : base;
    }

    __exports__.domHelpers = domHelpers;
  });