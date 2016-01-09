// Services keep track of their consumers. LazyComponent are placeholders
// for services that haven't loaded yet. A LazyComponent mimics the api of a
// real service/component (they are the same), and when the service finally
// loads, its ```hydrate``` method is called. All consumers of the service will
// have the now fully loaded service set, the LazyService will transfer all of
// its consumers over to the fully loaded service, and then commit seppiku,
// destroying itself.
function LazyComponent(type, options){
  var loadCallbacks = [];
  this.isHydrated = true;
  this.isComponent = true;
  this.isModel = true;
  this.isLazyComponent = true;
  this.attributes = {};
  this.consumers = [];
  this.set = this.on = this.off = function(){
    return 1;
  };
  this.get = function(path){
    return (path) ? undefined : this;
  };
  this.hydrate = function(service){
    this._component = service;
    _.each(this.consumers, function(consumer){
      var component = consumer.component,
          key = consumer.key;
      if(component.attributes && component.set) component.set(key, service);
      if(component.services) component.services[key] = service;
      if(component.defaults) component.defaults[key] = service;
    });
    service.consumers = this.consumers;

    // Call all of our callbacks
    _.each(loadCallbacks, (cb)=>{ cb(service); });
    delete this.loadCallbacks;
  };
  this.onLoad = function(cb){
    loadCallbacks.push(cb);
  };
}


LazyComponent.extend= function(protoProps) {
  var parent = this,
      child = function(){ return parent.apply(this, arguments); };

  // These properties exist on all instances of the Component
  protoProps || (protoProps = {});

  // Our class should inherit everything from its parent, defined above
  var Surrogate = function(){ this.constructor = child; };
  Surrogate.prototype = parent.prototype;
  child.prototype = new Surrogate();

  // Extend our prototype with any protoProps, overriting pre-defined ones
  if (protoProps){ _.extend(child.prototype, protoProps); }

  // Set our ancestry
  child.__super__ = parent.prototype;

  return child;
};

export default LazyComponent;
