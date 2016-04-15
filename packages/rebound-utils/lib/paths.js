
const SPLIT_PATH_REGEXP = /(?:\.|\[|\])+/;

// Chainable style path helper, Allow instantiation without the 'new' keyword
var Path = function Path(p){
    if ( !(this instanceof Path) ) { return new Path(p); }
    if(typeof p !== 'string'){ p = void 0; }
    this.path = p;
};

// Split the provided path into its constitnuant parts
Path.prototype.split = function split(){
  if(this.path === void 0){ return []; }
  var path = this.path.split(SPLIT_PATH_REGEXP);
  return path.filter(Boolean);
};

// Using the provided path, query the passed data object for values
// at that location. Accepts Rebound Data, or POJOs.
Path.prototype.query = function query(obj, options={}){

  var key = this.path,
      parts = this.split(),
      result = obj,
      i, l = parts.length;

  if(this.path === void 0){ return this.p; }

  // - If key is undefined, return `undefined`.
  // - If key is empty string, return `this`.
  if(_.isUndefined(key) || _.isNull(key)){ return void 0; }
  if(key === '' || parts.length === 0){ return result; }

  // For each part:
  // - If a `Computed Property` and `options.raw` is true, return it.
  // - If a `Computed Property` traverse to its value.
  // - If not set, return its falsy value.
  // - If a `Model` or `Collection`, traverse to it.
  for (i = 0; i < l; i++) {
    if(result && result.isComputedProperty && options.raw){ return result; }
    if(result && result.isComputedProperty){ result = result.value(); }
    if(_.isUndefined(result) || _.isNull(result)){ return result; }
    if(parts[i] === '@parent'){ result = result.__parent__; }
    else if(result.isCollection){ result = result.models[parts[i]]; }
    else if(result.isModel){ result = result.attributes[parts[i]]; }
    else if(result && result.hasOwnProperty(parts[i])){ result = result[parts[i]]; }
  }

  // Finally, if we're not fetching the raw Computed Property object,
  // and the result is a Computed Property, fetch its value.
  if(result && result.isComputedProperty && !options.raw){ result = result.value(); }

  return result;
};

export default Path;
