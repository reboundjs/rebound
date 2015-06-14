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


QUnit.test('Rebound Precompiler', function() {

  var out, exp;

  out = precompile('<div></div>', {name: 'test/filepath'}).replace(/(\r\n|\n|\r)/gm," ").replace(/\s+/g," ");
  exp = " define( [ ], function(){ var template = (function() { return { meta: {}, arity: 0, cachedFragment: null, hasRendered: false, buildFragment: function buildFragment(dom) { var el0 = dom.createDocumentFragment(); var el1 = dom.createElement(\"div\"); dom.appendChild(el0, el1); return el0; }, buildRenderNodes: function buildRenderNodes() { return []; }, statements: [ ], locals: [], templates: [] }; }()); window.Rebound.registerPartial(\"test/filepath\", template); });";

  equal(out, exp, 'Pre-compiler can handle partials');



  out = precompile(
    '<element name="test-element">\n'         +
    '  <template>\n'      +
    '    <style>\n'       +
    '      .test{}\n'     +
    '    </style>\n'      +
    '    Test\n'          +
    '  </template>\n'     +
    '  <script>\n'        +
    '    alert(0)\n'      +
    '  </script>\n'       +
    '</element>\n');
  exp = 'define( [], function(){ (function(){var template = (function() { function build(dom) { var el0 = dom.createElement("div"); return el0; } var cachedFragment; return function template(context, env, contextualElement) { var dom = env.dom, hooks = env.hooks; if (cachedFragment === undefined) { cachedFragment = build(dom); } var fragment = dom.cloneNode(cachedFragment, true); return fragment; }; }()); window.Rebound.registerPartial( "test/filepath", template);})(); });';


});