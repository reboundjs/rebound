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
      _.each(this.current.__component__.routes, function (value, key) {

        var regExp = router._routeToRegExp(key).toString();

        // Remove the handler from our route object
        Backbone.history.handlers = _.filter(Backbone.history.handlers, function(obj){return obj.route.toString() !== regExp;});

        // Delete our referance to the route's callback
        delete router[ '_function_' + key ];

      });

      // Un-hook Event Bindings, Delete Objects
      this.current.__component__.deinitialize();

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
    _.each(pageInstance.__component__.routes, function (value, key) {
      // Generate our route callback's new name
      var routeFunctionName = '_function_' + key,
          functionName;
      // Add the new callback referance on to our router
      router[routeFunctionName] =  function () { pageInstance.__component__[value].apply(pageInstance.__component__, arguments); };
      // Add the route handler
      router.route(key, value, this[routeFunctionName]);
    }, this);

    if(!isGlobal){
      window.Rebound.services.page = (this.current = pageInstance).__component__;
    } else{
      window.Rebound.services[pageInstance.__name] = pageInstance.__component__;
    }

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
        window.require([jsUrl], function(PageClass){

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

      // Save our config referance
      this.config = options.config;
      this.config.handlers = [];

      var remoteUrl = /^([a-z]+:)|^(\/\/)|^([^\/]+\.)/,

      router = this;

      // Convert our routeMappings to regexps and push to our handlers
      _.each(this.config.routeMapping, function(value, route){
        if (!_.isRegExp(route)) route = router._routeToRegExp(route);
        router.config.handlers.unshift({ route: route, primaryRoute: value });
      }, this);

      // Navigate to route for any link with a relative href
      $(document).on('click', 'a', function(e){

        var path = e.target.getAttribute('href');

        // If path is not an remote url, ends in .[a-z], or blank, try and navigate to that route.
        if( path && path !== '#' && !remoteUrl.test(path) ){
          e.preventDefault();
          if(path !== '/'+Backbone.history.fragment) $(document).unMarkLinks();
          router.navigate(path, {trigger: true});
        }
      });

      Backbone.history.on('route', function(route, params){
        $(document).markLinks();
      });

      // Install our global components
      _.each(this.config.globalComponents, function(selector, route){
        fetchResources.call(router, route, route, selector);
      });

      // Let all of our components always have referance to our router
      Rebound.Component.prototype.router = this;

      // Start the history
      Backbone.history.start({
        pushState: true,
        root: this.config.root
      });

    }
  });

export default ReboundRouter;
