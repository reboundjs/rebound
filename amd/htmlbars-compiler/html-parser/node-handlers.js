define("htmlbars-compiler/html-parser/node-handlers", 
  ["../ast","../html-parser/helpers","../html-parser/tokens","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var BlockNode = __dependency1__.BlockNode;
    var ProgramNode = __dependency1__.ProgramNode;
    var TextNode = __dependency1__.TextNode;
    var appendChild = __dependency1__.appendChild;
    var usesMorph = __dependency1__.usesMorph;
    var postprocessProgram = __dependency2__.postprocessProgram;
    var Chars = __dependency3__.Chars;

    var nodeHelpers = {

      program: function(program) {
        var statements = [];
        var node = new ProgramNode(statements, program.strip);
        var i, l = program.statements.length;

        this.elementStack.push(node);

        if (l === 0) return this.elementStack.pop();

        for (i = 0; i < l; i++) {
          this.acceptNode(program.statements[i]);
        }

        this.acceptToken(this.tokenizer.tokenizeEOF());

        postprocessProgram(node);

        // Ensure that that the element stack is balanced properly.
        var poppedNode = this.elementStack.pop();
        if (poppedNode !== node) {
          throw new Error("Unclosed element: " + poppedNode.tag);
        }

        return node;
      },

      block: function(block) {
        switchToHandlebars(this);
        this.acceptToken(block);

        var mustache = block.mustache;
        var program = this.acceptNode(block.program);
        var inverse = block.inverse ? this.acceptNode(block.inverse) : null;
        var strip = block.strip;

        // Normalize inverse's strip
        if (inverse && !inverse.strip.left) {
          inverse.strip.left = false;
        }

        var node = new BlockNode(mustache, program, inverse, strip);
        var parentProgram = this.currentElement();
        appendChild(parentProgram, node);
      },

      content: function(content) {
        var tokens = this.tokenizer.tokenizePart(content.string);

        return tokens.forEach(function(token) {
          this.acceptToken(token);
        }, this);
      },

      mustache: function(mustache) {
        switchToHandlebars(this);
        this.acceptToken(mustache);
      }

    };

    function switchToHandlebars(processor) {
      var token = processor.tokenizer.token;

      // TODO: Monkey patch Chars.addChar like attributes
      if (token instanceof Chars) {
        processor.acceptToken(token);
        processor.tokenizer.token = null;
      }
    }

    __exports__["default"] = nodeHelpers;
  });