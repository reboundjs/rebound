"use strict";

/*jshint -W054 */
// jshint ignore: start

// A second optional argument can be given to further configure
// the parser process. These options are recognized:

var exports = {};

var options, input, inputLen, sourceFile;

var defaultOptions = exports.defaultOptions = {
  // `ecmaVersion` indicates the ECMAScript version to parse. Must
  // be either 3, or 5, or 6. This influences support for strict
  // mode, the set of reserved words, support for getters and
  // setters and other features. ES6 support is only partial.
  ecmaVersion: 5,
  // Turn on `strictSemicolons` to prevent the parser from doing
  // automatic semicolon insertion.
  strictSemicolons: false,
  // When `allowTrailingCommas` is false, the parser will not allow
  // trailing commas in array and object literals.
  allowTrailingCommas: true,
  // By default, reserved words are not enforced. Enable
  // `forbidReserved` to enforce them. When this option has the
  // value "everywhere", reserved words and keywords can also not be
  // used as property names.
  forbidReserved: false,
  // When enabled, a return at the top level is not considered an
  // error.
  allowReturnOutsideFunction: false,
  // When `locations` is on, `loc` properties holding objects with
  // `start` and `end` properties in `{line, column}` form (with
  // line being 1-based and column 0-based) will be attached to the
  // nodes.
  locations: false,
  // A function can be passed as `onComment` option, which will
  // cause Acorn to call that function with `(block, text, start,
  // end)` parameters whenever a comment is skipped. `block` is a
  // boolean indicating whether this is a block (`/* */`) comment,
  // `text` is the content of the comment, and `start` and `end` are
  // character offsets that denote the start and end of the comment.
  // When the `locations` option is on, two more parameters are
  // passed, the full `{line, column}` locations of the start and
  // end of the comments. Note that you are not allowed to call the
  // parser from the callback—that will corrupt its internal state.
  onComment: null,
  // Nodes have their start and end characters offsets recorded in
  // `start` and `end` properties (directly on the node, rather than
  // the `loc` object, which holds line/column data. To also add a
  // [semi-standardized][range] `range` property holding a `[start,
  // end]` array with the same numbers, set the `ranges` option to
  // `true`.
  //
  // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
  ranges: false,
  // It is possible to parse multiple files into a single AST by
  // passing the tree produced by parsing the first file as
  // `program` option in subsequent parses. This will add the
  // toplevel forms of the parsed file to the `Program` (top) node
  // of an existing parse tree.
  program: null,
  // When `locations` is on, you can pass this to record the source
  // file in every node's `loc` object.
  sourceFile: null,
  // This value, if given, is stored in every node, whether
  // `locations` is on or off.
  directSourceFile: null
};

function setOptions(opts) {
  options = opts || {};
  for (var opt in defaultOptions) if (!Object.prototype.hasOwnProperty.call(options, opt)) options[opt] = defaultOptions[opt];
  sourceFile = options.sourceFile || null;

  isKeyword = options.ecmaVersion >= 6 ? isEcma6Keyword : isEcma5AndLessKeyword;
}

// The `getLineInfo` function is mostly useful when the
// `locations` option is off (for performance reasons) and you
// want to find the line/column position for a given character
// offset. `input` should be the code string that the offset refers
// into.

var getLineInfo = exports.getLineInfo = function (input, offset) {
  for (var line = 1, cur = 0;;) {
    lineBreak.lastIndex = cur;
    var match = lineBreak.exec(input);
    if (match && match.index < offset) {
      ++line;
      cur = match.index + match[0].length;
    } else break;
  }
  return { line: line, column: offset - cur };
};

// Acorn is organized as a tokenizer and a recursive-descent parser.
// The `tokenize` export provides an interface to the tokenizer.
// Because the tokenizer is optimized for being efficiently used by
// the Acorn parser itself, this interface is somewhat crude and not
// very modular. Performing another parse or call to `tokenize` will
// reset the internal state, and invalidate existing tokenizers.

exports.tokenize = function (inpt, opts) {
  var getToken = function (forceRegexp) {
    lastEnd = tokEnd;
    readToken(forceRegexp);
    t.start = tokStart;t.end = tokEnd;
    t.startLoc = tokStartLoc;t.endLoc = tokEndLoc;
    t.type = tokType;t.value = tokVal;
    return t;
  };

  input = String(inpt);inputLen = input.length;
  setOptions(opts);
  initTokenState();

  var t = {};
  getToken.jumpTo = function (pos, reAllowed) {
    tokPos = pos;
    if (options.locations) {
      tokCurLine = 1;
      tokLineStart = lineBreak.lastIndex = 0;
      var match;
      while ((match = lineBreak.exec(input)) && match.index < pos) {
        ++tokCurLine;
        tokLineStart = match.index + match[0].length;
      }
    }
    tokRegexpAllowed = reAllowed;
    skipSpace();
  };
  return getToken;
};

// State is kept in (closure-)global variables. We already saw the
// `options`, `input`, and `inputLen` variables above.

