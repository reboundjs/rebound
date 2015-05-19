// Rebound Router
// ----------------

import $ from "rebound-component/utils";
import LazyComponent from "rebound-router/lazy-component";

var DEFAULT_404_PAGE =
`<div style="display: block;text-align: center;font-size: 22px;">
  <h1 style="margin-top: 60px;">
    Oops! We couldn't find this page.
  </h1>
  <a href="#" onclick="window.history.back();return false;" style="display: block;text-decoration: none;margin-top: 30px;">
    Take me back
  </a>
</div>`;

var ERROR_ROUTE_NAME = 'error';
var SUCCESS = 'success';
var ERROR = 'error';
var LOADING = 'loading';

// Overload Backbone's loadUrl so it returns the value of the routed callback
// instead of undefined
Backbone.history.loadUrl = function(fragment) {
  fragment = this.fragment = this.getFragment(fragment);
  var resp = false;
  _.any(this.handlers, function(handler) {
    if (handler.route.test(fragment)) {
      resp = handler.callback(fragment);
      return true;
    }
  });
  return resp;
}

// ReboundRouter Constructor
var ReboundRouter = Backbone.Router.extend({

  status: SUCCESS, // loading, success or error

  // By default there is one route. The wildcard route fetches the required
  // page assets based on user-defined naming convention.
  routes: {
    '*route': 'wildcardRoute'
  },

  // Called when no matching routes are found. Extracts root route and fetches it's resources
  wildcardRoute: function(route) {
    var primaryRoute;

    // If empty route sent, route home
    route = route || '';

    // Get Root of Route
    primaryRoute = (route) ? route.split('/')[0] : 'index';

    // Fetch Resources
    document.body.classList.add("loading");

    return this._fetchResource(route, this.config.container).then(function(){
      document.body.classList.remove('loading');
    }).catch(function(){});
  },

  // Modify navigate to default to `trigger=true` and to return the value of
  // `Backbone.history.navigate` inside of a promise.
  navigate: function(fragment, options={}) {
    (options.trigger === undefined) && (options.trigger = true)
    var resp = Backbone.history.navigate(fragment, options);

    // Always return a promise
    return new Promise(function(resolve, reject) {
      if(resp && resp.constructor === Promise) resp.then(resolve, reject);
      resolve(resp)
    });
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

    // Allow user to override error route
    ERROR_ROUTE_NAME = this.config.errorRoute || ERROR_ROUTE_NAME;

    // Use the user provided container, or default to the closest `<content>` tag
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
      var container = $(selector)[0] || document.createElement(selector || 'span');
      this._watchLinks(container);
      Rebound.services[route] = new LazyComponent();
      this._fetchResource(route, container).catch(function(){});
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

    if(!this.current) return;

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

    // Now we no longer have a page installed.
    this.current = undefined;

    // Disable old css if it exists
    setTimeout(() => {
      if(this.status = ERROR) return;
      document.getElementById(oldPageName + '-css').setAttribute('disabled', true);
    }, 500);

  },

  // Give our new page component, load routes and render a new instance of the
  // page component in the top level outlet.
  _installResource: function(PageApp, primaryRoute, container) {
    var oldPageName, pageInstance, container;
    var isService = (container !== this.config.container);
    container.classList.remove('error', 'loading');

    if(!isService && this.current) this._uninstallResource();

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

    var name = (isService) ? primaryRoute : 'page';
    if(!isService) this.current = pageInstance;
    if(window.Rebound.services[name].isService)
      window.Rebound.services[name].hydrate(pageInstance['data']);
    window.Rebound.services[name] = pageInstance['data'];


    // Re-trigger route so the newly added route may execute if there's a route match.
    // If no routes are matched, app will hit wildCard route which will then trigger 404
    if(!isService){
      if(this.config.triggerOnFirstLoad) Backbone.history.loadUrl(Backbone.history.fragment);
      this.config.triggerOnFirstLoad = true;
    }

    // Return our newly installed app
    return pageInstance;
  },

  // Fetches HTML and CSS
  _fetchResource: function(route, container) {
    var jsUrl, cssUrl,
        cssLoaded = false,
        jsLoaded = false,
        cssElement, jsElement,
        PageClass, appName, primaryRoute,
        isService = (container !== this.config.container);

    // Get the root of this route
    appName = primaryRoute = (route) ? route.split('/')[0] : 'index';

    // Find Any Custom Route Mappings
    _.any(this.config.handlers, function(handler) {
      if (handler.route.test(route)) {
        appName = handler.primaryRoute;
        return true;
      }
    });

    jsUrl = this.config.jsPath.replace(/:route/g, primaryRoute).replace(/:app/g, appName);
    cssUrl = this.config.cssPath.replace(/:route/g, primaryRoute).replace(/:app/g, appName);
    cssElement = document.getElementById(appName + '-css');
    jsElement = document.getElementById(appName + '-js');

    // Wrap these async resource fetches in a promise and return it.
    // This promise resolves when both css and js resources are loaded
    // It rejects if either of the css or js resources fails to load.
    return new Promise((resolve, reject) => {

      this.status = LOADING;

      var defaultError = (err) => {
        if(!isService){
          this._uninstallResource();
          container.innerHTML = DEFAULT_404_PAGE;
        }
        reject(err);
      }

      var throwError = (err) => {
        if(route === ERROR_ROUTE_NAME) return defaultError()
        if(this.status === ERROR) return;
        this.status = ERROR;
        console.error('Could not ' + ((isService) ? 'load the ' + route + ' service:' : 'find the ' + route + ' page:') +
                      '\n  - CSS Url: '+ cssUrl +
                      '\n  - JavaScript Url: ' + jsUrl);
        this._fetchResource(ERROR_ROUTE_NAME, container).then(reject, reject);
      }

      // If Page Is Already Loaded Then The Route Does Not Exist. 404 and Exit.
      if (this.current && this.current.name === primaryRoute) {
        return throwError();
      }

      // If this css element is not on the page already, it hasn't been loaded before -
      // create the element and load the css resource.
      // Else if the css resource has been loaded before, enable it
      if(cssElement === null){
        cssElement = document.createElement('link');
        cssElement.setAttribute('type', 'text/css');
        cssElement.setAttribute('rel', 'stylesheet');
        cssElement.setAttribute('href', cssUrl);
        cssElement.setAttribute('id', appName + '-css');
        $(cssElement).on('load', (event) => {
            if((cssLoaded = true) && jsLoaded){
              this.status = SUCCESS;
              this._installResource(PageClass, appName, container);
              resolve(this);
            }
          });
        $(cssElement).on('error', function(err){
          cssElement.dataset.error = '';
          throwError();
        });
        document.head.appendChild(cssElement);
      } else {
        if(cssElement.hasAttribute('data-error')){return throwError();}
        if((cssLoaded = true) && jsLoaded){
          cssElement && cssElement.removeAttribute('disabled');
          cssLoaded = true;
        }
      }

      // AMD will manage dependancies for us. Load the JavaScript.
      window.require([jsUrl], (c) => {
        jsElement = $('script[src="'+jsUrl+'"]')[0]
        jsElement.setAttribute('id', appName + '-js');
        if((jsLoaded = true) && (PageClass = c) && cssLoaded){
          this.status = SUCCESS;
          cssElement && cssElement.removeAttribute('disabled');
          this._installResource(PageClass, appName, container);
          resolve(this);
        }
      }, function(){
        jsElement = $('script[src="'+jsUrl+'"]')[0]
        jsElement.setAttribute('id', appName + '-js');
        jsElement.dataset.error = '';
        throwError();
      });
    });
  }
});

export default ReboundRouter;
