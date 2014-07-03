(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        //Allow using this built library as an AMD module
        //in another project. That other project will only
        //see this AMD call, not the internal modules in
        //the closure below.
        define([], factory);
    } else {
        //Browser globals case. Just assign the
        //result to a property on the global.
        root.htmlbars = factory();
    }
}(this, function () {
    //almond, and your modules will be inlined here

var define, requireModule, require, requirejs;

(function() {
  var registry = {}, seen = {}, state = {};
  var FAILED = false;

  define = function(name, deps, callback) {
    registry[name] = {
      deps: deps,
      callback: callback
    };
  };

  define.amd = {};

  function reify(deps, name, seen) {
    var length = deps.length;
    var reified = new Array(length);
    var dep;
    var exports;

    for (var i = 0, l = length; i < l; i++) {
      dep = deps[i];
      if (dep === 'exports') {
        exports = reified[i] = seen;
      } else {
        reified[i] = require(resolve(dep, name));
      }
    }

    return {
      deps: reified,
      exports: exports
    };
  }

  requirejs = require = requireModule = function(name) {
    if (state[name] !== FAILED &&
        seen.hasOwnProperty(name)) {
      return seen[name];
    }

    if (!registry[name]) {
      throw new Error('Could not find module ' + name);
    }

    var mod = registry[name];
    var reified;
    var module;
    var loaded = false;

    seen[name] = { }; // placeholder for run-time cycles

    try {
      reified = reify(mod.deps, name, seen[name]);
      module = mod.callback.apply(this, reified.deps);
      loaded = true;
    } finally {
      if (!loaded) {
        state[name] = FAILED;
      }
    }

    return reified.exports ? seen[name] : (seen[name] = module);
  };

  function resolve(child, name) {
    if (child.charAt(0) !== '.') { return child; }

    var parts = child.split('/');
    var nameParts = name.split('/');
    var parentBase = nameParts.slice(0, -1);

    for (var i = 0, l = parts.length; i < l; i++) {
      var part = parts[i];

      if (part === '..') { parentBase.pop(); }
      else if (part === '.') { continue; }
      else { parentBase.push(part); }
    }

    return parentBase.join('/');
  }

  requirejs.entries = requirejs._eak_seen = registry;
  requirejs.clear = function(){
    requirejs.entries = requirejs._eak_seen = registry = {};
    seen = state = {};
  };
})();

define("handlebars/base", 
  ["./utils","./exception","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Utils = __dependency1__;
    var Exception = __dependency2__["default"];

    var VERSION = "2.0.0-alpha.4";
    __exports__.VERSION = VERSION;var COMPILER_REVISION = 5;
    __exports__.COMPILER_REVISION = COMPILER_REVISION;
    var REVISION_CHANGES = {
      1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
      2: '== 1.0.0-rc.3',
      3: '== 1.0.0-rc.4',
      4: '== 1.x.x',
      5: '>= 2.0.0'
    };
    __exports__.REVISION_CHANGES = REVISION_CHANGES;
    var isArray = Utils.isArray,
        isFunction = Utils.isFunction,
        toString = Utils.toString,
        objectType = '[object Object]';

    function HandlebarsEnvironment(helpers, partials) {
      this.helpers = helpers || {};
      this.partials = partials || {};

      registerDefaultHelpers(this);
    }

    __exports__.HandlebarsEnvironment = HandlebarsEnvironment;HandlebarsEnvironment.prototype = {
      constructor: HandlebarsEnvironment,

      logger: logger,
      log: log,

      registerHelper: function(name, fn, inverse) {
        if (toString.call(name) === objectType) {
          if (inverse || fn) { throw new Exception('Arg not supported with multiple helpers'); }
          Utils.extend(this.helpers, name);
        } else {
          if (inverse) { fn.not = inverse; }
          this.helpers[name] = fn;
        }
      },
      unregisterHelper: function(name) {
        delete this.helpers[name];
      },

      registerPartial: function(name, str) {
        if (toString.call(name) === objectType) {
          Utils.extend(this.partials,  name);
        } else {
          this.partials[name] = str;
        }
      },
      unregisterPartial: function(name) {
        delete this.partials[name];
      }
    };

    function registerDefaultHelpers(instance) {
      instance.registerHelper('helperMissing', function(/* [args, ]options */) {
        if(arguments.length === 1) {
          // A missing field in a {{foo}} constuct.
          return undefined;
        } else {
          // Someone is actually trying to call something, blow up.
          throw new Exception("Missing helper: '" + arguments[arguments.length-1].name + "'");
        }
      });

      instance.registerHelper('blockHelperMissing', function(context, options) {
        var inverse = options.inverse || function() {}, fn = options.fn;

        if (isFunction(context)) { context = context.call(this); }

        if(context === true) {
          return fn(this);
        } else if(context === false || context == null) {
          return inverse(this);
        } else if (isArray(context)) {
          if(context.length > 0) {
            if (options.ids) {
              options.ids = [options.name];
            }

            return instance.helpers.each(context, options);
          } else {
            return inverse(this);
          }
        } else {
          if (options.data && options.ids) {
            var data = createFrame(options.data);
            data.contextPath = Utils.appendContextPath(options.data.contextPath, options.name);
            options = {data: data};
          }

          return fn(context, options);
        }
      });

      instance.registerHelper('each', function(context, options) {
        if (!options) {
          throw new Exception('Must pass iterator to #each');
        }

        var fn = options.fn, inverse = options.inverse;
        var i = 0, ret = "", data;

        var contextPath;
        if (options.data && options.ids) {
          contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]) + '.';
        }

        if (isFunction(context)) { context = context.call(this); }

        if (options.data) {
          data = createFrame(options.data);
        }

        if(context && typeof context === 'object') {
          if (isArray(context)) {
            for(var j = context.length; i<j; i++) {
              if (data) {
                data.index = i;
                data.first = (i === 0);
                data.last  = (i === (context.length-1));

                if (contextPath) {
                  data.contextPath = contextPath + i;
                }
              }
              ret = ret + fn(context[i], { data: data });
            }
          } else {
            for(var key in context) {
              if(context.hasOwnProperty(key)) {
                if(data) {
                  data.key = key;
                  data.index = i;
                  data.first = (i === 0);

                  if (contextPath) {
                    data.contextPath = contextPath + key;
                  }
                }
                ret = ret + fn(context[key], {data: data});
                i++;
              }
            }
          }
        }

        if(i === 0){
          ret = inverse(this);
        }

        return ret;
      });

      instance.registerHelper('if', function(conditional, options) {
        if (isFunction(conditional)) { conditional = conditional.call(this); }

        // Default behavior is to render the positive path if the value is truthy and not empty.
        // The `includeZero` option may be set to treat the condtional as purely not empty based on the
        // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
        if ((!options.hash.includeZero && !conditional) || Utils.isEmpty(conditional)) {
          return options.inverse(this);
        } else {
          return options.fn(this);
        }
      });

      instance.registerHelper('unless', function(conditional, options) {
        return instance.helpers['if'].call(this, conditional, {fn: options.inverse, inverse: options.fn, hash: options.hash});
      });

      instance.registerHelper('with', function(context, options) {
        if (isFunction(context)) { context = context.call(this); }

        var fn = options.fn;

        if (!Utils.isEmpty(context)) {
          if (options.data && options.ids) {
            var data = createFrame(options.data);
            data.contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]);
            options = {data:data};
          }

          return fn(context, options);
        }
      });

      instance.registerHelper('log', function(context, options) {
        var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
        instance.log(level, context);
      });

      instance.registerHelper('lookup', function(obj, field, options) {
        return obj && obj[field];
      });
    }

    var logger = {
      methodMap: { 0: 'debug', 1: 'info', 2: 'warn', 3: 'error' },

      // State enum
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
      level: 3,

      // can be overridden in the host environment
      log: function(level, obj) {
        if (logger.level <= level) {
          var method = logger.methodMap[level];
          if (typeof console !== 'undefined' && console[method]) {
            console[method].call(console, obj);
          }
        }
      }
    };
    __exports__.logger = logger;
    function log(level, obj) { logger.log(level, obj); }

    __exports__.log = log;var createFrame = function(object) {
      var frame = Utils.extend({}, object);
      frame._parent = object;
      return frame;
    };
    __exports__.createFrame = createFrame;
  });
define("handlebars/compiler/ast", 
  ["../exception","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Exception = __dependency1__["default"];

    function LocationInfo(locInfo){
      locInfo = locInfo || {};
      this.firstLine   = locInfo.first_line;
      this.firstColumn = locInfo.first_column;
      this.lastColumn  = locInfo.last_column;
      this.lastLine    = locInfo.last_line;
    }

    var AST = {
      ProgramNode: function(statements, inverseStrip, inverse, locInfo) {
        var inverseLocationInfo, firstInverseNode;
        if (arguments.length === 3) {
          locInfo = inverse;
          inverse = null;
        } else if (arguments.length === 2) {
          locInfo = inverseStrip;
          inverseStrip = null;
        }

        LocationInfo.call(this, locInfo);
        this.type = "program";
        this.statements = statements;
        this.strip = {};

        if(inverse) {
          firstInverseNode = inverse[0];
          if (firstInverseNode) {
            inverseLocationInfo = {
              first_line: firstInverseNode.firstLine,
              last_line: firstInverseNode.lastLine,
              last_column: firstInverseNode.lastColumn,
              first_column: firstInverseNode.firstColumn
            };
            this.inverse = new AST.ProgramNode(inverse, inverseStrip, inverseLocationInfo);
          } else {
            this.inverse = new AST.ProgramNode(inverse, inverseStrip);
          }
          this.strip.right = inverseStrip.left;
        } else if (inverseStrip) {
          this.strip.left = inverseStrip.right;
        }
      },

      MustacheNode: function(rawParams, hash, open, strip, locInfo) {
        LocationInfo.call(this, locInfo);
        this.type = "mustache";
        this.strip = strip;

        // Open may be a string parsed from the parser or a passed boolean flag
        if (open != null && open.charAt) {
          // Must use charAt to support IE pre-10
          var escapeFlag = open.charAt(3) || open.charAt(2);
          this.escaped = escapeFlag !== '{' && escapeFlag !== '&';
        } else {
          this.escaped = !!open;
        }

        if (rawParams instanceof AST.SexprNode) {
          this.sexpr = rawParams;
        } else {
          // Support old AST API
          this.sexpr = new AST.SexprNode(rawParams, hash);
        }

        this.sexpr.isRoot = true;

        // Support old AST API that stored this info in MustacheNode
        this.id = this.sexpr.id;
        this.params = this.sexpr.params;
        this.hash = this.sexpr.hash;
        this.eligibleHelper = this.sexpr.eligibleHelper;
        this.isHelper = this.sexpr.isHelper;
      },

      SexprNode: function(rawParams, hash, locInfo) {
        LocationInfo.call(this, locInfo);

        this.type = "sexpr";
        this.hash = hash;

        var id = this.id = rawParams[0];
        var params = this.params = rawParams.slice(1);

        // a mustache is definitely a helper if:
        // * it is an eligible helper, and
        // * it has at least one parameter or hash segment
        this.isHelper = !!(params.length || hash);

        // a mustache is an eligible helper if:
        // * its id is simple (a single part, not `this` or `..`)
        this.eligibleHelper = this.isHelper || id.isSimple;

        // if a mustache is an eligible helper but not a definite
        // helper, it is ambiguous, and will be resolved in a later
        // pass or at runtime.
      },

      PartialNode: function(partialName, context, hash, strip, locInfo) {
        LocationInfo.call(this, locInfo);
        this.type         = "partial";
        this.partialName  = partialName;
        this.context      = context;
        this.hash = hash;
        this.strip = strip;
      },

      BlockNode: function(mustache, program, inverse, close, locInfo) {
        LocationInfo.call(this, locInfo);

        if(mustache.sexpr.id.original !== close.path.original) {
          throw new Exception(mustache.sexpr.id.original + " doesn't match " + close.path.original, this);
        }

        this.type = 'block';
        this.mustache = mustache;
        this.program  = program;
        this.inverse  = inverse;

        this.strip = {
          left: mustache.strip.left,
          right: close.strip.right
        };

        (program || inverse).strip.left = mustache.strip.right;
        (inverse || program).strip.right = close.strip.left;

        if (inverse && !program) {
          this.isInverse = true;
        }
      },

      RawBlockNode: function(mustache, content, close, locInfo) {
        LocationInfo.call(this, locInfo);

        if (mustache.sexpr.id.original !== close) {
          throw new Exception(mustache.sexpr.id.original + " doesn't match " + close, this);
        }

        content = new AST.ContentNode(content, locInfo);

        this.type = 'block';
        this.mustache = mustache;
        this.program = new AST.ProgramNode([content], locInfo);
      },

      ContentNode: function(string, locInfo) {
        LocationInfo.call(this, locInfo);
        this.type = "content";
        this.string = string;
      },

      HashNode: function(pairs, locInfo) {
        LocationInfo.call(this, locInfo);
        this.type = "hash";
        this.pairs = pairs;
      },

      IdNode: function(parts, locInfo) {
        LocationInfo.call(this, locInfo);
        this.type = "ID";

        var original = "",
            dig = [],
            depth = 0,
            depthString = '';

        for(var i=0,l=parts.length; i<l; i++) {
          var part = parts[i].part;
          original += (parts[i].separator || '') + part;

          if (part === ".." || part === "." || part === "this") {
            if (dig.length > 0) {
              throw new Exception("Invalid path: " + original, this);
            } else if (part === "..") {
              depth++;
              depthString += '../';
            } else {
              this.isScoped = true;
            }
          } else {
            dig.push(part);
          }
        }

        this.original = original;
        this.parts    = dig;
        this.string   = dig.join('.');
        this.depth    = depth;
        this.idName   = depthString + this.string;

        // an ID is simple if it only has one part, and that part is not
        // `..` or `this`.
        this.isSimple = parts.length === 1 && !this.isScoped && depth === 0;

        this.stringModeValue = this.string;
      },

      PartialNameNode: function(name, locInfo) {
        LocationInfo.call(this, locInfo);
        this.type = "PARTIAL_NAME";
        this.name = name.original;
      },

      DataNode: function(id, locInfo) {
        LocationInfo.call(this, locInfo);
        this.type = "DATA";
        this.id = id;
        this.stringModeValue = id.stringModeValue;
        this.idName = '@' + id.stringModeValue;
      },

      StringNode: function(string, locInfo) {
        LocationInfo.call(this, locInfo);
        this.type = "STRING";
        this.original =
          this.string =
          this.stringModeValue = string;
      },

      NumberNode: function(number, locInfo) {
        LocationInfo.call(this, locInfo);
        this.type = "NUMBER";
        this.original =
          this.number = number;
        this.stringModeValue = Number(number);
      },

      BooleanNode: function(bool, locInfo) {
        LocationInfo.call(this, locInfo);
        this.type = "BOOLEAN";
        this.bool = bool;
        this.stringModeValue = bool === "true";
      },

      CommentNode: function(comment, locInfo) {
        LocationInfo.call(this, locInfo);
        this.type = "comment";
        this.comment = comment;
      }
    };

    // Must be exported as an object rather than the root of the module as the jison lexer
    // most modify the object to operate properly.
    __exports__["default"] = AST;
  });
define("handlebars/compiler/base", 
  ["./parser","./ast","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var parser = __dependency1__["default"];
    var AST = __dependency2__["default"];

    __exports__.parser = parser;

    function parse(input) {
      // Just return if an already-compile AST was passed in.
      if(input.constructor === AST.ProgramNode) { return input; }

      parser.yy = AST;
      return parser.parse(input);
    }

    __exports__.parse = parse;
  });
define("handlebars/compiler/compiler", 
  ["../exception","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Exception = __dependency1__["default"];

    function Compiler() {}

    __exports__.Compiler = Compiler;// the foundHelper register will disambiguate helper lookup from finding a
    // function in a context. This is necessary for mustache compatibility, which
    // requires that context functions in blocks are evaluated by blockHelperMissing,
    // and then proceed as if the resulting value was provided to blockHelperMissing.

    Compiler.prototype = {
      compiler: Compiler,

      disassemble: function() {
        var opcodes = this.opcodes, opcode, out = [], params, param;

        for (var i=0, l=opcodes.length; i<l; i++) {
          opcode = opcodes[i];

          if (opcode.opcode === 'DECLARE') {
            out.push("DECLARE " + opcode.name + "=" + opcode.value);
          } else {
            params = [];
            for (var j=0; j<opcode.args.length; j++) {
              param = opcode.args[j];
              if (typeof param === "string") {
                param = "\"" + param.replace("\n", "\\n") + "\"";
              }
              params.push(param);
            }
            out.push(opcode.opcode + " " + params.join(" "));
          }
        }

        return out.join("\n");
      },

      equals: function(other) {
        var len = this.opcodes.length;
        if (other.opcodes.length !== len) {
          return false;
        }

        for (var i = 0; i < len; i++) {
          var opcode = this.opcodes[i],
              otherOpcode = other.opcodes[i];
          if (opcode.opcode !== otherOpcode.opcode || opcode.args.length !== otherOpcode.args.length) {
            return false;
          }
          for (var j = 0; j < opcode.args.length; j++) {
            if (opcode.args[j] !== otherOpcode.args[j]) {
              return false;
            }
          }
        }

        len = this.children.length;
        if (other.children.length !== len) {
          return false;
        }
        for (i = 0; i < len; i++) {
          if (!this.children[i].equals(other.children[i])) {
            return false;
          }
        }

        return true;
      },

      guid: 0,

      compile: function(program, options) {
        this.opcodes = [];
        this.children = [];
        this.depths = {list: []};
        this.options = options;
        this.stringParams = options.stringParams;
        this.trackIds = options.trackIds;

        // These changes will propagate to the other compiler components
        var knownHelpers = this.options.knownHelpers;
        this.options.knownHelpers = {
          'helperMissing': true,
          'blockHelperMissing': true,
          'each': true,
          'if': true,
          'unless': true,
          'with': true,
          'log': true,
          'lookup': true
        };
        if (knownHelpers) {
          for (var name in knownHelpers) {
            this.options.knownHelpers[name] = knownHelpers[name];
          }
        }

        return this.accept(program);
      },

      accept: function(node) {
        var strip = node.strip || {},
            ret;
        if (strip.left) {
          this.opcode('strip');
        }

        ret = this[node.type](node);

        if (strip.right) {
          this.opcode('strip');
        }

        return ret;
      },

      program: function(program) {
        var statements = program.statements;

        for(var i=0, l=statements.length; i<l; i++) {
          this.accept(statements[i]);
        }
        this.isSimple = l === 1;

        this.depths.list = this.depths.list.sort(function(a, b) {
          return a - b;
        });

        return this;
      },

      compileProgram: function(program) {
        var result = new this.compiler().compile(program, this.options);
        var guid = this.guid++, depth;

        this.usePartial = this.usePartial || result.usePartial;

        this.children[guid] = result;

        for(var i=0, l=result.depths.list.length; i<l; i++) {
          depth = result.depths.list[i];

          if(depth < 2) { continue; }
          else { this.addDepth(depth - 1); }
        }

        return guid;
      },

      block: function(block) {
        var mustache = block.mustache,
            program = block.program,
            inverse = block.inverse;

        if (program) {
          program = this.compileProgram(program);
        }

        if (inverse) {
          inverse = this.compileProgram(inverse);
        }

        var sexpr = mustache.sexpr;
        var type = this.classifySexpr(sexpr);

        if (type === "helper") {
          this.helperSexpr(sexpr, program, inverse);
        } else if (type === "simple") {
          this.simpleSexpr(sexpr);

          // now that the simple mustache is resolved, we need to
          // evaluate it by executing `blockHelperMissing`
          this.opcode('pushProgram', program);
          this.opcode('pushProgram', inverse);
          this.opcode('emptyHash');
          this.opcode('blockValue', sexpr.id.original);
        } else {
          this.ambiguousSexpr(sexpr, program, inverse);

          // now that the simple mustache is resolved, we need to
          // evaluate it by executing `blockHelperMissing`
          this.opcode('pushProgram', program);
          this.opcode('pushProgram', inverse);
          this.opcode('emptyHash');
          this.opcode('ambiguousBlockValue');
        }

        this.opcode('append');
      },

      hash: function(hash) {
        var pairs = hash.pairs, i, l;

        this.opcode('pushHash');

        for(i=0, l=pairs.length; i<l; i++) {
          this.pushParam(pairs[i][1]);
        }
        while(i--) {
          this.opcode('assignToHash', pairs[i][0]);
        }
        this.opcode('popHash');
      },

      partial: function(partial) {
        var partialName = partial.partialName;
        this.usePartial = true;

        if (partial.hash) {
          this.accept(partial.hash);
        } else {
          this.opcode('push', 'undefined');
        }

        if (partial.context) {
          this.accept(partial.context);
        } else {
          this.opcode('push', 'depth0');
        }

        this.opcode('invokePartial', partialName.name);
        this.opcode('append');
      },

      content: function(content) {
        this.opcode('appendContent', content.string);
      },

      mustache: function(mustache) {
        this.sexpr(mustache.sexpr);

        if(mustache.escaped && !this.options.noEscape) {
          this.opcode('appendEscaped');
        } else {
          this.opcode('append');
        }
      },

      ambiguousSexpr: function(sexpr, program, inverse) {
        var id = sexpr.id,
            name = id.parts[0],
            isBlock = program != null || inverse != null;

        this.opcode('getContext', id.depth);

        this.opcode('pushProgram', program);
        this.opcode('pushProgram', inverse);

        this.opcode('invokeAmbiguous', name, isBlock);
      },

      simpleSexpr: function(sexpr) {
        var id = sexpr.id;

        if (id.type === 'DATA') {
          this.DATA(id);
        } else if (id.parts.length) {
          this.ID(id);
        } else {
          // Simplified ID for `this`
          this.addDepth(id.depth);
          this.opcode('getContext', id.depth);
          this.opcode('pushContext');
        }

        this.opcode('resolvePossibleLambda');
      },

      helperSexpr: function(sexpr, program, inverse) {
        var params = this.setupFullMustacheParams(sexpr, program, inverse),
            id = sexpr.id,
            name = id.parts[0];

        if (this.options.knownHelpers[name]) {
          this.opcode('invokeKnownHelper', params.length, name);
        } else if (this.options.knownHelpersOnly) {
          throw new Exception("You specified knownHelpersOnly, but used the unknown helper " + name, sexpr);
        } else {
          this.ID(id);
          this.opcode('invokeHelper', params.length, id.original, sexpr.isRoot);
        }
      },

      sexpr: function(sexpr) {
        var type = this.classifySexpr(sexpr);

        if (type === "simple") {
          this.simpleSexpr(sexpr);
        } else if (type === "helper") {
          this.helperSexpr(sexpr);
        } else {
          this.ambiguousSexpr(sexpr);
        }
      },

      ID: function(id) {
        this.addDepth(id.depth);
        this.opcode('getContext', id.depth);

        var name = id.parts[0];
        if (!name) {
          this.opcode('pushContext');
        } else {
          this.opcode('lookupOnContext', id.parts[0]);
        }

        for(var i=1, l=id.parts.length; i<l; i++) {
          this.opcode('lookup', id.parts[i]);
        }
      },

      DATA: function(data) {
        this.options.data = true;
        this.opcode('lookupData', data.id.depth);
        var parts = data.id.parts;
        for(var i=0, l=parts.length; i<l; i++) {
          this.opcode('lookup', parts[i]);
        }
      },

      STRING: function(string) {
        this.opcode('pushString', string.string);
      },

      NUMBER: function(number) {
        this.opcode('pushLiteral', number.number);
      },

      BOOLEAN: function(bool) {
        this.opcode('pushLiteral', bool.bool);
      },

      comment: function() {},

      // HELPERS
      opcode: function(name) {
        this.opcodes.push({ opcode: name, args: [].slice.call(arguments, 1) });
      },

      declare: function(name, value) {
        this.opcodes.push({ opcode: 'DECLARE', name: name, value: value });
      },

      addDepth: function(depth) {
        if(depth === 0) { return; }

        if(!this.depths[depth]) {
          this.depths[depth] = true;
          this.depths.list.push(depth);
        }
      },

      classifySexpr: function(sexpr) {
        var isHelper   = sexpr.isHelper;
        var isEligible = sexpr.eligibleHelper;
        var options    = this.options;

        // if ambiguous, we can possibly resolve the ambiguity now
        // An eligible helper is one that does not have a complex path, i.e. `this.foo`, `../foo` etc.
        if (isEligible && !isHelper) {
          var name = sexpr.id.parts[0];

          if (options.knownHelpers[name]) {
            isHelper = true;
          } else if (options.knownHelpersOnly) {
            isEligible = false;
          }
        }

        if (isHelper) { return "helper"; }
        else if (isEligible) { return "ambiguous"; }
        else { return "simple"; }
      },

      pushParams: function(params) {
        for(var i=0, l=params.length; i<l; i++) {
          this.pushParam(params[i]);
        }
      },

      pushParam: function(val) {
        if (this.stringParams) {
          if(val.depth) {
            this.addDepth(val.depth);
          }
          this.opcode('getContext', val.depth || 0);
          this.opcode('pushStringParam', val.stringModeValue, val.type);

          if (val.type === 'sexpr') {
            // Subexpressions get evaluated and passed in
            // in string params mode.
            this.sexpr(val);
          }
        } else {
          if (this.trackIds) {
            this.opcode('pushId', val.type, val.idName || val.stringModeValue);
          }
          this.accept(val);
        }
      },

      setupFullMustacheParams: function(sexpr, program, inverse) {
        var params = sexpr.params;
        this.pushParams(params);

        this.opcode('pushProgram', program);
        this.opcode('pushProgram', inverse);

        if (sexpr.hash) {
          this.hash(sexpr.hash);
        } else {
          this.opcode('emptyHash');
        }

        return params;
      }
    };

    function precompile(input, options, env) {
      if (input == null || (typeof input !== 'string' && input.constructor !== env.AST.ProgramNode)) {
        throw new Exception("You must pass a string or Handlebars AST to Handlebars.precompile. You passed " + input);
      }

      options = options || {};
      if (!('data' in options)) {
        options.data = true;
      }

      var ast = env.parse(input);
      var environment = new env.Compiler().compile(ast, options);
      return new env.JavaScriptCompiler().compile(environment, options);
    }

    __exports__.precompile = precompile;function compile(input, options, env) {
      if (input == null || (typeof input !== 'string' && input.constructor !== env.AST.ProgramNode)) {
        throw new Exception("You must pass a string or Handlebars AST to Handlebars.compile. You passed " + input);
      }

      options = options || {};

      if (!('data' in options)) {
        options.data = true;
      }

      var compiled;

      function compileInput() {
        var ast = env.parse(input);
        var environment = new env.Compiler().compile(ast, options);
        var templateSpec = new env.JavaScriptCompiler().compile(environment, options, undefined, true);
        return env.template(templateSpec);
      }

      // Template is only compiled on first use and cached after that point.
      var ret = function(context, options) {
        if (!compiled) {
          compiled = compileInput();
        }
        return compiled.call(this, context, options);
      };
      ret._setup = function(options) {
        if (!compiled) {
          compiled = compileInput();
        }
        return compiled._setup(options);
      };
      ret._child = function(i) {
        if (!compiled) {
          compiled = compileInput();
        }
        return compiled._child(i);
      };
      return ret;
    }

    __exports__.compile = compile;
  });