// The current position of the tokenizer in the input.

var tokPos;

// The start and end offsets of the current token.

var tokStart, tokEnd;

// When `options.locations` is true, these hold objects
// containing the tokens start and end line/column pairs.

var tokStartLoc, tokEndLoc;

// The type and value of the current token. Token types are objects,
// named by variables against which they can be compared, and
// holding properties that describe them (indicating, for example,
// the precedence of an infix operator, and the original name of a
// keyword token). The kind of value that's held in `tokVal` depends
// on the type of the token. For literals, it is the literal value,
// for operators, the operator name, and so on.

var tokType, tokVal;

// Interal state for the tokenizer. To distinguish between division
// operators and regular expressions, it remembers whether the last
// token was one that is allowed to be followed by an expression.
// (If it is, a slash is probably a regexp, if it isn't it's a
// division operator. See the `parseStatement` function for a
// caveat.)

var tokRegexpAllowed;

// When `options.locations` is true, these are used to keep
// track of the current line, and know when a new line has been
// entered.

var tokCurLine, tokLineStart;

// These store the position of the previous token, which is useful
// when finishing a node and assigning its `end` position.

var lastStart, lastEnd, lastEndLoc;

// This is the parser's state. `inFunction` is used to reject
// `return` statements outside of functions, `labels` to verify that
// `break` and `continue` have somewhere to jump to, and `strict`
// indicates whether strict mode is on.

var inFunction, labels, strict;

// This function is used to raise exceptions on parse errors. It
// takes an offset integer (into the current `input`) to indicate
// the location of the error, attaches the position to the end
// of the error message, and then raises a `SyntaxError` with that
// message.

function raise(pos, message) {
  var loc = getLineInfo(input, pos);
  message += " (" + loc.line + ":" + loc.column + ")";
  var err = new SyntaxError(message);
  err.pos = pos;err.loc = loc;err.raisedAt = tokPos;
  throw err;
}

// Reused empty array added for node fields that are always empty.

var empty = [];

// ## Token types

// The assignment of fine-grained, information-carrying type objects
// allows the tokenizer to store the information it has about a
// token in a way that is very cheap for the parser to look up.

// All token type variables start with an underscore, to make them
// easy to recognize.

// These are the general types. The `type` property is only used to
// make them recognizeable when debugging.

var _num = { type: "num" },
    _regexp = { type: "regexp" },
    _string = { type: "string" };
var _name = { type: "name" },
    _eof = { type: "eof" };

// Keyword tokens. The `keyword` property (also used in keyword-like
// operators) indicates that the token originated from an
// identifier-like word, which is used when parsing property names.
//
// The `beforeExpr` property is used to disambiguate between regular
// expressions and divisions. It is set on all token types that can
// be followed by an expression (thus, a slash after them would be a
// regular expression).
//
// `isLoop` marks a keyword as starting a loop, which is important
// to know when parsing a label, in order to allow or disallow
// continue jumps to that label.

var _break = { keyword: "break" },
    _case = { keyword: "case", beforeExpr: true },
    _catch = { keyword: "catch" };
var _continue = { keyword: "continue" },
    _debugger = { keyword: "debugger" },
    _default = { keyword: "default" };
var _do = { keyword: "do", isLoop: true },
    _else = { keyword: "else", beforeExpr: true };
var _finally = { keyword: "finally" },
    _for = { keyword: "for", isLoop: true },
    _function = { keyword: "function" };
var _if = { keyword: "if" },
    _return = { keyword: "return", beforeExpr: true },
    _switch = { keyword: "switch" };
var _throw = { keyword: "throw", beforeExpr: true },
    _try = { keyword: "try" },
    _var = { keyword: "var" };
var _let = { keyword: "let" },
    _const = { keyword: "const" };
var _while = { keyword: "while", isLoop: true },
    _with = { keyword: "with" },
    _new = { keyword: "new", beforeExpr: true };
var _this = { keyword: "this" };

// The keywords that denote values.

var _null = { keyword: "null", atomValue: null },
    _true = { keyword: "true", atomValue: true };
var _false = { keyword: "false", atomValue: false };

// Some keywords are treated as regular operators. `in` sometimes
// (when parsing `for`) needs to be tested against specifically, so
// we assign a variable name to it for quick comparing.

var _in = { keyword: "in", binop: 7, beforeExpr: true };

// Map keyword names to token types.

var keywordTypes = { "break": _break, "case": _case, "catch": _catch,
  "continue": _continue, "debugger": _debugger, "default": _default,
  "do": _do, "else": _else, "finally": _finally, "for": _for,
  "function": _function, "if": _if, "return": _return, "switch": _switch,
  "throw": _throw, "try": _try, "var": _var, "let": _let, "const": _const,
  "while": _while, "with": _with,
  "null": _null, "true": _true, "false": _false, "new": _new, "in": _in,
  "instanceof": { keyword: "instanceof", binop: 7, beforeExpr: true }, "this": _this,
  "typeof": { keyword: "typeof", prefix: true, beforeExpr: true },
  "void": { keyword: "void", prefix: true, beforeExpr: true },
  "delete": { keyword: "delete", prefix: true, beforeExpr: true } };

