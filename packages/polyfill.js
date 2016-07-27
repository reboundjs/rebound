// Chrome: 45 Firefox: 34 IE: no Edge: yes Opera: 32 Safari: 9
import objectAssignPolyfill from "es6-object-assign";
objectAssignPolyfill.polyfill();

// Chrome: yes Firefox: 4.0 IE: 8.0 Opera: 15.0 Safari: yes
import consolePolyfill from "console-polyfill";

// Chrome: 23 Firefox: 11.0 IE: 10.0 Opera: 15.0 Safari: 6.1
import requestAnimationFramePolyfill from "raf";
requestAnimationFramePolyfill.polyfill();

// Chrome: 29 Firefox: 4.0 IE: no Opera: 16 Safari: 8
import currentScriptPolyfill from "current-script";

// Chrome: 8 Edge: yes Firefox: 3.6 IE: 10 Opera: 11.50 Safari: 5.1
import classlistPolyfill from "classlist-polyfill";

// Chrome: 34 Edge: yes Firefox: 34 IE: 11 Opera: 21 Safari: 7.1
// https://gist.github.com/3062955.git
this.Element && function(ElementPrototype) {
	ElementPrototype.matchesSelector = ElementPrototype.matchesSelector ||
	ElementPrototype.mozMatchesSelector ||
	ElementPrototype.msMatchesSelector ||
	ElementPrototype.oMatchesSelector ||
	ElementPrototype.webkitMatchesSelector ||
	function (selector) {
		var node = this, nodes = (node.parentNode || node.document).querySelectorAll(selector), i = -1;

		while (nodes[++i] && nodes[i] != node);

		return !!nodes[i];
	}
}(Element.prototype);


// Chrome: 8 Edge: yes Firefox: 3.6 IE: 10 Opera: 11.50 Safari: 5.1
import documentRegisterElementPolyfill from "document-register-element";

// Chrome: no Edge: yes Firefox: no IE: 10 Opera: no Safari: no
import setimmediatePolyfill from "setimmediate";

// Chrome: no Edge: yes Firefox: no IE: 10 Opera: no Safari: no
import promisePolyfill from "promise-polyfill";

// Chrome: 38 Edge: yes Firefox: 36 IE: np Opera: 25 Safari: 9
import symbolsPolyfill from "get-own-property-symbols";

// Chrome: yes Edge: yes Firefox: 16 IE: no Opera: yes Safari: no
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger
Number.isInteger = Number.isInteger || function(value) {
  return typeof value === "number" &&
    isFinite(value) &&
    Math.floor(value) === value;
};
