import precompile from 'rebound-compiler/precompile';

function equalTokens(fragment, html) {
  var div = document.createElement("div");

  div.appendChild(fragment.cloneNode(true));

  var fragTokens = tokenizer.tokenize(div.innerHTML);
  var htmlTokens = tokenizer.tokenize(html);

  function normalizeTokens(token) {
    if (token.type === 'StartTag') {
      token.attributes = token.attributes.sort(function(a,b){
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

  deepEqual(fragTokens, htmlTokens);
}


QUnit.test('Rebound Precompiler', function( assert ) {
  var out, exp;

  assert.expect(2);

  out = precompile('<div></div>', {name: 'test/filepath'}).src.replace(/(\r\n|\n|\r)/gm," ").replace(/\s+/g," ");
  exp = '(function(R){ R.router._loadDeps([ ]); R.registerPartial("test/filepath", (function() { return { meta: {}, isEmpty: false, arity: 0, cachedFragment: null, hasRendered: false, buildFragment: function buildFragment(dom) { var el0 = dom.createDocumentFragment(); var el1 = dom.createElement("div"); dom.appendChild(el0, el1); return el0; }, buildRenderNodes: function buildRenderNodes() { return []; }, statements: [ ], locals: [], templates: [] }; }())); })(window.Rebound);';

  assert.equal(out, exp, 'Pre-compiler can handle partials');



  out = precompile(
    '<element name="test-element">\n' +
    '  <template>\n'      +
    '    <style>\n'       +
    '      .test{}\n'     +
    '    </style>\n'      +
    '    Test\n'          +
    '  </template>\n'     +
    '  <script>\n'        +
    '    alert(0)\n'      +
    '  </script>\n'       +
    '</element>\n').src.replace(/(\r\n|\n|\r)/gm," ").replace(/\s+/g," ");
  exp = '(function(R){ R.router._loadDeps([ ]); document.currentScript.setAttribute("data-name", "test-element"); return R.registerComponent(\"test-element\", { prototype: (function(){ alert(0) })(), template: (function() { return { meta: {}, isEmpty: false, arity: 0, cachedFragment: null, hasRendered: false, buildFragment: function buildFragment(dom) { var el0 = dom.createDocumentFragment(); var el1 = dom.createTextNode(\"\\n \"); dom.appendChild(el0, el1); var el1 = dom.createElement(\"style\"); var el2 = dom.createTextNode(\"\\n .test{}\\n \"); dom.appendChild(el1, el2); dom.appendChild(el0, el1); var el1 = dom.createTextNode(\"\\n Test\\n \"); dom.appendChild(el0, el1); return el0; }, buildRenderNodes: function buildRenderNodes() { return []; }, statements: [ ], locals: [], templates: [] }; }()), stylesheet: \" .test{} \" }); })(window.Rebound);';
  assert.equal(out, exp, 'Pre-compiler can handle components');

});