// Punctuation token types. Again, the `type` property is purely for debugging.

var _bracketL = { type: "[", beforeExpr: true },
    _bracketR = { type: "]" },
    _braceL = { type: "{", beforeExpr: true };
var _braceR = { type: "}" },
    _parenL = { type: "(", beforeExpr: true },
    _parenR = { type: ")" };
var _comma = { type: ",", beforeExpr: true },
    _semi = { type: ";", beforeExpr: true };
var _colon = { type: ":", beforeExpr: true },
    _dot = { type: "." },
    _ellipsis = { type: "..." },
    _question = { type: "?", beforeExpr: true };

// Operators. These carry several kinds of properties to help the
// parser use them properly (the presence of these properties is
// what categorizes them as operators).
//
// `binop`, when present, specifies that this operator is a binary
// operator, and will refer to its precedence.
//
// `prefix` and `postfix` mark the operator as a prefix or postfix
// unary operator. `isUpdate` specifies that the node produced by
// the operator should be of type UpdateExpression rather than
// simply UnaryExpression (`++` and `--`).
//
// `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
// binary operators with a very low precedence, that should result
// in AssignmentExpression nodes.

var _slash = { binop: 10, beforeExpr: true },
    _eq = { isAssign: true, beforeExpr: true };
var _assign = { isAssign: true, beforeExpr: true };
var _incDec = { postfix: true, prefix: true, isUpdate: true },
    _prefix = { prefix: true, beforeExpr: true };
var _logicalOR = { binop: 1, beforeExpr: true };
var _logicalAND = { binop: 2, beforeExpr: true };
var _bitwiseOR = { binop: 3, beforeExpr: true };
var _bitwiseXOR = { binop: 4, beforeExpr: true };
var _bitwiseAND = { binop: 5, beforeExpr: true };
var _equality = { binop: 6, beforeExpr: true };
var _relational = { binop: 7, beforeExpr: true };
var _bitShift = { binop: 8, beforeExpr: true };
var _plusMin = { binop: 9, prefix: true, beforeExpr: true };
var _multiplyModulo = { binop: 10, beforeExpr: true };

// Provide access to the token types for external users of the
// tokenizer.

exports.tokTypes = { bracketL: _bracketL, bracketR: _bracketR, braceL: _braceL, braceR: _braceR,
  parenL: _parenL, parenR: _parenR, comma: _comma, semi: _semi, colon: _colon,
  dot: _dot, ellipsis: _ellipsis, question: _question, slash: _slash, eq: _eq,
  name: _name, eof: _eof, num: _num, regexp: _regexp, string: _string };
for (var kw in keywordTypes) exports.tokTypes["_" + kw] = keywordTypes[kw];

// This is a trick taken from Esprima. It turns out that, on
// non-Chrome browsers, to check whether a string is in a set, a
// predicate containing a big ugly `switch` statement is faster than
// a regular expression, and on Chrome the two are about on par.
// This function uses `eval` (non-lexical) to produce such a
// predicate from a space-separated string of words.
//
// It starts by sorting the words by length.

function makePredicate(words) {
  var compareTo = function (arr) {
    if (arr.length == 1) return f += "return str === " + JSON.stringify(arr[0]) + ";";
    f += "switch(str){";
    for (var i = 0; i < arr.length; ++i) f += "case " + JSON.stringify(arr[i]) + ":";
    f += "return true}return false;";
  };

  words = words.split(" ");
  var f = "",
      cats = [];
  out: for (var i = 0; i < words.length; ++i) {
    for (var j = 0; j < cats.length; ++j) if (cats[j][0].length == words[i].length) {
      cats[j].push(words[i]);
      continue out;
    }
    cats.push([words[i]]);
  }


  // When there are more than three length categories, an outer
  // switch first dispatches on the lengths, to save on comparisons.

  if (cats.length > 3) {
    cats.sort(function (a, b) {
      return b.length - a.length;
    });
    f += "switch(str.length){";
    for (var i = 0; i < cats.length; ++i) {
      var cat = cats[i];
      f += "case " + cat[0].length + ":";
      compareTo(cat);
    }
    f += "}";

    // Otherwise, simply generate a flat `switch` statement.
  } else {
    compareTo(words);
  }
  return new Function("str", f);
}

// The ECMAScript 3 reserved word list.

var isReservedWord3 = makePredicate("abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile");

// ECMAScript 5 reserved words.

var isReservedWord5 = makePredicate("class enum extends super const export import");

// The additional reserved words in strict mode.

var isStrictReservedWord = makePredicate("implements interface let package private protected public static yield");

// The forbidden variable names in strict mode.

var isStrictBadIdWord = makePredicate("eval arguments");

// And the keywords.

var ecma5AndLessKeywords = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this";

var isEcma5AndLessKeyword = makePredicate(ecma5AndLessKeywords);

