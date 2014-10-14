import tokenizer from "property-compiler/tokenizer";

var computedProperties = [];

// TODO: Make this farrrrrr more robust...very minimal right now

function compile(){
  var output = {};

  _.each(computedProperties, function(prop){
    var str = prop.val.toString(), //.replace(/(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s;])+\/\/(?:.*)$)/gm, '$1'), // String representation of function sans comments
        nextToken = tokenizer.tokenize(str),
        tokens = [],
        token,
        finishedPaths = [],
        namedPaths = {},
        opcodes = [],
        named = false,
        listening = 0,
        inSubComponent = 0,
        subComponent = [],
        root,
        paths = [],
        path,
        tmpPath,
        attrs = [],
        workingpath = [],
        terminators = [';',',','==','>','<','>=','<=','>==','<==','!=','!==', '===', '&&', '||'];
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

      if(token.value === 'slice' || token.value === 'clone'){
        path = nextToken();
        workingpath.push('@each');
      }

      if(token.value === 'at'){

        path = nextToken();
        while(_.isUndefined(path.value)){
          path = nextToken();
        }
        // workingpath[workingpath.length -1] = workingpath[workingpath.length -1] + '[' + path.value + ']';
        // workingpath.push('[' + path.value + ']');
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

      if(listening && _.indexOf(terminators, token.type.type) > -1 || _.indexOf(terminators, token.value) > -1){
        workingpath = _.reduce(workingpath, function(memo, paths){
          var newMemo = [];
          paths = (!_.isArray(paths)) ? [paths] : paths;
          _.each(paths, function(path){
            _.each(memo, function(mem){
              newMemo.push(_.compact([mem, path]).join('.').replace('.[', '['));
            });
          });
          return newMemo;
        }, ['']);
        finishedPaths = _.compact(_.union(finishedPaths, workingpath));
        workingpath = [];
        listening--;
      }

    } while(token.start !== token.end);

    console.log('COMPUTED PROPERTY', prop.key, 'registered with these dependancy paths:', finishedPaths);

    // Save this property's dependancies in its __params attribute
    prop.val.__params = finishedPaths;

    // Add it to our output
    output[prop.obj.cid] = output[prop.obj.cid] || {};
    output[prop.obj.cid][prop.key] = prop.val;

  });

  // Reset our computed proerties queue
  computedProperties = [];

  return output;

}

function register(context, key, func){
  computedProperties.push({obj: context, key: key, val: func});
}

export default { register: register, compile: compile };