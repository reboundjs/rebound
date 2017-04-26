// Rebound Path Parser
// ---------------
// A utility class used to parse and process Rebound path strings.
//
//     var path = new Path('foo.bar[1].biz');
//     path.push('baz');
//     path.toString(); // 'foo.bar[1].biz.baz'
//

// Grammar constant defenitions
const INVALID_CHARS = {
        ':':1, '!':1, '"':1, '#':1, '%':1, '&':1, "'":1, '(':1, ')':1, '*':1, '+':1,
        ',':1, '/':1, ';':1, '<':1, '=':1, '>':1, '@':1, '[':1, '\\':1, ']':1, '^':1,
        '`':1, '{':1, '|':1, '}':1, '~':1
      },
      INT_CHARS = {
        '0':1, '1':1, '2':1, '3':1, '4':1, '5':1, '6':1, '7':1, '8':1, '9':1
      },
      WHITESPACE = /\s/,
      SEGMENT_SEPERATOR = '.',
      NAMESPACE_SEPERATOR = ':',
      ESCAPE_START = '[',
      ESCAPE_END = ']',
      WILDCARD_START = '@',
      SEPERATORS = {
        [SEGMENT_SEPERATOR]: 1,
        [NAMESPACE_SEPERATOR]: 1,
        [ESCAPE_START]: 1
      },
      WILDCARDS = {
        'all':    1,
        'each':   1,
        'parent': 1
      };

// Helper function for identifying character types.
function isInvalidChar(c)   { return !!INVALID_CHARS[c];        }
function isIntChar(c)       { return !!INT_CHARS[c];            }
function isSegmentSep(c)    { return SEGMENT_SEPERATOR === c;   }
function isNamespaceSep(c)  { return NAMESPACE_SEPERATOR === c; }
function isWildcardStart(c) { return WILDCARD_START === c;      }
function isEscapeStart(c)   { return ESCAPE_START === c;        }
function isEscapeEnd(c)     { return ESCAPE_END === c;          }
function isWhitespace(c)    { return c.match(WHITESPACE);       }

// Prototype agnostic helper for hasOwnProperty
function hasOwnProperty (obj, prop) { return {}.hasOwnProperty.call(obj, prop); }

// ### Tokenize

// **Tokenize** is a helper class that breaks a path string up into its constintuant
// parts. If `sanatize: true` is passed as an option, it will attempt to fix invalidly
// formatted paths while parsing. Returns an array of tokens of the format:
//
//     [
//       1: {
//         value: 'segment',
//         type: 'escaped' || 'segment' || 'wildcard' || 'namespace'
//       },
//       ...
//       isValid: Boolean,
//       hasWildcard: Boolean
//     ]
//
class Tokenize {