var isEcma6Keyword = makePredicate(ecma5AndLessKeywords + " let const");

var isKeyword = isEcma5AndLessKeyword;

// ## Character categories

// Big ugly regular expressions that match characters in the
// whitespace, identifier, and identifier-start categories. These
// are only applied when a character is found to actually have a
// code point above 128.

var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;
var nonASCIIidentifierStartChars = "ªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶͷͺ-ͽΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԧԱ-Ֆՙա-ևא-תװ-ײؠ-يٮٯٱ-ۓەۥۦۮۯۺ-ۼۿܐܒ-ܯݍ-ޥޱߊ-ߪߴߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࢠࢢ-ࢬऄ-हऽॐक़-ॡॱ-ॷॹ-ॿঅ-ঌএঐও-নপ-রলশ-হঽৎড়ঢ়য়-ৡৰৱਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹਖ਼-ੜਫ਼ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલળવ-હઽૐૠૡଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହଽଡ଼ଢ଼ୟ-ୡୱஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹௐఅ-ఌఎ-ఐఒ-నప-ళవ-హఽౘౙౠౡಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽೞೠೡೱೲഅ-ഌഎ-ഐഒ-ഺഽൎൠൡൺ-ൿඅ-ඖක-නඳ-රලව-ෆก-ะาำเ-ๆກຂຄງຈຊຍດ-ທນ-ຟມ-ຣລວສຫອ-ະາຳຽເ-ໄໆໜ-ໟༀཀ-ཇཉ-ཬྈ-ྌက-ဪဿၐ-ၕၚ-ၝၡၥၦၮ-ၰၵ-ႁႎႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚᎀ-ᎏᎠ-Ᏼᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛰᜀ-ᜌᜎ-ᜑᜠ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜᠠ-ᡷᢀ-ᢨᢪᢰ-ᣵᤀ-ᤜᥐ-ᥭᥰ-ᥴᦀ-ᦫᧁ-ᧇᨀ-ᨖᨠ-ᩔᪧᬅ-ᬳᭅ-ᭋᮃ-ᮠᮮᮯᮺ-ᯥᰀ-ᰣᱍ-ᱏᱚ-ᱽᳩ-ᳬᳮ-ᳱᳵᳶᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼⁱⁿₐ-ₜℂℇℊ-ℓℕℙ-ℝℤΩℨK-ℭℯ-ℹℼ-ℿⅅ-ⅉⅎⅠ-ↈⰀ-Ⱞⰰ-ⱞⱠ-ⳤⳫ-ⳮⳲⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞⸯ々-〇〡-〩〱-〵〸-〼ぁ-ゖゝ-ゟァ-ヺー-ヿㄅ-ㄭㄱ-ㆎㆠ-ㆺㇰ-ㇿ㐀-䶵一-鿌ꀀ-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘟꘪꘫꙀ-ꙮꙿ-ꚗꚠ-ꛯꜗ-ꜟꜢ-ꞈꞋ-ꞎꞐ-ꞓꞠ-Ɦꟸ-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢꡀ-ꡳꢂ-ꢳꣲ-ꣷꣻꤊ-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏꨀ-ꨨꩀ-ꩂꩄ-ꩋꩠ-ꩶꩺꪀ-ꪯꪱꪵꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꯀ-ꯢ가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּסּףּפּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼＡ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ";
var nonASCIIidentifierChars = "̀-ͯ҃-֑҇-ׇֽֿׁׂׅׄؐ-ؚؠ-ىٲ-ۓۧ-ۨۻ-ۼܰ-݊ࠀ-ࠔࠛ-ࠣࠥ-ࠧࠩ-࠭ࡀ-ࡗࣤ-ࣾऀ-ःऺ-़ा-ॏ॑-ॗॢ-ॣ०-९ঁ-ঃ়া-ৄেৈৗয়-ৠਁ-ਃ਼ਾ-ੂੇੈੋ-੍ੑ੦-ੱੵઁ-ઃ઼ા-ૅે-ૉો-્ૢ-ૣ૦-૯ଁ-ଃ଼ା-ୄେୈୋ-୍ୖୗୟ-ୠ୦-୯ஂா-ூெ-ைொ-்ௗ௦-௯ఁ-ఃె-ైొ-్ౕౖౢ-ౣ౦-౯ಂಃ಼ಾ-ೄೆ-ೈೊ-್ೕೖೢ-ೣ೦-೯ംഃെ-ൈൗൢ-ൣ൦-൯ංඃ්ා-ුූෘ-ෟෲෳิ-ฺเ-ๅ๐-๙ິ-ູ່-ໍ໐-໙༘༙༠-༩༹༵༷ཁ-ཇཱ-྄྆-྇ྍ-ྗྙ-ྼ࿆က-ဩ၀-၉ၧ-ၭၱ-ၴႂ-ႍႏ-ႝ፝-፟ᜎ-ᜐᜠ-ᜰᝀ-ᝐᝲᝳក-ឲ៝០-៩᠋-᠍᠐-᠙ᤠ-ᤫᤰ-᤻ᥑ-ᥭᦰ-ᧀᧈ-ᧉ᧐-᧙ᨀ-ᨕᨠ-ᩓ᩠-᩿᩼-᪉᪐-᪙ᭆ-ᭋ᭐-᭙᭫-᭳᮰-᮹᯦-᯳ᰀ-ᰢ᱀-᱉ᱛ-ᱽ᳐-᳒ᴀ-ᶾḁ-ἕ‌‍‿⁀⁔⃐-⃥⃜⃡-⃰ⶁ-ⶖⷠ-ⷿ〡-〨゙゚Ꙁ-ꙭꙴ-꙽ꚟ꛰-꛱ꟸ-ꠀ꠆ꠋꠣ-ꠧꢀ-ꢁꢴ-꣄꣐-꣙ꣳ-ꣷ꤀-꤉ꤦ-꤭ꤰ-ꥅꦀ-ꦃ꦳-꧀ꨀ-ꨧꩀ-ꩁꩌ-ꩍ꩐-꩙ꩻꫠ-ꫩꫲ-ꫳꯀ-ꯡ꯬꯭꯰-꯹ﬠ-ﬨ︀-️︠-︦︳︴﹍-﹏０-９＿";
var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

