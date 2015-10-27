// Property Compiler
// ----------------

import { tokenizer } from "acorn";

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
      token = tokenizer(str),
      finishedPaths = [],
      listening = 0,
      paths = [],
      attrs = [],
      workingpath = [];
  while(token.start !== token.end){

    token.nextToken();

    if(token.value === 'this'){
      listening++;
      workingpath = [];
    }

    // TODO: handle gets on collections
    if(token.value === 'get'){
      token.nextToken();
      while(_.isUndefined(token.value)){
        token.nextToken();
      }

      // Replace any access to a collection with the generic @each placeholder and push dependancy
      workingpath.push(token.value.replace(/\[.+\]/g, ".@each").replace(/^\./, ''));
    }

    if(token.value === 'pluck'){
      token.nextToken();
      while(_.isUndefined(token.value)){
        token.nextToken();
      }

      workingpath.push('@each.' + token.value);
    }

    if(token.value === 'slice' || token.value === 'clone' || token.value === 'filter'){
      token.nextToken();
      if(token.type.type === '(') workingpath.push('@each');
    }

    if(token.value === 'at'){
      token.nextToken();
      while(_.isUndefined(token.value)){
        token.nextToken();
      }
      workingpath.push('@each');
    }

    if(token.value === 'where' || token.value === 'findWhere'){
      workingpath.push('@each');
      token.nextToken();
      attrs = [];
      var itr = 0;
      while(token.type.type !== ')'){
        if(token.value){
          if(itr%2 === 0){
            attrs.push(token.value);
          }
          itr++;
        }
        token.nextToken();
      }
      workingpath.push(attrs);
    }

    if(listening && (_.indexOf(TERMINATORS, token.type.type) > -1 || _.indexOf(TERMINATORS, token.value) > -1)){
      workingpath = _.reduce(workingpath, reduceMemos, ['']);
      finishedPaths = _.compact(_.union(finishedPaths, workingpath));
      workingpath = [];
      listening--;
    }
// debugger;
  }

  console.log('COMPUTED PROPERTY', name, 'registered with these dependancy paths:', finishedPaths);

  // Save our finished paths directly on the function
  prop.__params = finishedPaths;

  // Return the dependancies list
  return finishedPaths;

}

export default { compile: compile };
