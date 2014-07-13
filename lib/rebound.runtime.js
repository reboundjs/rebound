import { registerHelper, notify, hydrate } from "rebound/runtime";
  var __computedProperties = [];
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

      // If any value is a function, turn it into a computed property
      if(_.isFunction(val)){
        __computedProperties.push({obj: this, key: key, val: val});
      }
      // If any value is an object, turn it into a model
      else if(_.isObject(val) && !_.isArray(val) && !_.isFunction(val)){
        val = attrs[key] = new Backbone.Model(val);
      }
      // If any value is an array, turn it into a collection
      else if(_.isArray(val)){
        val = attrs[key] = new Backbone.Collection(val)
      }

      // Set this element's path variable. Returns the fully formed json path of this element
      if(val){
        val.__path = (function(model, key){ return function(){ return model.__path() + '.' + key ; }; })(this, key);
      }

      // If this is a new key, and it is an eventable object, propagate its event to our parent
      if(!(this.has(key)) && val instanceof Backbone.Model || val instanceof Backbone.Collection){
        // When requesting the name value of our value, return the its key appended to the computed name value of our parent
        // Closure is needed to preserve values in the instance so they dont get set to the prototype
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
    if( options && options.silent && !this.models.__indexed ){
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
    _.bindAll(this, '_onModelChange', '_onCollectionChange', '__callOnController');
    options || (options = {});
    _.extend(this, _.pick(options, controllerOptions));
    registerHelper('__callOnController', this.__callOnController);
    this.initialize.apply(this, arguments);
    this.data = options.data;

    this._parseComputedProperties(this.data);

    // Take our precompiled template and hydrates it. When Rebound Compiler is included, can be a handlebars template string.
    this._setTemplate();
    this._startListening();
  }


  var controllerOptions = ['models', 'collections', 'outlet', 'template'];

  _.extend(Controller.prototype, Backbone.Events, {

    // Initialize is an empty function by default. Override it with your own initialization logic.
    initialize: function(){},

    __callOnController: function(name, event){
        this[name].call(this, event);
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

    _parseComputedProperties: function(data){
      console.log("Compiling Computed Property Dependancies", __computedProperties)
      _.each(__computedProperties, function(prop){
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

        console.log('DONE', finishedPaths)

        Rebound.registerHelper(prop.key, prop.val, finishedPaths);

      });
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
          observers,
          newPath,
          paths;

      // TODO: Reverse this update process. We want to render higher level paths first.
      // Call notify on every object up the data tree starting at the element that triggered the change
      while(obj){
        // Constructs paths variable relative to current data element
        paths = _.map((_.keys(changed)), function(attr){
                  return ((path && path + '.') + attr).replace(obj.__path()+'.', '');
                });
        observers = (obj instanceof Backbone.Collection) ? obj.models.__observers : obj.__observers

        if(observers && paths.length){
          _.each(paths, function(path){
            // For elements in array syntax for a specific element, also listen for changes on the collection for any element changing
            // ex: test.[1].whatever -> test.@each.whatever
            if(path.match(/\[.+\]/g)){
              newPath = path.replace(/\[.+\]/g, "@each");
              paths.push(newPath);
              // Also listen to collection changes. Adds, removes, etc, if applicible.
              newPath = newPath.split(/\.@each\.?/);
              paths.push(newPath[0]);
            }

          })
          console.log(obj, paths)
          notify(obj, paths);
        }
        obj = obj.__parent;
      }
    }

  });

  Controller.extend = window.Backbone.Router.extend;

}

export { registerHelper};
