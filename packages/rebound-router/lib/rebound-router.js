// Rebound Router
// ----------------

import Backbone from "backbone";
import $ from "rebound-utils/rebound-utils";
import { SERVICES, ServiceLoader} from "rebound-router/service";
import Component from "rebound-component/factory";
import loader from "rebound-router/loader";

// If no error page is defined for an app, this is the default 404 page
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

// Regexp to validate remote URLs
var IS_REMOTE_URL = /^([a-z]+:)|^(\/\/)|^([^\/]+\.)/;
var STRIP_SLASHES = /(^\/+|\/+$)/mg;

function normalizeUrl(){
  var url = '';
  var args = Array.prototype.slice.call(arguments);
  args.forEach(function(val){
    if(!val || val === '/'){ return void 0; }
    url += ('/' + val.replace(STRIP_SLASHES, ''));
  });
  return url || '/';
}

// Overload Backbone's loadUrl so it returns the value of the routed callback
// Only ever compare the current path (excludes the query params) to the route regexp
Backbone.history.loadUrl = function(fragment) {
  var key, resp = false;
  this.fragment = this.getFragment(fragment).split('?')[0];
  for(key in this.handlers){
    if(this.handlers[key].route.test(this.fragment)){ return this.handlers[key].callback(this.fragment); }
  }
};

