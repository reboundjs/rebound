
      define( [  ], function(){
        return window.Rebound.registerComponent("test-index-6", {
          prototype: (function(){
    return ({
      service1: Rebound.services.service1,
      service2: Rebound.services.service2
    })
  })(),
          template: (function() {
  return {
    meta: {},
    arity: 0,
    cachedFragment: null,
    hasRendered: false,
    buildFragment: function buildFragment(dom) {
      var el0 = dom.createDocumentFragment();
      var el1 = dom.createTextNode("\n    ");
      dom.appendChild(el0, el1);
      var el1 = dom.createElement("h1");
      var el2 = dom.createTextNode("Index Page 6!");
      dom.appendChild(el1, el2);
      dom.appendChild(el0, el1);
      var el1 = dom.createTextNode("\n  ");
      dom.appendChild(el0, el1);
      return el0;
    },
    buildRenderNodes: function buildRenderNodes() { return []; },
    statements: [

    ],
    locals: [],
    templates: []
  };
}()),
          style: ""
        });
      });