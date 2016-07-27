
// Wrap an optional error callback with a fallback error event.
var wrapError = function(model, options) {
  var error = options.error;
  options.error = function(resp) {
    if (error) error.call(options.context, model, resp, options);
    model._go('error', model, resp, options);
  };
};

export default class AJAX {

  // Proxy `Backbone.sync` by default.
  sync() { return Backbone.sync.apply(this, arguments); }

  // **parse** converts a response into a list of models to be added to the
  // collection. The default implementation is just to pass it through.
  parse(resp, options) { return resp; }

  // Fetch the default set of data for this Data object, setting it the
  // object when they arrive. If `reset: true` is passed, the response
  // data will be passed through the `reset` method instead of `set`.
  fetch(options) {
    options = _.extend({parse: true}, options);
    var success = options.success;
    var data = this;
    options.success = function(resp) {
      var method = options.reset ? 'reset' : 'set';
      var serverAttrs = options.parse && data.parse ? data.parse(resp, options) : resp;
      if (!data[method](serverAttrs, options)) return false;
      if (success) success.call(options.context, data, resp, options);
      data.trigger('sync', data, resp, options);
    };
    wrapError(this, options);
    return this.sync('read', this, options);
  }

  // Set a hash of model attributes, and sync the model to the server.
  // If the server returns an attributes hash that differs, the model's
  // state will be `set` again.
  save(key, val, options) {
    // Handle both `"key", value` and `{key: value}` -style arguments.
    var attrs;
    if (key == null || typeof key === 'object') {
      attrs = key;
      options = val;
    } else {
      (attrs = {})[key] = val;
    }

    options = _.extend({validate: true, parse: true}, options);
    var wait = options.wait;

    // If we're not waiting and attributes exist, save acts as
    // `set(attr).save(null, opts)` with validation. Otherwise, check if
    // the model will be valid when the attributes, if any, are set.
    if (attrs && !wait) {
      if (!this.set(attrs, options)) return false;
    } else if (!validate.call(this, attrs, options)) {
      return false;
    }

    // After a successful server-side save, the client is (optionally)
    // updated with the server-side state.
    var model = this;
    var success = options.success;
    var attributes = this.attributes;
    options.success = function(resp) {
      // Ensure attributes are restored during synchronous saves.
      model.attributes = attributes;
      var serverAttrs = options.parse ? model.parse(resp, options) : resp;
      if (wait) serverAttrs = _.extend({}, attrs, serverAttrs);
      if (serverAttrs && !model.set(serverAttrs, options)) return false;
      if (success) success.call(options.context, model, resp, options);
      model.trigger('sync', model, resp, options);
    };
    wrapError(this, options);

    // Set temporary attributes if `{wait: true}` to properly find new ids.
    if (attrs && wait) this.attributes = _.extend({}, attributes, attrs);

    var method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
    if (method === 'patch' && !options.attrs) options.attrs = attrs;
    var xhr = this.sync(method, this, options);

    // Restore attributes.
    this.attributes = attributes;

    return xhr;
  }

  // Destroy this model on the server if it was already persisted.
  // Optimistically removes the model from its collection, if it has one.
  // If `wait: true` is passed, waits for the server to respond before removal.
  destroy(options) {
    options = options ? _.clone(options) : {};
    var model = this;
    var success = options.success;
    var wait = options.wait;

    var destroy = function() {
      model.stopListening();
      model.trigger('destroy', model, model.parent, options);
    };

    options.success = function(resp) {
      if (wait) destroy();
      if (success) success.call(options.context, model, resp, options);
      if (!model.isNew()) model.trigger('sync', model, resp, options);
    };

    var xhr = false;
    if (this.isNew()) {
      _.defer(options.success);
    } else {
      wrapError(this, options);
      xhr = this.sync('delete', this, options);
    }
    if (!wait) destroy();
    return xhr;
  }

}