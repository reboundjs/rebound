"use strict";
// If Rebound Runtime has already been run, throw error
if(Backbone.AppLoader){ throw 'Rebound is already loaded on the page!'; }
// If Backbone hasn't been started yet, throw error
if(!window.Backbone){ throw "Backbone must be on the page for Rebound to load."; }

var AppLoader = Backbone.AppLoader = (function (Backbone) {
  'use strict';

  var AppLoader,
      appRouter,

  // map to check if particular route dependency is resolved or not
    routeDependencyTracker = {},

  // points to currently loaded pageApp
    pageApp,

  // AppLoader config
    config = {};

  /**
   * Destroys previously installed app and augments the Router with routes from newly loaded app
   *
   * @param primaryRoute
   */
  function installPageResources(PageApp, primaryRoute, isGlobal) {
    var oldPageName, pageInstance;

    // De-initialize the previous app before rendering a new app
    // This way we can ensure that every new page starts with a clean slate
    // This is crucial for scalability of a single page app.
    if(!isGlobal && pageApp){

      oldPageName = pageApp.__name;
      // Unset Previous Application's Routes. For each route in the page app:
      _.each(pageApp.__template.routes, function (value, key) {

        var regExp = appRouter._routeToRegExp(key).toString();

        // Remove the handler from our route object
        Backbone.history.handlers = _.filter(Backbone.history.handlers, function(obj){return obj.route.toString() !== regExp;});

        // Delete our referance to the route's callback
        delete appRouter[ '_function_' + key ];

      });

      // Un-hook Event Bindings, Delete Objects
      pageApp.__template.deinitialize();

      // Disable old css if it exists
      setTimeout(function(){
        $('#' + oldPageName + '-css').attr('disabled', true);
      }, 500);

    }

    // Load New PageApp, give it it's name so we know what css to remove when it deinitializes
    pageInstance = new PageApp();
    pageInstance.__name = primaryRoute;

    // Add to our page
    ((isGlobal) ? $(isGlobal) : $('content')).html(pageInstance);

    // Augment ApplicationRouter with new routes from PageApp
    _.each(pageInstance.__template.routes, function (value, key) {
      // Generate our route callback's new name
      var routeFunctionName = '_function_' + key,
          functionName;
      // Add the new callback referance on to our router
      appRouter[routeFunctionName] =  function () { pageInstance.__template[value].apply(pageInstance.__template, arguments); };
      // Add the route handler
      appRouter.route(key, value, appRouter[routeFunctionName]);
    });

    // Mark The App Dependancies As Resolved,
    routeDependencyTracker[primaryRoute] = pageInstance.name = primaryRoute;

    // Return our newly installed app
    return (!isGlobal) ? pageInstance : pageApp;
  }

  /**
   * Loads Page dependencies (JS, CSS) based on given primaryRoute
   * Note: .tls are bunched with the js concat groups to save additional call for template
   *
   * @param primaryRoute
   */
  function loadPageResources(primaryRoute, isGlobal) {

    // Expecting Module Definition as 'SearchApp' Where 'Search' a Primary Route
    var jsPrefix = config.jsPrefix.replace(/:route/g, primaryRoute),
        jsUrl = jsPrefix + primaryRoute + config.jsSuffix,
        cssUrl = config.cssPrefix + primaryRoute + config.cssSuffix + '.css',
        cssLoaded = false,
        jsLoaded = false,
        pageInstance = false,
        PageApp;

      // Only Load CSS If Not Loaded Before
      if(!$("#" + primaryRoute + '-css').length){
        $('<link>')
          .appendTo($('head'))
          .attr({type : 'text/css', rel : 'stylesheet'})
          .attr('href', cssUrl)
          .attr('id', primaryRoute + '-css')
          .on('load', function(event){
            if((cssLoaded = true) && jsLoaded){
              // Install The Loaded Resources
              pageApp = installPageResources(PageApp, primaryRoute, isGlobal);
              Rebound.pageApp = pageApp;

              // Re-trigger route so the newly added route may execute if there's a route match.
              // If no routes are matched, app will hit wildCard route which will then trigger 404
              if(!isGlobal && config.triggerOnFirstLoad){
                Backbone.history.loadUrl(Backbone.history.fragment);
              }
              if(!isGlobal){
                config.triggerOnFirstLoad = true;
              }
              $('body').removeClass('loading');
            }
          });
      }
      // If it has been loaded bevore, enable it
      else {
        $('#'+primaryRoute + '-css').attr('disabled', false);
        cssLoaded = true;
      }

      // If require library is almond, load script manualy
      if(require._defined){
        $('<script>')
          .appendTo($('head'))
          .attr({type : 'text/javascript'})
          .attr('src', '/'+jsUrl+'.js')
          .attr('id', primaryRoute + '-js')
          .on('load', function(event){
            // AMD Will Manage Dependancies For Us. Load The App.
            require([jsUrl], function(PageClass){

              if((jsLoaded = true) && (PageApp = PageClass) && cssLoaded){

                // Install The Loaded Resources
                pageApp = installPageResources(PageApp, primaryRoute, isGlobal);
                // Re-trigger route so the newly added route may execute if there's a route match.
                // If no routes are matched, app will hit wildCard route which will then trigger 404
                if(!isGlobal && config.triggerOnFirstLoad){
                  Backbone.history.loadUrl(Backbone.history.fragment);
                }
                Rebound.pageApp = pageApp;
                if(!isGlobal){
                  config.triggerOnFirstLoad = true;
                }
                $('body').removeClass('loading');
              }
            });
          });
      }
      else{
        // AMD Will Manage Dependancies For Us. Load The App.
        require([jsUrl], function(PageClass){

          if((jsLoaded = true) && (PageApp = PageClass) && cssLoaded){

            // Install The Loaded Resources
            pageApp = installPageResources(PageApp, primaryRoute, isGlobal);
            // Re-trigger route so the newly added route may execute if there's a route match.
            // If no routes are matched, app will hit wildCard route which will then trigger 404
            if(!isGlobal && config.triggerOnFirstLoad){
              Backbone.history.loadUrl(Backbone.history.fragment);
            }
            Rebound.pageApp = pageApp;
            if(!isGlobal){
              config.triggerOnFirstLoad = true;
            }
            $('body').removeClass('loading');
          }
        });
      }

  }

  /**
   *  wild-card route handler
   *  it is the last route in routing tree hierarchy
   *  gets called when no matching routes are found..
   *
   *  based on primaryRoute (for ex: given this url "appContext/search/searchId/SomeAction" the primaryRoute is search)
   *  it loads the app dependencies (js, tl, css) if it has not already loaded
   *
   *  if route dependency is already resolved that means there were no matching routes found in router
   *  and we have a route, which application can not handle..
   *  emits 404 RouteEvent which can be handled accordingly
   *
   */
  function onUnknownRoute(route) {

    // Handle null route
    route = route || '';

    // Get Root of Route
    var primaryRoute = (route) ? route.split('/')[0] : '';

    // Apply Any Special Mappings
    _.any(config.handlers, function(handler) {
      if (handler.route.test(route)) {
        primaryRoute = handler.primaryRoute;
        return true;
      }
    });

    // If Page Is Already Loaded, The Route Does Not Exist. 404 and Exit.
    if (pageApp && pageApp.name === primaryRoute) {
      return Backbone.history.loadUrl('404');
    }

    // Load Page Resources
    $('body').addClass('loading');
    loadPageResources(primaryRoute);
  }

  /**
   * Construct for AppLoader
   */

  AppLoader = function() {
    this.initialize.apply(this, arguments);
  };

  _.extend(AppLoader.prototype, Backbone.Events, {

    // On startup, save our config object and start the router
    initialize: function(options) {
      // Save our config referance
      config = options.config;
      config.handlers = [];
      this.start();
    },

    // Proxy function for Backbone's navigate function
    navigate: function(path, options){
      return this.router.navigate(path, options);
    },

    /**
     * app startup code
     * - at this point router contains one wildcard route
     */
    start: function() {

      // Backbone router options
      var options = {
        pushState: true,
        root: config.appContext
      },
      absoluteUrl = new RegExp('^(?:[a-z]+:)?//', 'i');

      // Create our page router
      appRouter =  this.router = new Backbone.Router();

      // Convert our routeMappings to regexps and push to our handlers
      _.each(config.routeMapping, function(value, route){
        if (!_.isRegExp(route)) route = appRouter._routeToRegExp(route);
        config.handlers.unshift({ route: route, primaryRoute: value });
      }, this);

      // Navigate to route for any link with a relative href
      $(document).on('click', 'a', function(event){
        var path = event.currentTarget.getAttribute('href');

        // If path is not an absolute url, or blank, try and navigate to that route.
        if(path !== '#' && path !== '' && !absoluteUrl.test(path)){
          event.preventDefault();
          appRouter.navigate(path, {trigger: true});
        }
      });

      // Add wildcard route
      this.router.onUnknownRoute = onUnknownRoute;
      this.router.route('*route', 'onUnknownRoute');

      // Install our global components
      _.each(config.globalComponents, function(selector, route){
        loadPageResources(route, selector);
      });

      // Start the history
      Backbone.history.start(options);

      // Let all of our components always have referance to our appRouter
      Backbone.Component.prototype.router = this.router;
    }
  });

  return AppLoader;
})(Backbone);

exports["default"] = AppLoader;