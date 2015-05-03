// Rebound Router
// ----------------

import $ from "rebound-component/utils";

// If Backbone hasn't been started yet, throw error
if(!window.Backbone){ throw "Backbone must be on the page for Rebound to load."; }

  // Services keep track of their consumers. LazyComponent are placeholders
  // for services that haven't loaded yet. A LazyComponent mimics the api of a
  // real service/component (they are the same), and when the service finally
  // loads, its ```hydrate``` method is called. All consumers of the service will
  // have the now fully loaded service set, the LazyService will transfer all of
  // its consumers over to the fully loaded service, and then destroy itself.
  function LazyComponent(){
    this.isService = true;
    this.isComponent = true;
    this.isModel = true;
    this.attributes = {};
    this.consumers = [];
    this.set = this.on = this.off = function(){
      return 1;
    };
    this.get = function(path){
      return (path) ? undefined : this;
    };
    this.hydrate = function(service){
      _.each(this.consumers, function(consumer){
        var component = consumer.component,
            key = consumer.key;
        if(component.attributes && component.set) component.set(key, service);
        if(component.services) component.services[key] = service;
        if(component.defaults) component.defaults[key] = service;
      });
      service.consumers = this.consumers;
      delete this.consumers;
    }
  }

  // Overload Backbone's loadUrl so it returns the value of the routed callback
  // inside of a promise instead of undefined
  Backbone.history.loadUrl = function(fragment) {
    fragment = this.fragment = this.getFragment(fragment);
    var resp = false;
    _.any(this.handlers, function(handler) {
      if (handler.route.test(fragment)) {
        resp = handler.callback(fragment);
        return true;
      }
    });

    // Always return a promise
    return new Promise(function(resolve, reject) {
      if(resp && resp.constructor === Promise) resp.then(resolve);
      resolve(resp)
    });
  }

  // ReboundRouter Constructor
  var ReboundRouter = Backbone.Router.extend({

    // By default there is one route. The wildcard route fetches the required
    // page assets based on user-defined naming convention.
    routes: {
      '*route': 'wildcardRoute'
    },

    // Called when no matching routes are found. Extracts root route and fetches it's resources
    wildcardRoute: function(route) {
      var appName, primaryRoute;

      // If empty route sent, route home
      route = route || '';

      // Get Root of Route
      appName = primaryRoute = (route) ? route.split('/')[0] : 'index';

      // Find Any Custom Route Mappings
      _.any(this.config.handlers, function(handler) {
        if (handler.route.test(route)) {
          appName = handler.primaryRoute;
          return true;
        }
      });

      // If Page Is Already Loaded Then The Route Does Not Exist. 404 and Exit.
      if (this.current && this.current.name === primaryRoute) {
        return this._fetchResource('404', 'error', false);
      }

      // Fetch Resources
      document.body.classList.add("loading");

      return this._fetchResource(appName, primaryRoute, this.config.container).then(function(){
        document.body.classList.remove('loading');
      });
    },

    // Modify navigate to default to `trigger=true` and to return the value of
    // `Backbone.history.navigate`
    navigate: function(fragment, options={}) {
      (options.trigger === undefined) && (options.trigger = true)
      return Backbone.history.navigate(fragment, options);
    },

    // Modify `router.execute` to return the value of our route callback
    execute: function(callback, args, name) {
      if (callback) return callback.apply(this, args);
    },

    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (_.isFunction(name)) {
        callback = name;
        name = '';
      }

      if (!callback) callback = this[name];
      Backbone.history.route(route, (fragment) => {
        var args = this._extractParameters(route, fragment);
        var resp = this.execute(callback, args, name);
        if ( resp !== false) {
          this.trigger.apply(this, ['route:' + name].concat(args));
          this.trigger('route', name, args);
          Backbone.history.trigger('route', this, name, args);
        }
        return resp;
      });
      return this;
    },

    // On startup, save our config object and start the router
    initialize: function(options={}, callback=function(){}) {

      // Let all of our components always have referance to our router
      Rebound.Component.prototype.router = this;

      // Save our config referance
      this.config = options;
      this.config.handlers = [];
      var container = this.config.container = $((this.config.container || 'content'))[0];

      // Convert our routeMappings to regexps and push to our handlers
      _.each(this.config.routeMapping, function(value, route){
        if (!_.isRegExp(route)) route = this._routeToRegExp(route);
        this.config.handlers.unshift({ route: route, primaryRoute: value });
      }, this);

      this._watchLinks(container);
      Rebound.services.page = new LazyComponent();

      // Install our global components
      _.each(this.config.services, function(selector, route){
        var container = $(selector)[0];
        this._watchLinks(container);
        Rebound.services[route] = new LazyComponent();
        this._fetchResource(route, route, container);
      }, this);

      // Start the history and call the provided callback
      Backbone.history.start({
        pushState: (this.config.pushState === undefined) ? true : this.config.pushState,
        root: this.config.root
      }).then(callback);

      return this;
    },

    // Given a dom element, watch for all click events on anchor tags.
    // If the clicked anchor has a relative url, attempt to route to that path.
    // Give all links on the page that match this path the class `active`.
    _watchLinks: function(container){
      // Navigate to route for any link with a relative href
      var remoteUrl = /^([a-z]+:)|^(\/\/)|^([^\/]+\.)/;
      $(container).on('click', 'a', (e) => {
        var path = e.target.getAttribute('href');
        // If path is not an remote url, ends in .[a-z], or blank, try and navigate to that route.
        if( path && path !== '#' && !remoteUrl.test(path) ) e.preventDefault();
        // If this is not our current route, navigate to the new route
        if(path !== '/'+Backbone.history.fragment){
          $(container).unMarkLinks();
          this.navigate(path, {trigger: true})
            .then(function(){ $(container).markLinks(); });
        }
      });
    },

    // De-initializes the previous app before rendering a new app
    // This way we can ensure that every new page starts with a clean slate
    // This is crucial for scalability of a single page app.
    _uninstallResource: function(){

      var oldPageName = this.current.__name;

      // Unset Previous Application's Routes. For each route in the page app:
      _.each(this.current['data'].routes, (value, key) => {

        var regExp = this._routeToRegExp(key).toString();

        // Remove the handler from our route object
        Backbone.history.handlers = _.filter(Backbone.history.handlers, function(obj){return obj.route.toString() !== regExp;});

        // Delete our referance to the route's callback
        delete this[ '_function_' + key ];

      });

      // Un-hook Event Bindings, Delete Objects
      this.current['data'].deinitialize();

      // Disable old css if it exists
      setTimeout(function(){
        document.getElementById(oldPageName + '-css').setAttribute('disabled', true);
      }, 500);

    },

    // Give our new page component, load routes and render a new instance of the
    // page component in the top level outlet.
    _installResource: function(PageApp, primaryRoute, container) {
      var oldPageName, pageInstance, container;
      var isGlobal = (container !== this.config.container);

      if(!isGlobal && this.current) this._uninstallResource();

      // Load New PageApp, give it it's name so we know what css to remove when it deinitializes
      pageInstance = new PageApp();
      pageInstance.__name = primaryRoute;

      // Add to our page
      container.innerHTML = '';
      container.appendChild(pageInstance);

      // Make sure we're back at the top of the page
      document.body.scrollTop = 0;

      // Augment ApplicationRouter with new routes from PageApp
      _.each(pageInstance['data'].routes, (value, key) => {
        // Generate our route callback's new name
        var routeFunctionName = '_function_' + key,
            functionName;
        // Add the new callback referance on to our router and add the route handler
        this[routeFunctionName] =  function () { pageInstance['data'][value].apply(pageInstance['data'], arguments); };
        this.route(key, value, this[routeFunctionName]);
      }, this);

      var name = (isGlobal) ? primaryRoute : 'page';
      if(!isGlobal) this.current = pageInstance;
      if(window.Rebound.services[name].isService)
        window.Rebound.services[name].hydrate(pageInstance['data']);
      window.Rebound.services[name] = pageInstance['data'];


      // Re-trigger route so the newly added route may execute if there's a route match.
      // If no routes are matched, app will hit wildCard route which will then trigger 404
      if(!isGlobal){
        if(this.config.triggerOnFirstLoad) Backbone.history.loadUrl(Backbone.history.fragment);
        this.config.triggerOnFirstLoad = true;
      }

      // Return our newly installed app
      return pageInstance;
    },

    // Fetches Pare HTML and CSS
    _fetchResource: function(appName, primaryRoute, container) {

      // Expecting Module Definition as 'SearchApp' Where 'Search' a Primary Route
      var jsUrl = this.config.jsPath.replace(/:route/g, primaryRoute).replace(/:app/g, appName),
          cssUrl = this.config.cssPath.replace(/:route/g, primaryRoute).replace(/:app/g, appName),
          cssLoaded = false,
          jsLoaded = false,
          cssElement = document.getElementById(appName + '-css'),
          jsElement = document.getElementById(appName + '-js'),
          PageClass;

        return new Promise((resolve, reject) => {

          // Only Load CSS If Not Loaded Before
          if(cssElement === null){
            cssElement = document.createElement('link');
            cssElement.setAttribute('type', 'text/css');
            cssElement.setAttribute('rel', 'stylesheet');
            cssElement.setAttribute('href', cssUrl);
            cssElement.setAttribute('id', appName + '-css');
            $(cssElement).on('load', (event) => {
                if((cssLoaded = true) && jsLoaded){
                  this._installResource(PageClass, appName, container);
                  resolve && resolve(this);
                }
              });
            $(cssElement).on('error', (err) => {
                this._fetchResource('404', 'error', false);
                reject && reject(err)
              });
            document.head.appendChild(cssElement);
          }
          // If it has been loaded before, enable it
          else {
            cssElement && cssElement.removeAttribute('disabled');
            cssLoaded = true;
          }

          // AMD Will Manage Dependancies For Us. Load The App.
          window.require([jsUrl], (c) => {
            if((jsLoaded = true) && (PageClass = c) && cssLoaded){
              this._installResource(PageClass, appName, container);
              resolve && resolve(this);
            }
          }, (err) => {
            this._fetchResource('404', 'error', false);
            reject && reject(err);
          });
        });
    }

  });

export default ReboundRouter;