// Remove the hash up to a `?` character. In IE9, which does not support the
// History API, we need to allow query params to be set both on the URL itself
// and in the hash, giving precedence to the query params in the URL.
Backbone.history.getSearch = function() {
   var match = this.location.href.replace(/#[^\?]*/, '').match(/\?.+/);
   return match ? match[0] : '';
};


// Router Constructor
var Router = Backbone.Router.extend({

  status: SUCCESS,    // loading, success or error
  _currentRoute:  '', // The route path that triggered the current page
  _previousRoute: '',

  // By default there is one route. The wildcard route fetches the required
  // page assets based on user-defined naming convention.
  routes: {
    '*route': 'wildcardRoute'
  },

  _loadDeps: loader.load,

  // Called when no matching routes are found. Extracts root route and fetches it's resources
  wildcardRoute: function(route) {

    // Save the previous route value
    this._previousRoute = this._currentRoute;

    // Fetch Resources
    document.body.classList.add("loading");
    return this._fetchResource(route, this.config.container).then(function(res){
      document.body.classList.remove('loading');
      return res;
    });
  },

  // Modify navigate to default to `trigger=true` and to return the value of
  // `Backbone.history.navigate` inside of a promise.
  navigate: function(fragment, options={}) {

    // Default trigger to true unless otherwise specified
    (options.trigger === undefined) && (options.trigger = true);

    // Stringify any data passed in the options hash
    var query = options.data ? (~fragment.indexOf('?') ? '&' : '?') + $.url.query.stringify(options.data) : '';

    // Un-Mark any `active` links in the page container
    var $container = $(this.config.containers).unMarkLinks();

    // Navigate to the specified path. Return value is the value from the router
    // callback specified on the component
    var resp = Backbone.history.navigate(fragment + query, options);

    // Always return a promise. If the response of `Backbone.histroy.navigate`
    // was a promise, wait for it to resolve before resolving. Once resolved,
    // mark relevent links on the page as `active`.
    return new Promise(function(resolve, reject) {
      if(resp && resp.constructor === Promise) resp.then(resolve, resolve);
      resolve(resp);
    }).then(function(resp){
      $container.markLinks();
      return resp;
    });
  },

  // Modify `router.execute` to return the value of our route callback
  execute: function(callback, args, name) {
    if (callback){ return callback.apply(this, args); }
  },

  // Override routeToRegExp so:
  //  - If key is a stringified regexp literal, convert to a regexp object
  //  - Else If route is a string, proxy right through
  _routeToRegExp: function(route){
    var res;

    if(route[0] === '/' && route[route.length-1] === '/' ) {
      res = new RegExp(route.slice(1, route.length-1), '');
      res._isRegexp = true;
    }
    else if(typeof route == 'string'){
      res = Backbone.Router.prototype._routeToRegExp.call(this, route);
      res._isString = true;
    }

    return res;
  },

  // Override route so if callback returns false, the route event is not triggered
  // Every route also looks for query params, parses with QS, and passes the extra
  // variable as a POJO to callbacks
  route: function(route, name, callback) {
    if (_.isFunction(name)) {
      callback = name;
      name = '';
    }

    if (!_.isRegExp(route)){
      route = this._routeToRegExp(route);
    }

    if (!callback){ callback = this[name]; }
    Backbone.history.route(route, (fragment) => {

      // If this route was defined as a regular expression, we don't capture
      // query params. Only parse the actual path.
      fragment = fragment.split('?')[0];

      // Extract the arguments we care about from the fragment
      var args = this._extractParameters(route, fragment);

      // Get the query params string
      var search = (Backbone.history.getSearch() || '').slice(1);

      // If this route was created from a string (not a regexp), remove the auto-captured
      // search params.
      if(route._isString) args.pop();

      // If the route is not user prodided, if the history object has search params
      // then our args have the params as its last agrument as of Backbone 1.2.0
      // If the route is a user provided regex, add in parsed search params from
      // the history object before passing to the callback.
      args.push((search) ? $.url.query.parse(search) : {});

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
    Component.prototype.router = this;

    // Save our config referance
    this.config = options;
    this.config.handlers = [];
    this.config.containers = [];

    // Normalize our url configs
    this.config.root = normalizeUrl(this.config.root);
    this.config.assetRoot = this.config.assetRoot ? normalizeUrl(this.config.assetRoot) : this.config.root;
    this.config.jsPath = normalizeUrl(this.config.assetRoot, this.config.jsPath);
    this.config.cssPath = normalizeUrl(this.config.assetRoot, this.config.cssPath);

    // Get a unique instance id for this router
    this.uid = $.uniqueId('router');

    // Allow user to override error route
    this.config.errorRoute && (ERROR_ROUTE_NAME = this.config.errorRoute);

    // Convert our routeMappings to regexps and push to our handlers
    _.each(this.config.routeMapping, function(value, route){
      var regex = this._routeToRegExp(route);
      this.config.handlers.unshift({ route: route, regex: regex, app: value });
    }, this);

    // Use the user provided container, or default to the closest `<main>` tag
    this.config.container = $((this.config.container || 'main'))[0];
    this.config.containers.push(this.config.container);
    SERVICES.page = new ServiceLoader('page');

    // Install our global components
    _.each(this.config.services, function(selector, route){
      var container = $(selector)[0] || document.createElement('span');
      this.config.containers.push(container);
      SERVICES[route] = new ServiceLoader(route);
      this._fetchResource(route, container).catch(function(){});
    }, this);

    // Watch click events on links in all out containers
    this._watchLinks(this.config.containers);

    // Start the history and call the provided callback
    Backbone.history.start({
      pushState: (this.config.pushState === undefined) ? true : this.config.pushState,
      root: (this.config.root || '')
    }).then(callback);

    return this;
  },

  stop: function(){
    $(this.config.container).off('click');
    Backbone.history.stop();
    this._uninstallResource();
    Backbone.history.handlers = [];
  },

  // Given a dom element, watch for all click events on anchor tags.
  // If the clicked anchor has a relative url, attempt to route to that path.
  // Give all links on the page that match this path the class `active`.
  _watchLinks: function(container){
    // Navigate to route for any link with a relative href
    $(container).on('click', 'a', (e) => {
      var path = e.target.getAttribute('href');

      // If the path is a remote URL, allow the browser to navigate normally.
      // Otherwise, prevent default so we can handle the route event.
      if(IS_REMOTE_URL.test(path) || path === '#'){ return void 0; }
      e.preventDefault();

      // If this is not our current route, navigate to the new route
      if(path !== '/'+Backbone.history.fragment){
        this.navigate(path, {trigger: true});
      }
    });
  },

  // De-initializes the previous app before rendering a new app
  // This way we can ensure that every new page starts with a clean slate
  // This is crucial for scalability of a single page app.
  _uninstallResource: function(){

    var routes = this.current ? (this.current.data.routes || {}) : {};
        routes[this._previousRoute] = '';

    // Unset Previous Application's Routes. For each route in the page app, remove
    // the handler from our route object and delete our referance to the route's callback
    _.each(routes, (value, key) => {
      var regExp = this._routeToRegExp(key).toString();
      Backbone.history.handlers = _.filter(Backbone.history.handlers, function(obj){
        return obj.route.toString() !== regExp;
      });
    });

    if(!this.current){ return void 0; }

    var oldPageName = this.current.__pageId;

    // Un-hook Event Bindings, Delete Objects
    this.current.data.deinitialize();

    // Now we no longer have a page installed.
    this.current = undefined;

    // Disable old css if it exists
    setTimeout(() => {
      if(this.status === ERROR){ return void 0; }
      document.getElementById(oldPageName + '-css').setAttribute('disabled', true);
    }, 500);

  },

  // Give our new page component, load routes and render a new instance of the
  // page component in the top level outlet.
  _installResource: function(PageApp, appName, container) {
    var oldPageName, pageInstance, routes = [];
    var isService = (container !== this.config.container);
    var name = (isService) ? appName : 'page';

    // If no container exists, throw an error
    if(!container) throw 'No container found on the page! Please specify a container that exists in your Rebound config.';

    // Add page level loading class
    container.classList.remove('error', 'loading');

    // Uninstall any old resource we have loaded
    if(!isService && this.current){ this._uninstallResource(); }

    // Load New PageApp, give it it's name so we know what css to remove when it deinitializes
    pageInstance = Component(PageApp).el;
    if(SERVICES[name].isLazyComponent){ SERVICES[name].hydrate(pageInstance.data); }
    else{ SERVICES[name] = pageInstance.data; }
    pageInstance.__pageId = this.uid + '-' + appName;

    // Add to our page
    container.innerHTML = '';
    container.appendChild(pageInstance);

    // Make sure we're back at the top of the page
    document.body.scrollTop = 0;

    // Add a default route handler for the route that got us here so if the component
    // does not define a route that handles it, we don't get a redirect loop
    if(!isService){ this.route(this._currentRoute, 'default', function(){ return void 0; }); }

    // Augment ApplicationRouter with new routes from PageApp added in reverse order to preserve order higherarchy
    _.each(pageInstance.data.routes, (value, key) => {
      // Add the new callback referance on to our router and add the route handler
      this.route(key, value, function () { return pageInstance.data[value].apply(pageInstance.data, arguments); });
    });

    // If this is the main page component, set it as current
    if(!isService){ this.current = pageInstance; }

    // Always return a promise
    return new Promise(function(resolve, reject){

      // Re-trigger route so the newly added route may execute if there's a route match.
      // If no routes are matched, app will hit wildCard route which will then trigger 404
      if(!isService){
        let res = Backbone.history.loadUrl(Backbone.history.fragment);
        if(res && typeof res.then === 'function') return res.then(resolve);
        return resolve(res);
      }
      // Return our newly installed app
      return resolve(pageInstance);
    });
  },

  _fetchJavascript: function(routeName, appName){
    var jsID = this.uid + '-' + appName + '-route',
        jsUrl = this.config.jsPath.replace(/:route/g, routeName).replace(/:app/g, appName);

        // Load the JavaScript.
        return loader.loadJS(jsUrl, jsID);
  },

  _fetchCSS: function(routeName, appName){

    var cssID = this.uid + '-' + appName + '-css',
        cssUrl = this.config.cssPath.replace(/:route/g, routeName).replace(/:app/g, appName);

    // Load the CSS
    return loader.loadCSS(cssUrl, cssID);
  },

  // Fetches HTML and CSS
  _fetchResource: function(route, container) {

    var appName, routeName,
        isService = (container !== this.config.container),
        isError = (route === ERROR_ROUTE_NAME);

    // Normalize Route
    route || (route = '');

    // Get the app name from this route
    appName = routeName = (route.split('/')[0] || 'index');

    // If this isn't the error route, Find Any Custom Route Mappings
    if(!isService && !isError){
      this._currentRoute = route.split('/')[0];
      _.any(this.config.handlers, (handler) => {
        if (handler.regex.test(route)){
          appName = handler.app;
          this._currentRoute = handler.route;
          return true;
        }
      });
    }

    // Wrap these async resource fetches in a promise and return it.
    // This promise resolves when both css and js resources are loaded
    // It rejects if either of the css or js resources fails to load.
    return new Promise((resolve, reject) => {

      var throwError = (err) => {
        // If we are already in an error state, this means we were unable to load
        // a custom error page. Uninstall anything we have and insert our default 404 page.
        if(this.status === ERROR){
          if(isService) return resolve(err);
          this._uninstallResource();
          container.innerHTML = DEFAULT_404_PAGE;
          return resolve(err);
        }

        // Set our status to error and attempt to load a custom error page.
        console.error('Could not ' + ((isService) ? 'load the ' + appName + ' service:' : 'find the ' + (appName || 'index') + ' app.'), 'at', ('/' + route));
        this.status = ERROR;
        this._currentRoute = route;
        resolve(this._fetchResource(ERROR_ROUTE_NAME, container));
      };

      // If the values we got from installing our resources are unexpected, 404
      // Otherwise, set status, activate the css, and install the page component
      var install = (response) => {
        var cssElement = response[0], jsElement = response[1];
        if(!(cssElement instanceof Element) || !(jsElement instanceof Element) ) return throwError();
        (!isService && !isError) && (this.status = SUCCESS);
        cssElement && cssElement.removeAttribute('disabled');
        this._installResource(jsElement.dataset.name, appName, container).then(resolve, resolve);
      };

      // If loading a page, set status to loading
      (!isService && !isError) && (this.status = LOADING);

      // If Page Is Already Loaded Then The Route Does Not Exist. 404 and Exit.
      if (this.current && this.current.__pageId === (this.uid + '-' + appName)){ return throwError(); }

      // Fetch our css and js in paralell, install or throw when both complete
      Promise.all([this._fetchCSS(routeName, appName), this._fetchJavascript(routeName, appName)])
      .then(install, throwError);

    });
  }
});

export default Router;
export { Router as Router };
export { SERVICES as services};
