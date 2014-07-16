var computedProperties = [];

// TODO: Make this farrrrrr more robust...very minimal right now

function compile(data){
  console.log("Compiling Computed Property Dependancies", computedProperties)
  _.each(computedProperties, function(prop){
    console.log(prop)
    var str = prop.val.toString(),
        tokens = str.substring(str.indexOf('{')+1, str.lastIndexOf('}')).trim().replace(/\n|(  +)/g, ' ').split(/[\s.'"(){}]+/),
        finishedPaths = [],
        namedPaths = {},
        opcodes = [],
        named = false,
        listening = 0,
        inSubComponent = 0,
        subComponent = [],
        root,
        paths = [],
        workingpath = [],
        terminators = ['}',';','if','while','else','==','>','<','>=','<=','>==','<==','!=','!=='];

    console.log('STARTING COMPILE', str, tokens, workingpath)
    _.each(tokens, function(token, index, list){
      // If token is 'this' or a previously named path, start new.
      // If currently on a named path, add it to namedPaths. Push previous path.
      // If we are at a new named path, save its name. Reset path and values accordingly

      if(token === 'this' || namedPaths[token]){
        if(named)
          namedPaths[name] = {path: workingpath, root: root};
        // Save our previous path in case we're not finished
        if(workingpath)
          paths.push({path: workingpath, root: root, name: name});
        named = (list[index-1] === '=') ? list[index-2] : false;
        workingpath = (named) ? [namedPaths[name].path] : [];
        root = (named) ? namedPaths[name].root : data;
        listening++;
      }

      // If a phrase terminating token, terminate
      if(!inSubComponent && listening && _.indexOf(terminators, token) >= 0 ){
        finishedPaths.push(workingpath.join('.'));
        var path = paths.pop();
        root = path.root;
        name = path.name;
        workingpath = path.path;
        listening--;
      }
      if(inSubComponent && token === '}'){
        inSubComponent = false;
        subComponent.pop();
      }
      // If next value is a get and we are on a backbone model, push the key to path
      // If next value is a get and er are on a collection, signal that all models should be listened to
      if(token === 'get'){
        if( root instanceof Backbone.Model ){
          workingpath.push(list[index+1]);
          root = root.get(list[index+1]);
        }
        else if( root instanceof Backbone.Collection )
          workingpath.push('@each');
      }
      // If next value is a where and we are on a backbone model, throw an error.
      // If next value is a where and we are on a collection, add the following.
      if(token === 'where'){
        if( root instanceof Backbone.Model ) console.log("ERROR: Problem compiling model dependancy. Model with 'where' method found.");
        if( root instanceof Backbone.Collection ){
          workingpath.push('@each');
          subComponent.push('where');
        }
      }

      if(subComponent[subComponent.length-1] == 'where' && list[index+1] == ':'){
        workingpath.push(token);
      }

    })
    finishedPaths.push(workingpath.join('.'));
    finishedPaths = _.compact(_.uniq(finishedPaths));

    console.log('DONE', finishedPaths)

    Rebound.registerHelper(prop.key, prop.val, finishedPaths);

  });
}

function register(context, key, func){
  computedProperties.push({obj: context, key: key, val: func})
}

export default { register: register, compile: compile };