  constructor(input, options={}){

    // The actual return value of `Tokenize`, `parts` is built up as we parse the
    // `input`. Contains all the tokenized path values and state flags.
    var parts = this.parts = [];
    parts.isValid = true;
    parts.hasWildcard = false;

    // Segment specific state values.
    var segment = '';
    var escaped = false;

    // Internal state for our tokenizer
    this.input = input = options.sanatize ? String(input) : input;
    this.pos = 0;

    // Empty string and `.` *are* valid paths. Return empty `parts`.
    if ( input === '' || input === '.' ) return parts;

    // If input is not of type `string`, log error and exit.
    if ( typeof input !== 'string' ) {
      console.error('Expected string when parsing path. Instead received:', input);
      parts.isValid = false;
      return parts;
    }

    // If last character is a segment `.` or namespace `:` seperator, this is an invalid path.
    var last = input[input.length-1];
    if ( isSegmentSep(last) || isNamespaceSep(last) ) {
      if (options.sanatize) this.input = input = input.slice(0, -1);
      else {
        parts.isValid = false;
        return parts;
      }
    }

    // If first character is an invalid character, and asked to sanatize, begin forces escaping. Otherwise, fail.
    var char = this.next();
    if (isSegmentSep(char) || isNamespaceSep(char) || isIntChar(char)){
      if (options.sanatize) escaped = true;
      else {
        console.error(`Invalid start character found in path "${this.input}"`);
        parts.isValid = false;
        return parts;
      }
    }

    // #### Main tokenize loop.

    // For each character encountered:
    do {

      // **Handle wildcards:** `@wildcard`
      if ( isWildcardStart(char) && (isSegmentSep(this.lookback()) || isNamespaceSep(this.lookback()) || this.pos === 1) ) {
        let wildcard = this.skipTo(SEPERATORS);
        parts.hasWildcard = true;
        if (WILDCARDS[wildcard]) parts.push({value: WILDCARD_START + wildcard, type: 'wildcard'});
        else {
          if (options.sanatize) parts.push({value: WILDCARD_START + wildcard, type: 'escaped'});
          else {
            parts.isValid = false;
            console.error(`Invalid wildcard found in path "${this.input}"`);
          }
        }
      }

      // **Handle escaped paths:** `[escaped]`
      else if ( isEscapeStart(char) ) {

        // Finish off previous segment and reset state
        segment && parts.push({value: segment, type: escaped ? 'escaped' : 'segment'});
        segment = this.skipTo(ESCAPE_END);
        escaped = true;

        // If we've reached the end, there was no closing bracket! Fail.
        if (this.pos > this.input.length && this.input[this.input.length] !== ESCAPE_END) { parts.isValid = false; }

        if (options.sanatize){
          escaped = false;
          for (let i=0;i<segment.length;i++){
            if (!i && isIntChar(segment[i]) || isInvalidChar(segment[i])) escaped = true;
          }
        }

        parts.push({value: segment, type: escaped ? 'escaped' : 'segment'});
        char = this.next(); // Move past the escape Close
        segment = '';
        escaped = false;
      }

      // **Handle stray excape close characters:** `invalidpath]`
      else if ( isEscapeEnd(char) ){
        if (options.sanatize) parts.push({value: segment, type: escaped ? 'escaped' : 'segment'});
        else {
          console.error(`Invalid escape close "]" found in path "${this.input}"`);
          parts.isValid = false;
        }
        segment = '';
        escaped = false;
      }

      // **Handle namespace seperators:** `:`
      else if ( isNamespaceSep(char) ) {
        segment && parts.push({value: segment, type: escaped ? 'escaped' : 'segment'});
        segment = '';
        escaped = false;
        parts.push({value: char, type: 'namespace'});
      }

      // **Handle segment seperators:** `.`
      else if ( isSegmentSep(char) ) {
        segment && parts.push({value: segment, type: escaped ? 'escaped' : 'segment'});
        segment = '';
        escaped = false;
        if (isSegmentSep(this.peek())) {
          if (options.sanatize) escaped = true;
          else {
            console.error("Found double `.` when parsing path", input);
            parts.isValid = false;
          }
        }
        if (isIntChar(this.peek())) {
          if (options.sanatize) escaped = true;
          else {
            console.error("Path segments with leading int value must be escaped:", input);
            parts.isValid = false;
          }
        }
      }

      // **Handle whitespace and invalid characters**
      else if ( isWhitespace(char) || isInvalidChar(char) ) {
        if (options.sanatize){ escaped = true; segment += char; }
        else {
          console.error("Path segments containing invalid characters must be escaped:", input);
          parts.isValid = false;
        }
      }

      // **Handle valid, non-special characters**
      else { segment += char; }

    } while(parts.isValid && (char = this.next()) !== void 0);

    segment && parts.push({value: segment, type: escaped ? 'escaped' : 'segment'});

    return parts;
  }

  // **next** returns the next character and increment our position
  next(){ return this.input[this.pos++]; }

  // **peek** returns the next character without incrementing our position
  peek(){ return this.input[this.pos]; }

  // **lookback** returns the previous character without changint our position
  lookback(){ return this.input[this.pos-2]; }

