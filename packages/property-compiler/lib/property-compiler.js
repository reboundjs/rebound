// Property Compiler
// ----------------

import tokenizer from "property-compiler/tokenizer";

const TERMINATORS = [';',',','==','>','<','>=','<=','>==','<==','!=','!==', '===', '&&', '||', '+', '-', '/', '*', '{', '}'];

function reduceMemos(memo, paths){
  var newMemo = [];
  paths = (!_.isArray(paths)) ? [paths] : paths;
  _.each(paths, function(path){
    _.each(memo, function(mem){
      newMemo.push(_.compact([mem, path]).join('.').replace('.[', '['));
    });
  });
  return newMemo;
}

// TODO: Make this farrrrrr more robust...very minimal right now

function compile(prop, name){
  var output = {};

  if(prop.__params) return prop.__params;

  var str = prop.toString(), //.replace(/(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s;])+\/\/(?:.*)$)/gm, '$1'), // String representation of function sans comments
      nextToken = tokenizer.tokenize(str),
      token,
      finishedPaths = [],
      listening = 0,
      paths = [],
      path,
      attrs = [],
      workingpath = [];
  do{

    token = nextToken();

    if(token.value === 'this'){
      listening++;
      workingpath = [];
    }

    // TODO: handle gets on collections
    if(token.value === 'get'){
      path = nextToken();
      while(_.isUndefined(path.value)){
        path = nextToken();
      }

      // Replace any access to a collection with the generic @each placeholder and push dependancy
      workingpath.push(path.value.replace(/\[.+\]/g, ".@each").replace(/^\./, ''));
    }

    if(token.value === 'pluck'){
      path = nextToken();
      while(_.isUndefined(path.value)){
        path = nextToken();
      }

      workingpath.push('@each.' + path.value);
    }

    if(token.value === 'slice' || token.value === 'clone' || token.value === 'filter'){
      path = nextToken();
      if(path.type.type === '(') workingpath.push('@each');
    }

    if(token.value === 'at'){
      path = nextToken();
      while(_.isUndefined(path.value)){
        path = nextToken();
      }
      workingpath.push('@each');
    }

    if(token.value === 'where' || token.value === 'findWhere'){
      workingpath.push('@each');
      path = nextToken();
      attrs = [];
      var itr = 0;
      while(path.type.type !== ')'){
        if(path.value){
          if(itr%2 === 0){
            attrs.push(path.value);
          }
          itr++;
        }
        path = nextToken();
      }
      workingpath.push(attrs);
    }

    if(listening && (_.indexOf(TERMINATORS, token.type.type) > -1 || _.indexOf(TERMINATORS, token.value) > -1)){
      workingpath = _.reduce(workingpath, reduceMemos, ['']);
      finishedPaths = _.compact(_.union(finishedPaths, workingpath));
      workingpath = [];
      listening--;
    }

  } while(token.start !== token.end);

  console.log('COMPUTED PROPERTY', name, 'registered with these dependancy paths:', finishedPaths);

  // Save our finished paths directly on the function
  prop.__params = finishedPaths;

  // Return the dependancies list
  return finishedPaths;

}

export default { compile: compile };