define("handlebars/compiler/javascript-compiler", 
  ["../base","../exception","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var COMPILER_REVISION = __dependency1__.COMPILER_REVISION;
    var REVISION_CHANGES = __dependency1__.REVISION_CHANGES;
    var log = __dependency1__.log;
    var Exception = __dependency2__["default"];

    function Literal(value) {
      this.value = value;
    }

    function JavaScriptCompiler() {}

    JavaScriptCompiler.prototype = {
      // PUBLIC API: You can override these methods in a subclass to provide
      // alternative compiled forms for name lookup and buffering semantics
      nameLookup: function(parent, name /* , type*/) {
        var wrap,
            ret;
        if (parent.indexOf('depth') === 0) {
          wrap = true;
        }

        if (JavaScriptCompiler.isValidJavaScriptVariableName(name)) {
          ret = parent + "." + name;
        } else {
          ret = parent + "['" + name + "']";
        }

        if (wrap) {
          return '(' + parent + ' && ' + ret + ')';
        } else {
          return ret;
        }
      },

      compilerInfo: function() {
        var revision = COMPILER_REVISION,
            versions = REVISION_CHANGES[revision];
        return [revision, versions];
      },

      appendToBuffer: function(string) {
        if (this.environment.isSimple) {
          return "return " + string + ";";
        } else {
          return {
            appendToBuffer: true,
            content: string,
            toString: function() { return "buffer += " + string + ";"; }
          };
        }
      },

      initializeBuffer: function() {
        return this.quotedString("");
      },

      namespace: "Handlebars",
      // END PUBLIC API

      compile: function(environment, options, context, asObject) {
        this.environment = environment;
        this.options = options || {};
        this.stringParams = this.options.stringParams;
        this.trackIds = this.options.trackIds;
        this.precompile = !asObject;

        log('debug', this.environment.disassemble() + "\n\n");

        this.name = this.environment.name;
        this.isChild = !!context;
        this.context = context || {
          programs: [],
          environments: []
        };

        this.preamble();

        this.stackSlot = 0;
        this.stackVars = [];
        this.aliases = {};
        this.registers = { list: [] };
        this.hashes = [];
        this.compileStack = [];
        this.inlineStack = [];

        this.compileChildren(environment, options);

        var opcodes = environment.opcodes,
            opcode,
            i,
            l;

        for (i = 0, l = opcodes.length; i < l; i++) {
          opcode = opcodes[i];

          if(opcode.opcode === 'DECLARE') {
            this[opcode.name] = opcode.value;
          } else {
            this[opcode.opcode].apply(this, opcode.args);
          }

          // Reset the stripNext flag if it was not set by this operation.
          if (opcode.opcode !== this.stripNext) {
            this.stripNext = false;
          }
        }

        // Flush any trailing content that might be pending.
        this.pushSource('');

        if (this.stackSlot || this.inlineStack.length || this.compileStack.length) {
          throw new Exception('Compile completed with content left on stack');
        }

        var fn = this.createFunctionContext(asObject);
        if (!this.isChild) {
          var ret = {
            compiler: this.compilerInfo(),
            main: fn
          };
          var programs = this.context.programs;
          for (i = 0, l = programs.length; i < l; i++) {
            if (programs[i]) {
              ret[i] = programs[i];
            }
          }

          if (this.environment.usePartial) {
            ret.usePartial = true;
          }
          if (this.options.data) {
            ret.useData = true;
          }

          if (!asObject) {
            ret.compiler = JSON.stringify(ret.compiler);
            ret = this.objectLiteral(ret);
          }

          return ret;
        } else {
          return fn;
        }
      },

      preamble: function() {
        // track the last context pushed into place to allow skipping the
        // getContext opcode when it would be a noop
        this.lastContext = 0;
        this.source = [];
      },

      createFunctionContext: function(asObject) {
        var varDeclarations = '';

        var locals = this.stackVars.concat(this.registers.list);
        if(locals.length > 0) {
          varDeclarations += ", " + locals.join(", ");
        }

        // Generate minimizer alias mappings
        for (var alias in this.aliases) {
          if (this.aliases.hasOwnProperty(alias)) {
            varDeclarations += ', ' + alias + '=' + this.aliases[alias];
          }
        }

        var params = ["depth0", "helpers", "partials", "data"];

        for(var i=0, l=this.environment.depths.list.length; i<l; i++) {
          params.push("depth" + this.environment.depths.list[i]);
        }

        // Perform a second pass over the output to merge content when possible
        var source = this.mergeSource(varDeclarations);

        if (asObject) {
          params.push(source);

          return Function.apply(this, params);
        } else {
          return 'function(' + params.join(',') + ') {\n  ' + source + '}';
        }
      },
      mergeSource: function(varDeclarations) {
        var source = '',
            buffer,
            appendOnly = !this.forceBuffer,
            appendFirst;

        for (var i = 0, len = this.source.length; i < len; i++) {
          var line = this.source[i];
          if (line.appendToBuffer) {
            if (buffer) {
              buffer = buffer + '\n    + ' + line.content;
            } else {
              buffer = line.content;
            }
          } else {
            if (buffer) {
              if (!source) {
                appendFirst = true;
                source = buffer + ';\n  ';
              } else {
                source += 'buffer += ' + buffer + ';\n  ';
              }
              buffer = undefined;
            }
            source += line + '\n  ';

            if (!this.environment.isSimple) {
              appendOnly = false;
            }
          }
        }

        if (appendOnly) {
          if (buffer || !source) {
            source += 'return ' + (buffer || '""') + ';\n';
          }
        } else {
          varDeclarations += ", buffer = " + (appendFirst ? '' : this.initializeBuffer());
          if (buffer) {
            source += 'return buffer + ' + buffer + ';\n';
          } else {
            source += 'return buffer;\n';
          }
        }

        if (varDeclarations) {
          source = 'var ' + varDeclarations.substring(2) + (appendFirst ? '' : ';\n  ') + source;
        }

        return source;
      },

      // [blockValue]
      //
      // On stack, before: hash, inverse, program, value
      // On stack, after: return value of blockHelperMissing
      //
      // The purpose of this opcode is to take a block of the form
      // `{{#this.foo}}...{{/this.foo}}`, resolve the value of `foo`, and
      // replace it on the stack with the result of properly
      // invoking blockHelperMissing.
      blockValue: function(name) {
        this.aliases.blockHelperMissing = 'helpers.blockHelperMissing';

        var params = ["depth0"];
        this.setupParams(name, 0, params);

        this.replaceStack(function(current) {
          params.splice(1, 0, current);
          return "blockHelperMissing.call(" + params.join(", ") + ")";
        });
      },

      // [ambiguousBlockValue]
      //
      // On stack, before: hash, inverse, program, value
      // Compiler value, before: lastHelper=value of last found helper, if any
      // On stack, after, if no lastHelper: same as [blockValue]
      // On stack, after, if lastHelper: value
      ambiguousBlockValue: function() {
        this.aliases.blockHelperMissing = 'helpers.blockHelperMissing';

        // We're being a bit cheeky and reusing the options value from the prior exec
        var params = ["depth0"];
        this.setupParams('', 0, params, true);

        this.flushInline();

        var current = this.topStack();
        params.splice(1, 0, current);

        this.pushSource("if (!" + this.lastHelper + ") { " + current + " = blockHelperMissing.call(" + params.join(", ") + "); }");
      },

      // [appendContent]
      //
      // On stack, before: ...
      // On stack, after: ...
      //
      // Appends the string value of `content` to the current buffer
      appendContent: function(content) {
        if (this.pendingContent) {
          content = this.pendingContent + content;
        }
        if (this.stripNext) {
          content = content.replace(/^\s+/, '');
        }

        this.pendingContent = content;
      },

      // [strip]
      //
      // On stack, before: ...
      // On stack, after: ...
      //
      // Removes any trailing whitespace from the prior content node and flags
      // the next operation for stripping if it is a content node.
      strip: function() {
        if (this.pendingContent) {
          this.pendingContent = this.pendingContent.replace(/\s+$/, '');
        }
        this.stripNext = 'strip';
      },

      // [append]
      //
      // On stack, before: value, ...
      // On stack, after: ...
      //
      // Coerces `value` to a String and appends it to the current buffer.
      //
      // If `value` is truthy, or 0, it is coerced into a string and appended
      // Otherwise, the empty string is appended
      append: function() {
        // Force anything that is inlined onto the stack so we don't have duplication
        // when we examine local
        this.flushInline();
        var local = this.popStack();
        this.pushSource("if(" + local + " || " + local + " === 0) { " + this.appendToBuffer(local) + " }");
        if (this.environment.isSimple) {
          this.pushSource("else { " + this.appendToBuffer("''") + " }");
        }
      },

      // [appendEscaped]
      //
      // On stack, before: value, ...
      // On stack, after: ...
      //
      // Escape `value` and append it to the buffer
      appendEscaped: function() {
        this.aliases.escapeExpression = 'this.escapeExpression';

        this.pushSource(this.appendToBuffer("escapeExpression(" + this.popStack() + ")"));
      },

      // [getContext]
      //
      // On stack, before: ...
      // On stack, after: ...
      // Compiler value, after: lastContext=depth
      //
      // Set the value of the `lastContext` compiler value to the depth
      getContext: function(depth) {
        if(this.lastContext !== depth) {
          this.lastContext = depth;
        }
      },

      // [lookupOnContext]
      //
      // On stack, before: ...
      // On stack, after: currentContext[name], ...
      //
      // Looks up the value of `name` on the current context and pushes
      // it onto the stack.
      lookupOnContext: function(name) {
        this.push(this.nameLookup('depth' + this.lastContext, name, 'context'));
      },

      // [pushContext]
      //
      // On stack, before: ...
      // On stack, after: currentContext, ...
      //
      // Pushes the value of the current context onto the stack.
      pushContext: function() {
        this.pushStackLiteral('depth' + this.lastContext);
      },

      // [resolvePossibleLambda]
      //
      // On stack, before: value, ...
      // On stack, after: resolved value, ...
      //
      // If the `value` is a lambda, replace it on the stack by
      // the return value of the lambda
      resolvePossibleLambda: function() {
        this.aliases.functionType = '"function"';

        this.replaceStack(function(current) {
          return "typeof " + current + " === functionType ? " + current + ".apply(depth0) : " + current;
        });
      },

      // [lookup]
      //
      // On stack, before: value, ...
      // On stack, after: value[name], ...
      //
      // Replace the value on the stack with the result of looking
      // up `name` on `value`
      lookup: function(name) {
        this.replaceStack(function(current) {
          return current + " == null || " + current + " === false ? " + current + " : " + this.nameLookup(current, name, 'context');
        });
      },

      // [lookupData]
      //
      // On stack, before: ...
      // On stack, after: data, ...
      //
      // Push the data lookup operator
      lookupData: function(depth) {
        if (!depth) {
          this.pushStackLiteral('data');
        } else {
          this.pushStackLiteral('this.data(data, ' + depth + ')');
        }
      },

      // [pushStringParam]
      //
      // On stack, before: ...
      // On stack, after: string, currentContext, ...
      //
      // This opcode is designed for use in string mode, which
      // provides the string value of a parameter along with its
      // depth rather than resolving it immediately.
      pushStringParam: function(string, type) {
        this.pushStackLiteral('depth' + this.lastContext);

        this.pushString(type);

        // If it's a subexpression, the string result
        // will be pushed after this opcode.
        if (type !== 'sexpr') {
          if (typeof string === 'string') {
            this.pushString(string);
          } else {
            this.pushStackLiteral(string);
          }
        }
      },

      emptyHash: function() {
        this.pushStackLiteral('{}');

        if (this.trackIds) {
          this.push('{}'); // hashIds
        }
        if (this.stringParams) {
          this.push('{}'); // hashContexts
          this.push('{}'); // hashTypes
        }
      },
      pushHash: function() {
        if (this.hash) {
          this.hashes.push(this.hash);
        }
        this.hash = {values: [], types: [], contexts: [], ids: []};
      },
      popHash: function() {
        var hash = this.hash;
        this.hash = this.hashes.pop();

        if (this.trackIds) {
          this.push('{' + hash.ids.join(',') + '}');
        }
        if (this.stringParams) {
          this.push('{' + hash.contexts.join(',') + '}');
          this.push('{' + hash.types.join(',') + '}');
        }

        this.push('{\n    ' + hash.values.join(',\n    ') + '\n  }');
      },

      // [pushString]
      //
      // On stack, before: ...
      // On stack, after: quotedString(string), ...
      //
      // Push a quoted version of `string` onto the stack
      pushString: function(string) {
        this.pushStackLiteral(this.quotedString(string));
      },

      // [push]
      //
      // On stack, before: ...
      // On stack, after: expr, ...
      //
      // Push an expression onto the stack
      push: function(expr) {
        this.inlineStack.push(expr);
        return expr;
      },

      // [pushLiteral]
      //
      // On stack, before: ...
      // On stack, after: value, ...
      //
      // Pushes a value onto the stack. This operation prevents
      // the compiler from creating a temporary variable to hold
      // it.
      pushLiteral: function(value) {
        this.pushStackLiteral(value);
      },

      // [pushProgram]
      //
      // On stack, before: ...
      // On stack, after: program(guid), ...
      //
      // Push a program expression onto the stack. This takes
      // a compile-time guid and converts it into a runtime-accessible
      // expression.
      pushProgram: function(guid) {
        if (guid != null) {
          this.pushStackLiteral(this.programExpression(guid));
        } else {
          this.pushStackLiteral(null);
        }
      },

      // [invokeHelper]
      //
      // On stack, before: hash, inverse, program, params..., ...
      // On stack, after: result of helper invocation
      //
      // Pops off the helper's parameters, invokes the helper,
      // and pushes the helper's return value onto the stack.
      //
      // If the helper is not found, `helperMissing` is called.
      invokeHelper: function(paramSize, name, isRoot) {
        this.aliases.helperMissing = 'helpers.helperMissing';
        this.useRegister('helper');

        var nonHelper = this.popStack();
        var helper = this.setupHelper(paramSize, name);

        var lookup = 'helper = ' + helper.name + ' || ' + nonHelper + ' || helperMissing';
        if (helper.paramsInit) {
          lookup += ',' + helper.paramsInit;
        }

        this.push('(' + lookup + ',helper.call(' + helper.callParams + '))');

        // Always flush subexpressions. This is both to prevent the compounding size issue that
        // occurs when the code has to be duplicated for inlining and also to prevent errors
        // due to the incorrect options object being passed due to the shared register.
        if (!isRoot) {
          this.flushInline();
        }
      },

      // [invokeKnownHelper]
      //
      // On stack, before: hash, inverse, program, params..., ...
      // On stack, after: result of helper invocation
      //
      // This operation is used when the helper is known to exist,
      // so a `helperMissing` fallback is not required.
      invokeKnownHelper: function(paramSize, name) {
        var helper = this.setupHelper(paramSize, name);
        this.push(helper.name + ".call(" + helper.callParams + ")");
      },

      // [invokeAmbiguous]
      //
      // On stack, before: hash, inverse, program, params..., ...
      // On stack, after: result of disambiguation
      //
      // This operation is used when an expression like `{{foo}}`
      // is provided, but we don't know at compile-time whether it
      // is a helper or a path.
      //
      // This operation emits more code than the other options,
      // and can be avoided by passing the `knownHelpers` and
      // `knownHelpersOnly` flags at compile-time.
      invokeAmbiguous: function(name, helperCall) {
        this.aliases.functionType = '"function"';
        this.useRegister('helper');

        this.emptyHash();
        var helper = this.setupHelper(0, name, helperCall);

        var helperName = this.lastHelper = this.nameLookup('helpers', name, 'helper');
        var nonHelper = this.nameLookup('depth' + this.lastContext, name, 'context');

        this.push(
          '((helper = ' + helperName + ' || ' + nonHelper
            + (helper.paramsInit ? '),(' + helper.paramsInit : '') + '),'
          + '(typeof helper === functionType ? helper.call(' + helper.callParams + ') : helper))');
      },

      // [invokePartial]
      //
      // On stack, before: context, ...
      // On stack after: result of partial invocation
      //
      // This operation pops off a context, invokes a partial with that context,
      // and pushes the result of the invocation back.
      invokePartial: function(name) {
        var params = [this.nameLookup('partials', name, 'partial'), "'" + name + "'", this.popStack(), this.popStack(), "helpers", "partials"];

        if (this.options.data) {
          params.push("data");
        }

        this.push("this.invokePartial(" + params.join(", ") + ")");
      },

      // [assignToHash]
      //
      // On stack, before: value, ..., hash, ...
      // On stack, after: ..., hash, ...
      //
      // Pops a value off the stack and assigns it to the current hash
      assignToHash: function(key) {
        var value = this.popStack(),
            context,
            type,
            id;

        if (this.trackIds) {
          id = this.popStack();
        }
        if (this.stringParams) {
          type = this.popStack();
          context = this.popStack();
        }

        var hash = this.hash;
        if (context) {
          hash.contexts.push("'" + key + "': " + context);
        }
        if (type) {
          hash.types.push("'" + key + "': " + type);
        }
        if (id) {
          hash.ids.push("'" + key + "': " + id);
        }
        hash.values.push("'" + key + "': (" + value + ")");
      },

      pushId: function(type, name) {
        if (type === 'ID' || type === 'DATA') {
          this.pushString(name);
        } else if (type === 'sexpr') {
          this.pushStackLiteral('true');
        } else {
          this.pushStackLiteral('null');
        }
      },

      // HELPERS

      compiler: JavaScriptCompiler,

      compileChildren: function(environment, options) {
        var children = environment.children, child, compiler;

        for(var i=0, l=children.length; i<l; i++) {
          child = children[i];
          compiler = new this.compiler();

          var index = this.matchExistingProgram(child);

          if (index == null) {
            this.context.programs.push('');     // Placeholder to prevent name conflicts for nested children
            index = this.context.programs.length;
            child.index = index;
            child.name = 'program' + index;
            this.context.programs[index] = compiler.compile(child, options, this.context, !this.precompile);
            this.context.environments[index] = child;
          } else {
            child.index = index;
            child.name = 'program' + index;
          }
        }
      },
      matchExistingProgram: function(child) {
        for (var i = 0, len = this.context.environments.length; i < len; i++) {
          var environment = this.context.environments[i];
          if (environment && environment.equals(child)) {
            return i;
          }
        }
      },

      programExpression: function(guid) {
        if(guid == null) {
          return 'this.noop';
        }

        var child = this.environment.children[guid],
            depths = child.depths.list, depth;

        var programParams = [child.index, 'data'];

        for(var i=0, l = depths.length; i<l; i++) {
          depth = depths[i];

          programParams.push('depth' + (depth - 1));
        }

        return (depths.length === 0 ? 'this.program(' : 'this.programWithDepth(') + programParams.join(', ') + ')';
      },

      register: function(name, val) {
        this.useRegister(name);
        this.pushSource(name + " = " + val + ";");
      },

      useRegister: function(name) {
        if(!this.registers[name]) {
          this.registers[name] = true;
          this.registers.list.push(name);
        }
      },

      pushStackLiteral: function(item) {
        return this.push(new Literal(item));
      },

      pushSource: function(source) {
        if (this.pendingContent) {
          this.source.push(this.appendToBuffer(this.quotedString(this.pendingContent)));
          this.pendingContent = undefined;
        }

        if (source) {
          this.source.push(source);
        }
      },

      pushStack: function(item) {
        this.flushInline();

        var stack = this.incrStack();
        if (item) {
          this.pushSource(stack + " = " + item + ";");
        }
        this.compileStack.push(stack);
        return stack;
      },

      replaceStack: function(callback) {
        var prefix = '',
            inline = this.isInline(),
            stack,
            createdStack,
            usedLiteral;

        // If we are currently inline then we want to merge the inline statement into the
        // replacement statement via ','
        if (inline) {
          var top = this.popStack(true);

          if (top instanceof Literal) {
            // Literals do not need to be inlined
            stack = top.value;
            usedLiteral = true;
          } else {
            // Get or create the current stack name for use by the inline
            createdStack = !this.stackSlot;
            var name = !createdStack ? this.topStackName() : this.incrStack();

            prefix = '(' + this.push(name) + ' = ' + top + '),';
            stack = this.topStack();
          }
        } else {
          stack = this.topStack();
        }

        var item = callback.call(this, stack);

        if (inline) {
          if (!usedLiteral) {
            this.popStack();
          }
          if (createdStack) {
            this.stackSlot--;
          }
          this.push('(' + prefix + item + ')');
        } else {
          // Prevent modification of the context depth variable. Through replaceStack
          if (!/^stack/.test(stack)) {
            stack = this.nextStack();
          }

          this.pushSource(stack + " = (" + prefix + item + ");");
        }
        return stack;
      },

      nextStack: function() {
        return this.pushStack();
      },

      incrStack: function() {
        this.stackSlot++;
        if(this.stackSlot > this.stackVars.length) { this.stackVars.push("stack" + this.stackSlot); }
        return this.topStackName();
      },
      topStackName: function() {
        return "stack" + this.stackSlot;
      },
      flushInline: function() {
        var inlineStack = this.inlineStack;
        if (inlineStack.length) {
          this.inlineStack = [];
          for (var i = 0, len = inlineStack.length; i < len; i++) {
            var entry = inlineStack[i];
            if (entry instanceof Literal) {
              this.compileStack.push(entry);
            } else {
              this.pushStack(entry);
            }
          }
        }
      },
      isInline: function() {
        return this.inlineStack.length;
      },

      popStack: function(wrapped) {
        var inline = this.isInline(),
            item = (inline ? this.inlineStack : this.compileStack).pop();

        if (!wrapped && (item instanceof Literal)) {
          return item.value;
        } else {
          if (!inline) {
            if (!this.stackSlot) {
              throw new Exception('Invalid stack pop');
            }
            this.stackSlot--;
          }
          return item;
        }
      },

      topStack: function(wrapped) {
        var stack = (this.isInline() ? this.inlineStack : this.compileStack),
            item = stack[stack.length - 1];

        if (!wrapped && (item instanceof Literal)) {
          return item.value;
        } else {
          return item;
        }
      },

      quotedString: function(str) {
        return '"' + str
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\u2028/g, '\\u2028')   // Per Ecma-262 7.3 + 7.8.4
          .replace(/\u2029/g, '\\u2029') + '"';
      },

      objectLiteral: function(obj) {
        var pairs = [];

        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            pairs.push(this.quotedString(key) + ':' + obj[key]);
          }
        }

        return '{' + pairs.join(',') + '}';
      },

      setupHelper: function(paramSize, name, blockHelper) {
        var params = [],
            paramsInit = this.setupParams(name, paramSize, params, blockHelper);
        var foundHelper = this.nameLookup('helpers', name, 'helper');

        return {
          params: params,
          paramsInit: paramsInit,
          name: foundHelper,
          callParams: ["depth0"].concat(params).join(", ")
        };
      },

      setupOptions: function(helper, paramSize, params) {
        var options = {}, contexts = [], types = [], ids = [], param, inverse, program;

        options.name = this.quotedString(helper);
        options.hash = this.popStack();

        if (this.trackIds) {
          options.hashIds = this.popStack();
        }
        if (this.stringParams) {
          options.hashTypes = this.popStack();
          options.hashContexts = this.popStack();
        }

        inverse = this.popStack();
        program = this.popStack();

        // Avoid setting fn and inverse if neither are set. This allows
        // helpers to do a check for `if (options.fn)`
        if (program || inverse) {
          if (!program) {
            program = 'this.noop';
          }

          if (!inverse) {
            inverse = 'this.noop';
          }

          options.fn = program;
          options.inverse = inverse;
        }

        // The parameters go on to the stack in order (making sure that they are evaluated in order)
        // so we need to pop them off the stack in reverse order
        var i = paramSize;
        while (i--) {
          param = this.popStack();
          params[i] = param;

          if (this.trackIds) {
            ids[i] = this.popStack();
          }
          if (this.stringParams) {
            types[i] = this.popStack();
            contexts[i] = this.popStack();
          }
        }

        if (this.trackIds) {
          options.ids = "[" + ids.join(",") + "]";
        }
        if (this.stringParams) {
          options.types = "[" + types.join(",") + "]";
          options.contexts = "[" + contexts.join(",") + "]";
        }

        if (this.options.data) {
          options.data = "data";
        }

        return options;
      },

      // the params and contexts arguments are passed in arrays
      // to fill in
      setupParams: function(helperName, paramSize, params, useRegister) {
        var options = this.objectLiteral(this.setupOptions(helperName, paramSize, params));

        if (useRegister) {
          this.useRegister('options');
          params.push('options');
          return 'options=' + options;
        } else {
          params.push(options);
          return '';
        }
      }
    };

    var reservedWords = (
      "break else new var" +
      " case finally return void" +
      " catch for switch while" +
      " continue function this with" +
      " default if throw" +
      " delete in try" +
      " do instanceof typeof" +
      " abstract enum int short" +
      " boolean export interface static" +
      " byte extends long super" +
      " char final native synchronized" +
      " class float package throws" +
      " const goto private transient" +
      " debugger implements protected volatile" +
      " double import public let yield"
    ).split(" ");

    var compilerWords = JavaScriptCompiler.RESERVED_WORDS = {};

    for(var i=0, l=reservedWords.length; i<l; i++) {
      compilerWords[reservedWords[i]] = true;
    }

    JavaScriptCompiler.isValidJavaScriptVariableName = function(name) {
      return !JavaScriptCompiler.RESERVED_WORDS[name] && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name);
    };

    __exports__["default"] = JavaScriptCompiler;
  });
