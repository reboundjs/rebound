var util = {};

// Applies function `func` to every node in the tree starting from `node`
util.walkTheDOM = function(node, func) {
    func(node);
    node = node.firstChild;
    while (node) {
        util.walkTheDOM(node, func);
        node = node.nextSibling;
    }
};

/*  Copyright (C) 2012-2014  Kurt Milam - http://xioup.com | Source: https://gist.github.com/1868955
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
**/

// Rolled my own deep extend in leu of having a hard dependancy on lodash.
util.deepDefaults = function(obj) {
  var parentRE = /#{\s*?_\s*?}/,
      slice = Array.prototype.slice,
      hasOwnProperty = Object.prototype.hasOwnProperty;

  _.each(slice.call(arguments, 1), function(def) {

    var objArr, srcArr, objAttr, srcAttr;
    for (var prop in def) {
      if (hasOwnProperty.call(def, prop)) {
        if(_.isUndefined(obj[prop])){

          if(_.isObject(def[prop]) && !_.isFunction(def[prop])){
            if(def[prop].isCollection){
              obj[prop] = util.deepDefaults([], def[prop].models);
            }
            else if(_.isArray(def[prop])){
              obj[prop] = util.deepDefaults([], def[prop]);
            }
            else if((def[prop].isModel)){
              obj[prop] = util.deepDefaults({}, def[prop].attributes);
            }
            else{
              obj[prop] = util.deepDefaults({}, def[prop]);
            }
          }
          else{
            obj[prop] = def[prop];
          }
        }
        else if(_.isObject(obj[prop])){
          if(obj[prop].isCollection || _.isArray(obj[prop])){
            continue;
          }
          else if((obj[prop].isModel)){
            obj[prop] = util.deepDefaults({}, obj[prop].attributes, def[prop]);
          }
          else{
            obj[prop] = util.deepDefaults({}, obj[prop], def[prop]);
          }
        }
      }
    }
  });

  return obj;
};

export default util;
