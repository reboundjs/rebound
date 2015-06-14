import compiler from 'rebound-compiler/compile';
import tokenizer from 'simple-html-tokenizer';
import helpers from 'rebound-component/helpers';
import Model from 'rebound-data/model';
import hooks from 'rebound-component/hooks';

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

  _.each(env.revalidateQueue, function(template){
    template.revalidate();
  });
}



QUnit.test('Rebound Helpers - On', function() {

  var template, data, dom, env = hooks.createFreshEnv(), el = document.createElement('p');
  data = {
    el: el,
    simpleCallback: function(){
      window.delegateCallback = true;
      equal(1, 1, 'Events are triggered on the element');
    },
    callbackWithData: function(event){
      window.delegateCallback = true;
      equal(event.data.foo, 'bar', 'Events are past hash values as event.data');
    },
    delegateCallback: function(event){
      equal(window.delegateCallback, undefined, 'Events with a delegate are called before those without');
      window.delegateCallback = true;
      equal(event.target.tagName, 'LI', 'Events are triggered via delegates');
    },
    directCallback: function(event){
      equal(window.delegateCallback, undefined, 'Events bound directly to children elements are called before delegates higher in the dom tree');
    }
  };
  env.helpers._callOnComponent = function(name, event){
    return data[name].call(data, event);
  };

  template = compiler.compile(`<div id="0" style="visibility:hidden;"
         {{on "click" "simpleCallback"}}
         {{on "click" "callbackWithData" foo="bar"}}
         {{on "click" "li" "delegateCallback"}}
    >
     <ul>
      <li id="1" {{on "click" "directCallback"}}>One</li>
      <li id="2">Two</li>
     </ul>
   </div>`, {name: 'test/partial'});

  dom = template.render(data, env);
  // In PhantomJS, document fragments don't have a firstElementChild property
  var el = dom.fragment.firstChild;
  document.body.appendChild(el);
  var event = document.createEvent('Event');
  event.initEvent('click', true, true);
  el.firstElementChild.firstElementChild.dispatchEvent(event)

});
