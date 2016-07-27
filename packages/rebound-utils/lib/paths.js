
const SEPERATORS = /(?:\.|\[|\])+/;
const LAST_PATH_SEGMENT = /[\.\[]?[^\.\[\:]*$/;
const FIRST_PATH_SEGMENT = /^\[?[^\.\[]+\]?/;
const LEADING_DOT = /^\./;

// Chainable style path helper, Allow instantiation without the 'new' keyword
var Path = function Path(p){
    if ( !(this instanceof Path) ) { return new Path(p); }
    if(typeof p !== 'string'){ p = void 0; }
    this.path = p;
};

// Split the provided path into its constitnuant parts
Path.split = Path.prototype.split = function split(path){
  var segment = path || this.path;
  if (!segment) return [];
  return segment.split(SEPERATORS).filter(Boolean);
};


// Concat all path parts passed, wrapping invalid path keys in brackets (`first[second]`) and seperating
// valid properties with dot-notation (`first.second`).
Path.join = Path.prototype.join = function join( ...args ){
  var path = '';
  this.path && args.unshift(this.path);
  var length = args.length;
  for (let i = 0; i < length; i++) {
    Path.split(args[i]).forEach((arg) => {
      path += Path.isValid(arg) ? (path ? `.${arg}` : `${arg}`) : `[${arg}]`;
    });
  }
  return path;
};

// Given a string, check if it is valid property name
const INVALID_PROPERTY_PART = /^\d|\s/; // TODO: Make more robust http://es5.github.io/#x7.6
Path.isValid = function isValid(name){ return !String(name).match(INVALID_PROPERTY_PART); }

// Get the key of our last path segment. This is the un-stripped value: keys
// pointing to collections will still be wrapped in brackets (ex: [1]).
Path.prototype.pop = function pop(){
  if(this.path === void 0){ return this; }
  return (this.path.match(LAST_PATH_SEGMENT) || [''])[0].replace(LEADING_DOT, '')
};

// Get the value of our first path segment. This is the un-stripped value: keys
// pointing to collections will still be wrapped in brackets (ex: [1]).
Path.prototype.shift = function shift(){
  if(this.path === void 0){ return this; }
  return (this.path.match(FIRST_PATH_SEGMENT) || [''])[0];
};

// Using the provided path, query the passed data object for values
// at that location. Accepts Rebound Data, or POJOs.
Path.prototype.query = function query(obj, options={}){

  var key = this.path,
      parts = this.split(),
      result = obj,
      len = parts.length;

  // - If key is undefined, return `undefined`.
  if (key === void 0 || key == null) return void 0;

  // - If key is empty string, return `this`.
  if (key === '') return result;

  // For each part:
  // - If a `Computed Property` and `options.raw` is true, return it.
  // - If a `Computed Property` traverse to its value.
  // - If not set, return its falsy value.
  // - If a `Model` or `Collection`, traverse to it.
  for (let i = 0; i < len; i++) {
    if (result && result.isComputedProperty && options.raw){ return result; }
    if (result && result.isComputedProperty){ result = result.value(); }
    if (result === void 0 || result === null){ return result; }
    if (parts[i] === '@parent'){ result = result.parent; }
    else if (result.isCollection){ result = result.models[parts[i]]; }
    else if (result.isModel){ result = result.attributes[parts[i]]; }
    else if (result && result.hasOwnProperty(parts[i])){ result = result[parts[i]]; }
    else { result = void 0; break; }
  }

  // Finally, if we're not fetching the raw Computed Property object,
  // and the result is a Computed Property, fetch its value.
  if(result && result.isComputedProperty && !options.raw){ result = result.value(); }

  return result;
};

export default Path;
