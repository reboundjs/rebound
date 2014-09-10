// If Rebound Runtime has already been run, throw error
if(Backbone.Collection.rebound){
  throw 'Rebound Collection is already loaded on the page!';
}
// If Backbone hasn't been started yet, throw error
if(!window.Backbone){
  throw "Backbone must be on the page for Rebound to load.";
}

var Collection = Backbone.Collection;

Backbone.Collection.prototype.rebound = true;
Backbone.Collection.prototype.isCollection = true;

function pathGenerator(collection, model){
  return function(){
    return collection.__path() + '.[' + collection.indexOf(model) + ']';
  };
}

// By default, __path returns the root object unless overridden
Backbone.Collection.prototype.__path = function(){return '';};

// Have collections set its model's names.
Backbone.Collection.prototype.__set = Backbone.Collection.prototype.set;
Backbone.Collection.prototype.set = function(models, options){
  var id,
      model,
      i, l;
  models = (!_.isArray(models)) ? (models ? [models] : []) : _.clone(models);

  // If a silent remove and this is the first silent remove since the last dom update, save our initial indicies
  if( options && options.silent && !this.models.__indexed ){
    _.each(this.models, function(model, index){
      model.__originalIndex = index;
    }, this);
    this.models.__indexed = true;
  }

  for (i = 0, l = models.length; i < l; i++) {
    model = models[i] || {};
    // If model is a backbone model, awesome. If not, make it one.
    if (model.isModel) {
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
      model.__path = (pathGenerator(this, model));
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

};

export { Collection };