// Whether a single character denotes a newline.

var newline = /[\n\r\u2028\u2029]/;

// Matches a whole line break (where CRLF is considered a single
// line break). Used to count lines.

var lineBreak = /\r\n|[\n\r\u2028\u2029]/g;

// Test whether a given character code starts an identifier.

var isIdentifierStart = exports.isIdentifierStart = function (code) {
  if (code < 65) return code === 36;
  if (code < 91) return true;
  if (code < 97) return code === 95;
  if (code < 123) return true;
  return code >= 170 && nonASCIIidentifierStart.test(String.fromCharCode(code));
};

// Test whether a given character is part of an identifier.

var isIdentifierChar = exports.isIdentifierChar = function (code) {
  if (code < 48) return code === 36;
  if (code < 58) return true;
  if (code < 65) return false;
  if (code < 91) return true;
  if (code < 97) return code === 95;
  if (code < 123) return true;
  return code >= 170 && nonASCIIidentifier.test(String.fromCharCode(code));
};

// ## Tokenizer

// These are used when `options.locations` is on, for the
// `tokStartLoc` and `tokEndLoc` properties.

function Position() {
  this.line = tokCurLine;
  this.column = tokPos - tokLineStart;
}

// Reset the token state. Used at the start of a parse.

function initTokenState() {
  tokCurLine = 1;
  tokPos = tokLineStart = 0;
  tokRegexpAllowed = true;
  skipSpace();
}

// Called at the end of every token. Sets `tokEnd`, `tokVal`, and
// `tokRegexpAllowed`, and skips the space after the token, so that
// the next one's `tokStart` will point at the right position.

function finishToken(type, val) {
  tokEnd = tokPos;
  if (options.locations) tokEndLoc = new Position();
  tokType = type;
  skipSpace();
  tokVal = val;
  tokRegexpAllowed = type.beforeExpr;
}

function skipBlockComment() {
  var startLoc = options.onComment && options.locations && new Position();
  var start = tokPos,
      end = input.indexOf("*/", tokPos += 2);
  if (end === -1) raise(tokPos - 2, "Unterminated comment");
  tokPos = end + 2;
  if (options.locations) {
    lineBreak.lastIndex = start;
    var match;
    while ((match = lineBreak.exec(input)) && match.index < tokPos) {
      ++tokCurLine;
      tokLineStart = match.index + match[0].length;
    }
  }
  if (options.onComment) options.onComment(true, input.slice(start + 2, end), start, tokPos, startLoc, options.locations && new Position());
}

function skipLineComment() {
  var start = tokPos;
  var startLoc = options.onComment && options.locations && new Position();
  var ch = input.charCodeAt(tokPos += 2);
  while (tokPos < inputLen && ch !== 10 && ch !== 13 && ch !== 8232 && ch !== 8233) {
    ++tokPos;
    ch = input.charCodeAt(tokPos);
  }
  if (options.onComment) options.onComment(false, input.slice(start + 2, tokPos), start, tokPos, startLoc, options.locations && new Position());
}

// Called at the start of the parse and after every token. Skips
// whitespace and comments, and.

function skipSpace() {
  while (tokPos < inputLen) {
    var ch = input.charCodeAt(tokPos);
    if (ch === 32) {
      // ' '
      ++tokPos;
    } else if (ch === 13) {
      ++tokPos;
      var next = input.charCodeAt(tokPos);
      if (next === 10) {
        ++tokPos;
      }
      if (options.locations) {
        ++tokCurLine;
        tokLineStart = tokPos;
      }
    } else if (ch === 10 || ch === 8232 || ch === 8233) {
      ++tokPos;
      if (options.locations) {
        ++tokCurLine;
        tokLineStart = tokPos;
      }
    } else if (ch > 8 && ch < 14) {
      ++tokPos;
    } else if (ch === 47) {
      // '/'
      var next = input.charCodeAt(tokPos + 1);
      if (next === 42) {
        // '*'
        skipBlockComment();
      } else if (next === 47) {
        // '/'
        skipLineComment();
      } else break;
    } else if (ch === 160) {
      // '\xa0'
      ++tokPos;
    } else if (ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
      ++tokPos;
    } else {
      break;
    }
  }
}

