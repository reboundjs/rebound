define("htmlbars-compiler/compiler", 
  ["./parser","./compiler/template","htmlbars-runtime/dom_helpers","morph","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    /*jshint evil:true*/
    var preprocess = __dependency1__.preprocess;
    var TemplateCompiler = __dependency2__.TemplateCompiler;
    var domHelpers = __dependency3__.domHelpers;
    var Morph = __dependency4__.Morph;

    function compile(string, options) {
      return compileSpec(string, options)(domHelpers(), Morph);
    }

    __exports__.compile = compile;function compileSpec(string, options) {
      var ast = preprocess(string, options);
      var compiler = new TemplateCompiler();
      var program = compiler.compile(ast);
      return new Function("dom", "Morph", "return " + program);
    }

    __exports__.compileSpec = compileSpec;
  });