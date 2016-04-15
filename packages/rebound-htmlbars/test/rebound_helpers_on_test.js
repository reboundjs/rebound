import compiler from 'rebound-compiler/compile';
import { tokenize } from 'simple-html-tokenizer/index';
import helpers from 'rebound-htmlbars/helpers';
import Model from 'rebound-data/model';
import hooks from 'rebound-htmlbars/hooks';

function equalTokens(fragment, html, message) {
  var div = document.createElement("div");

  div.appendChild(fragment.cloneNode(true));

  var fragTokens = tokenize(div.innerHTML);
  var htmlTokens = tokenize(html);

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

QUnit.test('Rebound Helpers - On', function(assert) {
  
  assert.expect(5);

  var data = {
    simpleCallback: function(){
      window.delegateCallback = true;
      assert.equal(1, 1, 'Events are triggered on the element');
    },
    callbackWithData: function(event){
      window.delegateCallback = true;
      assert.equal(event.data.foo, 'bar', 'Events are past hash values as event.data');
    },
    delegateCallback: function(event){
      equal(window.delegateCallback, undefined, 'Events with a delegate are called before those without');
      window.delegateCallback = true;
      assert.equal(event.target.tagName, 'LI', 'Events are triggered via delegates');
    },
    directCallback: function(event){
      assert.equal(window.delegateCallback, undefined, 'Events bound directly to children elements are called before delegates higher in the dom tree');
    }
  };
  var options = {
    helpers: {
      _callOnComponent: function(name, event){
        return data[name].call(data, event);
      }
    }
  };

  var template = compiler.compile(`<div id="0" style="visibility:hidden;"
         {{on "click" "simpleCallback"}}
         {{on "click" "callbackWithData" foo="bar"}}
         {{on "click" "li" "delegateCallback"}}
    >
     <ul>
      <li id="1" {{on "click" "directCallback"}}>One</li>
      <li id="2">Two</li>
     </ul>
   </div>`, {name: 'test/partial'});

  var dom = document.createDocumentFragment();
  template.render(dom, data, options);
  // In PhantomJS, document fragments don't have a firstElementChild property
  dom = dom.firstChild;
  document.body.appendChild(dom);
  var event = document.createEvent('Event');
  event.initEvent('click', true, true);
  dom.firstElementChild.firstElementChild.dispatchEvent(event);

});