// ### Token reading

// This is the function that is called to fetch the next token. It
// is somewhat obscure, because it works in character codes rather
// than characters, and because operator parsing has been inlined
// into it.
//
// All in the name of speed.
//
// The `forceRegexp` parameter is used in the one case where the
// `tokRegexpAllowed` trick does not work. See `parseStatement`.

function readToken_dot() {
  var next = input.charCodeAt(tokPos + 1);
  if (next >= 48 && next <= 57) return readNumber(true);
  var next2 = input.charCodeAt(tokPos + 2);
  if (options.ecmaVersion >= 6 && next === 46 && next2 === 46) {
    // 46 = dot '.'
    tokPos += 3;
    return finishToken(_ellipsis);
  } else {
    ++tokPos;
    return finishToken(_dot);
  }
}

function readToken_slash() {
  // '/'
  var next = input.charCodeAt(tokPos + 1);
  if (tokRegexpAllowed) {
    ++tokPos;return readRegexp();
  }
  if (next === 61) return finishOp(_assign, 2);
  return finishOp(_slash, 1);
}

function readToken_mult_modulo() {
  // '%*'
  var next = input.charCodeAt(tokPos + 1);
  if (next === 61) return finishOp(_assign, 2);
  return finishOp(_multiplyModulo, 1);
}

function readToken_pipe_amp(code) {
  // '|&'
  var next = input.charCodeAt(tokPos + 1);
  if (next === code) return finishOp(code === 124 ? _logicalOR : _logicalAND, 2);
  if (next === 61) return finishOp(_assign, 2);
  return finishOp(code === 124 ? _bitwiseOR : _bitwiseAND, 1);
}

function readToken_caret() {
  // '^'
  var next = input.charCodeAt(tokPos + 1);
  if (next === 61) return finishOp(_assign, 2);
  return finishOp(_bitwiseXOR, 1);
}

function readToken_plus_min(code) {
  // '+-'
  var next = input.charCodeAt(tokPos + 1);
  if (next === code) {
    if (next == 45 && input.charCodeAt(tokPos + 2) == 62 && newline.test(input.slice(lastEnd, tokPos))) {
      // A `-->` line comment
      tokPos += 3;
      skipLineComment();
      skipSpace();
      return readToken();
    }
    return finishOp(_incDec, 2);
  }
  if (next === 61) return finishOp(_assign, 2);
  return finishOp(_plusMin, 1);
}

function readToken_lt_gt(code) {
  // '<>'
  var next = input.charCodeAt(tokPos + 1);
  var size = 1;
  if (next === code) {
    size = code === 62 && input.charCodeAt(tokPos + 2) === 62 ? 3 : 2;
    if (input.charCodeAt(tokPos + size) === 61) return finishOp(_assign, size + 1);
    return finishOp(_bitShift, size);
  }
  if (next == 33 && code == 60 && input.charCodeAt(tokPos + 2) == 45 && input.charCodeAt(tokPos + 3) == 45) {
    // `<!--`, an XML-style comment that should be interpreted as a line comment
    tokPos += 4;
    skipLineComment();
    skipSpace();
    return readToken();
  }
  if (next === 61) size = input.charCodeAt(tokPos + 2) === 61 ? 3 : 2;
  return finishOp(_relational, size);
}

function readToken_eq_excl(code) {
  // '=!'
  var next = input.charCodeAt(tokPos + 1);
  if (next === 61) return finishOp(_equality, input.charCodeAt(tokPos + 2) === 61 ? 3 : 2);
  return finishOp(code === 61 ? _eq : _prefix, 1);
}