define("handlebars/compiler/parser", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /* jshint ignore:start */
    /* Jison generated parser */
    var handlebars = (function(){
    var parser = {trace: function trace() { },
    yy: {},
    symbols_: {"error":2,"root":3,"statements":4,"EOF":5,"program":6,"simpleInverse":7,"statement":8,"openRawBlock":9,"CONTENT":10,"END_RAW_BLOCK":11,"openInverse":12,"closeBlock":13,"openBlock":14,"mustache":15,"partial":16,"COMMENT":17,"OPEN_RAW_BLOCK":18,"sexpr":19,"CLOSE_RAW_BLOCK":20,"OPEN_BLOCK":21,"CLOSE":22,"OPEN_INVERSE":23,"OPEN_ENDBLOCK":24,"path":25,"OPEN":26,"OPEN_UNESCAPED":27,"CLOSE_UNESCAPED":28,"OPEN_PARTIAL":29,"partialName":30,"param":31,"partial_option0":32,"partial_option1":33,"sexpr_repetition0":34,"sexpr_option0":35,"dataName":36,"STRING":37,"NUMBER":38,"BOOLEAN":39,"OPEN_SEXPR":40,"CLOSE_SEXPR":41,"hash":42,"hash_repetition_plus0":43,"hashSegment":44,"ID":45,"EQUALS":46,"DATA":47,"pathSegments":48,"SEP":49,"$accept":0,"$end":1},
    terminals_: {2:"error",5:"EOF",10:"CONTENT",11:"END_RAW_BLOCK",17:"COMMENT",18:"OPEN_RAW_BLOCK",20:"CLOSE_RAW_BLOCK",21:"OPEN_BLOCK",22:"CLOSE",23:"OPEN_INVERSE",24:"OPEN_ENDBLOCK",26:"OPEN",27:"OPEN_UNESCAPED",28:"CLOSE_UNESCAPED",29:"OPEN_PARTIAL",37:"STRING",38:"NUMBER",39:"BOOLEAN",40:"OPEN_SEXPR",41:"CLOSE_SEXPR",45:"ID",46:"EQUALS",47:"DATA",49:"SEP"},
    productions_: [0,[3,2],[3,1],[6,2],[6,3],[6,2],[6,1],[6,1],[6,0],[4,1],[4,2],[8,3],[8,3],[8,3],[8,1],[8,1],[8,1],[8,1],[9,3],[14,3],[12,3],[13,3],[15,3],[15,3],[16,5],[16,4],[7,2],[19,3],[19,1],[31,1],[31,1],[31,1],[31,1],[31,1],[31,3],[42,1],[44,3],[30,1],[30,1],[30,1],[36,2],[25,1],[48,3],[48,1],[32,0],[32,1],[33,0],[33,1],[34,0],[34,2],[35,0],[35,1],[43,1],[43,2]],
    performAction: function anonymous(yytext,yyleng,yylineno,yy,yystate,$$,_$) {

    var $0 = $$.length - 1;
    switch (yystate) {
    case 1: return new yy.ProgramNode($$[$0-1], this._$); 
    break;
    case 2: return new yy.ProgramNode([], this._$); 
    break;
    case 3:this.$ = new yy.ProgramNode([], $$[$0-1], $$[$0], this._$);
    break;
    case 4:this.$ = new yy.ProgramNode($$[$0-2], $$[$0-1], $$[$0], this._$);
    break;
    case 5:this.$ = new yy.ProgramNode($$[$0-1], $$[$0], [], this._$);
    break;
    case 6:this.$ = new yy.ProgramNode($$[$0], this._$);
    break;
    case 7:this.$ = new yy.ProgramNode([], this._$);
    break;
    case 8:this.$ = new yy.ProgramNode([], this._$);
    break;
    case 9:this.$ = [$$[$0]];
    break;
    case 10: $$[$0-1].push($$[$0]); this.$ = $$[$0-1]; 
    break;
    case 11:this.$ = new yy.RawBlockNode($$[$0-2], $$[$0-1], $$[$0], this._$);
    break;
    case 12:this.$ = new yy.BlockNode($$[$0-2], $$[$0-1].inverse, $$[$0-1], $$[$0], this._$);
    break;
    case 13:this.$ = new yy.BlockNode($$[$0-2], $$[$0-1], $$[$0-1].inverse, $$[$0], this._$);
    break;
    case 14:this.$ = $$[$0];
    break;
    case 15:this.$ = $$[$0];
    break;
    case 16:this.$ = new yy.ContentNode($$[$0], this._$);
    break;
    case 17:this.$ = new yy.CommentNode($$[$0], this._$);
    break;
    case 18:this.$ = new yy.MustacheNode($$[$0-1], null, '', '', this._$);
    break;
    case 19:this.$ = new yy.MustacheNode($$[$0-1], null, $$[$0-2], stripFlags($$[$0-2], $$[$0]), this._$);
    break;
    case 20:this.$ = new yy.MustacheNode($$[$0-1], null, $$[$0-2], stripFlags($$[$0-2], $$[$0]), this._$);
    break;
    case 21:this.$ = {path: $$[$0-1], strip: stripFlags($$[$0-2], $$[$0])};
    break;
    case 22:this.$ = new yy.MustacheNode($$[$0-1], null, $$[$0-2], stripFlags($$[$0-2], $$[$0]), this._$);
    break;
    case 23:this.$ = new yy.MustacheNode($$[$0-1], null, $$[$0-2], stripFlags($$[$0-2], $$[$0]), this._$);
    break;
    case 24:this.$ = new yy.PartialNode($$[$0-3], $$[$0-2], $$[$0-1], stripFlags($$[$0-4], $$[$0]), this._$);
    break;
    case 25:this.$ = new yy.PartialNode($$[$0-2], undefined, $$[$0-1], stripFlags($$[$0-3], $$[$0]), this._$);
    break;
    case 26:this.$ = stripFlags($$[$0-1], $$[$0]);
    break;
    case 27:this.$ = new yy.SexprNode([$$[$0-2]].concat($$[$0-1]), $$[$0], this._$);
    break;
    case 28:this.$ = new yy.SexprNode([$$[$0]], null, this._$);
    break;
    case 29:this.$ = $$[$0];
    break;
    case 30:this.$ = new yy.StringNode($$[$0], this._$);
    break;
    case 31:this.$ = new yy.NumberNode($$[$0], this._$);
    break;
    case 32:this.$ = new yy.BooleanNode($$[$0], this._$);
    break;
    case 33:this.$ = $$[$0];
    break;
    case 34:$$[$0-1].isHelper = true; this.$ = $$[$0-1];
    break;
    case 35:this.$ = new yy.HashNode($$[$0], this._$);
    break;
    case 36:this.$ = [$$[$0-2], $$[$0]];
    break;
    case 37:this.$ = new yy.PartialNameNode($$[$0], this._$);
    break;
    case 38:this.$ = new yy.PartialNameNode(new yy.StringNode($$[$0], this._$), this._$);
    break;
    case 39:this.$ = new yy.PartialNameNode(new yy.NumberNode($$[$0], this._$));
    break;
    case 40:this.$ = new yy.DataNode($$[$0], this._$);
    break;
    case 41:this.$ = new yy.IdNode($$[$0], this._$);
    break;
    case 42: $$[$0-2].push({part: $$[$0], separator: $$[$0-1]}); this.$ = $$[$0-2]; 
    break;
    case 43:this.$ = [{part: $$[$0]}];
    break;
    case 48:this.$ = [];
    break;
    case 49:$$[$0-1].push($$[$0]);
    break;
    case 52:this.$ = [$$[$0]];
    break;
    case 53:$$[$0-1].push($$[$0]);
    break;
    }
    },
    table: [{3:1,4:2,5:[1,3],8:4,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,13],26:[1,15],27:[1,16],29:[1,17]},{1:[3]},{5:[1,18],8:19,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,13],26:[1,15],27:[1,16],29:[1,17]},{1:[2,2]},{5:[2,9],10:[2,9],17:[2,9],18:[2,9],21:[2,9],23:[2,9],24:[2,9],26:[2,9],27:[2,9],29:[2,9]},{10:[1,20]},{4:23,6:21,7:22,8:4,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,24],24:[2,8],26:[1,15],27:[1,16],29:[1,17]},{4:23,6:25,7:22,8:4,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,24],24:[2,8],26:[1,15],27:[1,16],29:[1,17]},{5:[2,14],10:[2,14],17:[2,14],18:[2,14],21:[2,14],23:[2,14],24:[2,14],26:[2,14],27:[2,14],29:[2,14]},{5:[2,15],10:[2,15],17:[2,15],18:[2,15],21:[2,15],23:[2,15],24:[2,15],26:[2,15],27:[2,15],29:[2,15]},{5:[2,16],10:[2,16],17:[2,16],18:[2,16],21:[2,16],23:[2,16],24:[2,16],26:[2,16],27:[2,16],29:[2,16]},{5:[2,17],10:[2,17],17:[2,17],18:[2,17],21:[2,17],23:[2,17],24:[2,17],26:[2,17],27:[2,17],29:[2,17]},{19:26,25:27,36:28,45:[1,31],47:[1,30],48:29},{19:32,25:27,36:28,45:[1,31],47:[1,30],48:29},{19:33,25:27,36:28,45:[1,31],47:[1,30],48:29},{19:34,25:27,36:28,45:[1,31],47:[1,30],48:29},{19:35,25:27,36:28,45:[1,31],47:[1,30],48:29},{25:37,30:36,37:[1,38],38:[1,39],45:[1,31],48:29},{1:[2,1]},{5:[2,10],10:[2,10],17:[2,10],18:[2,10],21:[2,10],23:[2,10],24:[2,10],26:[2,10],27:[2,10],29:[2,10]},{11:[1,40]},{13:41,24:[1,42]},{4:43,8:4,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,13],24:[2,7],26:[1,15],27:[1,16],29:[1,17]},{7:44,8:19,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,24],24:[2,6],26:[1,15],27:[1,16],29:[1,17]},{19:32,22:[1,45],25:27,36:28,45:[1,31],47:[1,30],48:29},{13:46,24:[1,42]},{20:[1,47]},{20:[2,48],22:[2,48],28:[2,48],34:48,37:[2,48],38:[2,48],39:[2,48],40:[2,48],41:[2,48],45:[2,48],47:[2,48]},{20:[2,28],22:[2,28],28:[2,28],41:[2,28]},{20:[2,41],22:[2,41],28:[2,41],37:[2,41],38:[2,41],39:[2,41],40:[2,41],41:[2,41],45:[2,41],47:[2,41],49:[1,49]},{25:50,45:[1,31],48:29},{20:[2,43],22:[2,43],28:[2,43],37:[2,43],38:[2,43],39:[2,43],40:[2,43],41:[2,43],45:[2,43],47:[2,43],49:[2,43]},{22:[1,51]},{22:[1,52]},{22:[1,53]},{28:[1,54]},{22:[2,46],25:57,31:55,33:56,36:61,37:[1,58],38:[1,59],39:[1,60],40:[1,62],42:63,43:64,44:66,45:[1,65],47:[1,30],48:29},{22:[2,37],37:[2,37],38:[2,37],39:[2,37],40:[2,37],45:[2,37],47:[2,37]},{22:[2,38],37:[2,38],38:[2,38],39:[2,38],40:[2,38],45:[2,38],47:[2,38]},{22:[2,39],37:[2,39],38:[2,39],39:[2,39],40:[2,39],45:[2,39],47:[2,39]},{5:[2,11],10:[2,11],17:[2,11],18:[2,11],21:[2,11],23:[2,11],24:[2,11],26:[2,11],27:[2,11],29:[2,11]},{5:[2,12],10:[2,12],17:[2,12],18:[2,12],21:[2,12],23:[2,12],24:[2,12],26:[2,12],27:[2,12],29:[2,12]},{25:67,45:[1,31],48:29},{8:19,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,13],24:[2,3],26:[1,15],27:[1,16],29:[1,17]},{4:68,8:4,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,13],24:[2,5],26:[1,15],27:[1,16],29:[1,17]},{10:[2,26],17:[2,26],18:[2,26],21:[2,26],23:[2,26],24:[2,26],26:[2,26],27:[2,26],29:[2,26]},{5:[2,13],10:[2,13],17:[2,13],18:[2,13],21:[2,13],23:[2,13],24:[2,13],26:[2,13],27:[2,13],29:[2,13]},{10:[2,18]},{20:[2,50],22:[2,50],25:57,28:[2,50],31:70,35:69,36:61,37:[1,58],38:[1,59],39:[1,60],40:[1,62],41:[2,50],42:71,43:64,44:66,45:[1,65],47:[1,30],48:29},{45:[1,72]},{20:[2,40],22:[2,40],28:[2,40],37:[2,40],38:[2,40],39:[2,40],40:[2,40],41:[2,40],45:[2,40],47:[2,40]},{10:[2,20],17:[2,20],18:[2,20],21:[2,20],23:[2,20],24:[2,20],26:[2,20],27:[2,20],29:[2,20]},{10:[2,19],17:[2,19],18:[2,19],21:[2,19],23:[2,19],24:[2,19],26:[2,19],27:[2,19],29:[2,19]},{5:[2,22],10:[2,22],17:[2,22],18:[2,22],21:[2,22],23:[2,22],24:[2,22],26:[2,22],27:[2,22],29:[2,22]},{5:[2,23],10:[2,23],17:[2,23],18:[2,23],21:[2,23],23:[2,23],24:[2,23],26:[2,23],27:[2,23],29:[2,23]},{22:[2,44],32:73,42:74,43:64,44:66,45:[1,75]},{22:[1,76]},{20:[2,29],22:[2,29],28:[2,29],37:[2,29],38:[2,29],39:[2,29],40:[2,29],41:[2,29],45:[2,29],47:[2,29]},{20:[2,30],22:[2,30],28:[2,30],37:[2,30],38:[2,30],39:[2,30],40:[2,30],41:[2,30],45:[2,30],47:[2,30]},{20:[2,31],22:[2,31],28:[2,31],37:[2,31],38:[2,31],39:[2,31],40:[2,31],41:[2,31],45:[2,31],47:[2,31]},{20:[2,32],22:[2,32],28:[2,32],37:[2,32],38:[2,32],39:[2,32],40:[2,32],41:[2,32],45:[2,32],47:[2,32]},{20:[2,33],22:[2,33],28:[2,33],37:[2,33],38:[2,33],39:[2,33],40:[2,33],41:[2,33],45:[2,33],47:[2,33]},{19:77,25:27,36:28,45:[1,31],47:[1,30],48:29},{22:[2,47]},{20:[2,35],22:[2,35],28:[2,35],41:[2,35],44:78,45:[1,75]},{20:[2,43],22:[2,43],28:[2,43],37:[2,43],38:[2,43],39:[2,43],40:[2,43],41:[2,43],45:[2,43],46:[1,79],47:[2,43],49:[2,43]},{20:[2,52],22:[2,52],28:[2,52],41:[2,52],45:[2,52]},{22:[1,80]},{8:19,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,13],24:[2,4],26:[1,15],27:[1,16],29:[1,17]},{20:[2,27],22:[2,27],28:[2,27],41:[2,27]},{20:[2,49],22:[2,49],28:[2,49],37:[2,49],38:[2,49],39:[2,49],40:[2,49],41:[2,49],45:[2,49],47:[2,49]},{20:[2,51],22:[2,51],28:[2,51],41:[2,51]},{20:[2,42],22:[2,42],28:[2,42],37:[2,42],38:[2,42],39:[2,42],40:[2,42],41:[2,42],45:[2,42],47:[2,42],49:[2,42]},{22:[1,81]},{22:[2,45]},{46:[1,79]},{5:[2,25],10:[2,25],17:[2,25],18:[2,25],21:[2,25],23:[2,25],24:[2,25],26:[2,25],27:[2,25],29:[2,25]},{41:[1,82]},{20:[2,53],22:[2,53],28:[2,53],41:[2,53],45:[2,53]},{25:57,31:83,36:61,37:[1,58],38:[1,59],39:[1,60],40:[1,62],45:[1,31],47:[1,30],48:29},{5:[2,21],10:[2,21],17:[2,21],18:[2,21],21:[2,21],23:[2,21],24:[2,21],26:[2,21],27:[2,21],29:[2,21]},{5:[2,24],10:[2,24],17:[2,24],18:[2,24],21:[2,24],23:[2,24],24:[2,24],26:[2,24],27:[2,24],29:[2,24]},{20:[2,34],22:[2,34],28:[2,34],37:[2,34],38:[2,34],39:[2,34],40:[2,34],41:[2,34],45:[2,34],47:[2,34]},{20:[2,36],22:[2,36],28:[2,36],41:[2,36],45:[2,36]}],
    defaultActions: {3:[2,2],18:[2,1],47:[2,18],63:[2,47],74:[2,45]},
    parseError: function parseError(str, hash) {
        throw new Error(str);
    },
    parse: function parse(input) {
        var self = this, stack = [0], vstack = [null], lstack = [], table = this.table, yytext = "", yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
        this.lexer.setInput(input);
        this.lexer.yy = this.yy;
        this.yy.lexer = this.lexer;
        this.yy.parser = this;
        if (typeof this.lexer.yylloc == "undefined")
            this.lexer.yylloc = {};
        var yyloc = this.lexer.yylloc;
        lstack.push(yyloc);
        var ranges = this.lexer.options && this.lexer.options.ranges;
        if (typeof this.yy.parseError === "function")
            this.parseError = this.yy.parseError;
        function popStack(n) {
            stack.length = stack.length - 2 * n;
            vstack.length = vstack.length - n;
            lstack.length = lstack.length - n;
        }
        function lex() {
            var token;
            token = self.lexer.lex() || 1;
            if (typeof token !== "number") {
                token = self.symbols_[token] || token;
            }
            return token;
        }
        var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
        while (true) {
            state = stack[stack.length - 1];
            if (this.defaultActions[state]) {
                action = this.defaultActions[state];
            } else {
                if (symbol === null || typeof symbol == "undefined") {
                    symbol = lex();
                }
                action = table[state] && table[state][symbol];
            }
            if (typeof action === "undefined" || !action.length || !action[0]) {
                var errStr = "";
                if (!recovering) {
                    expected = [];
                    for (p in table[state])
                        if (this.terminals_[p] && p > 2) {
                            expected.push("'" + this.terminals_[p] + "'");
                        }
                    if (this.lexer.showPosition) {
                        errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                    } else {
                        errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == 1?"end of input":"'" + (this.terminals_[symbol] || symbol) + "'");
                    }
                    this.parseError(errStr, {text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected});
                }
            }
            if (action[0] instanceof Array && action.length > 1) {
                throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
            }
            switch (action[0]) {
            case 1:
                stack.push(symbol);
                vstack.push(this.lexer.yytext);
                lstack.push(this.lexer.yylloc);
                stack.push(action[1]);
                symbol = null;
                if (!preErrorSymbol) {
                    yyleng = this.lexer.yyleng;
                    yytext = this.lexer.yytext;
                    yylineno = this.lexer.yylineno;
                    yyloc = this.lexer.yylloc;
                    if (recovering > 0)
                        recovering--;
                } else {
                    symbol = preErrorSymbol;
                    preErrorSymbol = null;
                }
                break;
            case 2:
                len = this.productions_[action[1]][1];
                yyval.$ = vstack[vstack.length - len];
                yyval._$ = {first_line: lstack[lstack.length - (len || 1)].first_line, last_line: lstack[lstack.length - 1].last_line, first_column: lstack[lstack.length - (len || 1)].first_column, last_column: lstack[lstack.length - 1].last_column};
                if (ranges) {
                    yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
                }
                r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
                if (typeof r !== "undefined") {
                    return r;
                }
                if (len) {
                    stack = stack.slice(0, -1 * len * 2);
                    vstack = vstack.slice(0, -1 * len);
                    lstack = lstack.slice(0, -1 * len);
                }
                stack.push(this.productions_[action[1]][0]);
                vstack.push(yyval.$);
                lstack.push(yyval._$);
                newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
                stack.push(newState);
                break;
            case 3:
                return true;
            }
        }
        return true;
    }
    };


    function stripFlags(open, close) {
      return {
        left: open.charAt(2) === '~',
        right: close.charAt(0) === '~' || close.charAt(1) === '~'
      };
    }

    /* Jison generated lexer */
    var lexer = (function(){
    var lexer = ({EOF:1,
    parseError:function parseError(str, hash) {
            if (this.yy.parser) {
                this.yy.parser.parseError(str, hash);
            } else {
                throw new Error(str);
            }
        },
    setInput:function (input) {
            this._input = input;
            this._more = this._less = this.done = false;
            this.yylineno = this.yyleng = 0;
            this.yytext = this.matched = this.match = '';
            this.conditionStack = ['INITIAL'];
            this.yylloc = {first_line:1,first_column:0,last_line:1,last_column:0};
            if (this.options.ranges) this.yylloc.range = [0,0];
            this.offset = 0;
            return this;
        },
    input:function () {
            var ch = this._input[0];
            this.yytext += ch;
            this.yyleng++;
            this.offset++;
            this.match += ch;
            this.matched += ch;
            var lines = ch.match(/(?:\r\n?|\n).*/g);
            if (lines) {
                this.yylineno++;
                this.yylloc.last_line++;
            } else {
                this.yylloc.last_column++;
            }
            if (this.options.ranges) this.yylloc.range[1]++;

            this._input = this._input.slice(1);
            return ch;
        },
    unput:function (ch) {
            var len = ch.length;
            var lines = ch.split(/(?:\r\n?|\n)/g);

            this._input = ch + this._input;
            this.yytext = this.yytext.substr(0, this.yytext.length-len-1);
            //this.yyleng -= len;
            this.offset -= len;
            var oldLines = this.match.split(/(?:\r\n?|\n)/g);
            this.match = this.match.substr(0, this.match.length-1);
            this.matched = this.matched.substr(0, this.matched.length-1);

            if (lines.length-1) this.yylineno -= lines.length-1;
            var r = this.yylloc.range;

            this.yylloc = {first_line: this.yylloc.first_line,
              last_line: this.yylineno+1,
              first_column: this.yylloc.first_column,
              last_column: lines ?
                  (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length:
                  this.yylloc.first_column - len
              };

            if (this.options.ranges) {
                this.yylloc.range = [r[0], r[0] + this.yyleng - len];
            }
            return this;
        },
    more:function () {
            this._more = true;
            return this;
        },
    less:function (n) {
            this.unput(this.match.slice(n));
        },
    pastInput:function () {
            var past = this.matched.substr(0, this.matched.length - this.match.length);
            return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
        },
    upcomingInput:function () {
            var next = this.match;
            if (next.length < 20) {
                next += this._input.substr(0, 20-next.length);
            }
            return (next.substr(0,20)+(next.length > 20 ? '...':'')).replace(/\n/g, "");
        },
    showPosition:function () {
            var pre = this.pastInput();
            var c = new Array(pre.length + 1).join("-");
            return pre + this.upcomingInput() + "\n" + c+"^";
        },
    next:function () {
            if (this.done) {
                return this.EOF;
            }
            if (!this._input) this.done = true;

            var token,
                match,
                tempMatch,
                index,
                col,
                lines;
            if (!this._more) {
                this.yytext = '';
                this.match = '';
            }
            var rules = this._currentRules();
            for (var i=0;i < rules.length; i++) {
                tempMatch = this._input.match(this.rules[rules[i]]);
                if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                    match = tempMatch;
                    index = i;
                    if (!this.options.flex) break;
                }
            }
            if (match) {
                lines = match[0].match(/(?:\r\n?|\n).*/g);
                if (lines) this.yylineno += lines.length;
                this.yylloc = {first_line: this.yylloc.last_line,
                               last_line: this.yylineno+1,
                               first_column: this.yylloc.last_column,
                               last_column: lines ? lines[lines.length-1].length-lines[lines.length-1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length};
                this.yytext += match[0];
                this.match += match[0];
                this.matches = match;
                this.yyleng = this.yytext.length;
                if (this.options.ranges) {
                    this.yylloc.range = [this.offset, this.offset += this.yyleng];
                }
                this._more = false;
                this._input = this._input.slice(match[0].length);
                this.matched += match[0];
                token = this.performAction.call(this, this.yy, this, rules[index],this.conditionStack[this.conditionStack.length-1]);
                if (this.done && this._input) this.done = false;
                if (token) return token;
                else return;
            }
            if (this._input === "") {
                return this.EOF;
            } else {
                return this.parseError('Lexical error on line '+(this.yylineno+1)+'. Unrecognized text.\n'+this.showPosition(),
                        {text: "", token: null, line: this.yylineno});
            }
        },
    lex:function lex() {
            var r = this.next();
            if (typeof r !== 'undefined') {
                return r;
            } else {
                return this.lex();
            }
        },
    begin:function begin(condition) {
            this.conditionStack.push(condition);
        },
    popState:function popState() {
            return this.conditionStack.pop();
        },
    _currentRules:function _currentRules() {
            return this.conditions[this.conditionStack[this.conditionStack.length-1]].rules;
        },
    topState:function () {
            return this.conditionStack[this.conditionStack.length-2];
        },
    pushState:function begin(condition) {
            this.begin(condition);
        }});
    lexer.options = {};
    lexer.performAction = function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {


    function strip(start, end) {
      return yy_.yytext = yy_.yytext.substr(start, yy_.yyleng-end);
    }


    var YYSTATE=YY_START
    switch($avoiding_name_collisions) {
    case 0:
                                       if(yy_.yytext.slice(-2) === "\\\\") {
                                         strip(0,1);
                                         this.begin("mu");
                                       } else if(yy_.yytext.slice(-1) === "\\") {
                                         strip(0,1);
                                         this.begin("emu");
                                       } else {
                                         this.begin("mu");
                                       }
                                       if(yy_.yytext) return 10;
                                     
    break;
    case 1:return 10;
    break;
    case 2:
                                       this.popState();
                                       return 10;
                                     
    break;
    case 3:
                                      yy_.yytext = yy_.yytext.substr(5, yy_.yyleng-9);
                                      this.popState();
                                      return 11;
                                     
    break;
    case 4: return 10; 
    break;
    case 5:strip(0,4); this.popState(); return 17;
    break;
    case 6:return 40;
    break;
    case 7:return 41;
    break;
    case 8: return 18; 
    break;
    case 9:
                                      this.popState();
                                      this.begin('raw');
                                      return 20;
                                     
    break;
    case 10:
                                      yy_.yytext = yy_.yytext.substr(4, yy_.yyleng-8);
                                      this.popState();
                                      return 'RAW_BLOCK';
                                     
    break;
    case 11:return 29;
    break;
    case 12:return 21;
    break;
    case 13:return 24;
    break;
    case 14:return 23;
    break;
    case 15:return 23;
    break;
    case 16:return 27;
    break;
    case 17:return 26;
    break;
    case 18:this.popState(); this.begin('com');
    break;
    case 19:strip(3,5); this.popState(); return 17;
    break;
    case 20:return 26;
    break;
    case 21:return 46;
    break;
    case 22:return 45;
    break;
    case 23:return 45;
    break;
    case 24:return 49;
    break;
    case 25:// ignore whitespace
    break;
    case 26:this.popState(); return 28;
    break;
    case 27:this.popState(); return 22;
    break;
    case 28:yy_.yytext = strip(1,2).replace(/\\"/g,'"'); return 37;
    break;
    case 29:yy_.yytext = strip(1,2).replace(/\\'/g,"'"); return 37;
    break;
    case 30:return 47;
    break;
    case 31:return 39;
    break;
    case 32:return 39;
    break;
    case 33:return 38;
    break;
    case 34:return 45;
    break;
    case 35:yy_.yytext = strip(1,2); return 45;
    break;
    case 36:return 'INVALID';
    break;
    case 37:return 5;
    break;
    }
    };
    lexer.rules = [/^(?:[^\x00]*?(?=(\{\{)))/,/^(?:[^\x00]+)/,/^(?:[^\x00]{2,}?(?=(\{\{|\\\{\{|\\\\\{\{|$)))/,/^(?:\{\{\{\{\/[^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=[=}\s\/.])\}\}\}\})/,/^(?:[^\x00]*?(?=(\{\{\{\{\/)))/,/^(?:[\s\S]*?--\}\})/,/^(?:\()/,/^(?:\))/,/^(?:\{\{\{\{)/,/^(?:\}\}\}\})/,/^(?:\{\{\{\{[^\x00]*\}\}\}\})/,/^(?:\{\{(~)?>)/,/^(?:\{\{(~)?#)/,/^(?:\{\{(~)?\/)/,/^(?:\{\{(~)?\^)/,/^(?:\{\{(~)?\s*else\b)/,/^(?:\{\{(~)?\{)/,/^(?:\{\{(~)?&)/,/^(?:\{\{!--)/,/^(?:\{\{![\s\S]*?\}\})/,/^(?:\{\{(~)?)/,/^(?:=)/,/^(?:\.\.)/,/^(?:\.(?=([=~}\s\/.)])))/,/^(?:[\/.])/,/^(?:\s+)/,/^(?:\}(~)?\}\})/,/^(?:(~)?\}\})/,/^(?:"(\\["]|[^"])*")/,/^(?:'(\\[']|[^'])*')/,/^(?:@)/,/^(?:true(?=([~}\s)])))/,/^(?:false(?=([~}\s)])))/,/^(?:-?[0-9]+(?:\.[0-9]+)?(?=([~}\s)])))/,/^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=([=~}\s\/.)]))))/,/^(?:\[[^\]]*\])/,/^(?:.)/,/^(?:$)/];
    lexer.conditions = {"mu":{"rules":[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37],"inclusive":false},"emu":{"rules":[2],"inclusive":false},"com":{"rules":[5],"inclusive":false},"raw":{"rules":[3,4],"inclusive":false},"INITIAL":{"rules":[0,1,37],"inclusive":true}};
    return lexer;})()
    parser.lexer = lexer;
    function Parser () { this.yy = {}; }Parser.prototype = parser;parser.Parser = Parser;
    return new Parser;
    })();__exports__["default"] = handlebars;
    /* jshint ignore:end */
  });
define("handlebars/compiler/printer", 
  ["./visitor","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Visitor = __dependency1__["default"];

    function print(ast) {
      return new PrintVisitor().accept(ast);
    }

    __exports__.print = print;function PrintVisitor() {
      this.padding = 0;
    }

    __exports__.PrintVisitor = PrintVisitor;PrintVisitor.prototype = new Visitor();

    PrintVisitor.prototype.pad = function(string, newline) {
      var out = "";

      for(var i=0,l=this.padding; i<l; i++) {
        out = out + "  ";
      }

      out = out + string;

      if(newline !== false) { out = out + "\n"; }
      return out;
    };

    PrintVisitor.prototype.program = function(program) {
      var out = "",
          statements = program.statements,
          i, l;

      for(i=0, l=statements.length; i<l; i++) {
        out = out + this.accept(statements[i]);
      }

      this.padding--;

      return out;
    };

    PrintVisitor.prototype.block = function(block) {
      var out = "";

      out = out + this.pad("BLOCK:");
      this.padding++;
      out = out + this.accept(block.mustache);
      if (block.program) {
        out = out + this.pad("PROGRAM:");
        this.padding++;
        out = out + this.accept(block.program);
        this.padding--;
      }
      if (block.inverse) {
        if (block.program) { this.padding++; }
        out = out + this.pad("{{^}}");
        this.padding++;
        out = out + this.accept(block.inverse);
        this.padding--;
        if (block.program) { this.padding--; }
      }
      this.padding--;

      return out;
    };

    PrintVisitor.prototype.sexpr = function(sexpr) {
      var params = sexpr.params, paramStrings = [], hash;

      for(var i=0, l=params.length; i<l; i++) {
        paramStrings.push(this.accept(params[i]));
      }

      params = "[" + paramStrings.join(", ") + "]";

      hash = sexpr.hash ? " " + this.accept(sexpr.hash) : "";

      return this.accept(sexpr.id) + " " + params + hash;
    };

    PrintVisitor.prototype.mustache = function(mustache) {
      return this.pad("{{ " + this.accept(mustache.sexpr) + " }}");
    };

    PrintVisitor.prototype.partial = function(partial) {
      var content = this.accept(partial.partialName);
      if(partial.context) {
        content += " " + this.accept(partial.context);
      }
      if (partial.hash) {
        content += " " + this.accept(partial.hash);
      }
      return this.pad("{{> " + content + " }}");
    };

    PrintVisitor.prototype.hash = function(hash) {
      var pairs = hash.pairs;
      var joinedPairs = [], left, right;

      for(var i=0, l=pairs.length; i<l; i++) {
        left = pairs[i][0];
        right = this.accept(pairs[i][1]);
        joinedPairs.push( left + "=" + right );
      }

      return "HASH{" + joinedPairs.join(", ") + "}";
    };

    PrintVisitor.prototype.STRING = function(string) {
      return '"' + string.string + '"';
    };

    PrintVisitor.prototype.NUMBER = function(number) {
      return "NUMBER{" + number.number + "}";
    };

    PrintVisitor.prototype.BOOLEAN = function(bool) {
      return "BOOLEAN{" + bool.bool + "}";
    };

    PrintVisitor.prototype.ID = function(id) {
      var path = id.parts.join("/");
      if(id.parts.length > 1) {
        return "PATH:" + path;
      } else {
        return "ID:" + path;
      }
    };

    PrintVisitor.prototype.PARTIAL_NAME = function(partialName) {
        return "PARTIAL:" + partialName.name;
    };

    PrintVisitor.prototype.DATA = function(data) {
      return "@" + this.accept(data.id);
    };

    PrintVisitor.prototype.content = function(content) {
      return this.pad("CONTENT[ '" + content.string + "' ]");
    };

    PrintVisitor.prototype.comment = function(comment) {
      return this.pad("{{! '" + comment.comment + "' }}");
    };
  });
define("handlebars/compiler/visitor", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function Visitor() {}

    Visitor.prototype = {
      constructor: Visitor,

      accept: function(object) {
        return this[object.type](object);
      }
    };

    __exports__["default"] = Visitor;
  });
define("handlebars/exception", 
  ["exports"],
  function(__exports__) {
    "use strict";

    var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

    function Exception(message, node) {
      var line;
      if (node && node.firstLine) {
        line = node.firstLine;

        message += ' - ' + line + ':' + node.firstColumn;
      }

      var tmp = Error.prototype.constructor.call(this, message);

      // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
      for (var idx = 0; idx < errorProps.length; idx++) {
        this[errorProps[idx]] = tmp[errorProps[idx]];
      }

      if (line) {
        this.lineNumber = line;
        this.column = node.firstColumn;
      }
    }

    Exception.prototype = new Error();

    __exports__["default"] = Exception;
  });
define("handlebars/runtime", 
  ["./utils","./exception","./base","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var Utils = __dependency1__;
    var Exception = __dependency2__["default"];
    var COMPILER_REVISION = __dependency3__.COMPILER_REVISION;
    var REVISION_CHANGES = __dependency3__.REVISION_CHANGES;
    var createFrame = __dependency3__.createFrame;

    function checkRevision(compilerInfo) {
      var compilerRevision = compilerInfo && compilerInfo[0] || 1,
          currentRevision = COMPILER_REVISION;

      if (compilerRevision !== currentRevision) {
        if (compilerRevision < currentRevision) {
          var runtimeVersions = REVISION_CHANGES[currentRevision],
              compilerVersions = REVISION_CHANGES[compilerRevision];
          throw new Exception("Template was precompiled with an older version of Handlebars than the current runtime. "+
                "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").");
        } else {
          // Use the embedded version info since the runtime doesn't know about this revision yet
          throw new Exception("Template was precompiled with a newer version of Handlebars than the current runtime. "+
                "Please update your runtime to a newer version ("+compilerInfo[1]+").");
        }
      }
    }

    __exports__.checkRevision = checkRevision;// TODO: Remove this line and break up compilePartial

    function template(templateSpec, env) {
      if (!env) {
        throw new Exception("No environment passed to template");
      }

      // Note: Using env.VM references rather than local var references throughout this section to allow
      // for external users to override these as psuedo-supported APIs.
      env.VM.checkRevision(templateSpec.compiler);

      var invokePartialWrapper = function(partial, name, context, hash, helpers, partials, data) {
        if (hash) {
          context = Utils.extend({}, context, hash);
        }

        var result = env.VM.invokePartial.call(this, partial, name, context, helpers, partials, data);
        if (result != null) { return result; }

        if (env.compile) {
          var options = { helpers: helpers, partials: partials, data: data };
          partials[name] = env.compile(partial, { data: data !== undefined }, env);
          return partials[name](context, options);
        } else {
          throw new Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
        }
      };

      // Just add water
      var container = {
        escapeExpression: Utils.escapeExpression,
        invokePartial: invokePartialWrapper,

        fn: function(i) {
          return templateSpec[i];
        },

        programs: [],
        program: function(i, data) {
          var programWrapper = this.programs[i],
              fn = this.fn(i);
          if(data) {
            programWrapper = program(this, i, fn, data);
          } else if (!programWrapper) {
            programWrapper = this.programs[i] = program(this, i, fn);
          }
          return programWrapper;
        },
        programWithDepth: env.VM.programWithDepth,

        data: function(data, depth) {
          while (data && depth--) {
            data = data._parent;
          }
          return data;
        },
        merge: function(param, common) {
          var ret = param || common;

          if (param && common && (param !== common)) {
            ret = Utils.extend({}, common, param);
          }

          return ret;
        },

        noop: env.VM.noop,
        compilerInfo: templateSpec.compiler
      };

      var ret = function(context, options) {
        options = options || {};
        var helpers,
            partials,
            data = options.data;

        ret._setup(options);
        if (!options.partial && templateSpec.useData) {
          data = initData(context, data);
        }
        return templateSpec.main.call(container, context, container.helpers, container.partials, data);
      };

      ret._setup = function(options) {
        if (!options.partial) {
          container.helpers = container.merge(options.helpers, env.helpers);

          if (templateSpec.usePartial) {
            container.partials = container.merge(options.partials, env.partials);
          }
        } else {
          container.helpers = options.helpers;
          container.partials = options.partials;
        }
      };

      ret._child = function(i) {
        return container.programWithDepth(i);
      };
      return ret;
    }

    __exports__.template = template;function programWithDepth(i, data /*, $depth */) {
      /*jshint -W040 */
      var args = Array.prototype.slice.call(arguments, 2),
          container = this,
          fn = container.fn(i);

      var prog = function(context, options) {
        options = options || {};

        return fn.apply(container, [context, container.helpers, container.partials, options.data || data].concat(args));
      };
      prog.program = i;
      prog.depth = args.length;
      return prog;
    }

    __exports__.programWithDepth = programWithDepth;function program(container, i, fn, data) {
      var prog = function(context, options) {
        options = options || {};

        return fn.call(container, context, container.helpers, container.partials, options.data || data);
      };
      prog.program = i;
      prog.depth = 0;
      return prog;
    }

    __exports__.program = program;function invokePartial(partial, name, context, helpers, partials, data) {
      var options = { partial: true, helpers: helpers, partials: partials, data: data };

      if(partial === undefined) {
        throw new Exception("The partial " + name + " could not be found");
      } else if(partial instanceof Function) {
        return partial(context, options);
      }
    }

    __exports__.invokePartial = invokePartial;function noop() { return ""; }

    __exports__.noop = noop;function initData(context, data) {
      if (!data || !('root' in data)) {
        data = data ? createFrame(data) : {};
        data.root = context;
      }
      return data;
    }
  });
define("handlebars/safe-string", 
  ["exports"],
  function(__exports__) {
    "use strict";
    // Build out our basic SafeString type
    function SafeString(string) {
      this.string = string;
    }

    SafeString.prototype.toString = function() {
      return "" + this.string;
    };

    __exports__["default"] = SafeString;
  });
define("handlebars/utils", 
  ["./safe-string","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /*jshint -W004 */
    var SafeString = __dependency1__["default"];

    var escape = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      "`": "&#x60;"
    };

    var badChars = /[&<>"'`]/g;
    var possible = /[&<>"'`]/;

    function escapeChar(chr) {
      return escape[chr] || "&amp;";
    }

    function extend(obj /* , ...source */) {
      for (var i = 1; i < arguments.length; i++) {
        for (var key in arguments[i]) {
          if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
            obj[key] = arguments[i][key];
          }
        }
      }

      return obj;
    }

    __exports__.extend = extend;var toString = Object.prototype.toString;
    __exports__.toString = toString;
    // Sourced from lodash
    // https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
    var isFunction = function(value) {
      return typeof value === 'function';
    };
    // fallback for older versions of Chrome and Safari
    if (isFunction(/x/)) {
      isFunction = function(value) {
        return typeof value === 'function' && toString.call(value) === '[object Function]';
      };
    }
    var isFunction;
    __exports__.isFunction = isFunction;
    var isArray = Array.isArray || function(value) {
      return (value && typeof value === 'object') ? toString.call(value) === '[object Array]' : false;
    };
    __exports__.isArray = isArray;

    function escapeExpression(string) {
      // don't escape SafeStrings, since they're already safe
      if (string instanceof SafeString) {
        return string.toString();
      } else if (!string && string !== 0) {
        return "";
      }

      // Force a string conversion as this will be done by the append regardless and
      // the regex test will do this transparently behind the scenes, causing issues if
      // an object's to string has escaped characters in it.
      string = "" + string;

      if(!possible.test(string)) { return string; }
      return string.replace(badChars, escapeChar);
    }

    __exports__.escapeExpression = escapeExpression;function isEmpty(value) {
      if (!value && value !== 0) {
        return true;
      } else if (isArray(value) && value.length === 0) {
        return true;
      } else {
        return false;
      }
    }

    __exports__.isEmpty = isEmpty;function appendContextPath(contextPath, id) {
      return (contextPath ? contextPath + '.' : '') + id;
    }

    __exports__.appendContextPath = appendContextPath;
  });
define("morph/dom-helper", 
  ["morph/morph","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Morph = __dependency1__["default"];

    var xhtmlNamespace = "http://www.w3.org/1999/xhtml";

    /*
     * A class wrapping DOM functions to address environment compatibility,
     * namespaces, contextual elements for morph un-escaped content
     * insertion.
     *
     * When entering a template, a DOMHelper should be passed to provide
     * context to the template. The context is most easily expressed as
     * an element:
     *
     *   template(context, { hooks: hooks, dom: new DOMHelper(element) });
     *
     * In this case, the namespace and ownerDocument of the element will
     * provide context.
     *
     * During fragment creation, a new namespace may be needed. In these
     * cases, a dom helper will be created for the new namespace:
     *
     *   dom1 = new dom0.constructor(null, dom0.document, someNamespaceURI);
     *
     * In this case the namespace and document are passed explicitly,
     * as decided by the parser at compile time, instead of asking the
     * DOMHelper to determine them. There is no contextual element passed,
     * but the contextual element should only be required by the morphs
     * at the root of a document anyway.
     *
     * Helpers and hooks can pass a new DOMHelper or another object as
     * is appropriate:
     *
     *   var svg = document.createElementNS(svgNamespace, 'svg');
     *   morph.render(context, {hooks: env.hooks, dom: new DOMHelper(svg)});
     *
     * TODO: support foreignObject as a passed contextual element. It has
     * a namespace (svg) that does not match its internal namespace
     * (xhtml).
     *
     * @class DOMHelper
     * @constructor
     * @param {HTMLElement} contextualElement the context element to be used
     *   during parseHTML requests. Will also be used for document and
     *   namespace if they are not provided explicitly.
     * @param {HTMLDocument} _document The document DOM methods are proxied to
     * @param {String} namespace The namespace for these actions
     */
    function DOMHelper(contextualElement, _document, namespaceURI){
      this.document = _document || (
        contextualElement ? contextualElement.ownerDocument : document);
      this.namespaceURI = namespaceURI || (
        contextualElement && contextualElement.namespaceURI !== xhtmlNamespace ?
        contextualElement.namespaceURI : null );
      this.contextualElement = contextualElement;
    }

    var prototype = DOMHelper.prototype;
    prototype.constructor = DOMHelper;

    prototype.appendChild = function(element, childElement) {
      element.appendChild(childElement);
    };

    prototype.appendText = function(element, text) {
      element.appendChild(this.document.createTextNode(text));
    };

    prototype.setAttribute = function(element, name, value) {
      element.setAttribute(name, value);
    };

    prototype.createElement = function(tagName) {
      if (this.namespaceURI) {
        return this.document.createElementNS(this.namespaceURI, tagName);
      } else {
        return this.document.createElement(tagName);
      }
    };

    prototype.createDocumentFragment = function(){
      return this.document.createDocumentFragment();
    };

    prototype.createTextNode = function(text){
      return this.document.createTextNode(text);
    };

    prototype.cloneNode = function(element, deep){
      return element.cloneNode(!!deep);
    };

    prototype.createMorph = function(parent, startIndex, endIndex){
      return Morph.create(parent, startIndex, endIndex, this);
    };

    prototype.parseHTML = function(html, parent){
      var element;
      // nodeType 11 is a document fragment. This will only
      // occur at the root of a template, and thus we can trust
      // that the contextualElement on the dom-helper is
      // the correct parent node.
      if (!parent || parent.nodeType === 11) {
        if (this.contextualElement){
          element = this.cloneNode(this.contextualElement, false);
        } else {
          // Perhaps this should just throw? It catches the corner
          // case of inner content being svg (like path), but not having
          // a parent or contextual element provided. this.createElement
          // then creates an SVG namespace div, and the inner content
          // ends up being correct.
          element = this.createElement('div');
        }
      } else {
        element = this.cloneNode(parent, false);
      }
      element.innerHTML = html;
      return element.childNodes;
    };

    prototype.sameAs = function(dom){
      return this.contextualElement === dom.contextualElement &&
             ( this.contextualElement ?
               this.contextualElement.tagName === dom.contextualElement.tagName :
               true ) &&
             this.document === dom.document &&
             this.namespace === dom.namespace;
    };

    __exports__["default"] = DOMHelper;
  });
define("morph/morph", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var splice = Array.prototype.splice;

    function Morph(parent, start, end, domHelper) {
      // TODO: this is an internal API, this should be an assert
      if (parent.nodeType === 11) {
        if (start === null || end === null) {
          throw new Error('a fragment parent must have boundary nodes in order to detect insertion');
        }
        this.element = null;
      } else {
        this.element = parent;
      }
      this._parent = parent;
      this.start = start;
      this.end = end;
      this.domHelper = domHelper;
      this.text = null;
      this.owner = null;
      this.morphs = null;
      this.before = null;
      this.after = null;
      this.escaped = true;
    }

    Morph.create = function (parent, startIndex, endIndex, domHelper) {
      var childNodes = parent.childNodes,
          start = startIndex === -1 ? null : childNodes[startIndex],
          end = endIndex === -1 ? null : childNodes[endIndex];
      return new Morph(parent, start, end, domHelper);
    };

    Morph.prototype.parent = function () {
      if (!this.element) {
        var parent = this.start.parentNode;
        if (this._parent !== parent) {
          this.element = this._parent = parent;
        }
      }
      return this._parent;
    };

    Morph.prototype.destroy = function () {
      if (this.owner) {
        this.owner.removeMorph(this);
      } else {
        clear(this.element || this.parent(), this.start, this.end);
      }
    };

    Morph.prototype.removeMorph = function (morph) {
      var morphs = this.morphs;
      for (var i=0, l=morphs.length; i<l; i++) {
        if (morphs[i] === morph) {
          this.replace(i, 1);
          break;
        }
      }
    };

    Morph.prototype.update = function (nodeOrString) {
      this._update(this.element || this.parent(), nodeOrString);
    };

    Morph.prototype.updateNode = function (node) {
      var parent = this.element || this.parent();
      if (!node) return this._updateText(parent, '');
      this._updateNode(parent, node);
    };

    Morph.prototype.updateText = function (text) {
      this._updateText(this.element || this.parent(), text);
    };

    Morph.prototype.updateHTML = function (html) {
      var parent = this.element || this.parent();
      if (!html) return this._updateText(parent, '');
      this._updateHTML(parent, html);
    };

    Morph.prototype._update = function (parent, nodeOrString) {
      if (nodeOrString === null || nodeOrString === undefined) {
        this._updateText(parent, '');
      } else if (typeof nodeOrString === 'string') {
        if (this.escaped) {
          this._updateText(parent, nodeOrString);
        } else {
          this._updateHTML(parent, nodeOrString);
        }
      } else if (nodeOrString.nodeType) {
        this._updateNode(parent, nodeOrString);
      } else if (nodeOrString.string) { // duck typed SafeString
        this._updateHTML(parent, nodeOrString.string);
      } else {
        this._updateText(parent, nodeOrString.toString());
      }
    };

    Morph.prototype._updateNode = function (parent, node) {
      if (this.text) {
        if (node.nodeType === 3) {
          this.text.nodeValue = node.nodeValue;
          return;
        } else {
          this.text = null;
        }
      }
      var start = this.start, end = this.end;
      clear(parent, start, end);
      parent.insertBefore(node, end);
      if (this.before !== null) {
        this.before.end = start.nextSibling;
      }
      if (this.after !== null) {
        this.after.start = end.previousSibling;
      }
    };

    Morph.prototype._updateText = function (parent, text) {
      if (this.text) {
        this.text.nodeValue = text;
        return;
      }
      var node = this.domHelper.createTextNode(text);
      this.text = node;
      clear(parent, this.start, this.end);
      parent.insertBefore(node, this.end);
      if (this.before !== null) {
        this.before.end = node;
      }
      if (this.after !== null) {
        this.after.start = node;
      }
    };

    Morph.prototype._updateHTML = function (parent, html) {
      var start = this.start, end = this.end;
      clear(parent, start, end);
      this.text = null;
      var childNodes = this.domHelper.parseHTML(html, parent);
      appendChildren(parent, end, childNodes);
      if (this.before !== null) {
        this.before.end = start.nextSibling;
      }
      if (this.after !== null) {
        this.after.start = end.previousSibling;
      }
    };

    Morph.prototype.append = function (node) {
      if (this.morphs === null) this.morphs = [];
      var index = this.morphs.length;
      return this.insert(index, node);
    };

    Morph.prototype.insert = function (index, node) {
      if (this.morphs === null) this.morphs = [];
      var parent = this.element || this.parent(),
        morphs = this.morphs,
        before = index > 0 ? morphs[index-1] : null,
        after  = index < morphs.length ? morphs[index] : null,
        start  = before === null ? this.start : (before.end === null ? parent.lastChild : before.end.previousSibling),
        end    = after === null ? this.end : (after.start === null ? parent.firstChild : after.start.nextSibling),
        morph  = new Morph(parent, start, end, this.domHelper);
      morph.owner = this;
      morph._update(parent, node);
      if (before !== null) {
        morph.before = before;
        before.end = start.nextSibling;
        before.after = morph;
      }
      if (after !== null) {
        morph.after = after;
        after.before = morph;
        after.start = end.previousSibling;
      }
      this.morphs.splice(index, 0, morph);
      return morph;
    };

    Morph.prototype.replace = function (index, removedLength, addedNodes) {
      if (this.morphs === null) this.morphs = [];
      var parent = this.element || this.parent(),
        morphs = this.morphs,
        before = index > 0 ? morphs[index-1] : null,
        after = index+removedLength < morphs.length ? morphs[index+removedLength] : null,
        start = before === null ? this.start : (before.end === null ? parent.lastChild : before.end.previousSibling),
        end   = after === null ? this.end : (after.start === null ? parent.firstChild : after.start.nextSibling),
        addedLength = addedNodes === undefined ? 0 : addedNodes.length,
        args, i, current;

      if (removedLength > 0) {
        clear(parent, start, end);
      }

      if (addedLength === 0) {
        if (before !== null) {
          before.after = after;
          before.end = end;
        }
        if (after !== null) {
          after.before = before;
          after.start = start;
        }
        morphs.splice(index, removedLength);
        return;
      }

      args = new Array(addedLength+2);
      if (addedLength > 0) {
        for (i=0; i<addedLength; i++) {
          args[i+2] = current = new Morph(parent, start, end, this.domHelper);
          current._update(parent, addedNodes[i]);
          current.owner = this;
          if (before !== null) {
            current.before = before;
            before.end = start.nextSibling;
            before.after = current;
          }
          before = current;
          start = end === null ? parent.lastChild : end.previousSibling;
        }
        if (after !== null) {
          current.after = after;
          after.before = current;
          after.start = end.previousSibling;
        }
      }

      args[0] = index;
      args[1] = removedLength;

      splice.apply(morphs, args);
    };

    function appendChildren(parent, end, nodeList) {
      var ref = end,
          i = nodeList.length,
          node;
      while (i--) {
        node = nodeList[i];
        parent.insertBefore(node, ref);
        ref = node;
      }
    }

    function clear(parent, start, end) {
      var current, previous;
      if (end === null) {
        current = parent.lastChild;
      } else {
        current = end.previousSibling;
      }

      while (current !== null && current !== start) {
        previous = current.previousSibling;
        parent.removeChild(current);
        current = previous;
      }
    }

    __exports__["default"] = Morph;
  });
define("htmlbars-compiler/ast", 
  ["handlebars/compiler/ast","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var AST = __dependency1__["default"];

    var MustacheNode = AST.MustacheNode;
    __exports__.MustacheNode = MustacheNode;var SexprNode = AST.SexprNode;
    __exports__.SexprNode = SexprNode;var HashNode = AST.HashNode;
    __exports__.HashNode = HashNode;var IdNode = AST.IdNode;
    __exports__.IdNode = IdNode;var StringNode = AST.StringNode;
    __exports__.StringNode = StringNode;
    function ProgramNode(statements, strip) {
      this.type = 'program';
      this.statements = statements;
      this.strip = strip;
    }

    __exports__.ProgramNode = ProgramNode;function BlockNode(mustache, program, inverse, strip) {
      this.type = 'block';
      this.mustache = mustache;
      this.program = program;
      this.inverse = inverse;
      this.strip = strip;
    }

    __exports__.BlockNode = BlockNode;function ComponentNode(tag, attributes, program) {
      this.type = 'component';
      this.tag = tag;
      this.attributes = attributes;
      this.program = program;
    }

    __exports__.ComponentNode = ComponentNode;function ElementNode(tag, attributes, helpers, children) {
      this.type = 'element';
      this.tag = tag;
      this.attributes = attributes;
      this.helpers = helpers;
      this.children = children;
    }

    __exports__.ElementNode = ElementNode;function AttrNode(name, value) {
      this.type = 'attr';
      this.name = name;
      this.value = value;
    }

    __exports__.AttrNode = AttrNode;function TextNode(chars) {
      this.type = 'text';
      this.chars = chars;
    }

    __exports__.TextNode = TextNode;function childrenFor(node) {
      if (node.type === 'program') return node.statements;
      if (node.type === 'element') return node.children;
    }

    __exports__.childrenFor = childrenFor;function usesMorph(node) {
      return node.type === 'mustache' || node.type === 'block' || node.type === 'component';
    }

    __exports__.usesMorph = usesMorph;function appendChild(parent, node) {
      var children = childrenFor(parent);

      var len = children.length, last;
      if (len > 0) {
        last = children[len-1];
        if (usesMorph(last) && usesMorph(node)) {
          children.push(new TextNode(''));
        }
      }
      children.push(node);
    }

    __exports__.appendChild = appendChild;
  });
define("htmlbars-compiler/compiler", 
  ["./parser","./compiler/template","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    /*jshint evil:true*/
    var preprocess = __dependency1__.preprocess;
    var TemplateCompiler = __dependency2__.TemplateCompiler;

    /*
     * Compile a string into a template rendering function
     *
     * Example usage:
     *
     *     // Template is the hydration portion of the compiled template
     *     var template = compile("Howdy {{name}}");
     *
     *     // Template accepts two arguments:
     *     //
     *     //   1. A context object
     *     //   2. An env object
     *     //
     *     // The env object *must* have at least these two properties:
     *     //
     *     //   1. `hooks` - Basic hooks for rendering a template
     *     //   2. `dom` - An instance of DOMHelper that provides the context for DOM creation
     *     //
     *     import {hooks} from 'htmlbars-runtime';
     *     import {DOMHelper} from 'morph';
     *     var domFragment = template({name: 'whatever'}, {hooks: hooks, dom: new DOMHelper() });
     *
     * @method compile
     * @param {String} string An htmlbars template string
     * @return {Function} A function for rendering the template
     */
    function compile(string) {
      var program = compileSpec(string);
      return new Function("return " + program)();
    }

    __exports__.compile = compile;/*
     * Compile a string into a template spec string. The template spec is a string
     * representation of a template. Usually, you would use compileSpec for
     * pre-compilation of a template on the server.
     *
     * Example usage:
     *
     *     var templateSpec = compileSpec("Howdy {{name}}");
     *     // This next step is basically what plain compile does
     *     var template = new Function("return " + templateSpec)();
     *
     * @method compileSpec
     * @param {String} string An htmlbars template string
     * @return {Function} A template spec string
     */
    function compileSpec(string) {
      var ast = preprocess(string);
      var compiler = new TemplateCompiler();
      var program = compiler.compile(ast);
      return program;
    }

    __exports__.compileSpec = compileSpec;
  });
define("htmlbars-compiler/compiler/fragment", 
  ["./utils","./quoting","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var processOpcodes = __dependency1__.processOpcodes;
    var string = __dependency2__.string;

    function FragmentCompiler() {
      this.source = [];
      this.depth = -1;
      this.domHelper = 'dom0';
    }

    __exports__.FragmentCompiler = FragmentCompiler;FragmentCompiler.prototype.compile = function(opcodes) {
      this.source.length = 0;
      this.depth = 0;

      this.source.push('function build() {\n');
      processOpcodes(this, opcodes);
      this.source.push('}\n');

      return this.source.join('');
    };

    FragmentCompiler.prototype.createFragment = function() {
      var el = 'el'+(++this.depth);
      this.source.push('  var '+el+' = '+this.domHelper+'.createDocumentFragment();\n');
    };

    FragmentCompiler.prototype.createElement = function(tagName) {
      var el = 'el'+(++this.depth);
      this.source.push('  var '+el+' = '+this.domHelper+'.createElement('+string(tagName)+');\n');
    };

    FragmentCompiler.prototype.createText = function(str) {
      var el = 'el'+(++this.depth);
      this.source.push('  var '+el+' = '+this.domHelper+'.createTextNode('+string(str)+');\n');
    };

    FragmentCompiler.prototype.returnNode = function() {
      var el = 'el'+this.depth;
      this.source.push('  return '+el+';\n');
    };

    FragmentCompiler.prototype.setAttribute = function(name, value) {
      var el = 'el'+this.depth;
      this.source.push('  '+this.domHelper+'.setAttribute('+el+','+string(name)+','+string(value)+');\n');
    };

    FragmentCompiler.prototype.createDOMHelper = function(domHelper) {
      var el = 'el'+this.depth;
      this.source.push('  '+domHelper+' = new '+this.domHelper+'.constructor('+el+');\n');
    };

    FragmentCompiler.prototype.selectDOMHelper = function(domHelper) {
      this.domHelper = domHelper;
    };

    FragmentCompiler.prototype.appendChild = function() {
      var child = 'el'+(this.depth--);
      var el = 'el'+this.depth;
      this.source.push('  '+this.domHelper+'.appendChild('+el+', '+child+');\n');
    };
  });
define("htmlbars-compiler/compiler/fragment_opcode", 
  ["./template_visitor","./utils","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var TemplateVisitor = __dependency1__["default"];
    var processOpcodes = __dependency2__.processOpcodes;

    function FragmentOpcodeCompiler() {
      this.opcodes = [];
    }

    FragmentOpcodeCompiler.prototype.compile = function(ast) {
      var templateVisitor = new TemplateVisitor();
      templateVisitor.visit(ast);

      processOpcodes(this, templateVisitor.actions);

      return this.opcodes;
    };

    FragmentOpcodeCompiler.prototype.opcode = function(type, params) {
      this.opcodes.push([type, params]);
    };

    FragmentOpcodeCompiler.prototype.text = function(text, childIndex, childCount, isSingleRoot) {
      this.opcode('createText', [text.chars]);
      if (!isSingleRoot) { this.opcode('appendChild'); }
    };

    FragmentOpcodeCompiler.prototype.openContextualElement = function(domHelper) {
      this.opcode('createDOMHelper', [domHelper]);
    };

    FragmentOpcodeCompiler.prototype.selectDOMHelper = function(domHelper) {
      this.opcode('selectDOMHelper', [domHelper]);
    };

    FragmentOpcodeCompiler.prototype.openElement = function(element) {
      this.opcode('createElement', [element.tag]);
      element.attributes.forEach(this.attribute, this);
    };

    FragmentOpcodeCompiler.prototype.closeElement = function(element, childIndex, childCount, isSingleRoot) {
      if (!isSingleRoot) { this.opcode('appendChild'); }
    };

    FragmentOpcodeCompiler.prototype.startProgram = function(program) {
      this.opcodes.length = 0;
      if (program.statements.length !== 1) {
        this.opcode('createFragment');
      }
    };

    FragmentOpcodeCompiler.prototype.endProgram = function(program) {
      this.opcode('returnNode');
    };

    FragmentOpcodeCompiler.prototype.mustache = function () {};

    FragmentOpcodeCompiler.prototype.component = function () {};

    FragmentOpcodeCompiler.prototype.block = function () {};

    FragmentOpcodeCompiler.prototype.attribute = function(attr) {
      if (attr.value.type === 'text') {
        this.opcode('setAttribute', [attr.name, attr.value.chars]);
      }
    };

    __exports__.FragmentOpcodeCompiler = FragmentOpcodeCompiler;
  });
define("htmlbars-compiler/compiler/helpers", 
  ["./quoting","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var array = __dependency1__.array;
    var hash = __dependency1__.hash;
    var string = __dependency1__.string;

    function prepareHelper(stack, size) {
      var args = [],
          types = [],
          hashPairs = [],
          hashTypes = [],
          keyName,
          i;

      var hashSize = stack.pop();

      for (i=0; i<hashSize; i++) {
        keyName = stack.pop();
        hashPairs.unshift(keyName + ':' + stack.pop());
        hashTypes.unshift(keyName + ':' + stack.pop());
      }

      for (i=0; i<size; i++) {
        args.unshift(stack.pop());
        types.unshift(stack.pop());
      }

      var programId = stack.pop();
      var inverseId = stack.pop();

      var options = ['types:' + array(types), 'hashTypes:' + hash(hashTypes), 'hash:' + hash(hashPairs)];

      if (programId !== null) {
        options.push('render:child' + programId);
      }

      if (inverseId !== null) {
        options.push('inverse:child' + inverseId);
      }

      return {
        options: options,
        args: array(args)
      };
    }

    __exports__.prepareHelper = prepareHelper;
  });
define("htmlbars-compiler/compiler/hydration", 
  ["./utils","./helpers","./quoting","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var processOpcodes = __dependency1__.processOpcodes;
    var prepareHelper = __dependency2__.prepareHelper;
    var string = __dependency3__.string;
    var quotedArray = __dependency3__.quotedArray;
    var hash = __dependency3__.hash;
    var array = __dependency3__.array;

    function HydrationCompiler() {
      this.stack = [];
      this.source = [];
      this.mustaches = [];
      this.parents = ['fragment'];
      this.parentCount = 0;
      this.domHelper = 'dom0';
      this.declarations = [];
    }

    var prototype = HydrationCompiler.prototype;

    prototype.compile = function(opcodes) {
      this.stack.length = 0;
      this.mustaches.length = 0;
      this.source.length = 0;
      this.parents.length = 1;
      this.declarations.length = 0;
      this.parentCount = 0;

      processOpcodes(this, opcodes);

      if (this.declarations.length) {
        var decs = "  var ";
        for (var i = 0, l = this.declarations.length; i < l; ++i) {
          var dec = this.declarations[i];
          decs += dec[0];
          decs += " = ";
          decs += dec[1];
          if (i+1 === l) {
            decs += ';\n';
          } else {
            decs += ', ';
          }
        }
        this.source.unshift(decs);
      }

      return this.source.join('');
    };

    prototype.program = function(programId, inverseId) {
      this.stack.push(inverseId);
      this.stack.push(programId);
    };

    prototype.id = function(parts) {
      this.stack.push(string('id'));
      this.stack.push(string(parts.join('.')));
    };

    prototype.literal = function(literal) {
      this.stack.push(string(typeof literal));
      this.stack.push(literal);
    };

    prototype.stringLiteral = function(str) {
      this.stack.push(string('string'));
      this.stack.push(string(str));
    };

    prototype.stackLiteral = function(literal) {
      this.stack.push(literal);
    };

    prototype.helper = function(name, size, escaped, morphNum) {
      var prepared = prepareHelper(this.stack, size);
      prepared.options.push('escaped:'+escaped);
      this.pushMustacheInContent(string(name), prepared.args, prepared.options, morphNum);
    };

    prototype.envHash = function() {
      return '{hooks: env.hooks, dom: '+this.domHelper+'}';
    };

    prototype.component = function(tag, morphNum) {
      var prepared = prepareHelper(this.stack, 0);
      this.pushWebComponent(string(tag), prepared.options, morphNum);
    };

    prototype.ambiguous = function(str, escaped, morphNum) {
      this.pushMustacheInContent(string(str), '[]', ['escaped:'+escaped], morphNum);
    };

    prototype.ambiguousAttr = function(str, escaped) {
      this.stack.push('['+string(str)+', [], {escaped:'+escaped+'}]');
    };

    prototype.helperAttr = function(name, size, escaped) {
      var prepared = prepareHelper(this.stack, size);
      prepared.options.push('escaped:'+escaped);

      this.stack.push('['+string(name)+','+prepared.args+','+ hash(prepared.options)+']');
    };

    prototype.sexpr = function(name, size) {
      var prepared = prepareHelper(this.stack, size);

      //export function subexpr(helperName, context, params, options) {
      this.stack.push('hooks.subexpr(' + string(name) + ', context, ' + prepared.args + ', ' + hash(prepared.options) + ', ' + this.envHash() + ')');
    };

    prototype.string = function(str) {
      this.stack.push(string(str));
    };

    prototype.nodeHelper = function(name, size, elementNum) {
      var prepared = prepareHelper(this.stack, size);
      this.pushMustacheInNode(string(name), prepared.args, prepared.options, elementNum);
    };

    prototype.morph = function(num, parentPath, startIndex, endIndex) {
      var parentIndex = parentPath.length === 0 ? 0 : parentPath[parentPath.length-1];
      var parent = this.getParent();
      var morph = this.domHelper+".createMorph("+parent+","+
        (startIndex === null ? "-1" : startIndex)+","+
        (endIndex === null ? "-1" : endIndex)+")";

      this.declarations.push(['morph' + num, morph]);
    };

    // Adds our element to cached declaration
    prototype.element = function(elementNum){
      var elementNodesName = "element" + elementNum;
      this.declarations.push([elementNodesName, this.getParent() ]);
      this.parents[this.parents.length-1] = elementNodesName;
    };

    prototype.pushWebComponent = function(name, pairs, morphNum) {
      this.source.push('  hooks.webComponent(morph' + morphNum + ', ' + name + ', context, ' + hash(pairs) + ', ' + this.envHash() + ');\n');
    };

    prototype.pushMustacheInContent = function(name, args, pairs, morphNum) {
      this.source.push('  hooks.content(morph' + morphNum + ', ' + name + ', context, ' + args + ', ' + hash(pairs) + ', ' + this.envHash() + ');\n');
    };

    prototype.pushMustacheInNode = function(name, args, pairs, elementNum) {
      this.source.push('  hooks.element(element' + elementNum + ', ' + name + ', context, ' + args + ', ' + hash(pairs) + ', ' + this.envHash() + ');\n');
    };

    prototype.shareParent = function(i) {
      var parentNodesName = "parent" + this.parentCount++;
      this.declarations.push([parentNodesName, this.getParent() + '.childNodes[' + i + ']']);
      this.parents.push(parentNodesName);
    };

    prototype.consumeParent = function(i) {
      this.parents.push(this.getParent() + '.childNodes[' + i + ']');
    };

    prototype.popParent = function() {
      this.parents.pop();
    };

    prototype.getParent = function() {
      return this.parents[this.parents.length-1];
    };

    prototype.selectDOMHelper = function(domHelper) {
      this.domHelper = domHelper;
    };

    __exports__.HydrationCompiler = HydrationCompiler;
  });
define("htmlbars-compiler/compiler/hydration_opcode", 
  ["./template_visitor","./utils","../html-parser/helpers","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var TemplateVisitor = __dependency1__["default"];
    var processOpcodes = __dependency2__.processOpcodes;
    var buildHashFromAttributes = __dependency3__.buildHashFromAttributes;

    function HydrationOpcodeCompiler() {
      this.opcodes = [];
      this.paths = [];
      this.templateId = 0;
      this.currentDOMChildIndex = 0;
      this.morphs = [];
      this.morphNum = 0;
      this.element = null;
      this.elementNum = -1;
    }

    HydrationOpcodeCompiler.prototype.compile = function(ast) {
      var templateVisitor = new TemplateVisitor();
      templateVisitor.visit(ast);

      processOpcodes(this, templateVisitor.actions);

      return this.opcodes;
    };

    HydrationOpcodeCompiler.prototype.startProgram = function() {
      this.opcodes.length = 0;
      this.paths.length = 0;
      this.morphs.length = 0;
      this.templateId = 0;
      this.currentDOMChildIndex = -1;
      this.morphNum = 0;
    };

    HydrationOpcodeCompiler.prototype.endProgram = function(program) {
      distributeMorphs(this.morphs, this.opcodes);
    };

    HydrationOpcodeCompiler.prototype.text = function(string) {
      ++this.currentDOMChildIndex;
    };

    HydrationOpcodeCompiler.prototype.selectDOMHelper = function(domHelper) {
      this.opcode('selectDOMHelper', domHelper);
    };

    HydrationOpcodeCompiler.prototype.openElement = function(element, pos, len, isSingleRoot, mustacheCount) {
      distributeMorphs(this.morphs, this.opcodes);
      ++this.currentDOMChildIndex;

      this.element = this.currentDOMChildIndex;
      
      if (!isSingleRoot) {
        this.opcode('consumeParent', this.currentDOMChildIndex);

        // If our parent referance will be used more than once, cache its referance.
        if (mustacheCount > 1) {
          this.opcode('element', ++this.elementNum);
          this.element = null; // Set element to null so we don't cache it twice
        }
      }

      this.paths.push(this.currentDOMChildIndex);
      this.currentDOMChildIndex = -1;

      element.attributes.forEach(this.attribute, this);
      element.helpers.forEach(this.nodeHelper, this);
    };

    HydrationOpcodeCompiler.prototype.closeElement = function(element, pos, len, isSingleRoot) {
      distributeMorphs(this.morphs, this.opcodes);
      if (!isSingleRoot) { this.opcode('popParent'); }
      this.currentDOMChildIndex = this.paths.pop();
    };

    HydrationOpcodeCompiler.prototype.block = function(block, childIndex, childrenLength) {
      var currentDOMChildIndex = this.currentDOMChildIndex,
          mustache = block.mustache;

      var start = (currentDOMChildIndex < 0 ? null : currentDOMChildIndex),
          end = (childIndex === childrenLength - 1 ? null : currentDOMChildIndex + 1);

      var morphNum = this.morphNum++;
      this.morphs.push([morphNum, this.paths.slice(), start, end]);

      this.opcode('program', this.templateId++, block.inverse === null ? null : this.templateId++);
      processParams(this, mustache.params);
      processHash(this, mustache.hash);
      this.opcode('helper', mustache.id.string, mustache.params.length, mustache.escaped, morphNum);
    };

    HydrationOpcodeCompiler.prototype.component = function(component, childIndex, childrenLength) {
      var currentDOMChildIndex = this.currentDOMChildIndex;

      var start = (currentDOMChildIndex < 0 ? null : currentDOMChildIndex),
          end = (childIndex === childrenLength - 1 ? null : currentDOMChildIndex + 1);

      var morphNum = this.morphNum++;
      this.morphs.push([morphNum, this.paths.slice(), start, end]);

      this.opcode('program', this.templateId++, null);
      processHash(this, buildHashFromAttributes(component.attributes));
      this.opcode('component', component.tag, morphNum);
    };

    HydrationOpcodeCompiler.prototype.opcode = function(type) {
      var params = [].slice.call(arguments, 1);
      this.opcodes.push([type, params]);
    };

    HydrationOpcodeCompiler.prototype.attribute = function(attr) {
      if (attr.value.type === 'text') return;

      // We treat attribute like a attribute helper evaluated by the element hook.
      // <p {{attribute 'class' 'foo ' (bar)}}></p>
      // Unwrapped any mustaches to just be their internal sexprs.
      this.nodeHelper({
        params: [attr.name, attr.value.sexpr],
        hash: null,
        id: {
          string: 'attribute'
        }
      });
    };

    HydrationOpcodeCompiler.prototype.nodeHelper = function(mustache) {
      this.opcode('program', null, null);
      processParams(this, mustache.params);
      processHash(this, mustache.hash);
      // If we have a helper in a node, and this element has not been cached, cache it
      if(this.element !== null){
        this.opcode('element', ++this.elementNum);
        this.element = null; // Reset element so we don't cache it more than once
      }
      this.opcode('nodeHelper', mustache.id.string, mustache.params.length, this.elementNum);
    };

    HydrationOpcodeCompiler.prototype.mustache = function(mustache, childIndex, childrenLength) {
      var currentDOMChildIndex = this.currentDOMChildIndex;

      var start = currentDOMChildIndex,
          end = (childIndex === childrenLength - 1 ? -1 : currentDOMChildIndex + 1);

      var morphNum = this.morphNum++;
      this.morphs.push([morphNum, this.paths.slice(), start, end]);

      if (mustache.isHelper) {
        this.opcode('program', null, null);
        processParams(this, mustache.params);
        processHash(this, mustache.hash);
        this.opcode('helper', mustache.id.string, mustache.params.length, mustache.escaped, morphNum);
      } else {
        this.opcode('ambiguous', mustache.id.string, mustache.escaped, morphNum);
      }
    };

    HydrationOpcodeCompiler.prototype.sexpr = function(sexpr) {
      this.string('sexpr');
      this.opcode('program', null, null);
      processParams(this, sexpr.params);
      processHash(this, sexpr.hash);
      this.opcode('sexpr', sexpr.id.string, sexpr.params.length);
    };

    HydrationOpcodeCompiler.prototype.string = function(str) {
      this.opcode('string', str);
    };

    HydrationOpcodeCompiler.prototype.mustacheInAttr = function(mustache) {
      if (mustache.isHelper) {
        this.opcode('program', null, null);
        processParams(this, mustache.params);
        processHash(this, mustache.hash);
        this.opcode('helperAttr', mustache.id.string, mustache.params.length, mustache.escaped);
      } else {
        this.opcode('ambiguousAttr', mustache.id.string, mustache.escaped);
      }
    };

    HydrationOpcodeCompiler.prototype.ID = function(id) {
      this.opcode('id', id.parts);
    };

    HydrationOpcodeCompiler.prototype.STRING = function(string) {
      this.opcode('stringLiteral', string.stringModeValue);
    };

    HydrationOpcodeCompiler.prototype.BOOLEAN = function(boolean) {
      this.opcode('literal', boolean.stringModeValue);
    };

    HydrationOpcodeCompiler.prototype.INTEGER = function(integer) {
      this.opcode('literal', integer.stringModeValue);
    };

    function processParams(compiler, params) {
      params.forEach(function(param) {
        if (param.type === 'text') {
          compiler.STRING({ stringModeValue: param.chars });
        } else if (param.type) {
          compiler[param.type](param);
        } else {
          compiler.STRING({ stringModeValue: param });
        }
      });
    }

    function processHash(compiler, hash) {
      if (hash) {
        hash.pairs.forEach(function(pair) {
          var name = pair[0], param = pair[1];
          compiler[param.type](param);
          compiler.opcode('stackLiteral', name);
        });
        compiler.opcode('stackLiteral', hash.pairs.length);
      } else {
        compiler.opcode('stackLiteral', 0);
      }
    }

    function distributeMorphs(morphs, opcodes) {
      if (morphs.length === 0) {
        return;
      }

      // Splice morphs after the most recent shareParent/consumeParent.
      var o;
      for (o = opcodes.length - 1; o >= 0; --o) {
        var opcode = opcodes[o][0];
        if (opcode === 'element' || opcode === 'consumeParent'  || opcode === 'popParent') {
          break;
        }
      }

      var spliceArgs = [o + 1, 0];
      for (var i = 0; i < morphs.length; ++i) {
        var p = morphs[i];
        spliceArgs.push(['morph', [p[0], p[1], p[2], p[3]]]);
      }
      opcodes.splice.apply(opcodes, spliceArgs);
      morphs.length = 0;
    }

    __exports__.HydrationOpcodeCompiler = HydrationOpcodeCompiler;
  });
define("htmlbars-compiler/compiler/quoting", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function escapeString(str) {
      return str.replace(/"/g, '\\"').replace(/\n/g, "\\n");
    }

    __exports__.escapeString = escapeString;

    function string(str) {
      return '"' + escapeString(str) + '"';
    }

    __exports__.string = string;

    function array(a) {
      return "[" + a + "]";
    }

    __exports__.array = array;

    function quotedArray(list) {
      return array(list.map(string).join(", "));
    }

    __exports__.quotedArray = quotedArray;function hash(pairs) {
      return "{" + pairs.join(",") + "}";
    }

    __exports__.hash = hash;
  });
define("htmlbars-compiler/compiler/template", 
  ["./fragment_opcode","./fragment","./hydration_opcode","./hydration","./template_visitor","./utils","./quoting","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __exports__) {
    "use strict";
    var FragmentOpcodeCompiler = __dependency1__.FragmentOpcodeCompiler;
    var FragmentCompiler = __dependency2__.FragmentCompiler;
    var HydrationOpcodeCompiler = __dependency3__.HydrationOpcodeCompiler;
    var HydrationCompiler = __dependency4__.HydrationCompiler;
    var TemplateVisitor = __dependency5__["default"];
    var processOpcodes = __dependency6__.processOpcodes;
    var string = __dependency7__.string;

    function TemplateCompiler() {
      this.fragmentOpcodeCompiler = new FragmentOpcodeCompiler();
      this.fragmentCompiler = new FragmentCompiler();
      this.hydrationOpcodeCompiler = new HydrationOpcodeCompiler();
      this.hydrationCompiler = new HydrationCompiler();
      this.templates = [];
      this.childTemplates = [];
      this.domHelperStack = [];
      this.domHelperVariables = [];
    }

    __exports__.TemplateCompiler = TemplateCompiler;TemplateCompiler.prototype.compile = function(ast) {
      var templateVisitor = new TemplateVisitor();
      templateVisitor.visit(ast);

      processOpcodes(this, templateVisitor.actions);

      return this.templates.pop();
    };

    TemplateCompiler.prototype.startProgram = function(program, childTemplateCount) {
      this.fragmentOpcodeCompiler.startProgram(program, childTemplateCount);
      this.hydrationOpcodeCompiler.startProgram(program, childTemplateCount);

      // The stack tracks what the current helper is
      this.domHelperStack.splice(0, this.domHelperStack.length, 'dom0');
      // The list of variables
      this.domHelperVariables.splice(0, this.domHelperVariables.length, 'dom0');

      this.childTemplates.length = 0;
      while(childTemplateCount--) {
        this.childTemplates.push(this.templates.pop());
      }
    };

    TemplateCompiler.prototype.endProgram = function(program) {
      this.fragmentOpcodeCompiler.endProgram(program);
      this.hydrationOpcodeCompiler.endProgram(program);

      // function build(dom) { return fragment; }
      var fragmentProgram = this.fragmentCompiler.compile(
        this.fragmentOpcodeCompiler.opcodes
      );

      // function hydrate(fragment) { return mustaches; }
      var hydrationProgram = this.hydrationCompiler.compile(
        this.hydrationOpcodeCompiler.opcodes
      );

      var childTemplateVars = "";
      for (var i=0, l=this.childTemplates.length; i<l; i++) {
        childTemplateVars +=   '  var child' + i + '=' + this.childTemplates[i] + ';\n';
      }

      var template =
        '(function (){\n' +
          childTemplateVars +
        'var ' + this.domHelperVariables.join(', ') + ';\n' +
          fragmentProgram +
        'var cachedFragment;\n' +
        'return function template(context, env) {\n' +
        '  if (!env.dom) { throw "You must specify a dom argument to env"; }\n' +
        '  if (dom0 === undefined || !dom0.sameAs(env.dom)) {\n' +
        '    dom0 = env.dom;\n' +
        '    cachedFragment = build();\n' +
        '  }\n' +
        '  var fragment = dom0.cloneNode(cachedFragment, true);\n' +
        '  var hooks = env.hooks;\n' +
           hydrationProgram +
        '  return fragment;\n' +
        '};\n' +
        '}())';

      this.templates.push(template);
    };

    TemplateCompiler.prototype.openElement = function(element, i, l, r, c) {
      this.fragmentOpcodeCompiler.openElement(element, i, l, r, c);
      this.hydrationOpcodeCompiler.openElement(element, i, l, r, c);
    };

    TemplateCompiler.prototype.closeElement = function(element, i, l, r) {
      this.fragmentOpcodeCompiler.closeElement(element, i, l, r);
      this.hydrationOpcodeCompiler.closeElement(element, i, l, r);
    };

    TemplateCompiler.prototype.openContextualElement = function(contextualElement) {
      var previousHelper = this.domHelperStack[this.domHelperStack.length-1],
          domHelper      = 'dom'+this.domHelperVariables.length;
      this.domHelperStack.push(domHelper);
      this.domHelperVariables.push(domHelper);

      this.fragmentOpcodeCompiler.openContextualElement(domHelper);
      this.fragmentOpcodeCompiler.selectDOMHelper(domHelper);
      this.hydrationOpcodeCompiler.selectDOMHelper(domHelper);
    };

    TemplateCompiler.prototype.closeContextualElement = function(contextualElement) {
      this.domHelperStack.pop();
      var domHelper = this.domHelperStack[this.domHelperStack.length-1];
      this.fragmentOpcodeCompiler.selectDOMHelper(domHelper);
      this.hydrationOpcodeCompiler.selectDOMHelper(domHelper);
    };

    TemplateCompiler.prototype.component = function(component, i, l) {
      this.fragmentOpcodeCompiler.component(component, i, l);
      this.hydrationOpcodeCompiler.component(component, i, l);
    };

    TemplateCompiler.prototype.block = function(block, i, l) {
      this.fragmentOpcodeCompiler.block(block, i, l);
      this.hydrationOpcodeCompiler.block(block, i, l);
    };

    TemplateCompiler.prototype.text = function(string, i, l, r) {
      this.fragmentOpcodeCompiler.text(string, i, l, r);
      this.hydrationOpcodeCompiler.text(string, i, l, r);
    };

    TemplateCompiler.prototype.mustache = function (mustache, i, l) {
      this.fragmentOpcodeCompiler.mustache(mustache, i, l);
      this.hydrationOpcodeCompiler.mustache(mustache, i, l);
    };
  });
define("htmlbars-compiler/compiler/template_visitor", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var push = Array.prototype.push;

    function Frame() {
      this.parentNode = null;
      this.childIndex = null;
      this.childCount = null;
      this.childTemplateCount = 0;
      this.mustacheCount = 0;
      this.actions = [];
    }

    /**
     * Takes in an AST and outputs a list of actions to be consumed
     * by a compiler. For example, the template
     *
     *     foo{{bar}}<div>baz</div>
     *
     * produces the actions
     *
     *     [['startProgram', [programNode, 0]],
     *      ['text', [textNode, 0, 3]],
     *      ['mustache', [mustacheNode, 1, 3]],
     *      ['openElement', [elementNode, 2, 3, 0]],
     *      ['text', [textNode, 0, 1]],
     *      ['closeElement', [elementNode, 2, 3],
     *      ['endProgram', [programNode]]]
     *
     * This visitor walks the AST depth first and backwards. As
     * a result the bottom-most child template will appear at the
     * top of the actions list whereas the root template will appear
     * at the bottom of the list. For example,
     *
     *     <div>{{#if}}foo{{else}}bar<b></b>{{/if}}</div>
     *
     * produces the actions
     *
     *     [['startProgram', [programNode, 0]],
     *      ['text', [textNode, 0, 2, 0]],
     *      ['openElement', [elementNode, 1, 2, 0]],
     *      ['closeElement', [elementNode, 1, 2]],
     *      ['endProgram', [programNode]],
     *      ['startProgram', [programNode, 0]],
     *      ['text', [textNode, 0, 1]],
     *      ['endProgram', [programNode]],
     *      ['startProgram', [programNode, 2]],
     *      ['openElement', [elementNode, 0, 1, 1]],
     *      ['block', [blockNode, 0, 1]],
     *      ['closeElement', [elementNode, 0, 1]],
     *      ['endProgram', [programNode]]]
     *
     * The state of the traversal is maintained by a stack of frames.
     * Whenever a node with children is entered (either a ProgramNode
     * or an ElementNode) a frame is pushed onto the stack. The frame
     * contains information about the state of the traversal of that
     * node. For example,
     * 
     *   - index of the current child node being visited
     *   - the number of mustaches contained within its child nodes
     *   - the list of actions generated by its child nodes
     */

    function TemplateVisitor() {
      this.frameStack = [];
      this.actions = [];
    }

    // Traversal methods

    TemplateVisitor.prototype.visit = function(node) {
      this[node.type](node);
    };

    TemplateVisitor.prototype.program = function(program) {
      var parentFrame = this.getCurrentFrame();
      var programFrame = this.pushFrame();

      programFrame.parentNode = program;
      programFrame.childCount = program.statements.length;
      programFrame.actions.push(['endProgram', [program]]);

      for (var i = program.statements.length - 1; i >= 0; i--) {
        programFrame.childIndex = i;
        this.visit(program.statements[i]);
      }

      programFrame.actions.push(['startProgram', [program, programFrame.childTemplateCount]]);
      this.popFrame();

      // Push the completed template into the global actions list
      if (parentFrame) { parentFrame.childTemplateCount++; }
      push.apply(this.actions, programFrame.actions.reverse());
    };

    TemplateVisitor.prototype.element = function(element) {
      var parentFrame = this.getCurrentFrame();
      var elementFrame = this.pushFrame();
      var parentNode = parentFrame.parentNode;

      elementFrame.parentNode = element;
      elementFrame.childCount = element.children.length;
      elementFrame.mustacheCount += element.helpers.length;

      var actionArgs = [
        element,
        parentFrame.childIndex,
        parentFrame.childCount,
        parentNode.type === 'program' && parentFrame.childCount === 1
      ];

      elementFrame.actions.push(['closeElement', actionArgs]);

      for (var i = element.attributes.length - 1; i >= 0; i--) {
        this.visit(element.attributes[i]);
      }

      for (i = element.children.length - 1; i >= 0; i--) {
        elementFrame.childIndex = i;
        this.visit(element.children[i]);
      }

      elementFrame.actions.push(['openElement', actionArgs.concat(elementFrame.mustacheCount)]);
      this.popFrame();

      // Propagate the element's frame state to the parent frame
      if (elementFrame.mustacheCount > 0) { parentFrame.mustacheCount++; }
      parentFrame.childTemplateCount += elementFrame.childTemplateCount;
      push.apply(parentFrame.actions, elementFrame.actions);
    };

    TemplateVisitor.prototype.attr = function(attr) {
      if (attr.value.type === 'mustache') {
        this.getCurrentFrame().mustacheCount++;
      }
    };

    TemplateVisitor.prototype.block = function(node) {
      var frame = this.getCurrentFrame();
      var parentNode = frame.parentNode;

      frame.mustacheCount++;
      
      if (parentNode.type === 'element') {
        frame.actions.push(['closeContextualElement', [parentNode]]);
        frame.actions.push([node.type, [node, frame.childIndex, frame.childCount]]);
        frame.actions.push(['openContextualElement', [parentNode]]);
      } else {
        frame.actions.push([node.type, [node, frame.childIndex, frame.childCount]]);
      }

      if (node.inverse) { this.visit(node.inverse); }
      if (node.program) { this.visit(node.program); }
    };

    TemplateVisitor.prototype.component = TemplateVisitor.prototype.block;

    TemplateVisitor.prototype.text = function(text) {
      var frame = this.getCurrentFrame();
      var isSingleRoot = frame.parentNode.type === 'program' && frame.childCount === 1;
      frame.actions.push(['text', [text, frame.childIndex, frame.childCount, isSingleRoot]]);
    };

    TemplateVisitor.prototype.mustache = function(mustache) {
      var frame = this.getCurrentFrame();
      frame.mustacheCount++;
      frame.actions.push(['mustache', [mustache, frame.childIndex, frame.childCount]]);
    };

    // Frame helpers

    TemplateVisitor.prototype.getCurrentFrame = function() {
      return this.frameStack[this.frameStack.length - 1];
    };

    TemplateVisitor.prototype.pushFrame = function() {
      var frame = new Frame();
      this.frameStack.push(frame);
      return frame;
    };

    TemplateVisitor.prototype.popFrame = function() {
      return this.frameStack.pop();
    };

    __exports__["default"] = TemplateVisitor;
  });
define("htmlbars-compiler/compiler/utils", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function processOpcodes(compiler, opcodes) {
      for (var i=0, l=opcodes.length; i<l; i++) {
        var method = opcodes[i][0];
        var params = opcodes[i][1];
        compiler[method].apply(compiler, params);
      }
    }

    __exports__.processOpcodes = processOpcodes;
  });
define("htmlbars-compiler/html-parser/helpers", 
  ["../ast","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var TextNode = __dependency1__.TextNode;
    var StringNode = __dependency1__.StringNode;
    var HashNode = __dependency1__.HashNode;
    var usesMorph = __dependency1__.usesMorph;

    // Rewrites an array of AttrNodes into a HashNode.
    // MustacheNodes are replaced with their root SexprNode and
    // TextNodes are replaced with StringNodes

    function buildHashFromAttributes(attributes) {
      var pairs = [];

      for (var i = 0; i < attributes.length; i++) {
        var attr = attributes[i];
        if (attr.value.type === 'mustache') {
          pairs.push([attr.name, attr.value.sexpr]);
        } else if (attr.value.type === 'text') {
          pairs.push([attr.name, new StringNode(attr.value.chars)]);
        }
      }

      return new HashNode(pairs);
    }

    __exports__.buildHashFromAttributes = buildHashFromAttributes;// Adds an empty text node at the beginning and end of a program.
    // The empty text nodes *between* nodes are handled elsewhere.
    // Also processes all whitespace stripping directives.

    function postprocessProgram(program) {
      var statements = program.statements;

      if (statements.length === 0) return;

      if (usesMorph(statements[0])) {
        statements.unshift(new TextNode(''));
      }

      if (usesMorph(statements[statements.length-1])) {
        statements.push(new TextNode(''));
      }

      // Perform any required whitespace stripping
      var l = statements.length;
      for (var i = 0; i < l; i++) {
        var statement = statements[i];

        if (statement.type !== 'text') continue;

        if ((i > 0 && statements[i-1].strip && statements[i-1].strip.right) ||
          (i === 0 && program.strip.left)) {
          statement.chars = statement.chars.replace(/^\s+/, '');
        }

        if ((i < l-1 && statements[i+1].strip && statements[i+1].strip.left) ||
          (i === l-1 && program.strip.right)) {
          statement.chars = statement.chars.replace(/\s+$/, '');
        }

        // Remove unnecessary text nodes
        if (statement.chars.length === 0) {
          if ((i > 0 && statements[i-1].type === 'element') ||
            (i < l-1 && statements[i+1].type === 'element')) {
            statements.splice(i, 1);
            i--;
            l--;
          }
        }
      }
    }

    __exports__.postprocessProgram = postprocessProgram;
  });
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
define("htmlbars-compiler/html-parser/token-handlers", 
  ["htmlbars-compiler/ast","htmlbars-compiler/html-parser/helpers","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var ProgramNode = __dependency1__.ProgramNode;
    var ComponentNode = __dependency1__.ComponentNode;
    var ElementNode = __dependency1__.ElementNode;
    var TextNode = __dependency1__.TextNode;
    var appendChild = __dependency1__.appendChild;
    var postprocessProgram = __dependency2__.postprocessProgram;

    // This table maps from the state names in the tokenizer to a smaller
    // number of states that control how mustaches are handled
    var states = {
      "beforeAttributeValue": "before-attr",
      "attributeValueDoubleQuoted": "attr",
      "attributeValueSingleQuoted": "attr",
      "attributeValueUnquoted": "attr",
      "beforeAttributeName": "in-tag"
    };

    // The HTML elements in this list are speced by
    // http://www.w3.org/TR/html-markup/syntax.html#syntax-elements,
    // and will be forced to close regardless of if they have a
    // self-closing /> at the end.
    var voidTagNames = "area base br col command embed hr img input keygen link meta param source track wbr";
    var voidMap = {};

    voidTagNames.split(" ").forEach(function(tagName) {
      voidMap[tagName] = true;
    });

    var svgNamespace = "http://www.w3.org/2000/svg",
        // http://www.w3.org/html/wg/drafts/html/master/syntax.html#html-integration-point
        svgHTMLIntegrationPoints = ['foreignObject', 'desc', 'title'];

    function applyNamespace(tag, element, currentElement){
      if (tag.tagName === 'svg') {
        element.namespaceURI = svgNamespace;
      } else if (
        currentElement.type === 'element' &&
        currentElement.namespaceURI &&
        !currentElement.isHTMLIntegrationPoint
      ) {
        element.namespaceURI = currentElement.namespaceURI;
      }
    }

    function applyHTMLIntegrationPoint(tag, element){
      if (svgHTMLIntegrationPoints.indexOf(tag.tagName) !== -1) {
        element.isHTMLIntegrationPoint = true;
      }
    }


    // Except for `mustache`, all tokens are only allowed outside of
    // a start or end tag.
    var tokenHandlers = {

      Chars: function(token) {
        var current = this.currentElement();
        var text = new TextNode(token.chars);
        appendChild(current, text);
      },

      StartTag: function(tag) {
        var element = new ElementNode(tag.tagName, tag.attributes, tag.helpers || [], []);
        applyNamespace(tag, element, this.currentElement());
        applyHTMLIntegrationPoint(tag, element);
        this.elementStack.push(element);
        if (voidMap.hasOwnProperty(tag.tagName) || tag.selfClosing) {
          tokenHandlers.EndTag.call(this, tag);
        }
      },

      block: function(block) {
        if (this.tokenizer.state !== 'data') {
          throw new Error("A block may only be used inside an HTML element or another block.");
        }
      },

      mustache: function(mustache) {
        var state = this.tokenizer.state;
        var token = this.tokenizer.token;

        switch(states[state]) {
          case "before-attr":
            this.tokenizer.state = 'attributeValueUnquoted';
            token.addToAttributeValue(mustache);
            return;
          case "attr":
            token.addToAttributeValue(mustache);
            return;
          case "in-tag":
            token.addTagHelper(mustache);
            return;
          default:
            appendChild(this.currentElement(), mustache);
        }
      },

      EndTag: function(tag) {
        var element = this.elementStack.pop();
        var parent = this.currentElement();

        if (element.tag !== tag.tagName) {
          throw new Error("Closing tag " + tag.tagName + " did not match last open tag " + element.tag);
        }

        if (element.tag.indexOf("-") === -1) {
          appendChild(parent, element);
        } else {
          var program = new ProgramNode(element.children, { left: false, right: false });
          postprocessProgram(program);
          var component = new ComponentNode(element.tag, element.attributes, program);
          appendChild(parent, component);
        }

      }

    };

    __exports__["default"] = tokenHandlers;
  });
define("htmlbars-compiler/html-parser/tokens", 
  ["simple-html-tokenizer","../ast","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Chars = __dependency1__.Chars;
    var StartTag = __dependency1__.StartTag;
    var EndTag = __dependency1__.EndTag;
    var AttrNode = __dependency2__.AttrNode;
    var TextNode = __dependency2__.TextNode;
    var MustacheNode = __dependency2__.MustacheNode;
    var StringNode = __dependency2__.StringNode;
    var IdNode = __dependency2__.IdNode;

    StartTag.prototype.startAttribute = function(char) {
      this.finalizeAttributeValue();
      this.currentAttribute = new AttrNode(char.toLowerCase(), []);
      this.attributes.push(this.currentAttribute);
    };

    StartTag.prototype.addToAttributeName = function(char) {
      this.currentAttribute.name += char;
    };

    StartTag.prototype.addToAttributeValue = function(char) {
      var value = this.currentAttribute.value;

      if (char.type === 'mustache') {
        value.push(char);
      } else {
        if (value.length > 0 && value[value.length - 1].type === 'text') {
          value[value.length - 1].chars += char;
        } else {
          value.push(new TextNode(char));
        }
      }
    };

    StartTag.prototype.finalize = function() {
      this.finalizeAttributeValue();
      delete this.currentAttribute;
      return this;
    };

    StartTag.prototype.finalizeAttributeValue = function() {
      var attr = this.currentAttribute;

      if (!attr) return;

      if (attr.value.length === 1) {
        // Unwrap a single TextNode or MustacheNode
        attr.value = attr.value[0];
      } else {
        // If the attr value has multiple parts combine them into
        // a single MustacheNode with the concat helper
        var params = [ new IdNode([{ part: 'concat' }]) ];

        for (var i = 0; i < attr.value.length; i++) {
          var part = attr.value[i];
          if (part.type === 'text') {
            params.push(new StringNode(part.chars));
          } else if (part.type === 'mustache') {
            var sexpr = part.sexpr;
            delete sexpr.isRoot;

            if (sexpr.isHelper) {
              sexpr.isHelper = true;
            }

            params.push(sexpr);
          }
        }

        attr.value = new MustacheNode(params, undefined, true, { left: false, right: false });
      }
    };

    StartTag.prototype.addTagHelper = function(helper) {
      var helpers = this.helpers = this.helpers || [];
      helpers.push(helper);
    };

    __exports__.Chars = Chars;
    __exports__.StartTag = StartTag;
    __exports__.EndTag = EndTag;
  });
define("htmlbars-compiler/main", 
  [],
  function() {
    "use strict";
    // Stub
  });
define("htmlbars-compiler/parser", 
  ["handlebars","simple-html-tokenizer","./html-parser/node-handlers","./html-parser/token-handlers","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var Handlebars = __dependency1__["default"];
    var Tokenizer = __dependency2__.Tokenizer;
    var nodeHandlers = __dependency3__["default"];
    var tokenHandlers = __dependency4__["default"];

    function preprocess(html, options) {
      var ast = Handlebars.parse(html);
      var combined = new HTMLProcessor().acceptNode(ast);
      return combined;
    }

    __exports__.preprocess = preprocess;function HTMLProcessor() {
      this.elementStack = [];
      this.tokenizer = new Tokenizer('');
      this.nodeHandlers = nodeHandlers;
      this.tokenHandlers = tokenHandlers;
    }

    HTMLProcessor.prototype.acceptNode = function(node) {
      return this.nodeHandlers[node.type].call(this, node);
    };

    HTMLProcessor.prototype.acceptToken = function(token) {
      if (token) {
        return this.tokenHandlers[token.type].call(this, token);
      }
    };

    HTMLProcessor.prototype.currentElement = function() {
      return this.elementStack[this.elementStack.length - 1];
    };
  });
define("htmlbars-runtime/hooks", 
  ["./utils","handlebars/safe-string","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var merge = __dependency1__.merge;
    var SafeString = __dependency2__["default"];

    function content(morph, helperName, context, params, options, env) {
      var value, helper = this.lookupHelper(helperName, context, options);
      if (helper) {
        value = helper(context, params, options, env);
      } else {
        value = this.simple(context, helperName, options);
      }
      if (!options.escaped) {
        value = new SafeString(value);
      }
      morph.update(value);
    }

    __exports__.content = content;function webComponent(morph, tagName, context, options, env) {
      var value, helper = this.lookupHelper(tagName, context, options);
      if (helper) {
        value = helper(context, null, options, env);
      } else {
        value = this.webComponentFallback(morph, tagName, context, options, env);
      }
      morph.update(value);
    }

    __exports__.webComponent = webComponent;function webComponentFallback(morph, tagName, context, options, env) {
      var element = env.dom.createElement(tagName);
      var hash = options.hash, hashTypes = options.hashTypes;

      for (var name in hash) {
        if (hashTypes[name] === 'id') {
          element.setAttribute(name, this.simple(context, hash[name], options));
        } else {
          element.setAttribute(name, hash[name]);
        }
      }
      element.appendChild(options.render(context, env));
      return element;
    }

    __exports__.webComponentFallback = webComponentFallback;function element(domElement, helperName, context, params, options) {
      var helper = this.lookupHelper(helperName, context, options);
      if (helper) {
        options.element = domElement;
        helper(context, params, options);
      }
    }

    __exports__.element = element;function attribute(context, params, options) {
      options.element.setAttribute(params[0], params[1]);
    }

    __exports__.attribute = attribute;function concat(context, params, options) {
      var value = "";
      for (var i = 0, l = params.length; i < l; i++) {
        if (options.types[i] === 'id') {
          value += this.simple(context, params[i], options);
        } else {
          value += params[i];
        }
      }
      return value;
    }

    __exports__.concat = concat;function subexpr(helperName, context, params, options) {
      var helper = this.lookupHelper(helperName, context, options);
      if (helper) {
        return helper(context, params, options);
      } else {
        return this.simple(context, helperName, options);
      }
    }

    __exports__.subexpr = subexpr;function lookupHelper(helperName, context, options) {
      if (helperName === 'attribute') {
        return this.attribute;
      } else if (helperName === 'concat') {
        return this.concat;
      }
    }

    __exports__.lookupHelper = lookupHelper;function simple(context, name, options) {
      return context[name];
    }

    __exports__.simple = simple;function hydrationHooks(extensions) {
      var base = {
        content: content,
        webComponent: webComponent,
        webComponentFallback: webComponentFallback,
        element: element,
        attribute: attribute,
        concat: concat,
        subexpr: subexpr,
        lookupHelper: lookupHelper,
        simple: simple
      };

      return extensions ? merge(extensions, base) : base;
    }

    __exports__.hydrationHooks = hydrationHooks;
  });
define("htmlbars-runtime/main", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var hooks = require('htmlbars-runtime/hooks');

    var hooks;
    __exports__.hooks = hooks;
  });
define("htmlbars-runtime/utils", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function merge(options, defaults) {
      for (var prop in defaults) {
        if (options.hasOwnProperty(prop)) { continue; }
        options[prop] = defaults[prop];
      }
      return options;
    }

    __exports__.merge = merge;
  });
define("simple-html-tokenizer/char-refs", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var namedCodepoints = {
      AElig: [198],
      AMP: [38],
      Aacute: [193],
      Abreve: [258],
      Acirc: [194],
      Acy: [1040],
      Afr: [120068],
      Agrave: [192],
      Alpha: [913],
      Amacr: [256],
      And: [10835],
      Aogon: [260],
      Aopf: [120120],
      ApplyFunction: [8289],
      Aring: [197],
      Ascr: [119964],
      Assign: [8788],
      Atilde: [195],
      Auml: [196],
      Backslash: [8726],
      Barv: [10983],
      Barwed: [8966],
      Bcy: [1041],
      Because: [8757],
      Bernoullis: [8492],
      Beta: [914],
      Bfr: [120069],
      Bopf: [120121],
      Breve: [728],
      Bscr: [8492],
      Bumpeq: [8782],
      CHcy: [1063],
      COPY: [169],
      Cacute: [262],
      Cap: [8914],
      CapitalDifferentialD: [8517],
      Cayleys: [8493],
      Ccaron: [268],
      Ccedil: [199],
      Ccirc: [264],
      Cconint: [8752],
      Cdot: [266],
      Cedilla: [184],
      CenterDot: [183],
      Cfr: [8493],
      Chi: [935],
      CircleDot: [8857],
      CircleMinus: [8854],
      CirclePlus: [8853],
      CircleTimes: [8855],
      ClockwiseContourIntegral: [8754],
      CloseCurlyDoubleQuote: [8221],
      CloseCurlyQuote: [8217],
      Colon: [8759],
      Colone: [10868],
      Congruent: [8801],
      Conint: [8751],
      ContourIntegral: [8750],
      Copf: [8450],
      Coproduct: [8720],
      CounterClockwiseContourIntegral: [8755],
      Cross: [10799],
      Cscr: [119966],
      Cup: [8915],
      CupCap: [8781],
      DD: [8517],
      DDotrahd: [10513],
      DJcy: [1026],
      DScy: [1029],
      DZcy: [1039],
      Dagger: [8225],
      Darr: [8609],
      Dashv: [10980],
      Dcaron: [270],
      Dcy: [1044],
      Del: [8711],
      Delta: [916],
      Dfr: [120071],
      DiacriticalAcute: [180],
      DiacriticalDot: [729],
      DiacriticalDoubleAcute: [733],
      DiacriticalGrave: [96],
      DiacriticalTilde: [732],
      Diamond: [8900],
      DifferentialD: [8518],
      Dopf: [120123],
      Dot: [168],
      DotDot: [8412],
      DotEqual: [8784],
      DoubleContourIntegral: [8751],
      DoubleDot: [168],
      DoubleDownArrow: [8659],
      DoubleLeftArrow: [8656],
      DoubleLeftRightArrow: [8660],
      DoubleLeftTee: [10980],
      DoubleLongLeftArrow: [10232],
      DoubleLongLeftRightArrow: [10234],
      DoubleLongRightArrow: [10233],
      DoubleRightArrow: [8658],
      DoubleRightTee: [8872],
      DoubleUpArrow: [8657],
      DoubleUpDownArrow: [8661],
      DoubleVerticalBar: [8741],
      DownArrow: [8595],
      DownArrowBar: [10515],
      DownArrowUpArrow: [8693],
      DownBreve: [785],
      DownLeftRightVector: [10576],
      DownLeftTeeVector: [10590],
      DownLeftVector: [8637],
      DownLeftVectorBar: [10582],
      DownRightTeeVector: [10591],
      DownRightVector: [8641],
      DownRightVectorBar: [10583],
      DownTee: [8868],
      DownTeeArrow: [8615],
      Downarrow: [8659],
      Dscr: [119967],
      Dstrok: [272],
      ENG: [330],
      ETH: [208],
      Eacute: [201],
      Ecaron: [282],
      Ecirc: [202],
      Ecy: [1069],
      Edot: [278],
      Efr: [120072],
      Egrave: [200],
      Element: [8712],
      Emacr: [274],
      EmptySmallSquare: [9723],
      EmptyVerySmallSquare: [9643],
      Eogon: [280],
      Eopf: [120124],
      Epsilon: [917],
      Equal: [10869],
      EqualTilde: [8770],
      Equilibrium: [8652],
      Escr: [8496],
      Esim: [10867],
      Eta: [919],
      Euml: [203],
      Exists: [8707],
      ExponentialE: [8519],
      Fcy: [1060],
      Ffr: [120073],
      FilledSmallSquare: [9724],
      FilledVerySmallSquare: [9642],
      Fopf: [120125],
      ForAll: [8704],
      Fouriertrf: [8497],
      Fscr: [8497],
      GJcy: [1027],
      GT: [62],
      Gamma: [915],
      Gammad: [988],
      Gbreve: [286],
      Gcedil: [290],
      Gcirc: [284],
      Gcy: [1043],
      Gdot: [288],
      Gfr: [120074],
      Gg: [8921],
      Gopf: [120126],
      GreaterEqual: [8805],
      GreaterEqualLess: [8923],
      GreaterFullEqual: [8807],
      GreaterGreater: [10914],
      GreaterLess: [8823],
      GreaterSlantEqual: [10878],
      GreaterTilde: [8819],
      Gscr: [119970],
      Gt: [8811],
      HARDcy: [1066],
      Hacek: [711],
      Hat: [94],
      Hcirc: [292],
      Hfr: [8460],
      HilbertSpace: [8459],
      Hopf: [8461],
      HorizontalLine: [9472],
      Hscr: [8459],
      Hstrok: [294],
      HumpDownHump: [8782],
      HumpEqual: [8783],
      IEcy: [1045],
      IJlig: [306],
      IOcy: [1025],
      Iacute: [205],
      Icirc: [206],
      Icy: [1048],
      Idot: [304],
      Ifr: [8465],
      Igrave: [204],
      Im: [8465],
      Imacr: [298],
      ImaginaryI: [8520],
      Implies: [8658],
      Int: [8748],
      Integral: [8747],
      Intersection: [8898],
      InvisibleComma: [8291],
      InvisibleTimes: [8290],
      Iogon: [302],
      Iopf: [120128],
      Iota: [921],
      Iscr: [8464],
      Itilde: [296],
      Iukcy: [1030],
      Iuml: [207],
      Jcirc: [308],
      Jcy: [1049],
      Jfr: [120077],
      Jopf: [120129],
      Jscr: [119973],
      Jsercy: [1032],
      Jukcy: [1028],
      KHcy: [1061],
      KJcy: [1036],
      Kappa: [922],
      Kcedil: [310],
      Kcy: [1050],
      Kfr: [120078],
      Kopf: [120130],
      Kscr: [119974],
      LJcy: [1033],
      LT: [60],
      Lacute: [313],
      Lambda: [923],
      Lang: [10218],
      Laplacetrf: [8466],
      Larr: [8606],
      Lcaron: [317],
      Lcedil: [315],
      Lcy: [1051],
      LeftAngleBracket: [10216],
      LeftArrow: [8592],
      LeftArrowBar: [8676],
      LeftArrowRightArrow: [8646],
      LeftCeiling: [8968],
      LeftDoubleBracket: [10214],
      LeftDownTeeVector: [10593],
      LeftDownVector: [8643],
      LeftDownVectorBar: [10585],
      LeftFloor: [8970],
      LeftRightArrow: [8596],
      LeftRightVector: [10574],
      LeftTee: [8867],
      LeftTeeArrow: [8612],
      LeftTeeVector: [10586],
      LeftTriangle: [8882],
      LeftTriangleBar: [10703],
      LeftTriangleEqual: [8884],
      LeftUpDownVector: [10577],
      LeftUpTeeVector: [10592],
      LeftUpVector: [8639],
      LeftUpVectorBar: [10584],
      LeftVector: [8636],
      LeftVectorBar: [10578],
      Leftarrow: [8656],
      Leftrightarrow: [8660],
      LessEqualGreater: [8922],
      LessFullEqual: [8806],
      LessGreater: [8822],
      LessLess: [10913],
      LessSlantEqual: [10877],
      LessTilde: [8818],
      Lfr: [120079],
      Ll: [8920],
      Lleftarrow: [8666],
      Lmidot: [319],
      LongLeftArrow: [10229],
      LongLeftRightArrow: [10231],
      LongRightArrow: [10230],
      Longleftarrow: [10232],
      Longleftrightarrow: [10234],
      Longrightarrow: [10233],
      Lopf: [120131],
      LowerLeftArrow: [8601],
      LowerRightArrow: [8600],
      Lscr: [8466],
      Lsh: [8624],
      Lstrok: [321],
      Lt: [8810],
      Map: [10501],
      Mcy: [1052],
      MediumSpace: [8287],
      Mellintrf: [8499],
      Mfr: [120080],
      MinusPlus: [8723],
      Mopf: [120132],
      Mscr: [8499],
      Mu: [924],
      NJcy: [1034],
      Nacute: [323],
      Ncaron: [327],
      Ncedil: [325],
      Ncy: [1053],
      NegativeMediumSpace: [8203],
      NegativeThickSpace: [8203],
      NegativeThinSpace: [8203],
      NegativeVeryThinSpace: [8203],
      NestedGreaterGreater: [8811],
      NestedLessLess: [8810],
      NewLine: [10],
      Nfr: [120081],
      NoBreak: [8288],
      NonBreakingSpace: [160],
      Nopf: [8469],
      Not: [10988],
      NotCongruent: [8802],
      NotCupCap: [8813],
      NotDoubleVerticalBar: [8742],
      NotElement: [8713],
      NotEqual: [8800],
      NotEqualTilde: [8770, 824],
      NotExists: [8708],
      NotGreater: [8815],
      NotGreaterEqual: [8817],
      NotGreaterFullEqual: [8807, 824],
      NotGreaterGreater: [8811, 824],
      NotGreaterLess: [8825],
      NotGreaterSlantEqual: [10878, 824],
      NotGreaterTilde: [8821],
      NotHumpDownHump: [8782, 824],
      NotHumpEqual: [8783, 824],
      NotLeftTriangle: [8938],
      NotLeftTriangleBar: [10703, 824],
      NotLeftTriangleEqual: [8940],
      NotLess: [8814],
      NotLessEqual: [8816],
      NotLessGreater: [8824],
      NotLessLess: [8810, 824],
      NotLessSlantEqual: [10877, 824],
      NotLessTilde: [8820],
      NotNestedGreaterGreater: [10914, 824],
      NotNestedLessLess: [10913, 824],
      NotPrecedes: [8832],
      NotPrecedesEqual: [10927, 824],
      NotPrecedesSlantEqual: [8928],
      NotReverseElement: [8716],
      NotRightTriangle: [8939],
      NotRightTriangleBar: [10704, 824],
      NotRightTriangleEqual: [8941],
      NotSquareSubset: [8847, 824],
      NotSquareSubsetEqual: [8930],
      NotSquareSuperset: [8848, 824],
      NotSquareSupersetEqual: [8931],
      NotSubset: [8834, 8402],
      NotSubsetEqual: [8840],
      NotSucceeds: [8833],
      NotSucceedsEqual: [10928, 824],
      NotSucceedsSlantEqual: [8929],
      NotSucceedsTilde: [8831, 824],
      NotSuperset: [8835, 8402],
      NotSupersetEqual: [8841],
      NotTilde: [8769],
      NotTildeEqual: [8772],
      NotTildeFullEqual: [8775],
      NotTildeTilde: [8777],
      NotVerticalBar: [8740],
      Nscr: [119977],
      Ntilde: [209],
      Nu: [925],
      OElig: [338],
      Oacute: [211],
      Ocirc: [212],
      Ocy: [1054],
      Odblac: [336],
      Ofr: [120082],
      Ograve: [210],
      Omacr: [332],
      Omega: [937],
      Omicron: [927],
      Oopf: [120134],
      OpenCurlyDoubleQuote: [8220],
      OpenCurlyQuote: [8216],
      Or: [10836],
      Oscr: [119978],
      Oslash: [216],
      Otilde: [213],
      Otimes: [10807],
      Ouml: [214],
      OverBar: [8254],
      OverBrace: [9182],
      OverBracket: [9140],
      OverParenthesis: [9180],
      PartialD: [8706],
      Pcy: [1055],
      Pfr: [120083],
      Phi: [934],
      Pi: [928],
      PlusMinus: [177],
      Poincareplane: [8460],
      Popf: [8473],
      Pr: [10939],
      Precedes: [8826],
      PrecedesEqual: [10927],
      PrecedesSlantEqual: [8828],
      PrecedesTilde: [8830],
      Prime: [8243],
      Product: [8719],
      Proportion: [8759],
      Proportional: [8733],
      Pscr: [119979],
      Psi: [936],
      QUOT: [34],
      Qfr: [120084],
      Qopf: [8474],
      Qscr: [119980],
      RBarr: [10512],
      REG: [174],
      Racute: [340],
      Rang: [10219],
      Rarr: [8608],
      Rarrtl: [10518],
      Rcaron: [344],
      Rcedil: [342],
      Rcy: [1056],
      Re: [8476],
      ReverseElement: [8715],
      ReverseEquilibrium: [8651],
      ReverseUpEquilibrium: [10607],
      Rfr: [8476],
      Rho: [929],
      RightAngleBracket: [10217],
      RightArrow: [8594],
      RightArrowBar: [8677],
      RightArrowLeftArrow: [8644],
      RightCeiling: [8969],
      RightDoubleBracket: [10215],
      RightDownTeeVector: [10589],
      RightDownVector: [8642],
      RightDownVectorBar: [10581],
      RightFloor: [8971],
      RightTee: [8866],
      RightTeeArrow: [8614],
      RightTeeVector: [10587],
      RightTriangle: [8883],
      RightTriangleBar: [10704],
      RightTriangleEqual: [8885],
      RightUpDownVector: [10575],
      RightUpTeeVector: [10588],
      RightUpVector: [8638],
      RightUpVectorBar: [10580],
      RightVector: [8640],
      RightVectorBar: [10579],
      Rightarrow: [8658],
      Ropf: [8477],
      RoundImplies: [10608],
      Rrightarrow: [8667],
      Rscr: [8475],
      Rsh: [8625],
      RuleDelayed: [10740],
      SHCHcy: [1065],
      SHcy: [1064],
      SOFTcy: [1068],
      Sacute: [346],
      Sc: [10940],
      Scaron: [352],
      Scedil: [350],
      Scirc: [348],
      Scy: [1057],
      Sfr: [120086],
      ShortDownArrow: [8595],
      ShortLeftArrow: [8592],
      ShortRightArrow: [8594],
      ShortUpArrow: [8593],
      Sigma: [931],
      SmallCircle: [8728],
      Sopf: [120138],
      Sqrt: [8730],
      Square: [9633],
      SquareIntersection: [8851],
      SquareSubset: [8847],
      SquareSubsetEqual: [8849],
      SquareSuperset: [8848],
      SquareSupersetEqual: [8850],
      SquareUnion: [8852],
      Sscr: [119982],
      Star: [8902],
      Sub: [8912],
      Subset: [8912],
      SubsetEqual: [8838],
      Succeeds: [8827],
      SucceedsEqual: [10928],
      SucceedsSlantEqual: [8829],
      SucceedsTilde: [8831],
      SuchThat: [8715],
      Sum: [8721],
      Sup: [8913],
      Superset: [8835],
      SupersetEqual: [8839],
      Supset: [8913],
      THORN: [222],
      TRADE: [8482],
      TSHcy: [1035],
      TScy: [1062],
      Tab: [9],
      Tau: [932],
      Tcaron: [356],
      Tcedil: [354],
      Tcy: [1058],
      Tfr: [120087],
      Therefore: [8756],
      Theta: [920],
      ThickSpace: [8287, 8202],
      ThinSpace: [8201],
      Tilde: [8764],
      TildeEqual: [8771],
      TildeFullEqual: [8773],
      TildeTilde: [8776],
      Topf: [120139],
      TripleDot: [8411],
      Tscr: [119983],
      Tstrok: [358],
      Uacute: [218],
      Uarr: [8607],
      Uarrocir: [10569],
      Ubrcy: [1038],
      Ubreve: [364],
      Ucirc: [219],
      Ucy: [1059],
      Udblac: [368],
      Ufr: [120088],
      Ugrave: [217],
      Umacr: [362],
      UnderBar: [95],
      UnderBrace: [9183],
      UnderBracket: [9141],
      UnderParenthesis: [9181],
      Union: [8899],
      UnionPlus: [8846],
      Uogon: [370],
      Uopf: [120140],
      UpArrow: [8593],
      UpArrowBar: [10514],
      UpArrowDownArrow: [8645],
      UpDownArrow: [8597],
      UpEquilibrium: [10606],
      UpTee: [8869],
      UpTeeArrow: [8613],
      Uparrow: [8657],
      Updownarrow: [8661],
      UpperLeftArrow: [8598],
      UpperRightArrow: [8599],
      Upsi: [978],
      Upsilon: [933],
      Uring: [366],
      Uscr: [119984],
      Utilde: [360],
      Uuml: [220],
      VDash: [8875],
      Vbar: [10987],
      Vcy: [1042],
      Vdash: [8873],
      Vdashl: [10982],
      Vee: [8897],
      Verbar: [8214],
      Vert: [8214],
      VerticalBar: [8739],
      VerticalLine: [124],
      VerticalSeparator: [10072],
      VerticalTilde: [8768],
      VeryThinSpace: [8202],
      Vfr: [120089],
      Vopf: [120141],
      Vscr: [119985],
      Vvdash: [8874],
      Wcirc: [372],
      Wedge: [8896],
      Wfr: [120090],
      Wopf: [120142],
      Wscr: [119986],
      Xfr: [120091],
      Xi: [926],
      Xopf: [120143],
      Xscr: [119987],
      YAcy: [1071],
      YIcy: [1031],
      YUcy: [1070],
      Yacute: [221],
      Ycirc: [374],
      Ycy: [1067],
      Yfr: [120092],
      Yopf: [120144],
      Yscr: [119988],
      Yuml: [376],
      ZHcy: [1046],
      Zacute: [377],
      Zcaron: [381],
      Zcy: [1047],
      Zdot: [379],
      ZeroWidthSpace: [8203],
      Zeta: [918],
      Zfr: [8488],
      Zopf: [8484],
      Zscr: [119989],
      aacute: [225],
      abreve: [259],
      ac: [8766],
      acE: [8766, 819],
      acd: [8767],
      acirc: [226],
      acute: [180],
      acy: [1072],
      aelig: [230],
      af: [8289],
      afr: [120094],
      agrave: [224],
      alefsym: [8501],
      aleph: [8501],
      alpha: [945],
      amacr: [257],
      amalg: [10815],
      amp: [38],
      and: [8743],
      andand: [10837],
      andd: [10844],
      andslope: [10840],
      andv: [10842],
      ang: [8736],
      ange: [10660],
      angle: [8736],
      angmsd: [8737],
      angmsdaa: [10664],
      angmsdab: [10665],
      angmsdac: [10666],
      angmsdad: [10667],
      angmsdae: [10668],
      angmsdaf: [10669],
      angmsdag: [10670],
      angmsdah: [10671],
      angrt: [8735],
      angrtvb: [8894],
      angrtvbd: [10653],
      angsph: [8738],
      angst: [197],
      angzarr: [9084],
      aogon: [261],
      aopf: [120146],
      ap: [8776],
      apE: [10864],
      apacir: [10863],
      ape: [8778],
      apid: [8779],
      apos: [39],
      approx: [8776],
      approxeq: [8778],
      aring: [229],
      ascr: [119990],
      ast: [42],
      asymp: [8776],
      asympeq: [8781],
      atilde: [227],
      auml: [228],
      awconint: [8755],
      awint: [10769],
      bNot: [10989],
      backcong: [8780],
      backepsilon: [1014],
      backprime: [8245],
      backsim: [8765],
      backsimeq: [8909],
      barvee: [8893],
      barwed: [8965],
      barwedge: [8965],
      bbrk: [9141],
      bbrktbrk: [9142],
      bcong: [8780],
      bcy: [1073],
      bdquo: [8222],
      becaus: [8757],
      because: [8757],
      bemptyv: [10672],
      bepsi: [1014],
      bernou: [8492],
      beta: [946],
      beth: [8502],
      between: [8812],
      bfr: [120095],
      bigcap: [8898],
      bigcirc: [9711],
      bigcup: [8899],
      bigodot: [10752],
      bigoplus: [10753],
      bigotimes: [10754],
      bigsqcup: [10758],
      bigstar: [9733],
      bigtriangledown: [9661],
      bigtriangleup: [9651],
      biguplus: [10756],
      bigvee: [8897],
      bigwedge: [8896],
      bkarow: [10509],
      blacklozenge: [10731],
      blacksquare: [9642],
      blacktriangle: [9652],
      blacktriangledown: [9662],
      blacktriangleleft: [9666],
      blacktriangleright: [9656],
      blank: [9251],
      blk12: [9618],
      blk14: [9617],
      blk34: [9619],
      block: [9608],
      bne: [61, 8421],
      bnequiv: [8801, 8421],
      bnot: [8976],
      bopf: [120147],
      bot: [8869],
      bottom: [8869],
      bowtie: [8904],
      boxDL: [9559],
      boxDR: [9556],
      boxDl: [9558],
      boxDr: [9555],
      boxH: [9552],
      boxHD: [9574],
      boxHU: [9577],
      boxHd: [9572],
      boxHu: [9575],
      boxUL: [9565],
      boxUR: [9562],
      boxUl: [9564],
      boxUr: [9561],
      boxV: [9553],
      boxVH: [9580],
      boxVL: [9571],
      boxVR: [9568],
      boxVh: [9579],
      boxVl: [9570],
      boxVr: [9567],
      boxbox: [10697],
      boxdL: [9557],
      boxdR: [9554],
      boxdl: [9488],
      boxdr: [9484],
      boxh: [9472],
      boxhD: [9573],
      boxhU: [9576],
      boxhd: [9516],
      boxhu: [9524],
      boxminus: [8863],
      boxplus: [8862],
      boxtimes: [8864],
      boxuL: [9563],
      boxuR: [9560],
      boxul: [9496],
      boxur: [9492],
      boxv: [9474],
      boxvH: [9578],
      boxvL: [9569],
      boxvR: [9566],
      boxvh: [9532],
      boxvl: [9508],
      boxvr: [9500],
      bprime: [8245],
      breve: [728],
      brvbar: [166],
      bscr: [119991],
      bsemi: [8271],
      bsim: [8765],
      bsime: [8909],
      bsol: [92],
      bsolb: [10693],
      bsolhsub: [10184],
      bull: [8226],
      bullet: [8226],
      bump: [8782],
      bumpE: [10926],
      bumpe: [8783],
      bumpeq: [8783],
      cacute: [263],
      cap: [8745],
      capand: [10820],
      capbrcup: [10825],
      capcap: [10827],
      capcup: [10823],
      capdot: [10816],
      caps: [8745, 65024],
      caret: [8257],
      caron: [711],
      ccaps: [10829],
      ccaron: [269],
      ccedil: [231],
      ccirc: [265],
      ccups: [10828],
      ccupssm: [10832],
      cdot: [267],
      cedil: [184],
      cemptyv: [10674],
      cent: [162],
      centerdot: [183],
      cfr: [120096],
      chcy: [1095],
      check: [10003],
      checkmark: [10003],
      chi: [967],
      cir: [9675],
      cirE: [10691],
      circ: [710],
      circeq: [8791],
      circlearrowleft: [8634],
      circlearrowright: [8635],
      circledR: [174],
      circledS: [9416],
      circledast: [8859],
      circledcirc: [8858],
      circleddash: [8861],
      cire: [8791],
      cirfnint: [10768],
      cirmid: [10991],
      cirscir: [10690],
      clubs: [9827],
      clubsuit: [9827],
      colon: [58],
      colone: [8788],
      coloneq: [8788],
      comma: [44],
      commat: [64],
      comp: [8705],
      compfn: [8728],
      complement: [8705],
      complexes: [8450],
      cong: [8773],
      congdot: [10861],
      conint: [8750],
      copf: [120148],
      coprod: [8720],
      copy: [169],
      copysr: [8471],
      crarr: [8629],
      cross: [10007],
      cscr: [119992],
      csub: [10959],
      csube: [10961],
      csup: [10960],
      csupe: [10962],
      ctdot: [8943],
      cudarrl: [10552],
      cudarrr: [10549],
      cuepr: [8926],
      cuesc: [8927],
      cularr: [8630],
      cularrp: [10557],
      cup: [8746],
      cupbrcap: [10824],
      cupcap: [10822],
      cupcup: [10826],
      cupdot: [8845],
      cupor: [10821],
      cups: [8746, 65024],
      curarr: [8631],
      curarrm: [10556],
      curlyeqprec: [8926],
      curlyeqsucc: [8927],
      curlyvee: [8910],
      curlywedge: [8911],
      curren: [164],
      curvearrowleft: [8630],
      curvearrowright: [8631],
      cuvee: [8910],
      cuwed: [8911],
      cwconint: [8754],
      cwint: [8753],
      cylcty: [9005],
      dArr: [8659],
      dHar: [10597],
      dagger: [8224],
      daleth: [8504],
      darr: [8595],
      dash: [8208],
      dashv: [8867],
      dbkarow: [10511],
      dblac: [733],
      dcaron: [271],
      dcy: [1076],
      dd: [8518],
      ddagger: [8225],
      ddarr: [8650],
      ddotseq: [10871],
      deg: [176],
      delta: [948],
      demptyv: [10673],
      dfisht: [10623],
      dfr: [120097],
      dharl: [8643],
      dharr: [8642],
      diam: [8900],
      diamond: [8900],
      diamondsuit: [9830],
      diams: [9830],
      die: [168],
      digamma: [989],
      disin: [8946],
      div: [247],
      divide: [247],
      divideontimes: [8903],
      divonx: [8903],
      djcy: [1106],
      dlcorn: [8990],
      dlcrop: [8973],
      dollar: [36],
      dopf: [120149],
      dot: [729],
      doteq: [8784],
      doteqdot: [8785],
      dotminus: [8760],
      dotplus: [8724],
      dotsquare: [8865],
      doublebarwedge: [8966],
      downarrow: [8595],
      downdownarrows: [8650],
      downharpoonleft: [8643],
      downharpoonright: [8642],
      drbkarow: [10512],
      drcorn: [8991],
      drcrop: [8972],
      dscr: [119993],
      dscy: [1109],
      dsol: [10742],
      dstrok: [273],
      dtdot: [8945],
      dtri: [9663],
      dtrif: [9662],
      duarr: [8693],
      duhar: [10607],
      dwangle: [10662],
      dzcy: [1119],
      dzigrarr: [10239],
      eDDot: [10871],
      eDot: [8785],
      eacute: [233],
      easter: [10862],
      ecaron: [283],
      ecir: [8790],
      ecirc: [234],
      ecolon: [8789],
      ecy: [1101],
      edot: [279],
      ee: [8519],
      efDot: [8786],
      efr: [120098],
      eg: [10906],
      egrave: [232],
      egs: [10902],
      egsdot: [10904],
      el: [10905],
      elinters: [9191],
      ell: [8467],
      els: [10901],
      elsdot: [10903],
      emacr: [275],
      empty: [8709],
      emptyset: [8709],
      emptyv: [8709],
      emsp: [8195],
      emsp13: [8196],
      emsp14: [8197],
      eng: [331],
      ensp: [8194],
      eogon: [281],
      eopf: [120150],
      epar: [8917],
      eparsl: [10723],
      eplus: [10865],
      epsi: [949],
      epsilon: [949],
      epsiv: [1013],
      eqcirc: [8790],
      eqcolon: [8789],
      eqsim: [8770],
      eqslantgtr: [10902],
      eqslantless: [10901],
      equals: [61],
      equest: [8799],
      equiv: [8801],
      equivDD: [10872],
      eqvparsl: [10725],
      erDot: [8787],
      erarr: [10609],
      escr: [8495],
      esdot: [8784],
      esim: [8770],
      eta: [951],
      eth: [240],
      euml: [235],
      euro: [8364],
      excl: [33],
      exist: [8707],
      expectation: [8496],
      exponentiale: [8519],
      fallingdotseq: [8786],
      fcy: [1092],
      female: [9792],
      ffilig: [64259],
      fflig: [64256],
      ffllig: [64260],
      ffr: [120099],
      filig: [64257],
      fjlig: [102, 106],
      flat: [9837],
      fllig: [64258],
      fltns: [9649],
      fnof: [402],
      fopf: [120151],
      forall: [8704],
      fork: [8916],
      forkv: [10969],
      fpartint: [10765],
      frac12: [189],
      frac13: [8531],
      frac14: [188],
      frac15: [8533],
      frac16: [8537],
      frac18: [8539],
      frac23: [8532],
      frac25: [8534],
      frac34: [190],
      frac35: [8535],
      frac38: [8540],
      frac45: [8536],
      frac56: [8538],
      frac58: [8541],
      frac78: [8542],
      frasl: [8260],
      frown: [8994],
      fscr: [119995],
      gE: [8807],
      gEl: [10892],
      gacute: [501],
      gamma: [947],
      gammad: [989],
      gap: [10886],
      gbreve: [287],
      gcirc: [285],
      gcy: [1075],
      gdot: [289],
      ge: [8805],
      gel: [8923],
      geq: [8805],
      geqq: [8807],
      geqslant: [10878],
      ges: [10878],
      gescc: [10921],
      gesdot: [10880],
      gesdoto: [10882],
      gesdotol: [10884],
      gesl: [8923, 65024],
      gesles: [10900],
      gfr: [120100],
      gg: [8811],
      ggg: [8921],
      gimel: [8503],
      gjcy: [1107],
      gl: [8823],
      glE: [10898],
      gla: [10917],
      glj: [10916],
      gnE: [8809],
      gnap: [10890],
      gnapprox: [10890],
      gne: [10888],
      gneq: [10888],
      gneqq: [8809],
      gnsim: [8935],
      gopf: [120152],
      grave: [96],
      gscr: [8458],
      gsim: [8819],
      gsime: [10894],
      gsiml: [10896],
      gt: [62],
      gtcc: [10919],
      gtcir: [10874],
      gtdot: [8919],
      gtlPar: [10645],
      gtquest: [10876],
      gtrapprox: [10886],
      gtrarr: [10616],
      gtrdot: [8919],
      gtreqless: [8923],
      gtreqqless: [10892],
      gtrless: [8823],
      gtrsim: [8819],
      gvertneqq: [8809, 65024],
      gvnE: [8809, 65024],
      hArr: [8660],
      hairsp: [8202],
      half: [189],
      hamilt: [8459],
      hardcy: [1098],
      harr: [8596],
      harrcir: [10568],
      harrw: [8621],
      hbar: [8463],
      hcirc: [293],
      hearts: [9829],
      heartsuit: [9829],
      hellip: [8230],
      hercon: [8889],
      hfr: [120101],
      hksearow: [10533],
      hkswarow: [10534],
      hoarr: [8703],
      homtht: [8763],
      hookleftarrow: [8617],
      hookrightarrow: [8618],
      hopf: [120153],
      horbar: [8213],
      hscr: [119997],
      hslash: [8463],
      hstrok: [295],
      hybull: [8259],
      hyphen: [8208],
      iacute: [237],
      ic: [8291],
      icirc: [238],
      icy: [1080],
      iecy: [1077],
      iexcl: [161],
      iff: [8660],
      ifr: [120102],
      igrave: [236],
      ii: [8520],
      iiiint: [10764],
      iiint: [8749],
      iinfin: [10716],
      iiota: [8489],
      ijlig: [307],
      imacr: [299],
      image: [8465],
      imagline: [8464],
      imagpart: [8465],
      imath: [305],
      imof: [8887],
      imped: [437],
      in: [8712],
      incare: [8453],
      infin: [8734],
      infintie: [10717],
      inodot: [305],
      int: [8747],
      intcal: [8890],
      integers: [8484],
      intercal: [8890],
      intlarhk: [10775],
      intprod: [10812],
      iocy: [1105],
      iogon: [303],
      iopf: [120154],
      iota: [953],
      iprod: [10812],
      iquest: [191],
      iscr: [119998],
      isin: [8712],
      isinE: [8953],
      isindot: [8949],
      isins: [8948],
      isinsv: [8947],
      isinv: [8712],
      it: [8290],
      itilde: [297],
      iukcy: [1110],
      iuml: [239],
      jcirc: [309],
      jcy: [1081],
      jfr: [120103],
      jmath: [567],
      jopf: [120155],
      jscr: [119999],
      jsercy: [1112],
      jukcy: [1108],
      kappa: [954],
      kappav: [1008],
      kcedil: [311],
      kcy: [1082],
      kfr: [120104],
      kgreen: [312],
      khcy: [1093],
      kjcy: [1116],
      kopf: [120156],
      kscr: [120000],
      lAarr: [8666],
      lArr: [8656],
      lAtail: [10523],
      lBarr: [10510],
      lE: [8806],
      lEg: [10891],
      lHar: [10594],
      lacute: [314],
      laemptyv: [10676],
      lagran: [8466],
      lambda: [955],
      lang: [10216],
      langd: [10641],
      langle: [10216],
      lap: [10885],
      laquo: [171],
      larr: [8592],
      larrb: [8676],
      larrbfs: [10527],
      larrfs: [10525],
      larrhk: [8617],
      larrlp: [8619],
      larrpl: [10553],
      larrsim: [10611],
      larrtl: [8610],
      lat: [10923],
      latail: [10521],
      late: [10925],
      lates: [10925, 65024],
      lbarr: [10508],
      lbbrk: [10098],
      lbrace: [123],
      lbrack: [91],
      lbrke: [10635],
      lbrksld: [10639],
      lbrkslu: [10637],
      lcaron: [318],
      lcedil: [316],
      lceil: [8968],
      lcub: [123],
      lcy: [1083],
      ldca: [10550],
      ldquo: [8220],
      ldquor: [8222],
      ldrdhar: [10599],
      ldrushar: [10571],
      ldsh: [8626],
      le: [8804],
      leftarrow: [8592],
      leftarrowtail: [8610],
      leftharpoondown: [8637],
      leftharpoonup: [8636],
      leftleftarrows: [8647],
      leftrightarrow: [8596],
      leftrightarrows: [8646],
      leftrightharpoons: [8651],
      leftrightsquigarrow: [8621],
      leftthreetimes: [8907],
      leg: [8922],
      leq: [8804],
      leqq: [8806],
      leqslant: [10877],
      les: [10877],
      lescc: [10920],
      lesdot: [10879],
      lesdoto: [10881],
      lesdotor: [10883],
      lesg: [8922, 65024],
      lesges: [10899],
      lessapprox: [10885],
      lessdot: [8918],
      lesseqgtr: [8922],
      lesseqqgtr: [10891],
      lessgtr: [8822],
      lesssim: [8818],
      lfisht: [10620],
      lfloor: [8970],
      lfr: [120105],
      lg: [8822],
      lgE: [10897],
      lhard: [8637],
      lharu: [8636],
      lharul: [10602],
      lhblk: [9604],
      ljcy: [1113],
      ll: [8810],
      llarr: [8647],
      llcorner: [8990],
      llhard: [10603],
      lltri: [9722],
      lmidot: [320],
      lmoust: [9136],
      lmoustache: [9136],
      lnE: [8808],
      lnap: [10889],
      lnapprox: [10889],
      lne: [10887],
      lneq: [10887],
      lneqq: [8808],
      lnsim: [8934],
      loang: [10220],
      loarr: [8701],
      lobrk: [10214],
      longleftarrow: [10229],
      longleftrightarrow: [10231],
      longmapsto: [10236],
      longrightarrow: [10230],
      looparrowleft: [8619],
      looparrowright: [8620],
      lopar: [10629],
      lopf: [120157],
      loplus: [10797],
      lotimes: [10804],
      lowast: [8727],
      lowbar: [95],
      loz: [9674],
      lozenge: [9674],
      lozf: [10731],
      lpar: [40],
      lparlt: [10643],
      lrarr: [8646],
      lrcorner: [8991],
      lrhar: [8651],
      lrhard: [10605],
      lrm: [8206],
      lrtri: [8895],
      lsaquo: [8249],
      lscr: [120001],
      lsh: [8624],
      lsim: [8818],
      lsime: [10893],
      lsimg: [10895],
      lsqb: [91],
      lsquo: [8216],
      lsquor: [8218],
      lstrok: [322],
      lt: [60],
      ltcc: [10918],
      ltcir: [10873],
      ltdot: [8918],
      lthree: [8907],
      ltimes: [8905],
      ltlarr: [10614],
      ltquest: [10875],
      ltrPar: [10646],
      ltri: [9667],
      ltrie: [8884],
      ltrif: [9666],
      lurdshar: [10570],
      luruhar: [10598],
      lvertneqq: [8808, 65024],
      lvnE: [8808, 65024],
      mDDot: [8762],
      macr: [175],
      male: [9794],
      malt: [10016],
      maltese: [10016],
      map: [8614],
      mapsto: [8614],
      mapstodown: [8615],
      mapstoleft: [8612],
      mapstoup: [8613],
      marker: [9646],
      mcomma: [10793],
      mcy: [1084],
      mdash: [8212],
      measuredangle: [8737],
      mfr: [120106],
      mho: [8487],
      micro: [181],
      mid: [8739],
      midast: [42],
      midcir: [10992],
      middot: [183],
      minus: [8722],
      minusb: [8863],
      minusd: [8760],
      minusdu: [10794],
      mlcp: [10971],
      mldr: [8230],
      mnplus: [8723],
      models: [8871],
      mopf: [120158],
      mp: [8723],
      mscr: [120002],
      mstpos: [8766],
      mu: [956],
      multimap: [8888],
      mumap: [8888],
      nGg: [8921, 824],
      nGt: [8811, 8402],
      nGtv: [8811, 824],
      nLeftarrow: [8653],
      nLeftrightarrow: [8654],
      nLl: [8920, 824],
      nLt: [8810, 8402],
      nLtv: [8810, 824],
      nRightarrow: [8655],
      nVDash: [8879],
      nVdash: [8878],
      nabla: [8711],
      nacute: [324],
      nang: [8736, 8402],
      nap: [8777],
      napE: [10864, 824],
      napid: [8779, 824],
      napos: [329],
      napprox: [8777],
      natur: [9838],
      natural: [9838],
      naturals: [8469],
      nbsp: [160],
      nbump: [8782, 824],
      nbumpe: [8783, 824],
      ncap: [10819],
      ncaron: [328],
      ncedil: [326],
      ncong: [8775],
      ncongdot: [10861, 824],
      ncup: [10818],
      ncy: [1085],
      ndash: [8211],
      ne: [8800],
      neArr: [8663],
      nearhk: [10532],
      nearr: [8599],
      nearrow: [8599],
      nedot: [8784, 824],
      nequiv: [8802],
      nesear: [10536],
      nesim: [8770, 824],
      nexist: [8708],
      nexists: [8708],
      nfr: [120107],
      ngE: [8807, 824],
      nge: [8817],
      ngeq: [8817],
      ngeqq: [8807, 824],
      ngeqslant: [10878, 824],
      nges: [10878, 824],
      ngsim: [8821],
      ngt: [8815],
      ngtr: [8815],
      nhArr: [8654],
      nharr: [8622],
      nhpar: [10994],
      ni: [8715],
      nis: [8956],
      nisd: [8954],
      niv: [8715],
      njcy: [1114],
      nlArr: [8653],
      nlE: [8806, 824],
      nlarr: [8602],
      nldr: [8229],
      nle: [8816],
      nleftarrow: [8602],
      nleftrightarrow: [8622],
      nleq: [8816],
      nleqq: [8806, 824],
      nleqslant: [10877, 824],
      nles: [10877, 824],
      nless: [8814],
      nlsim: [8820],
      nlt: [8814],
      nltri: [8938],
      nltrie: [8940],
      nmid: [8740],
      nopf: [120159],
      not: [172],
      notin: [8713],
      notinE: [8953, 824],
      notindot: [8949, 824],
      notinva: [8713],
      notinvb: [8951],
      notinvc: [8950],
      notni: [8716],
      notniva: [8716],
      notnivb: [8958],
      notnivc: [8957],
      npar: [8742],
      nparallel: [8742],
      nparsl: [11005, 8421],
      npart: [8706, 824],
      npolint: [10772],
      npr: [8832],
      nprcue: [8928],
      npre: [10927, 824],
      nprec: [8832],
      npreceq: [10927, 824],
      nrArr: [8655],
      nrarr: [8603],
      nrarrc: [10547, 824],
      nrarrw: [8605, 824],
      nrightarrow: [8603],
      nrtri: [8939],
      nrtrie: [8941],
      nsc: [8833],
      nsccue: [8929],
      nsce: [10928, 824],
      nscr: [120003],
      nshortmid: [8740],
      nshortparallel: [8742],
      nsim: [8769],
      nsime: [8772],
      nsimeq: [8772],
      nsmid: [8740],
      nspar: [8742],
      nsqsube: [8930],
      nsqsupe: [8931],
      nsub: [8836],
      nsubE: [10949, 824],
      nsube: [8840],
      nsubset: [8834, 8402],
      nsubseteq: [8840],
      nsubseteqq: [10949, 824],
      nsucc: [8833],
      nsucceq: [10928, 824],
      nsup: [8837],
      nsupE: [10950, 824],
      nsupe: [8841],
      nsupset: [8835, 8402],
      nsupseteq: [8841],
      nsupseteqq: [10950, 824],
      ntgl: [8825],
      ntilde: [241],
      ntlg: [8824],
      ntriangleleft: [8938],
      ntrianglelefteq: [8940],
      ntriangleright: [8939],
      ntrianglerighteq: [8941],
      nu: [957],
      num: [35],
      numero: [8470],
      numsp: [8199],
      nvDash: [8877],
      nvHarr: [10500],
      nvap: [8781, 8402],
      nvdash: [8876],
      nvge: [8805, 8402],
      nvgt: [62, 8402],
      nvinfin: [10718],
      nvlArr: [10498],
      nvle: [8804, 8402],
      nvlt: [60, 8402],
      nvltrie: [8884, 8402],
      nvrArr: [10499],
      nvrtrie: [8885, 8402],
      nvsim: [8764, 8402],
      nwArr: [8662],
      nwarhk: [10531],
      nwarr: [8598],
      nwarrow: [8598],
      nwnear: [10535],
      oS: [9416],
      oacute: [243],
      oast: [8859],
      ocir: [8858],
      ocirc: [244],
      ocy: [1086],
      odash: [8861],
      odblac: [337],
      odiv: [10808],
      odot: [8857],
      odsold: [10684],
      oelig: [339],
      ofcir: [10687],
      ofr: [120108],
      ogon: [731],
      ograve: [242],
      ogt: [10689],
      ohbar: [10677],
      ohm: [937],
      oint: [8750],
      olarr: [8634],
      olcir: [10686],
      olcross: [10683],
      oline: [8254],
      olt: [10688],
      omacr: [333],
      omega: [969],
      omicron: [959],
      omid: [10678],
      ominus: [8854],
      oopf: [120160],
      opar: [10679],
      operp: [10681],
      oplus: [8853],
      or: [8744],
      orarr: [8635],
      ord: [10845],
      order: [8500],
      orderof: [8500],
      ordf: [170],
      ordm: [186],
      origof: [8886],
      oror: [10838],
      orslope: [10839],
      orv: [10843],
      oscr: [8500],
      oslash: [248],
      osol: [8856],
      otilde: [245],
      otimes: [8855],
      otimesas: [10806],
      ouml: [246],
      ovbar: [9021],
      par: [8741],
      para: [182],
      parallel: [8741],
      parsim: [10995],
      parsl: [11005],
      part: [8706],
      pcy: [1087],
      percnt: [37],
      period: [46],
      permil: [8240],
      perp: [8869],
      pertenk: [8241],
      pfr: [120109],
      phi: [966],
      phiv: [981],
      phmmat: [8499],
      phone: [9742],
      pi: [960],
      pitchfork: [8916],
      piv: [982],
      planck: [8463],
      planckh: [8462],
      plankv: [8463],
      plus: [43],
      plusacir: [10787],
      plusb: [8862],
      pluscir: [10786],
      plusdo: [8724],
      plusdu: [10789],
      pluse: [10866],
      plusmn: [177],
      plussim: [10790],
      plustwo: [10791],
      pm: [177],
      pointint: [10773],
      popf: [120161],
      pound: [163],
      pr: [8826],
      prE: [10931],
      prap: [10935],
      prcue: [8828],
      pre: [10927],
      prec: [8826],
      precapprox: [10935],
      preccurlyeq: [8828],
      preceq: [10927],
      precnapprox: [10937],
      precneqq: [10933],
      precnsim: [8936],
      precsim: [8830],
      prime: [8242],
      primes: [8473],
      prnE: [10933],
      prnap: [10937],
      prnsim: [8936],
      prod: [8719],
      profalar: [9006],
      profline: [8978],
      profsurf: [8979],
      prop: [8733],
      propto: [8733],
      prsim: [8830],
      prurel: [8880],
      pscr: [120005],
      psi: [968],
      puncsp: [8200],
      qfr: [120110],
      qint: [10764],
      qopf: [120162],
      qprime: [8279],
      qscr: [120006],
      quaternions: [8461],
      quatint: [10774],
      quest: [63],
      questeq: [8799],
      quot: [34],
      rAarr: [8667],
      rArr: [8658],
      rAtail: [10524],
      rBarr: [10511],
      rHar: [10596],
      race: [8765, 817],
      racute: [341],
      radic: [8730],
      raemptyv: [10675],
      rang: [10217],
      rangd: [10642],
      range: [10661],
      rangle: [10217],
      raquo: [187],
      rarr: [8594],
      rarrap: [10613],
      rarrb: [8677],
      rarrbfs: [10528],
      rarrc: [10547],
      rarrfs: [10526],
      rarrhk: [8618],
      rarrlp: [8620],
      rarrpl: [10565],
      rarrsim: [10612],
      rarrtl: [8611],
      rarrw: [8605],
      ratail: [10522],
      ratio: [8758],
      rationals: [8474],
      rbarr: [10509],
      rbbrk: [10099],
      rbrace: [125],
      rbrack: [93],
      rbrke: [10636],
      rbrksld: [10638],
      rbrkslu: [10640],
      rcaron: [345],
      rcedil: [343],
      rceil: [8969],
      rcub: [125],
      rcy: [1088],
      rdca: [10551],
      rdldhar: [10601],
      rdquo: [8221],
      rdquor: [8221],
      rdsh: [8627],
      real: [8476],
      realine: [8475],
      realpart: [8476],
      reals: [8477],
      rect: [9645],
      reg: [174],
      rfisht: [10621],
      rfloor: [8971],
      rfr: [120111],
      rhard: [8641],
      rharu: [8640],
      rharul: [10604],
      rho: [961],
      rhov: [1009],
      rightarrow: [8594],
      rightarrowtail: [8611],
      rightharpoondown: [8641],
      rightharpoonup: [8640],
      rightleftarrows: [8644],
      rightleftharpoons: [8652],
      rightrightarrows: [8649],
      rightsquigarrow: [8605],
      rightthreetimes: [8908],
      ring: [730],
      risingdotseq: [8787],
      rlarr: [8644],
      rlhar: [8652],
      rlm: [8207],
      rmoust: [9137],
      rmoustache: [9137],
      rnmid: [10990],
      roang: [10221],
      roarr: [8702],
      robrk: [10215],
      ropar: [10630],
      ropf: [120163],
      roplus: [10798],
      rotimes: [10805],
      rpar: [41],
      rpargt: [10644],
      rppolint: [10770],
      rrarr: [8649],
      rsaquo: [8250],
      rscr: [120007],
      rsh: [8625],
      rsqb: [93],
      rsquo: [8217],
      rsquor: [8217],
      rthree: [8908],
      rtimes: [8906],
      rtri: [9657],
      rtrie: [8885],
      rtrif: [9656],
      rtriltri: [10702],
      ruluhar: [10600],
      rx: [8478],
      sacute: [347],
      sbquo: [8218],
      sc: [8827],
      scE: [10932],
      scap: [10936],
      scaron: [353],
      sccue: [8829],
      sce: [10928],
      scedil: [351],
      scirc: [349],
      scnE: [10934],
      scnap: [10938],
      scnsim: [8937],
      scpolint: [10771],
      scsim: [8831],
      scy: [1089],
      sdot: [8901],
      sdotb: [8865],
      sdote: [10854],
      seArr: [8664],
      searhk: [10533],
      searr: [8600],
      searrow: [8600],
      sect: [167],
      semi: [59],
      seswar: [10537],
      setminus: [8726],
      setmn: [8726],
      sext: [10038],
      sfr: [120112],
      sfrown: [8994],
      sharp: [9839],
      shchcy: [1097],
      shcy: [1096],
      shortmid: [8739],
      shortparallel: [8741],
      shy: [173],
      sigma: [963],
      sigmaf: [962],
      sigmav: [962],
      sim: [8764],
      simdot: [10858],
      sime: [8771],
      simeq: [8771],
      simg: [10910],
      simgE: [10912],
      siml: [10909],
      simlE: [10911],
      simne: [8774],
      simplus: [10788],
      simrarr: [10610],
      slarr: [8592],
      smallsetminus: [8726],
      smashp: [10803],
      smeparsl: [10724],
      smid: [8739],
      smile: [8995],
      smt: [10922],
      smte: [10924],
      smtes: [10924, 65024],
      softcy: [1100],
      sol: [47],
      solb: [10692],
      solbar: [9023],
      sopf: [120164],
      spades: [9824],
      spadesuit: [9824],
      spar: [8741],
      sqcap: [8851],
      sqcaps: [8851, 65024],
      sqcup: [8852],
      sqcups: [8852, 65024],
      sqsub: [8847],
      sqsube: [8849],
      sqsubset: [8847],
      sqsubseteq: [8849],
      sqsup: [8848],
      sqsupe: [8850],
      sqsupset: [8848],
      sqsupseteq: [8850],
      squ: [9633],
      square: [9633],
      squarf: [9642],
      squf: [9642],
      srarr: [8594],
      sscr: [120008],
      ssetmn: [8726],
      ssmile: [8995],
      sstarf: [8902],
      star: [9734],
      starf: [9733],
      straightepsilon: [1013],
      straightphi: [981],
      strns: [175],
      sub: [8834],
      subE: [10949],
      subdot: [10941],
      sube: [8838],
      subedot: [10947],
      submult: [10945],
      subnE: [10955],
      subne: [8842],
      subplus: [10943],
      subrarr: [10617],
      subset: [8834],
      subseteq: [8838],
      subseteqq: [10949],
      subsetneq: [8842],
      subsetneqq: [10955],
      subsim: [10951],
      subsub: [10965],
      subsup: [10963],
      succ: [8827],
      succapprox: [10936],
      succcurlyeq: [8829],
      succeq: [10928],
      succnapprox: [10938],
      succneqq: [10934],
      succnsim: [8937],
      succsim: [8831],
      sum: [8721],
      sung: [9834],
      sup: [8835],
      sup1: [185],
      sup2: [178],
      sup3: [179],
      supE: [10950],
      supdot: [10942],
      supdsub: [10968],
      supe: [8839],
      supedot: [10948],
      suphsol: [10185],
      suphsub: [10967],
      suplarr: [10619],
      supmult: [10946],
      supnE: [10956],
      supne: [8843],
      supplus: [10944],
      supset: [8835],
      supseteq: [8839],
      supseteqq: [10950],
      supsetneq: [8843],
      supsetneqq: [10956],
      supsim: [10952],
      supsub: [10964],
      supsup: [10966],
      swArr: [8665],
      swarhk: [10534],
      swarr: [8601],
      swarrow: [8601],
      swnwar: [10538],
      szlig: [223],
      target: [8982],
      tau: [964],
      tbrk: [9140],
      tcaron: [357],
      tcedil: [355],
      tcy: [1090],
      tdot: [8411],
      telrec: [8981],
      tfr: [120113],
      there4: [8756],
      therefore: [8756],
      theta: [952],
      thetasym: [977],
      thetav: [977],
      thickapprox: [8776],
      thicksim: [8764],
      thinsp: [8201],
      thkap: [8776],
      thksim: [8764],
      thorn: [254],
      tilde: [732],
      times: [215],
      timesb: [8864],
      timesbar: [10801],
      timesd: [10800],
      tint: [8749],
      toea: [10536],
      top: [8868],
      topbot: [9014],
      topcir: [10993],
      topf: [120165],
      topfork: [10970],
      tosa: [10537],
      tprime: [8244],
      trade: [8482],
      triangle: [9653],
      triangledown: [9663],
      triangleleft: [9667],
      trianglelefteq: [8884],
      triangleq: [8796],
      triangleright: [9657],
      trianglerighteq: [8885],
      tridot: [9708],
      trie: [8796],
      triminus: [10810],
      triplus: [10809],
      trisb: [10701],
      tritime: [10811],
      trpezium: [9186],
      tscr: [120009],
      tscy: [1094],
      tshcy: [1115],
      tstrok: [359],
      twixt: [8812],
      twoheadleftarrow: [8606],
      twoheadrightarrow: [8608],
      uArr: [8657],
      uHar: [10595],
      uacute: [250],
      uarr: [8593],
      ubrcy: [1118],
      ubreve: [365],
      ucirc: [251],
      ucy: [1091],
      udarr: [8645],
      udblac: [369],
      udhar: [10606],
      ufisht: [10622],
      ufr: [120114],
      ugrave: [249],
      uharl: [8639],
      uharr: [8638],
      uhblk: [9600],
      ulcorn: [8988],
      ulcorner: [8988],
      ulcrop: [8975],
      ultri: [9720],
      umacr: [363],
      uml: [168],
      uogon: [371],
      uopf: [120166],
      uparrow: [8593],
      updownarrow: [8597],
      upharpoonleft: [8639],
      upharpoonright: [8638],
      uplus: [8846],
      upsi: [965],
      upsih: [978],
      upsilon: [965],
      upuparrows: [8648],
      urcorn: [8989],
      urcorner: [8989],
      urcrop: [8974],
      uring: [367],
      urtri: [9721],
      uscr: [120010],
      utdot: [8944],
      utilde: [361],
      utri: [9653],
      utrif: [9652],
      uuarr: [8648],
      uuml: [252],
      uwangle: [10663],
      vArr: [8661],
      vBar: [10984],
      vBarv: [10985],
      vDash: [8872],
      vangrt: [10652],
      varepsilon: [1013],
      varkappa: [1008],
      varnothing: [8709],
      varphi: [981],
      varpi: [982],
      varpropto: [8733],
      varr: [8597],
      varrho: [1009],
      varsigma: [962],
      varsubsetneq: [8842, 65024],
      varsubsetneqq: [10955, 65024],
      varsupsetneq: [8843, 65024],
      varsupsetneqq: [10956, 65024],
      vartheta: [977],
      vartriangleleft: [8882],
      vartriangleright: [8883],
      vcy: [1074],
      vdash: [8866],
      vee: [8744],
      veebar: [8891],
      veeeq: [8794],
      vellip: [8942],
      verbar: [124],
      vert: [124],
      vfr: [120115],
      vltri: [8882],
      vnsub: [8834, 8402],
      vnsup: [8835, 8402],
      vopf: [120167],
      vprop: [8733],
      vrtri: [8883],
      vscr: [120011],
      vsubnE: [10955, 65024],
      vsubne: [8842, 65024],
      vsupnE: [10956, 65024],
      vsupne: [8843, 65024],
      vzigzag: [10650],
      wcirc: [373],
      wedbar: [10847],
      wedge: [8743],
      wedgeq: [8793],
      weierp: [8472],
      wfr: [120116],
      wopf: [120168],
      wp: [8472],
      wr: [8768],
      wreath: [8768],
      wscr: [120012],
      xcap: [8898],
      xcirc: [9711],
      xcup: [8899],
      xdtri: [9661],
      xfr: [120117],
      xhArr: [10234],
      xharr: [10231],
      xi: [958],
      xlArr: [10232],
      xlarr: [10229],
      xmap: [10236],
      xnis: [8955],
      xodot: [10752],
      xopf: [120169],
      xoplus: [10753],
      xotime: [10754],
      xrArr: [10233],
      xrarr: [10230],
      xscr: [120013],
      xsqcup: [10758],
      xuplus: [10756],
      xutri: [9651],
      xvee: [8897],
      xwedge: [8896],
      yacute: [253],
      yacy: [1103],
      ycirc: [375],
      ycy: [1099],
      yen: [165],
      yfr: [120118],
      yicy: [1111],
      yopf: [120170],
      yscr: [120014],
      yucy: [1102],
      yuml: [255],
      zacute: [378],
      zcaron: [382],
      zcy: [1079],
      zdot: [380],
      zeetrf: [8488],
      zeta: [950],
      zfr: [120119],
      zhcy: [1078],
      zigrarr: [8669],
      zopf: [120171],
      zscr: [120015],
      zwj: [8205],
      zwnj: [8204]
    };
    __exports__.namedCodepoints = namedCodepoints;
  });
define("simple-html-tokenizer/helpers", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function makeArray(object) {
      if (object instanceof Array) {
        return object;
      } else {
        return [object];
      }
    }

    __exports__.makeArray = makeArray;var objectCreate = Object.create || function objectCreate(obj) {
      function F() {}
      F.prototype = obj;
      return new F();
    };
    __exports__.objectCreate = objectCreate;
    function isSpace(char) {
      return (/[\t\n\f ]/).test(char);
    }

    __exports__.isSpace = isSpace;function isAlpha(char) {
      return (/[A-Za-z]/).test(char);
    }

    __exports__.isAlpha = isAlpha;function isUpper(char) {
      return (/[A-Z]/).test(char);
    }

    __exports__.isUpper = isUpper;function removeLocInfo(tokens) {
      for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        delete token.firstLine;
        delete token.firstColumn;
        delete token.lastLine;
        delete token.lastColumn;
      }
    }

    __exports__.removeLocInfo = removeLocInfo;function tokensEqual(actual, expected, checkLocInfo, message) {
      if (!checkLocInfo) {
        removeLocInfo(actual);
      }
      deepEqual(actual, makeArray(expected), message);
    }

    __exports__.tokensEqual = tokensEqual;function locInfo(token, firstLine, firstColumn, lastLine, lastColumn) {
      token.firstLine = firstLine;
      token.firstColumn = firstColumn;
      token.lastLine = lastLine;
      token.lastColumn = lastColumn;
      return token;
    }

    __exports__.locInfo = locInfo;
  });
define("rebound/compiler", 
  ["htmlbars-compiler/compiler","htmlbars-runtime/utils","rebound/helpers","rebound/hooks","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var htmlbarsCompile = __dependency1__.compile;
    var merge = __dependency2__.merge;
    var defaultHelpers = __dependency3__["default"];
    var defaultHooks = __dependency4__["default"];

    function compile(string, options){
      // Ensure we have a well-formed object as var options
      options = options || {};
      options.helpers = options.helpers || {};
      options.hooks = options.hooks || {};

      // Merge our default helpers with user provided helpers
      options.helpers = merge(defaultHelpers, options.helpers);
      options.hooks = merge(defaultHooks, options.hooks);

      // Compile our template function
      var func = htmlbarsCompile(string, {
        helpers: options.helpers,
        hooks: options.hooks
      });

      // For debugging, output the compiled function
       console.log(func)

      // Return a wrapper function that will merge user provided helpers with our defaults
      return function(data, options){
        // Ensure we have a well-formed object as var options
        options = options || {};
        options.helpers = options.helpers || {};
        options.hooks = options.hooks || {};

        // Merge our default helpers and hooks with user provided helpers
        options.helpers = merge(defaultHelpers, options.helpers);
        options.hooks = merge(defaultHooks, options.hooks);

        // Call our func with merged helpers and hooks
        return func.call(this, data, {
          helpers: options.helpers,
          hooks: options.hooks
        })
      }
    }

    __exports__.compile = compile;
  });
define("rebound/controller", 
  [],
  function() {
    "use strict";

  });
define("rebound/hooks", 
  ["rebound/lazy-value","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var LazyValue = __dependency1__["default"];

    var hooks = this,
        helpers = this;

    /*******************************
            Default helpers
    ********************************/

    // Attribute helper handles binding data to dom attributes
    function __attribute() {
      var builder = new LazyValue(function(values) {
            return values.join('');
          }),
          options = _.last(arguments),
          name = options.params.shift();

      options.params.forEach(function(node) {
        if (typeof node === 'string' || node.isLazyValue)
          builder.addDependentValue(node);
      });

      builder.onNotify(function(lazyValue) {
        options.element.setAttribute(name, lazyValue.value());
      });

      options.element.setAttribute(name, builder.value());
    }

    function __if(value, options){
        return value ? options.render(this, options) : options.inverse(this, options)
    }

    function __unless(value, options){
        return value ? options.inverse(this, options) : options.render(this, options)
    }


    function __each(value, options){

      // Remove elements at indicies passed to us in the collection's __removedIndex array
      if(_.isArray(value.__removedIndex) && value.__removedIndex.length){
        // For each removed indes, in decending order so we dont mess up the dom for later indicies, destroy its morph element
        _.each(_.sortBy(value.__removedIndex, function(num){return num;}).reverse(), function(index){
          options.placeholder.morphs[index].destroy();
        })
      }

      // Leave our removed index array clean for the next call
      value.__removedIndex = [];
      value.__indexed = false;

      _.each(value, function(obj, key, list){

        // If this object in the collection has already been rendered, move on.
        if(obj.__rendered) return;

        // If this model was added silently, but is now being rendered, removing it will need to update the dom.
        if(obj.__silent) delete obj.__silent;

        // Create a lazyvalue whos value is the content inside our block helper rendered in the context of this current list object. Returns the rendered dom for this list element.
        var lazyValue = new LazyValue(function(){
          return options.render(obj, options);
        })

        // Insert our newly rendered value (a document tree) into our placeholder (the containing element) at its requested position (where we currently are in the object list)
        options.placeholder.insert(key, lazyValue.value());

        // Mark this object as rendered so we will not re-render it a second time
        obj.__rendered = true;

      }, this);

      // No need for a return statement. Our placeholder (containing element) now has all the dom we need.

    }


    function __with(value, options){

      // Render the content inside our block helper with the context of this object. Returns a dom tree.
      var dom = options.render(value, options);

      // TODO: Needs data binding?...

      // Insert our newly rendered value (a document tree) into our placeholder (the containing element) at its position (where we currently are in the rendering)
      options.placeholder.append(dom);

      // No need to return anything. Our placeholder (containing element) now has all the dom we need.

    }


    /*******************************
            Hook Utils
    ********************************/
    // Given a model and a path return the value
    function get(model, path) {
      // Get function now checks for collection, model or vanillajs object. Accesses appropreately.
      var parts  = {},
          result = {};

      // Split the path at all '.', '[' and ']' and find the value referanced.
      parts = _.compact(path.split(/(?:\.|\[|\])+/));
      // If no path, return current object, otherwise get value of the path
      result = model;
      if (parts.length > 0) {
        for (var i = 0, l = parts.length; i < l; i++) {
          result = (model instanceof Backbone.Collection)? result.at(parts[i]) : ((model instanceof Backbone.Model)? result.get(parts[i]) : result[parts[i]]);
        }
      }

      // A model can return a collection. Make sure when this happens, we get the collection's model array.
      result = (result === undefined) && '' || result;
      return (result instanceof Backbone.Collection) ? result.models : result;

    }

    // Add a callgack to a given model to trigger when its value at 'path' changes.
    function addObserver(model, path, callback) {
      // Ensure _observers exists and is an object
      model.__observers = model.__observers || {};
      // Ensure __obxervers[path] exists and is an array
      model.__observers[path] = model.__observers[path] || [];
      // Add our callback
      model.__observers[path].push(callback);
    }

    // Given an object (context) and a path, create a LazyValue object that returns the value of object at context and add it as an observer of the context.
    function streamFor(context, path) {

      // Lazy value that returns the value of context.path
      var lazyValue = new LazyValue(function() {
        return get(context, path);
      });

      // Whenever context.path changes, have LazyValue notify its listeners.
      addObserver(context, path, function() {
        lazyValue.notify();
      });

      return lazyValue;
    }

    function streamifyArgs(context, params, options, helpers) {
      // Convert ID params to streams
      for (var i = 0, l = params.length; i < l; i++) {
        if (options.types[i] === 'id') {
          params[i] = streamFor(context, params[i]);
        }
      }

      // Convert hash ID values to streams
      var hash = options.hash,
          hashTypes = options.hashTypes;
      for (var key in hash) {
        if (hashTypes[key] === 'id') {
          hash[key] = streamFor(context, hash[key]);
        }
      }
    }

    // lookupHelper returns the given function from the helpers object. Manual checks prevent user from overriding reserved words.
    function lookupHelper(name, env) {
      if(name === 'attribute') { return __attribute; }
      if(name === 'if') { return __if; }
      if(name === 'unless') { return __unless; }
      if(name === 'each') { return __each; }
      if(name === 'with') { return __with; }
      return helpers[name];
    }

    function constructHelper(el, path, context, params, options, env, helper) {
      var lazyValue;

      // For each argument passed to our helper, turn them into LazyValues. Params array is now an array of lazy values that will trigger when their value changes.
      streamifyArgs(context, params, options, env.helpers);

      // Extend options with the helper's containeing Morph element, hooks and helpers for any subsequent calls from a lazyvalue
      options.placeholder = el; // FIXME: this kinda sucks
      options.element = el; // FIXME: this kinda sucks
      options.params = params; // FIXME: this kinda sucks
      options.hooks = env.hooks; // FIXME: this kinda sucks
      options.helpers = env.helpers; // FIXME: this kinda sucks
      options.context = context; // FIXME: this kinda sucks
      options.dom = env.dom; // FIXME: this kinda sucks

      // Create a lazy value that returns the value of our evaluated helper.
      lazyValue = new LazyValue(function() {
        var len = params.length,
            i,
            args = [];

        // Assemble our args variable. For each lazyvalue param, push the lazyValue's value to args so helpers can be written handlebars style with no concept of lazyvalues.
        for(i=0; i<len; i++){
          args.push(( (params[i].isLazyValue) ? params[i].value() : params[i] ));
        }

        // Then push our options on to the end. Options are always last.
        args.push(options);

        // Call our helper functions with our assembled args.
        return helper.apply(context, args);
      });

      // For each param passed to our helper, add it to our helper's dependant list. Helper will re-evaluate when one changes.
      params.forEach(function(node) {
        if (typeof node === 'string' || node.isLazyValue) {
          lazyValue.addDependentValue(node);
        }
      });

      return lazyValue;
    }

    /*******************************
            Default Hooks
    ********************************/

    hooks.content = function(placeholder, path, context, params, options, env) {

      var lazyValue,
          value,
          helper = lookupHelper(path, env);

      // TODO: just set escaped on the placeholder in HTMLBars
      placeholder.escaped = options.escaped;

      // If we were passed a helper, and it was found in our registered helpers
      if (helper) {
        // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
        lazyValue = constructHelper(placeholder, path, context, params, options, env, helper)
      } else {
        // If not a helper, just subscribe to the value
        lazyValue = streamFor(context, path);
      }

      // If we have our lazy value, update our dom.
      // Placeholder is a morph element representing our dom node
      if (lazyValue) {
        lazyValue.onNotify(function(lazyValue) {
          var val = lazyValue.value();
          if(val) placeholder.update(val);
        });

        value = lazyValue.value();
        if(value) placeholder.append(value);
      }
    }

    // Handle placeholders in element tags
    hooks.element = function(element, path, context, params, options, env) {
      var helper = lookupHelper(path, env),
          lazyValue;

      //streamifyArgs(context, params, options, env.helpers);

      if (helper) {

        // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
        lazyValue = constructHelper(element, path, context, params, options, env, helper)

        // When we have our lazy value run it and start listening for updates.
        lazyValue.onNotify(function(lazyValue) {
          lazyValue.value();
        });
        lazyValue.value();

        //return helper(element, path, params, options, helpers);
      } else {
        return streamFor(context, path);
      }
    }


    hooks.subexpr = function(path, context, params, options, env) {
      var helper = lookupHelper(path, env);
      if (helper) {
        streamifyArgs(context, params, options, env.helpers);
        return helper(params, options);
      } else {
        return streamFor(context, path);
      }
    }

    // registerHelper is a publically available function to register a helper with HTMLBars
    function registerHelper(key, callback){
      helpers[key] = callback;
    }


    // TODO: When htmlbars adds support for partials, write partials hook


    __exports__["default"] = { registerHelper: registerHelper, hooks: hooks, helpers: helpers }
  });
define("rebound/lazy-value", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var NIL = function NIL(){}, // TODO: microoptimize... object literal or fn? :P
        EMPTY_ARRAY = [];

    function LazyValue(fn) {
      this.valueFn = fn;
    }

    // TODO: Function.prototype.makeLazy helper?

    LazyValue.prototype = {
      isLazyValue: true,
      parent: null, // TODO: is parent even needed? could be modeled as a subscriber
      children: null,
      cache: NIL,
      valueFn: null,
      subscribers: null, // TODO: do we need multiple subscribers?
      _childValues: null, // just for reusing the array, might not work well if children.length changes after computation

      value: function() {
        var cache = this.cache;
        if (cache !== NIL) { return cache; }

        var children = this.children;
        if (children) {
          var child,
              values = this._childValues || new Array(children.length);

          for (var i = 0, l = children.length; i < l; i++) {
            child = children[i];
            values[i] = (child && child.isLazyValue) ? child.value() : child;
          }

          return this.cache = this.valueFn(values);
        } else {
          return this.cache = this.valueFn(EMPTY_ARRAY);
        }
      },

      addDependentValue: function(value) {
        var children = this.children;
        if (!children) {
          children = this.children = [value];
        } else {
          children.push(value);
        }

        if (value && value.isLazyValue) { value.parent = this; }

        return this;
      },

      notify: function(sender) {
        var cache = this.cache,
            parent,
            subscribers;

        if (cache !== NIL) {
          parent = this.parent;
          subscribers = this.subscribers;
          cache = this.cache = NIL;

          if (parent) { parent.notify(this); }
          if (!subscribers) { return; }
          for (var i = 0, l = subscribers.length; i < l; i++) {
            subscribers[i](this); // TODO: should we worry about exception handling?
          }
        }
      },

      onNotify: function(callback) {
        var subscribers = this.subscribers;
        if (!subscribers) {
          subscribers = this.subscribers = [callback];
        } else {
          subscribers.push(callback);
        }
        return this;
      },

      destroy: function() {
        this.parent = this.children = this.cache = this.valueFn = this.subscribers = this._childValues = null;
      }
    };

    __exports__["default"] = LazyValue;
  });
define("rebound/runtime", 
  ["htmlbars-runtime/utils","morph/dom-helper","morph/morph","rebound/lazy-value","rebound/hooks","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    var merge = __dependency1__.merge;
    //import { domHelpers, Morph } from "htmlbars-runtime/main";
    var DOMHelper = __dependency2__["default"];
    var Morph = __dependency3__["default"];
    var LazyValue = __dependency4__["default"];
    var defaultEnv = __dependency5__["default"];

    function htmlbarsHydrate(spec, options) {
      return spec(options.dom, Morph);
    }

    function hydrate(spec, options){
      // Ensure we have a well-formed object as var options
      options = options || {};
      options.helpers = options.helpers || {};
      options.hooks = options.hooks || {};
      options.dom = options.dom || new DOMHelper(document.createElement('div'));

      // Merge our default helpers with user provided helpers
      options.helpers = merge(defaultEnv.helpers, options.helpers);
      options.hooks = merge(defaultEnv.hooks, options.hooks);

      // Compile our template function
      var func = htmlbarsHydrate(spec, options);

      // Return a wrapper function that will merge user provided helpers with our defaults
      return function(data, options){
        // Ensure we have a well-formed object as var options
        options = options || {};
        options.helpers = options.helpers || {};
        options.hooks = options.hooks || {};
        options.dom = options.dom || new DOMHelper(document.createElement('div'));

        // Merge our default helpers and hooks with user provided helpers
        options.helpers = merge(defaultEnv.helpers, options.helpers);
        options.hooks = merge(defaultEnv.hooks, options.hooks);

        // Call our func with merged helpers and hooks
        return func.call(this, data, options)
      }
    }

    // Notify all of a model's observers of the change, execute the callback
    function notify(model, path) {
      // If path is not an array of keys, wrap it in array
      path = (Object.prototype.toString.call(path) === '[object Array]') ? path : [path];

      // For each path, alert each observer and call its callback
      path.forEach(function(path){
        if(Object.prototype.toString.call(model.__observers[path]) === '[object Array]'){
          model.__observers[path].forEach(function(callback) {
            callback();
          });
        }
      });
    }

    var registerHelper = defaultEnv.registerHelper;

    __exports__.registerHelper = registerHelper;
    __exports__.notify = notify;
    __exports__.hydrate = hydrate;
  });
define("handlebars", 
  ["./handlebars.runtime","./handlebars/compiler/ast","./handlebars/compiler/base","./handlebars/compiler/compiler","./handlebars/compiler/javascript-compiler","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    /*globals Handlebars: true */
    var Handlebars = __dependency1__["default"];

    // Compiler imports
    var AST = __dependency2__["default"];
    var Parser = __dependency3__.parser;
    var parse = __dependency3__.parse;
    var Compiler = __dependency4__.Compiler;
    var compile = __dependency4__.compile;
    var precompile = __dependency4__.precompile;
    var JavaScriptCompiler = __dependency5__["default"];

    var _create = Handlebars.create;
    var create = function() {
      var hb = _create();

      hb.compile = function(input, options) {
        return compile(input, options, hb);
      };
      hb.precompile = function (input, options) {
        return precompile(input, options, hb);
      };

      hb.AST = AST;
      hb.Compiler = Compiler;
      hb.JavaScriptCompiler = JavaScriptCompiler;
      hb.Parser = Parser;
      hb.parse = parse;

      return hb;
    };

    Handlebars = create();
    Handlebars.create = create;

    __exports__["default"] = Handlebars;
  });
define("handlebars.runtime", 
  ["./handlebars/base","./handlebars/safe-string","./handlebars/exception","./handlebars/utils","./handlebars/runtime","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    /*globals Handlebars: true */
    var base = __dependency1__;

    // Each of these augment the Handlebars object. No need to setup here.
    // (This is done to easily share code between commonjs and browse envs)
    var SafeString = __dependency2__["default"];
    var Exception = __dependency3__["default"];
    var Utils = __dependency4__;
    var runtime = __dependency5__;

    // For compatibility and usage outside of module systems, make the Handlebars object a namespace
    var create = function() {
      var hb = new base.HandlebarsEnvironment();

      Utils.extend(hb, base);
      hb.SafeString = SafeString;
      hb.Exception = Exception;
      hb.Utils = Utils;

      hb.VM = runtime;
      hb.template = function(spec) {
        return runtime.template(spec, hb);
      };

      return hb;
    };

    var Handlebars = create();
    Handlebars.create = create;

    __exports__["default"] = Handlebars;
  });
define("rebound", 
  ["rebound/runtime","rebound/compiler","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var registerHelper = __dependency1__.registerHelper;
    var notify = __dependency1__.notify;
    var hydrate = __dependency1__.hydrate;
    var compile = __dependency2__.compile;

    // If Backbone hasn't been started yet, throw error
    if(!window.Backbone)
      throw "Backbone must be on the page for Rebound to load.";


    // New Backbone Controller
    var Controller = Backbone.Controller = function(options){
      this.cid = _.uniqueId('controller');
      options || (options = {});
      _.extend(this, _.pick(options, controllerOptions));
      this.initialize.apply(this, arguments);
      this.data = {};

      this.template = ((typeof this.template === 'string') && compile(this.template)) || ((typeof this.template === 'function') && this.template) || false;

      this._assembleData();
      this._startListening();
    }

    var controllerOptions = ['models', 'collections', 'outlet', 'template'];

    _.extend(Controller.prototype, Backbone.Events, {

      // Initialize is an empty function by default. Override it with your own initialization logic.
      initialize: function(){},

      _assembleData: function(){

        _.each(this.models, function(model, key, list){
          // Make our model aware of its assigned name
          model.__name = key;
          // Construct our vanilla js data model. All objects are passed by referance so this will reflect the current state of our models.
          this.data[key] = model.attributes;
          this.listenTo(model, 'change', this._notify)
        }, this)
        console.log(this.data)
      },

      _startListening: function(){
        console.log(this.data)
        this.dom = this.template(this.data);
        this.outlet.html(this.dom)
      },

      _notify: function(event){
        var name = event.__name;
        console.log(this.data)
        console.log(_.map(_.keys(event.changedAttributes()), function(attr){ return name + '.' + attr; }))
        notify(this.data, _.map(_.keys(event.changedAttributes()), function(attr){ return name + '.' + attr; }))
      }

    });

    Controller.extend = window.Backbone.Router.extend;

    __exports__.compile = compile;
    __exports__.registerHelper = registerHelper;
    __exports__.notify = notify;
    __exports__.hydrate = hydrate;
  });
define("rebound.runtime", 
  ["rebound/runtime","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var registerHelper = __dependency1__.registerHelper;
    var notify = __dependency1__.notify;
    var hydrate = __dependency1__.hydrate;

    // If Backbone hasn't been started yet, throw error
    if(!window.Backbone)
      throw "Backbone must be on the page for Rebound to load.";
    // If Rebound Runtime has already been run, exit
    if(!window.Backbone.Controller){

      // By default, __path returns the root object unless overridden
      Backbone.Model.prototype.__path = function(){return '';};
      // Modify the Backbone.Model.set() function to have models' eventable attributes propagate their events to their parent and keep a referance to their name.
      Backbone.Model.prototype.__set = Backbone.Model.prototype.set;
      Backbone.Model.prototype.set = function(key, val, options){
        var attrs, val, newKey;

        // Set is able to take a object or a key value pair. Normalize this input.
        if (typeof key === 'object') {
          attrs = key;
          options = val;
        } else {
          (attrs = {})[key] = val;
        }

        // For each key and value, call original set and propagate its events up to parent if it is eventable.
        for (key in attrs) {
          val = attrs[key];

          // If any value is an object, turn it into a model
          if(_.isObject(val) && !_.isArray(val)){
            val = attrs[key] = new Backbone.Model(val);
          }
          // If any value is an array, turn it into a collection
          if(_.isArray(val)){
            val = attrs[key] = new Backbone.Collection(val)
          }

          // If this is a new key, and it is an eventable object, propagate its event to our parent
          if(!(this.has(key)) && val instanceof Backbone.Model || val instanceof Backbone.Collection){
            // When requesting the name value of our value, return the its key appended to the computed name value of our parent
            // Closure is needed to preserve values in the instance so they dont get set to the prototype
            val.__path = (function(model, key){ return function(){ return model.__path() + '.' + key ; }; })(this, key);
            val.__parent = this;
            val.on('all', this.trigger, this);
          }

          // Call original backbone set function
          this.__set.call(this, key, val, options);

        }
      }


      // By default, __path returns the root object unless overridden
      Backbone.Collection.prototype.__path = function(){return '';};
      // Have collections set its model's names.
      Backbone.Collection.prototype.__set = Backbone.Collection.prototype.set;
      Backbone.Collection.prototype.set = function(models, options){
        var models = (!_.isArray(models)) ? (models ? [models] : []) : _.clone(models),
            id, model, i, l;

        // If a silent remove and this is the first silent remove since the last dom update, save our initial indicies
        if( options.silent && !this.models.__indexed ){
          _.each(this.models, function(model, index){
            model.__originalIndex = index;
          }, this)
          this.models.__indexed = true;
        }

        for (i = 0, l = models.length; i < l; i++) {
          model = models[i] || {};
          // If model is a backbone model, awesome. If not, make it one.
          if (model instanceof Backbone.Model) {
            id = model;
          } else {
            id = model[this.model.prototype.idAttribute || 'id'];
            options = options ? _.clone(options) : {};
            options.collection = this;
            model = new this.model(model, options);
          }

          // If model does not already exist in the collection, set its name.
          if (!this.get(id)){
            // When requesting the name value of our value, return the its index appended to the computed name value of our parent
            // Closure is needed to preserve values in the instance so they dont get set to the prototype
            model.__path = (function(collection, model){ return function(){return collection.__path() + '.[' + collection.indexOf(model) + ']' }; })(this, model);
            model.__parent = this;
          }

          // If added silently, make note. If removed later, before it is rendered in the dom, we can remove it without alerting the dom.
          if (options.silent){
            model.__silent = true;
          }

          models[i] = model;
        }

        // Call original set function
        this.__set.call(this, models, options);

      }

      // We override the _reset function to mark all models for removal in the dom and preserve our __removedIndex array on internal _reset.
      Backbone.Collection.prototype.___reset = Backbone.Collection.prototype._reset;
      Backbone.Collection.prototype._reset = function(){
        // Ensure existance of __removedIndex array. Saves indicies of removed elements to be passed to our #each helper.
        var cachedArray = this.models && this.models.__removedIndex || [];
        // Mark everything for removal from dom
        _.each(this.models, function(model){
          // If we have been accumulating silent removes, use the original index, otherwise use our current one.
          this.remove(model, {silent: true, __silent: true});
        }, this)
        this.___reset.call(this);
        this.models = this.models || [];
        this.models.__removedIndex = cachedArray;
      }

      // We override the remove function to always trigger a dom sync on removal.
      Backbone.Collection.prototype.__remove = Backbone.Collection.prototype.remove;
      Backbone.Collection.prototype.remove = function(models, options){
        var singular = !_.isArray(models);
        models = singular ? [models] : _.clone(models);
        options = _.extend({}, options);

        // If a silent remove and this is the first silent remove since the last dom update, save our initial indicies
        if( options.silent && !this.models.__indexed ){
          _.each(this.models, function(model, index){
            model.__originalIndex = index;
          })
          this.models.__indexed = true;
        }

        // Keep referance of removed elements' index so our each helper can stay in sync when elements are removed silently.
        _.each(models, function(model, index){
          // If this model was added silently, we do not need to alert the dom about its removal.
          if(model.__silent) return;
          // If we have been accumulating silent removes, use the original index, otherwise use our current one.
          var index = (this.models.__removedIndex.length  > 0) ? model.__originalIndex : this.indexOf(model);
          this.models.__removedIndex.push(index);
        }, this)

        // Call original set function.
        if(!options.__silent)
          this.__remove.call(this, models, options);
      }

      // New Backbone Controller
      var Controller = Backbone.Controller = function(options){
        this.cid = _.uniqueId('controller');
        _.bindAll(this, '_onModelChange', '_onCollectionChange', '_on');
        options || (options = {});
        _.extend(this, _.pick(options, controllerOptions));
        Rebound.registerHelper('on', this._on);
        this.initialize.apply(this, arguments);
        this.data = options.data;

        // Take our precompiled template and hydrates it. When Rebound Compiler is included, can be a handlebars template string.
        this._setTemplate();
        this._startListening();
      }


      var controllerOptions = ['models', 'collections', 'outlet', 'template'];

      _.extend(Controller.prototype, Backbone.Events, {

        // Initialize is an empty function by default. Override it with your own initialization logic.
        initialize: function(){},


        _on: function(eventName){
          var id = _.uniqueId('event'),
              i,
              options = _.last(arguments),
              delegate = options.hash.selector || '[data-event='+id+']',
              data = options.hash.data && options.hash.data.isLazyValue && options.hash.data.value() || options.hash.data || options.context;

          // Set our element's data-event id
          $(options.element).attr('data-event', id);

          // Make sure we only attach once for each combination of delagate selector and callback
          for(i = 1; i<arguments.length-1; i++){
            this.outlet.off(eventName, delegate, this[arguments[i]]).on(eventName, delegate, data, this[arguments[i]]);
          }
        },

        // Hydrate our template
        // Rebound Compiler overrides and gives the option for out template variable to be a handlebars template string
        _setTemplate: function(){
          if (typeof this.template === 'string') throw "Please include rebound compiler to use client side string templates, otherwise be sure to pre-compile.";
          if (typeof this.template !== 'function') throw "Template is required";
          return this.template = hydrate(this.template);
        },

        _startListening: function(){
          this.dom = this.template(this.data);
          //this.listenTo(this.data, 'add destroy reset', this._notify)
          this.listenTo(this.data, 'change', this._onModelChange);
          this.listenTo(this.data, 'add remove reset', this._onCollectionChange);

          this.outlet.html(this.dom);
        },

        _getValue: function(key){

        },

        _onModelChange: function(model, options){
          this._notify(model, model.changedAttributes())
        },

        _onCollectionChange: function(model, collection, options){
          var changed = {};
          if(model instanceof Backbone.Collection){
            options = collection
            collection = model;
          }
          changed[collection.__path()] = collection;
          this._notify(this.data, changed)
        },

        _notify: function(obj, changed){

          var path = obj.__path(),
              paths;

          // TODO: Reverse this update process. We want to render higher level paths first.
          // Call notify on every object up the data tree starting at the element that triggered the change
          while(obj){
            // Constructs paths variable relative to current data element
            paths = _.map((_.keys(changed)), function(attr){
                      return ((path && path + '.') + attr).replace(obj.__path()+'.', '');
                    });

            if(obj.__observers && paths.length){
              notify(obj, paths);
            }
            obj = obj.__parent;
          }
        }

      });

      Controller.extend = window.Backbone.Router.extend;

    }

    __exports__.registerHelper = registerHelper;
  });
define("simple-html-tokenizer", 
  ["simple-html-tokenizer/char-refs","simple-html-tokenizer/helpers","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    /*jshint boss:true*/

    var namedCodepoints = __dependency1__.namedCodepoints;
    var objectCreate = __dependency2__.objectCreate;
    var isSpace = __dependency2__.isSpace;
    var isAlpha = __dependency2__.isAlpha;
    var isUpper = __dependency2__.isUpper;

    function preprocessInput(input) {
      return input.replace(/\r\n?/g, "\n");
    }

    function Tokenizer(input) {
      this.input = preprocessInput(input);
      this.char = 0;
      this.line = 1;
      this.column = 0;

      this.state = 'data';
      this.token = null;
    }

    Tokenizer.prototype = {
      tokenize: function() {
        var tokens = [], token;

        while (true) {
          token = this.lex();
          if (token === 'EOF') { break; }
          if (token) { tokens.push(token); }
        }

        if (this.token) {
          tokens.push(this.token);
        }

        return tokens;
      },

      tokenizePart: function(string) {
        this.input += preprocessInput(string);
        var tokens = [], token;

        while (this.char < this.input.length) {
          token = this.lex();
          if (token) { tokens.push(token); }
        }

        this.tokens = (this.tokens || []).concat(tokens);
        return tokens;
      },

      tokenizeEOF: function() {
        var token = this.token;
        if (token) {
          this.token = null;
          return token;
        }
      },

      tag: function(Type, char) {
        var lastToken = this.token;
        this.token = new Type(char);
        this.state = 'tagName';
        return lastToken;
      },

      selfClosing: function() {
        this.token.selfClosing = true;
      },

      attribute: function(char) {
        this.token.startAttribute(char);
        this.state = 'attributeName';
      },

      addToAttributeName: function(char) {
        this.token.addToAttributeName(char);
      },

      addToAttributeValue: function(char) {
        this.token.addToAttributeValue(char);
      },

      commentStart: function() {
        var lastToken = this.token;
        this.token = new CommentToken();
        this.state = 'commentStart';
        return lastToken;
      },

      addToComment: function(char) {
        this.token.addChar(char);
      },

      emitData: function() {
        this.addLocInfo(this.line, this.column - 1);
        var lastToken = this.token;
        this.token = null;
        this.state = 'tagOpen';
        return lastToken;
      },

      emitToken: function() {
        this.addLocInfo();
        var lastToken = this.token.finalize();
        this.token = null;
        this.state = 'data';
        return lastToken;
      },

      addData: function(char) {
        if (this.token === null) {
          this.token = new Chars();
          this.markFirst();
        }

        this.token.addChar(char);
      },

      markFirst: function(line, column) {
        this.firstLine = (line === 0) ? 0 : (line || this.line);
        this.firstColumn = (column === 0) ? 0 : (column || this.column);
      },

      addLocInfo: function(line, column) {
        if (!this.token) return;
        this.token.firstLine = this.firstLine;
        this.token.firstColumn = this.firstColumn;
        this.token.lastLine = (line === 0) ? 0 : (line || this.line);
        this.token.lastColumn = (column === 0) ? 0 : (column || this.column);
      },

      consumeCharRef: function(allowedChar) {
        var matches;
        var input = this.input.slice(this.char);

        if (matches = input.match(/^#(?:x|X)([0-9A-Fa-f]+);/)) {
          this.char += matches[0].length;
          return String.fromCharCode(parseInt(matches[1], 16));
        } else if (matches = input.match(/^#([0-9]+);/)) {
          this.char += matches[0].length;
          return String.fromCharCode(parseInt(matches[1], 10));
        } else if (matches = input.match(/^([A-Za-z]+);/)) {
          var codepoints = namedCodepoints[matches[1]];
          if (codepoints) {
            this.char += matches[0].length;
            for (var i = 0, str = ""; i < codepoints.length; i++) {
              str += String.fromCharCode(codepoints[i]);
            }
            return str;
          }
        }

      },

      lex: function() {
        var char = this.input.charAt(this.char++);

        if (char) {
          if (char === "\n") {
            this.line++;
            this.column = 0;
          } else {
            this.column++;
          }
          // console.log(this.state, char);
          return this.states[this.state].call(this, char);
        } else {
          this.addLocInfo(this.line, this.column);
          return 'EOF';
        }
      },

      states: {
        data: function(char) {
          if (char === "<") {
            var chars = this.emitData();
            this.markFirst();
            return chars;
          } else if (char === "&") {
            this.addData(this.consumeCharRef() || "&");
          } else {
            this.addData(char);
          }
        },

        tagOpen: function(char) {
          if (char === "!") {
            this.state = 'markupDeclaration';
          } else if (char === "/") {
            this.state = 'endTagOpen';
          } else if (isAlpha(char)) {
            return this.tag(StartTag, char.toLowerCase());
          }
        },

        markupDeclaration: function(char) {
          if (char === "-" && this.input[this.char] === "-") {
            this.char++;
            this.commentStart();
          }
        },

        commentStart: function(char) {
          if (char === "-") {
            this.state = 'commentStartDash';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.addToComment(char);
            this.state = 'comment';
          }
        },

        commentStartDash: function(char) {
          if (char === "-") {
            this.state = 'commentEnd';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.addToComment("-");
            this.state = 'comment';
          }
        },

        comment: function(char) {
          if (char === "-") {
            this.state = 'commentEndDash';
          } else {
            this.addToComment(char);
          }
        },

        commentEndDash: function(char) {
          if (char === "-") {
            this.state = 'commentEnd';
          } else {
            this.addToComment("-" + char);
            this.state = 'comment';
          }
        },

        commentEnd: function(char) {
          if (char === ">") {
            return this.emitToken();
          } else {
            this.addToComment("--" + char);
            this.state = 'comment';
          }
        },

        tagName: function(char) {
          if (isSpace(char)) {
            this.state = 'beforeAttributeName';
          } else if (char === "/") {
            this.state = 'selfClosingStartTag';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.token.addToTagName(char);
          }
        },

        beforeAttributeName: function(char) {
          if (isSpace(char)) {
            return;
          } else if (char === "/") {
            this.state = 'selfClosingStartTag';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.attribute(char);
          }
        },

        attributeName: function(char) {
          if (isSpace(char)) {
            this.state = 'afterAttributeName';
          } else if (char === "/") {
            this.state = 'selfClosingStartTag';
          } else if (char === "=") {
            this.state = 'beforeAttributeValue';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.addToAttributeName(char);
          }
        },

        afterAttributeName: function(char) {
          if (isSpace(char)) {
            return;
          } else if (char === "/") {
            this.state = 'selfClosingStartTag';
          } else if (char === "=") {
            this.state = 'beforeAttributeValue';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.attribute(char);
          }
        },

        beforeAttributeValue: function(char) {
          if (isSpace(char)) {
            return;
          } else if (char === '"') {
            this.state = 'attributeValueDoubleQuoted';
          } else if (char === "'") {
            this.state = 'attributeValueSingleQuoted';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.state = 'attributeValueUnquoted';
            this.addToAttributeValue(char);
          }
        },

        attributeValueDoubleQuoted: function(char) {
          if (char === '"') {
            this.state = 'afterAttributeValueQuoted';
          } else if (char === "&") {
            this.addToAttributeValue(this.consumeCharRef('"') || "&");
          } else {
            this.addToAttributeValue(char);
          }
        },

        attributeValueSingleQuoted: function(char) {
          if (char === "'") {
            this.state = 'afterAttributeValueQuoted';
          } else if (char === "&") {
            this.addToAttributeValue(this.consumeCharRef("'") || "&");
          } else {
            this.addToAttributeValue(char);
          }
        },

        attributeValueUnquoted: function(char) {
          if (isSpace(char)) {
            this.state = 'beforeAttributeName';
          } else if (char === "&") {
            this.addToAttributeValue(this.consumeCharRef(">") || "&");
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.addToAttributeValue(char);
          }
        },

        afterAttributeValueQuoted: function(char) {
          if (isSpace(char)) {
            this.state = 'beforeAttributeName';
          } else if (char === "/") {
            this.state = 'selfClosingStartTag';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.char--;
            this.state = 'beforeAttributeName';
          }
        },

        selfClosingStartTag: function(char) {
          if (char === ">") {
            this.selfClosing();
            return this.emitToken();
          } else {
            this.char--;
            this.state = 'beforeAttributeName';
          }
        },

        endTagOpen: function(char) {
          if (isAlpha(char)) {
            this.tag(EndTag, char.toLowerCase());
          }
        }
      }
    };

    function Tag(tagName, attributes, options) {
      this.tagName = tagName || "";
      this.attributes = attributes || [];
      this.selfClosing = options ? options.selfClosing : false;
    }

    Tag.prototype = {
      constructor: Tag,

      addToTagName: function(char) {
        this.tagName += char;
      },

      startAttribute: function(char) {
        this.currentAttribute = [char.toLowerCase(), null];
        this.attributes.push(this.currentAttribute);
      },

      addToAttributeName: function(char) {
        this.currentAttribute[0] += char;
      },

      addToAttributeValue: function(char) {
        this.currentAttribute[1] = this.currentAttribute[1] || "";
        this.currentAttribute[1] += char;
      },

      finalize: function() {
        delete this.currentAttribute;
        return this;
      }
    };

    function StartTag() {
      Tag.apply(this, arguments);
    }

    StartTag.prototype = objectCreate(Tag.prototype);
    StartTag.prototype.type = 'StartTag';
    StartTag.prototype.constructor = StartTag;

    StartTag.prototype.toHTML = function() {
      return config.generateTag(this);
    };

    function generateTag(tag) {
      var out = "<";
      out += tag.tagName;

      if (tag.attributes.length) {
        out += " " + config.generateAttributes(tag.attributes);
      }

      out += ">";

      return out;
    }

    function generateAttributes(attributes) {
      var out = [], attribute, attrString, value;

      for (var i=0, l=attributes.length; i<l; i++) {
        attribute = attributes[i];

        out.push(config.generateAttribute.apply(this, attribute));
      }

      return out.join(" ");
    }

    function generateAttribute(name, value) {
      var attrString = name;

      if (value) {
        value = value.replace(/"/, '\\"');
        attrString += "=\"" + value + "\"";
      }

      return attrString;
    }

    function EndTag() {
      Tag.apply(this, arguments);
    }

    EndTag.prototype = objectCreate(Tag.prototype);
    EndTag.prototype.type = 'EndTag';
    EndTag.prototype.constructor = EndTag;

    EndTag.prototype.toHTML = function() {
      var out = "</";
      out += this.tagName;
      out += ">";

      return out;
    };

    function Chars(chars) {
      this.chars = chars || "";
    }

    Chars.prototype = {
      type: 'Chars',
      constructor: Chars,

      addChar: function(char) {
        this.chars += char;
      },

      toHTML: function() {
        return this.chars;
      }
    };

    function CommentToken(chars) {
      this.chars = chars || "";
    }

    CommentToken.prototype = {
      type: 'CommentToken',
      constructor: CommentToken,

      finalize: function() { return this; },

      addChar: function(char) {
        this.chars += char;
      },

      toHTML: function() {
        return "<!--" + this.chars + "-->";
      }
    };

    function tokenize(input) {
      var tokenizer = new Tokenizer(input);
      return tokenizer.tokenize();
    }

    function generate(tokens) {
      var output = "";

      for (var i=0, l=tokens.length; i<l; i++) {
        output += tokens[i].toHTML();
      }

      return output;
    }

    var config = {
      generateAttributes: generateAttributes,
      generateAttribute: generateAttribute,
      generateTag: generateTag
    };

    var original = {
      generateAttributes: generateAttributes,
      generateAttribute: generateAttribute,
      generateTag: generateTag
    };

    function configure(name, value) {
      config[name] = value;
    }

    __exports__.Tokenizer = Tokenizer;
    __exports__.tokenize = tokenize;
    __exports__.generate = generate;
    __exports__.configure = configure;
    __exports__.original = original;
    __exports__.StartTag = StartTag;
    __exports__.EndTag = EndTag;
    __exports__.Chars = Chars;
    __exports__.CommentToken = CommentToken;
  });
//# sourceMappingURL=rebound.amd.js.map