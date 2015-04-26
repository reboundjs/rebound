// Rebound Router
// ----------------

import $ from "rebound-component/utils";

// If Backbone hasn't been started yet, throw error
if(!window.Backbone){ throw "Backbone must be on the page for Rebound to load."; }

  // Clean up old page component and load routes from our new page component
  function installResources(PageApp, primaryRoute, isGlobal) {
    var oldPageName, pageInstance, container, router = this;

    // De-initialize the previous app before rendering a new app
    // This way we can ensure that every new page starts with a clean slate
    // This is crucial for scalability of a single page app.
    if(!isGlobal && this.current){

      oldPageName = this.current.__name;
      // Unset Previous Application's Routes. For each route in the page app:
      _.each(this.current['data'].routes, function (value, key) {

        var regExp = router._routeToRegExp(key).toString();

        // Remove the handler from our route object
        Backbone.history.handlers = _.filter(Backbone.history.handlers, function(obj){return obj.route.toString() !== regExp;});

        // Delete our referance to the route's callback
        delete router[ '_function_' + key ];

      });

      // Un-hook Event Bindings, Delete Objects
      this.current['data'].deinitialize();

      // Disable old css if it exists
      setTimeout(function(){
        document.getElementById(oldPageName + '-css').setAttribute('disabled', true);
      }, 500);

    }

    // Load New PageApp, give it it's name so we know what css to remove when it deinitializes
    pageInstance = new PageApp();
    pageInstance.__name = primaryRoute;

    // Add to our page
    container = (isGlobal) ? document.querySelector(isGlobal) : document.getElementsByTagName('content')[0];
    container.innerHTML = '';
    container.appendChild(pageInstance);

    // Make sure we're back at the top of the page
    document.body.scrollTop = 0;

    // Augment ApplicationRouter with new routes from PageApp
    _.each(pageInstance['data'].routes, function (value, key) {
      // Generate our route callback's new name
      var routeFunctionName = '_function_' + key,
          functionName;
      // Add the new callback referance on to our router
      router[routeFunctionName] =  function () { pageInstance['data'][value].apply(pageInstance['data'], arguments); };
      // Add the route handler
      router.route(key, value, this[routeFunctionName]);
    }, this);

    var name = (isGlobal) ? primaryRoute : 'page';
    if(!isGlobal) this.current = pageInstance;
    if(window.Rebound.services[name].isService)
      window.Rebound.services[name].hydrate(pageInstance['data']);
    window.Rebound.services[name] = pageInstance['data'];

    // Return our newly installed app
    return pageInstance;
  }

  // Fetches Pare HTML and CSS
  function fetchResources(appName, primaryRoute, isGlobal) {

    // Expecting Module Definition as 'SearchApp' Where 'Search' a Primary Route
    var jsUrl = this.config.jsPath.replace(/:route/g, primaryRoute).replace(/:app/g, appName),
        cssUrl = this.config.cssPath.replace(/:route/g, primaryRoute).replace(/:app/g, appName),
        cssLoaded = false,
        jsLoaded = false,
        cssElement = document.getElementById(appName + '-css'),
        jsElement = document.getElementById(appName + '-js'),
        router = this,
        PageApp;

      // Only Load CSS If Not Loaded Before
      if(cssElement === null){
        cssElement = document.createElement('link');
        cssElement.setAttribute('type', 'text/css');
        cssElement.setAttribute('rel', 'stylesheet');
        cssElement.setAttribute('href', cssUrl);
        cssElement.setAttribute('id', appName + '-css');
        document.head.appendChild(cssElement);
        $(cssElement).on('load', function(event){
            if((cssLoaded = true) && jsLoaded){
              // Install The Loaded Resources
              installResources.call(router, PageApp, appName, isGlobal);

              // Re-trigger route so the newly added route may execute if there's a route match.
              // If no routes are matched, app will hit wildCard route which will then trigger 404
              if(!isGlobal && router.config.triggerOnFirstLoad){
                Backbone.history.loadUrl(Backbone.history.fragment);
              }
              if(!isGlobal){
                router.config.triggerOnFirstLoad = true;
              }
              document.body.classList.remove('loading');
            }
          });
      }
      // If it has been loaded bevore, enable it
      else {
        cssElement && cssElement.removeAttribute('disabled');
        cssLoaded = true;
      }

      // If if requirejs is not on the page, load the file manually. It better contain all its dependancies.
      if(window.require._defined || _.isUndefined(window.require)){
          jsElement = document.createElement('script');
          jsElement.setAttribute('type', 'text/javascript');
          jsElement.setAttribute('src', '/'+jsUrl+'.js');
          jsElement.setAttribute('id', appName + '-js');
          document.head.appendChild(jsElement);
          $(jsElement).on('load', function(event){
            // AMD Will Manage Dependancies For Us. Load The App.
            require([jsUrl], function(PageClass){

              if((jsLoaded = true) && (PageApp = PageClass) && cssLoaded){

                // Install The Loaded Resources
                installResources.call(router, PageApp, appName, isGlobal);
                // Re-trigger route so the newly added route may execute if there's a route match.
                // If no routes are matched, app will hit wildCard route which will then trigger 404
                if(!isGlobal && router.config.triggerOnFirstLoad){
                  Backbone.history.loadUrl(Backbone.history.fragment);
                }
                if(!isGlobal){
                  router.config.triggerOnFirstLoad = true;
                }

                document.body.classList.remove('loading');
              }
            });
          });

      }
      else{
        // AMD Will Manage Dependancies For Us. Load The App.
        return window.require([jsUrl], function(PageClass){

          if((jsLoaded = true) && (PageApp = PageClass) && cssLoaded){

            // Install The Loaded Resources
            installResources.call(router, PageApp, appName, isGlobal);
            // Re-trigger route so the newly added route may execute if there's a route match.
            // If no routes are matched, app will hit wildCard route which will then trigger 404
            if(!isGlobal && router.config.triggerOnFirstLoad){
              Backbone.history.loadUrl(Backbone.history.fragment);
            }

            if(!isGlobal){
              router.config.triggerOnFirstLoad = true;
            }
            document.body.classList.remove('loading');
          }
        });
      }

  }

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

  // ReboundRouter Constructor
  var ReboundRouter = Backbone.Router.extend({

    routes: {
      '*route': 'wildcardRoute'
    },

    // Called when no matching routes are found. Extracts root route and fetches it resources
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
        return Backbone.history.loadUrl('404');
      }

      // Fetch Resources
      document.body.classList.add("loading");
      fetchResources.call(this, appName, primaryRoute);
    },

    // On startup, save our config object and start the router
    initialize: function(options) {

      // Default to first content tag on the page if no container is provided
      options.container || (options.container = 'content');
      var container = $(options.container)[0];

      // Save our config referance
      this.config = options;
      this.config.handlers = [];

      var remoteUrl = /^([a-z]+:)|^(\/\/)|^([^\/]+\.)/,
          router = this;

      // Convert our routeMappings to regexps and push to our handlers
      _.each(this.config.routeMapping, function(value, route){
        if (!_.isRegExp(route)) route = router._routeToRegExp(route);
        router.config.handlers.unshift({ route: route, primaryRoute: value });
      }, this);

      // Navigate to route for any link with a relative href
      $(container).on('click', 'a', function(e){

        var path = e.target.getAttribute('href');

        // If path is not an remote url, ends in .[a-z], or blank, try and navigate to that route.
        if( path && path !== '#' && !remoteUrl.test(path) ){
          e.preventDefault();
          if(path !== '/'+Backbone.history.fragment) $(container).unMarkLinks();
          router.navigate(path, {trigger: true});
        }
      });

      Backbone.history.on('route', function(route, params){
        $(container).markLinks();
      });

      Rebound.services.page = new LazyComponent();

      // Install our global components
      _.each(this.config.services, function(selector, route){
        Rebound.services[route] = new LazyComponent();
        fetchResources.call(router, route, route, selector);
      });

      // Let all of our components always have referance to our router
      Rebound.Component.prototype.router = this;

      // Start the history
      Backbone.history.start({
        pushState: (this.config.pushState === undefined) ? true : this.config.pushState,
        root: this.config.root
      });

    }
  });

export default ReboundRouter;