function getTokenFromCode(code) {
  switch (code) {
    // The interpretation of a dot depends on whether it is followed
    // by a digit or another two dots.
    case 46:
      // '.'
      return readToken_dot();

    // Punctuation tokens.
    case 40:
      ++tokPos;return finishToken(_parenL);
    case 41:
      ++tokPos;return finishToken(_parenR);
    case 59:
      ++tokPos;return finishToken(_semi);
    case 44:
      ++tokPos;return finishToken(_comma);
    case 91:
      ++tokPos;return finishToken(_bracketL);
    case 93:
      ++tokPos;return finishToken(_bracketR);
    case 123:
      ++tokPos;return finishToken(_braceL);
    case 125:
      ++tokPos;return finishToken(_braceR);
    case 58:
      ++tokPos;return finishToken(_colon);
    case 63:
      ++tokPos;return finishToken(_question);

    // '0x' is a hexadecimal number.
    case 48:
      // '0'
      var next = input.charCodeAt(tokPos + 1);
      if (next === 120 || next === 88) return readHexNumber();
    // Anything else beginning with a digit is an integer, octal
    // number, or float.
    /* falls through */
    case 49:
    case 50:
    case 51:
    case 52:
    case 53:
    case 54:
    case 55:
    case 56:
    case 57:
      // 1-9
      return readNumber(false);

    // Quotes produce strings.
    case 34:
    case 39:
      // '"', "'"
      return readString(code);

    // Operators are parsed inline in tiny state machines. '=' (61) is
    // often referred to. `finishOp` simply skips the amount of
    // characters it is given as second argument, and returns a token
    // of the type given by its first argument.

    case 47:
      // '/'
      return readToken_slash();

    case 37:
    case 42:
      // '%*'
      return readToken_mult_modulo();

    case 124:
    case 38:
      // '|&'
      return readToken_pipe_amp(code);

    case 94:
      // '^'
      return readToken_caret();

    case 43:
    case 45:
      // '+-'
      return readToken_plus_min(code);

    case 60:
    case 62:
      // '<>'
      return readToken_lt_gt(code);

    case 61:
    case 33:
      // '=!'
      return readToken_eq_excl(code);

    case 126:
      // '~'
      return finishOp(_prefix, 1);
  }

  return false;
}

function readToken(forceRegexp) {
  if (!forceRegexp) tokStart = tokPos;else tokPos = tokStart + 1;
  if (options.locations) tokStartLoc = new Position();
  if (forceRegexp) return readRegexp();
  if (tokPos >= inputLen) return finishToken(_eof);

  var code = input.charCodeAt(tokPos);
  // Identifier or keyword. '\uXXXX' sequences are allowed in
  // identifiers, so '\' also dispatches to that.
  if (isIdentifierStart(code) || code === 92 /* '\' */) return readWord();

  var tok = getTokenFromCode(code);

  if (tok === false) {
    // If we are here, we either found a non-ASCII identifier
    // character, or something that's entirely disallowed.
    var ch = String.fromCharCode(code);
    if (ch === "\\" || nonASCIIidentifierStart.test(ch)) return readWord();
    raise(tokPos, "Unexpected character '" + ch + "'");
  }
  return tok;
}

function finishOp(type, size) {
  var str = input.slice(tokPos, tokPos + size);
  tokPos += size;
  finishToken(type, str);
}

// Parse a regular expression. Some context-awareness is necessary,
// since a '/' inside a '[]' set does not end the expression.

function readRegexp() {
  var content = "",
      escaped,
      inClass,
      start = tokPos;
  for (;;) {
    if (tokPos >= inputLen) raise(start, "Unterminated regular expression");
    var ch = input.charAt(tokPos);
    if (newline.test(ch)) raise(start, "Unterminated regular expression");
    if (!escaped) {
      if (ch === "[") inClass = true;else if (ch === "]" && inClass) inClass = false;else if (ch === "/" && !inClass) break;
      escaped = ch === "\\";
    } else escaped = false;
    ++tokPos;
  }
  var content = input.slice(start, tokPos);
  ++tokPos;
  // Need to use `readWord1` because '\uXXXX' sequences are allowed
  // here (don't ask).
  var mods = readWord1();
  if (mods && !/^[gmsiy]*$/.test(mods)) raise(start, "Invalid regular expression flag");
  try {
    var value = new RegExp(content, mods);
  } catch (e) {
    if (e instanceof SyntaxError) raise(start, "Error parsing regular expression: " + e.message);
    raise(e);
  }
  return finishToken(_regexp, value);
}

// Read an integer in the given radix. Return null if zero digits
// were read, the integer value otherwise. When `len` is given, this
// will return `null` unless the integer has exactly `len` digits.

function readInt(radix, len) {
  var start = tokPos,
      total = 0;
  for (var i = 0, e = len == null ? Infinity : len; i < e; ++i) {
    var code = input.charCodeAt(tokPos),
        val;
    if (code >= 97) val = code - 97 + 10; // a
    else if (code >= 65) val = code - 65 + 10; // A
    else if (code >= 48 && code <= 57) val = code - 48; // 0-9
    else val = Infinity;
    if (val >= radix) break;
    ++tokPos;
    total = total * radix + val;
  }
  if (tokPos === start || len != null && tokPos - start !== len) return null;

  return total;
}

function readHexNumber() {
  tokPos += 2; // 0x
  var val = readInt(16);
  if (val == null) raise(tokStart + 2, "Expected hexadecimal number");
  if (isIdentifierStart(input.charCodeAt(tokPos))) raise(tokPos, "Identifier directly after number");
  return finishToken(_num, val);
}

// Read an integer, octal integer, or floating-point number.