  // **skipTo** progresses to the next instance of one of the test character(s) provided.
  // `test` may be either a single character or a character lookup of the form: `{'<char>':1}`.
  skipTo(test){
    var res = '';
    test = (typeof test === 'string') ? {[test]:1} : test;
    do { res += this.next(); }
    while (this.peek() && !test[this.peek()]);
    return res;
  }
}

// #### Path

// **Path** is main utility class delivered to consumers. It leverages `Tokenize`
// to break apart an input path and delivers all the documented utility methods
// to interact with `Tokenize`'s output. Most utility methods have both a static
// and non-static form.
export default class Path {

  constructor(input, options){
    this.src = input;
    var tokens = Path.tokenize(input, options);
    this._isValid = tokens.isValid;
    this._hasWildcard = tokens.hasWildcard;
    this.parts = tokens.isValid ? tokens : [];
  }

  // **Path.tokenize** provides static method on `Path` that will return the raw tokenized path parts list.
  static tokenize(input, options){ return new Tokenize(input, options); }

  // **length** proxies the length of our parts array.
  static length(path, options){ return new Path(path, options).length; }
  get length(){ return this.parts.length; }

  // **isValid** returns true if current parsed path is valid and false if not.
  static isValid(input, options){ return new Path(input, options).isValid(); }
  isValid(){ return this._isValid;}

  // **hasWildcard** returns if current parsed path is has wildcard parts like: `@each` and `@all`
  static hasWildcard(input, options){ return new Path(input, options).hasWildcard(); }
  hasWildcard(){ return this._isValid && this._hasWildcard; }

  // **split** returns an array of all path values. Ex: `foo.bar.baz` => `['foo', 'bar', 'baz']`.
  static split(input, options){ return new Path(input, options).split(); }
  split(){
    var res = [];
    for(let i=0, len=this.length; i<len; i++) res[i] = this.parts[i].value;
    return res;
  }

  // **first** returns the first path part in the input without removing it.
  static first(input, options){ return new Path(input, options).first(); }
  first(){
    if (!this._isValid) return false;
    var val = this.parts[0];
    return val ? val.value : '';
  }

  // **last** returns the last path part in the input without removing it.
  static last(input, options){ return new Path(input, options).last(); }
  last(){
    if (!this._isValid) return false;
    var val = this.parts[this.parts.length-1];
    return val ? val.value : '';
  }

  // **unshift** adds all arguments passed to the begining of this path and returns `this` to chain calls.
  unshift(){
    if (!this._isValid) return false;
    var len = arguments.length-1;
    for (let i=len; i>=0; i--){
      let tokens = Path.tokenize(String(arguments[i]), {sanatize: true});
      if (!tokens.isValid) { this._isValid = false; return false; }
      tokens.hasWildcard && (this._hasWildcard = true);
      [].unshift.apply(this.parts, tokens);
    }
    return this;
  }


  // **shift** returns the first path part in the input.
  static shift(input, options){ return new Path(input, options).shift(); }
  shift(){
    if (!this._isValid) return false;
    var val = this.parts.shift();
    return val ? val.value : '';
  }

  // **push** adds all arguments to the end of this path and returns `this` to chain calls.
  push(){
    if (!this._isValid) return false;
    var len = arguments.length;
    for (let i=0; i<len; i++){
      let tokens = Path.tokenize(String(arguments[i]), {sanatize: true});
      if (!tokens.isValid) { this._isValid = false; return false; }
      tokens.hasWildcard && (this._hasWildcard = true);
      [].push.apply(this.parts, tokens);
    }
    return this;
  }

  // **pop** returns and returns the last path part in the input.
  static pop(input, options){ return new Path(input, options).pop(); }
  pop(){
    if (!this._isValid) return false;
    var val = this.parts.pop();
    return val ? val.value : '';
  }

