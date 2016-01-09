import compiler from 'rebound-compiler/compile';
import tokenizer from 'simple-html-tokenizer';
import helpers, { hasHelper, lookupHelper, registerHelper, registerPartial } from "rebound-htmlbars/helpers";
import Model from 'rebound-data/model';

function equalTokens(fragment, html, message) {
  var div = document.createElement("div");

  div.appendChild(fragment.cloneNode(true));

  var fragTokens = tokenizer.tokenize(div.innerHTML);
  var htmlTokens = tokenizer.tokenize(html);

  function normalizeTokens(token) {
    if (token.type === 'StartTag') {
      token.attributes = token.attributes.sort(function(a, b) {
        if (a.name > b.name) {
          return 1;
        }
        if (a.name < b.name) {
          return -1;
        }
        return 0;
      });
    }
  }

  fragTokens.forEach(normalizeTokens);
  htmlTokens.forEach(normalizeTokens);

  deepEqual(fragTokens, htmlTokens, message);
}

// Notify all of a object's observers of the change, execute the callback
function notify(obj, path) {
  // If path is not an array of keys, wrap it in array
  path = (_.isString(path)) ? [path] : path;

  // For each path, alert each observer and call its callback
  _.each(path, function(path) {
    if (obj.__observers && _.isObject(obj.__observers[path])) {
      _.each(obj.__observers[path].collection, function(callback, index) {
        if (callback) {
          callback.notify();
        } else {
          delete obj.__observers[path][index];
        }
      });
      _.each(obj.__observers[path].model, function(callback, index) {
        if (callback) {
          callback.notify();
        } else {
          delete obj.__observers[path][index];
        }
      });
    }
  });
}


/************************************************************

Register Helper

*************************************************************/

QUnit.test('Rebound Helpers - Register', function() {

  var func = function() {
    return 'test';
  };
  registerHelper('test', func);
  var regFunc = lookupHelper('test');
  equal(func, regFunc, 'helpers.register adds a helper to the global scope which can be fetched by Helpers.lookupHelper');


  var template, dom;

  template = compiler.compile('<div>{{doesnotexist foo bar}}</div>');
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(dom.fragment, '<div><!----></div>', 'Using a helper that does not exist failes silently.');

  template = compiler.compile('<div>{{test foo bar}}</div>');
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: false}));
  equalTokens(dom.fragment, '<div>test</div>', 'Using a helper that does exist outputs the return value.');


  template = compiler.compile('<div>{{if bool (doesnotexist foo)}}</div>');
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(dom.fragment, '<div><!----></div>', 'Using a helper that does not exist in a subexpression fails silently.');

  template = compiler.compile('<div>{{if bool (test)}}</div>');
  dom = template.render(new Model({foo:'bar', bar:'foo', bool: true}));
  equalTokens(dom.fragment, '<div>test</div>', 'Using a helper that does exist in a subexpression outputs the return value.');


});