function readNumber(startsWithDot) {
  var start = tokPos,
      isFloat = false,
      octal = input.charCodeAt(tokPos) === 48;
  if (!startsWithDot && readInt(10) === null) raise(start, "Invalid number");
  if (input.charCodeAt(tokPos) === 46) {
    ++tokPos;
    readInt(10);
    isFloat = true;
  }
  var next = input.charCodeAt(tokPos);
  if (next === 69 || next === 101) {
    // 'eE'
    next = input.charCodeAt(++tokPos);
    if (next === 43 || next === 45) ++tokPos; // '+-'
    if (readInt(10) === null) raise(start, "Invalid number");
    isFloat = true;
  }
  if (isIdentifierStart(input.charCodeAt(tokPos))) raise(tokPos, "Identifier directly after number");

  var str = input.slice(start, tokPos),
      val;
  if (isFloat) val = parseFloat(str);else if (!octal || str.length === 1) val = parseInt(str, 10);else if (/[89]/.test(str) || strict) raise(start, "Invalid number");else val = parseInt(str, 8);
  return finishToken(_num, val);
}

// Read a string value, interpreting backslash-escapes.

function readString(quote) {
  tokPos++;
  var out = "";
  for (;;) {
    if (tokPos >= inputLen) raise(tokStart, "Unterminated string constant");
    var ch = input.charCodeAt(tokPos);
    if (ch === quote) {
      ++tokPos;
      return finishToken(_string, out);
    }
    if (ch === 92) {
      // '\'
      ch = input.charCodeAt(++tokPos);
      var octal = /^[0-7]+/.exec(input.slice(tokPos, tokPos + 3));
      if (octal) octal = octal[0];
      while (octal && parseInt(octal, 8) > 255) octal = octal.slice(0, -1);
      if (octal === "0") octal = null;
      ++tokPos;
      if (octal) {
        if (strict) raise(tokPos - 2, "Octal literal in strict mode");
        out += String.fromCharCode(parseInt(octal, 8));
        tokPos += octal.length - 1;
      } else {
        switch (ch) {
          case 110:
            out += "\n";break; // 'n' -> '\n'
          case 114:
            out += "\r";break; // 'r' -> '\r'
          case 120:
            out += String.fromCharCode(readHexChar(2));break; // 'x'
          case 117:
            out += String.fromCharCode(readHexChar(4));break; // 'u'
          case 85:
            out += String.fromCharCode(readHexChar(8));break; // 'U'
          case 116:
            out += "\t";break; // 't' -> '\t'
          case 98:
            out += "\b";break; // 'b' -> '\b'
          case 118:
            out += "\u000b";break; // 'v' -> '\u000b'
          case 102:
            out += "\f";break; // 'f' -> '\f'
          case 48:
            out += "\u0000";break; // 0 -> '\0'
          case 13:
            if (input.charCodeAt(tokPos) === 10) ++tokPos; // '\r\n'
          /* falls through */
          case 10:
            // ' \n'
            if (options.locations) {
              tokLineStart = tokPos;++tokCurLine;
            }
            break;
          default:
            out += String.fromCharCode(ch);break;
        }
      }
    } else {
      if (ch === 13 || ch === 10 || ch === 8232 || ch === 8233) raise(tokStart, "Unterminated string constant");
      out += String.fromCharCode(ch); // '\'
      ++tokPos;
    }
  }
}

// Used to read character escape sequences ('\x', '\u', '\U').

function readHexChar(len) {
  var n = readInt(16, len);
  if (n === null) raise(tokStart, "Bad character escape sequence");
  return n;
}

// Used to signal to callers of `readWord1` whether the word
// contained any escape sequences. This is needed because words with
// escape sequences must not be interpreted as keywords.

var containsEsc;

// Read an identifier, and return it as a string. Sets `containsEsc`
// to whether the word contained a '\u' escape.
//
// Only builds up the word character-by-character when it actually
// containeds an escape, as a micro-optimization.

function readWord1() {
  containsEsc = false;
  var word,
      first = true,
      start = tokPos;
  for (;;) {
    var ch = input.charCodeAt(tokPos);
    if (isIdentifierChar(ch)) {
      if (containsEsc) word += input.charAt(tokPos);
      ++tokPos;
    } else if (ch === 92) {
      // "\"
      if (!containsEsc) word = input.slice(start, tokPos);
      containsEsc = true;
      if (input.charCodeAt(++tokPos) != 117) // "u"
        raise(tokPos, "Expecting Unicode escape sequence \\uXXXX");
      ++tokPos;
      var esc = readHexChar(4);
      var escStr = String.fromCharCode(esc);
      if (!escStr) raise(tokPos - 1, "Invalid Unicode escape");
      if (!(first ? isIdentifierStart(esc) : isIdentifierChar(esc))) raise(tokPos - 4, "Invalid Unicode escape");
      word += escStr;
    } else {
      break;
    }
    first = false;
  }
  return containsEsc ? word : input.slice(start, tokPos);
}

// Read an identifier or keyword token. Will check for reserved
// words when necessary.

function readWord() {
  var word = readWord1();
  var type = _name;
  if (!containsEsc && isKeyword(word)) type = keywordTypes[word];
  return finishToken(type, word);
}


module.exports = { tokenize: exports.tokenize };