  // **join** combines one to many paths and returns joined paths as a string.
  static join(){ var tmp = new Path(''); return tmp.join.apply(tmp, arguments); }
  join(){
    if (!this._isValid) return false;
    this.push.apply(this, arguments);
    return this.toString();
  }

  // **toString** returns the string representation of this Path object.
  toString(){
    var path = '';
    var length = this.length;
    var prev = '';
    for (let i = 0; i < length; i++) {
      let part = this.parts[i];
      let val = part.value;
      switch (part.type){
        case 'escaped': path += `${ESCAPE_START}${val}${ESCAPE_END}`; break;
        case 'segment': path += (path && prev !== NAMESPACE_SEPERATOR ? `${SEGMENT_SEPERATOR}${val}` : `${val}`); break;
        case 'wildcard': path += (path && prev !== NAMESPACE_SEPERATOR ? `${SEGMENT_SEPERATOR}${val}` : `${val}`); break;
        case 'namespace': path += NAMESPACE_SEPERATOR; break;
      }
      prev = val;
    }
    return path;
  }

  // **matches** returns true or false depending on if the passed paths are identical.
  // Takes into account wildcard values.
  static matches(path1, path2){ return new Path(path1).matches(path2); }
  matches(path){

    // If matching strings, we're already done
    if (this.src === path) return true;
    path = new Path(path);
    var leftPath = this.parts;
    var rightPath = path.parts;
    var leftLen = leftPath.length;
    var rightLen = rightPath.length;
    var leftPos = 0;
    var rightPos = 0;

    do {
      let left = leftPath[leftPos];
      let right = rightPath[rightPos];

      if (left && left.type === 'wildcard' && left.value === '@all'){
        while (rightPos+1 < rightLen && rightPath[rightPos+1] && rightPath[rightPos+1].type !== 'namespace') rightPos++;
        if (rightPos === rightLen) return true;
        continue;
      }
      if (right && right.type === 'wildcard' && right.value === '@all'){
        while (leftPos+1 < leftLen && leftPath[leftPos+1] && leftPath[leftPos+1].type !== 'namespace' ) leftPos++;
        if (leftPos === leftLen) return true;
        continue;
      }

      if (!left || !right) return false;

      if (left.type === 'namespace' && right.type !== 'namespace') return false;
      if (left.type !== 'namespace' && right.type === 'namespace') return false;
      if (left.type === 'namespace' && right.type === 'namespace') continue;


      if (left.type === 'wildcard' && left.value === '@each') continue;
      if (right.type === 'wildcard' && right.value === '@each') continue;

      if (left.value !== right.value) return false;
    }
    while(++leftPos && ++rightPos && (leftPos < leftLen || rightPos < rightLen));

    return true;
  }

  // **query** Attempts to find the value in the passed data object at the `path`
  // location provided. Accepts Rebound Data, or POJOs.
  static query(path, obj, options={}){

    // If path is undefined, return `undefined`.
    if (path === void 0 || path == null) return void 0;

    // If path is empty string, return `this`.
    if (path === '') return result;

    // Split path into constituent parts
    var parts = Path.tokenize(path),
        len = parts.length,
        result = obj;

    // For each part:
    // - If a `Computed Property` and `options.raw` is true, return it.
    // - If a `Computed Property` traverse to its value.
    // - If not set, return its falsy value.
    // - If a `Model` or `Collection`, traverse to it.
    for (let i = 0; i < len; i++) {
      let key = parts[i].value;
      if ( result && result.isComputedProperty && options.raw ){ return result; }
      if ( result && result.isComputedProperty ){ result = result.value(); }
      if ( !result ){ return result; }
      if ( key === '@parent' ){ result = result.parent; }
      else if ( result.isData ){ result = result.get(key); }
      else if ( hasOwnProperty(result, key) ){ result = result[key]; }
      else { result = void 0; break; }
    }

    // Finally, if we're not fetching the raw Computed Property object,
    // and the result is a Computed Property, fetch its value.
    if(result && result.isData && !options.raw){ result = result.get(); }

    return result;
  }

}
