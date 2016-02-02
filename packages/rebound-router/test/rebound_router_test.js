import Rebound from 'runtime';
window.Rebound = Rebound;

var container = document.createElement('main');
    container.id = 'router-test';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.overflow = 'auto';
    container.style.position =  'fixed';
    container.style.background = 'white';
    container.style.border = '1px solid #333';
    container.style.bottom = '0px';
    container.style.right = '0';
    container.style.boxSizing = 'border-box';
    container.style.transform = 'scale(.4)';
    container.style.transformOrigin = '100% 100%';
    container.style['-webkit-transform'] = 'scale(.4)';
    container.style['-webkit-transformOrigin'] = '100% 100%';
    container.style['-ms-transform'] = 'scale(.4)';
    container.style['-ms-transformOrigin'] = '100% 100%';
    container.style.opacity = '0';
var nav = document.createElement('nav');
    nav.id = "nav";
var content = document.createElement('content');
    content.id = "content";
var footer = document.createElement('footer');
    footer.id = "footer";
container.appendChild(nav);
container.appendChild(content);
container.appendChild(footer);
document.body.appendChild(container);

function getHandlers(){
  var handlers = '';
  Rebound.history.handlers.forEach(function(handler){
    handlers += handler.route.source.replace(/\\/g, '');
  });
  return handlers;
}

function default404( assert ){
  return Rebound.start({
    "container": "#content",
    "root": window.location.pathname,
    "assetRoot": "/test/dummy-apps",
    "jsPath": "/0/:app.js",
    "cssPath": "/0/:app.css"
  }).then(function(){
    QUnit.start();
    equal(container.querySelectorAll('h1')[0].innerHTML.trim(), "Oops! We couldn't find this page.", 'No index component and no error component displays default 404 page.');
    QUnit.stop();
    return Rebound.router.navigate('');
  })
  .then(function(){
    Rebound.stop();
    return assert;
  });
}

var ran = [];

function custom404( assert ){
  return Rebound.start({
    "container": "#content",
    "root": window.location.pathname,
    "assetRoot": "/test/dummy-apps",
    "jsPath": "/1/:app.js",
    "cssPath": "/1/:app.css"
  }).then(function(){
    QUnit.start();
    equal(container.querySelectorAll('h1')[0].innerHTML.trim(), "Custom 404!", 'No index component and a custom error component displays the custom 404 page.');
    equal(document.head.querySelectorAll("[href='/test/dummy-apps/1/error.css']")[0] instanceof Element, true, 'Custom error component loads its CSS document.');
    var handlers = getHandlers();
    equal(handlers, `^(?:?([sS]*))?$^([^?]*?)(?:?([sS]*))?$`, "When routing to a custom 404 with no sub routes, the current page's path is added to history's handlers to prevent infinite looping.");
    QUnit.stop();
    return Rebound.router.navigate('');
  })
  .then(function(){
    Rebound.stop();
    ran.push('custom404');
    return assert;
  });
}

function defaultIndex( assert ){
  return Rebound.start({
    "container": "#content",
    "root": window.location.pathname,
    "assetRoot": "/test/dummy-apps",
    "jsPath": "/2/:app.js",
    "cssPath": "/2/:app.css"
  }).then(function(){
    QUnit.start();
    equal(container.querySelectorAll('h1')[0].innerHTML.trim(), "Default Index!", 'If no custom index page is specified, index.html component is used.');
    equal(document.head.querySelectorAll("[href='/test/dummy-apps/2/index.css']")[0] instanceof Element, true, 'Default index component loads its CSS document.');
    QUnit.stop();
    return Rebound.router.navigate('');
  })
  .then(function(){
    Rebound.stop();
    ran.push('defaultIndex');
    return assert;
  });
}

function customIndex( assert ){
  return Rebound.start({
    "container": "#content",
    "root": window.location.pathname,
    "assetRoot": "/test/dummy-apps/3",
    "jsPath": "/:app.js",
    "cssPath": "/:app.css",
    "routeMapping": {
      "": "there"
    }
  }).then(function(){
    QUnit.start();
    equal(document.head.querySelectorAll("[src='/test/dummy-apps/3/there.js']")[0] instanceof Element, true, 'Empty string in route mapping attempts to load the specified app for index.');
    equal(container.querySelectorAll('h1')[0].innerHTML.trim(), "Custom Index!", 'Custom mapped index loads properly if present.');
    var handlers = getHandlers();
    equal(handlers, "^(?:?([sS]*))?$^([^?]*?)(?:?([sS]*))?$", "When routing to a custom index with no sub routes, the current route is still added to history's handlers");
    QUnit.stop();
    return Rebound.router.navigate('');
  })
  .then(function(){
    Rebound.stop();
    ran.push('customIndex');
    return assert;
  });
}

function customIndex404( assert ){
  return Rebound.start({
    "container": "#content",
    "root": window.location.pathname,
    "assetRoot": "/test/dummy-apps/4",
    "jsPath": "/:app.js",
    "cssPath": "/:app.css",
    "routeMapping": {
      "": "not-there"
    }
  }).then(function(){
    QUnit.start();
    equal(document.head.querySelectorAll("[src='/test/dummy-apps/4/not-there.js']")[0] instanceof Element, true, 'Empty string in route mapping attempts to load the specified app for index.');
    equal(container.querySelectorAll('h1')[0].innerHTML.trim(), "Custom 404 v2!", 'Custom mapped index routes 404 properly if not present.');
    var handlers = getHandlers();
    equal(handlers, "^(?:?([sS]*))?$^([^?]*?)(?:?([sS]*))?$", "When routing to custom index 404 page, the current route is added to history's handlers");
    QUnit.stop();
    return Rebound.router.navigate('');
  })
  .then(function(){
    Rebound.stop();
    ran.push('customIndex404');
    return assert;
  });
}

function routeTransitions( assert ){
  return Rebound.start({
    "container": "#content",
    "root": window.location.pathname,
    "assetRoot": "/test/dummy-apps/5",
    "jsPath": "/:app.js",
    "cssPath": "/:app.css",
    "routeMapping": {
      "foo": "test"
    }
  }).then(function(){
    QUnit.start();
    equal(container.querySelectorAll('h1')[0].innerHTML.trim(), 'Index Page 5!', 'App with multiple routes loads index page.');
    equal(document.head.querySelectorAll("[href='/test/dummy-apps/5/index.css']")[0] instanceof Element, true, 'App with multiple routes loads index page\'s css.');
    QUnit.stop();
    return Rebound.router.navigate('test');
  })
  .then(function(){
    QUnit.start();
    equal(container.querySelectorAll('h1')[0].innerHTML.trim(), 'Test Page 5!', 'When route is triggered, new app is loaded and rendered.');
    equal(document.head.querySelectorAll("[href='/test/dummy-apps/5/index.css']")[0] instanceof Element, true, 'Second app loads it\'s css document.');
    var handlers = getHandlers();
    equal(handlers, "^test/bar(?:?([sS]*))?$^test/foo(?:?([sS]*))?$^test(?:?([sS]*))?$^([^?]*?)(?:?([sS]*))?$", "Second app's subroutes are loaded into the history's handlers in the apropreate order.");
    QUnit.stop();
    return Rebound.router.navigate('test/foo');
  })
  .then(function(res){
    QUnit.start();
    equal(res, 'foo', 'When a subroute is triggered that is present on the app, the method on our app component is called and its value is returned.');
    QUnit.stop();
    return Rebound.router.navigate('test/non-existant');
  })
  .then(function(res){
    QUnit.start();
    equal(container.querySelectorAll('h1')[0].innerHTML.trim(), 'Custom 404 v5!', 'When subroute is triggered from the parent app that does not exist, the error page is loaded properly');

    var handlers = getHandlers();
    equal(handlers, "^test/non-existant(?:?([sS]*))?$^([^?]*?)(?:?([sS]*))?$", "Navigating to an error page from another route removed the installed handlers and adds the route it is on.");
    QUnit.stop();
    return Rebound.router.navigate('test/bar');
  })
  .then(function(res){
    QUnit.start();
    equal(res, 'bar', 'Navigating to a subroute from the error page loads the subroute proprely and returns the value via a promise.');
    equal(container.querySelectorAll('h1')[0].innerHTML.trim(), 'Test Page 5!', 'Navigating to a subroute from an error route loads the subroute page properly.');

    var handlers = getHandlers();
    equal(handlers, "^test/bar(?:?([sS]*))?$^test/foo(?:?([sS]*))?$^test(?:?([sS]*))?$^([^?]*?)(?:?([sS]*))?$", "Navigating to a route from an error route loads its subroutes into the history's handlers in the apropreate order.");
    QUnit.stop();
    return Rebound.router.navigate('test/foo');
  })
  .then(function(res){
    QUnit.start();
    equal(res, 'foo', 'Navigating to a subroute from another subroute in the same app calls the subroute properly and returns the value via a promise.');
    equal(container.querySelectorAll('h1')[0].innerHTML.trim(), 'Test Page 5!', 'Navigating to a subroute from another subroute in the same app loads the subroute properly without uninstalling the app.');
    QUnit.stop();
    return Rebound.router.navigate('');
  })
  .then(function(res){
    QUnit.start();
    equal(container.querySelectorAll('h1')[0].innerHTML.trim(), 'Index Page 5!', 'Navigating back to index from a secondary app will load the index page again.');
    var handlers = getHandlers();
    equal(handlers, "^(?:?([sS]*))?$^([^?]*?)(?:?([sS]*))?$", "Navigating back to index from another app uninstalls the app's handlers and installs index'");
    QUnit.stop();
    return Rebound.router.navigate('');
  })
  .then(function(){
    Rebound.stop();
    ran.push('routeTransitions');
    return assert;
  });
}

function serviceLoading( assert ){
  return (function(){
    var app = Rebound.start({
      "container": "#content",
      "services": {
        "service1": "#nav",
        "service2": "#footer"
      },
      "root": window.location.pathname,
      "assetRoot": "/test/dummy-apps/6",
      "jsPath": "/:app.js",
      "cssPath": "/:app.css",
      "routeMapping": {
        "foo": "test"
      }
    });
    QUnit.start();
    equal(Rebound.services.service1.isLazyComponent, true, 'Before services are loaded, lazy components hold their place on the global Rebound object.');
    QUnit.stop();
    return app;
  })()
  .then(function(){
    // Block until services are loaded
    return new Promise(function(resolve, reject){
      var count = 0;
      function checkServices(){
        if(++count == 3) resolve();
      }
      Rebound.services.service1.onLoad(checkServices);
      Rebound.services.service2.onLoad(checkServices);
      Rebound.services.page.onLoad(checkServices);
    });
  })
  .then(function(){
    QUnit.start();

    equal(Rebound.services.service1.isLazyComponent, undefined, 'After services are loaded, lazy components are replaced by their actual objects on the global Rebound object.');
    equal(Rebound.services.page.attributes.service1.cid, Rebound.services.service1.cid, 'Components consuming a service have their instances of the service upgraded from a LazyComponent when the service loads.');
    equal(Rebound.services.page.attributes.service2.cid, Rebound.services.service2.cid, 'Components consuming multiple services referance multiple servces appropriately.');
    equal(Rebound.services.service1.consumers.length, 1, 'Services track who is consuming them in their `consumers` property.');
    equal(typeof Rebound.services.page.services.service1.cid, 'string', 'Pages that consume a service track the service they consume in their `services` hash.');
    equal(typeof Rebound.services.page.services.service2.cid, 'string', 'Pages that consume multiple services track the additional services they consume in their `services` hash.');
    equal(Rebound.services.page.services.service2.isLazyComponent, undefined, 'Pages that consume services have their services upgraded from a LazyComponent when everything is loaded.');

    equal(container.querySelectorAll('#nav h1')[0].innerHTML.trim(), 'Service 1!', 'App with multiple services load the first service.');
    equal(document.head.querySelectorAll("[href='/test/dummy-apps/6/service1.css']")[0] instanceof Element, true, 'App with multiple services load the first service\s css.');
    equal(container.querySelectorAll('#footer h1')[0].innerHTML.trim(), 'Service 2!', 'App with multiple services load subsequent services.');
    equal(document.head.querySelectorAll("[href='/test/dummy-apps/6/service2.css']")[0] instanceof Element, true, 'App with multiple services load subsequent service\s css.');

    equal(Rebound.services.page.el.getElementsByTagName('a')[0].className, 'active', 'Links on the main page service receive an active class on their route.');
    equal(Rebound.services.service1.el.getElementsByTagName('a')[0].className, 'active', 'Links in a service receive an active class on their route.');
    equal(Rebound.services.page.el.getElementsByTagName('a')[1].className, '', 'Links on the main page service don\'t receive an active class on a route other than their own.');
    equal(Rebound.services.service1.el.getElementsByTagName('a')[1].className, '', 'Links in a service don\'t receive an active class on a route other than their own.');

    QUnit.stop();
    return Rebound.router.navigate('test');
  })
  .then(function(){
    QUnit.start();
    equal(container.querySelectorAll('#content h1')[0].innerHTML.trim(), 'Test Page 6!', 'With services present, when route is triggered, new app is loaded and rendered.');
    equal(typeof Rebound.services.service1.cid, 'string', 'When a page component consuming a service is destroyed, the service it is consuming is left uneffected.');
    equal(Rebound.services.service1.consumers.length, 0, "Pages consuming services remove themselves from the service's `consumers` array on deinit.");

    var handlers = getHandlers();
    equal(handlers, "^test/bar(?:?([sS]*))?$^test/foo(?:?([sS]*))?$^test(?:?([sS]*))?$^([^?]*?)(?:?([sS]*))?$", "With services present, the new app's subroutes are loaded into the history's handlers in the apropreate order.");

    equal(container.querySelectorAll('#nav h1')[0].innerHTML.trim(), 'Service 1!', 'After transition to new app, and app with multiple services still has the first service rendered.');
    equal(container.querySelectorAll('#footer h1')[0].innerHTML.trim(), 'Service 2!', 'After transition to new app, and app with multiple services still has the subsequent services rendered.');

    equal(Rebound.services.page.el.getElementsByTagName('a')[0].className, '', 'Links on the main page service don\'t receive an active class on a route other than their own after a transition.');
    equal(Rebound.services.service1.el.getElementsByTagName('a')[0].className, '', 'Links in a service don\'t receive an active class on a route other than their own after a transition.');
    equal(Rebound.services.page.el.getElementsByTagName('a')[1].className, 'active', 'Links on the main page service receive an active class on their route after a transition.');
    equal(Rebound.services.service1.el.getElementsByTagName('a')[1].className, 'active', 'Links in a service receive an active class on their route after a transition.');
    QUnit.stop();

    return Rebound.router.navigate('', {trigger: false});
  })
  .then(function(){
    QUnit.start();
    equal(Rebound.services.page.el.getElementsByTagName('a')[0].className, 'active', 'Links on the main page service receive an active class on their route after a silent transition.');
    equal(Rebound.services.service1.el.getElementsByTagName('a')[0].className, 'active', 'Links in a service receive an active class on their route after a silent transition.');
    equal(Rebound.services.page.el.getElementsByTagName('a')[1].className, '', 'Links on the main page service don\'t receive an active class on a route other than their own after a silent transition.');
    equal(Rebound.services.service1.el.getElementsByTagName('a')[1].className, '', 'Links in a service don\'t receive an active class on a route other than their own after a silent transition.');
    ran.push('serviceLoading');
    QUnit.stop();
    return Rebound.router.navigate('');
  })
  .then(function(){
    Rebound.stop();
    return assert;
  });
}


function queryParams( assert ){
  return Rebound.start({
    "container": "#content",
    "services": {},
    "root": window.location.pathname,
    "assetRoot": "/test/dummy-apps/7",
    "jsPath": "/:app.js",
    "cssPath": "/:app.css",
    "routeMapping": {}
  })
  .then(function(){
    return Rebound.router.navigate('test');
  })
  .then(function(){
    deepEqual(window._queryParams, {}, "If a no query params are in the url, the callback function receives an empty object.");
    return Rebound.router.navigate('test?foo');
  })
  .then(function(){
    QUnit.start();
    deepEqual(window._queryParams, {'foo': ''}, "If a single undefined query param is in the url the callback function receives an object with the key defined on it as an empty string.");
    QUnit.stop();
    return Rebound.router.navigate('test?foo=bar');
  })
  .then(function(){
    QUnit.start();
    deepEqual(window._queryParams, {'foo': 'bar'}, "If a single query param with a value is in the url the callback function receives the key and value in a hash containing the value.");
    QUnit.stop();
    return Rebound.router.navigate('test?foo=bar&biz');
  })
  .then(function(){
    QUnit.start();
    deepEqual(window._queryParams, {foo: 'bar', biz: ''}, "If a multiple query params are in the url, one with a value and the other undefined, the callback function receives the key and value as a hash.");
    QUnit.stop();
    return Rebound.router.navigate('test?foo=bar&biz=baz');
  })
  .then(function(){
    QUnit.start();
    deepEqual(window._queryParams, {foo: 'bar', biz: 'baz'}, "If a multiple query params ar in the url , both with values, the callback function receives the key and value as a hash.");
    QUnit.stop();
    return Rebound.router.navigate('test?foo=bar&foo=baz');
  })
  .then(function(){
    QUnit.start();
    deepEqual(window._queryParams, {foo: ['bar', 'baz']}, "If a multiple query params of the same name are in the url , both with values, the callback function receives the key and value as a hash containing an array.");
    QUnit.stop();
    return Rebound.router.navigate('test?foo[]=bar&foo[]=baz');
  })
  .then(function(){
    QUnit.start();
    deepEqual(window._queryParams, {foo: ['bar', 'baz']}, "If a multiple query params of the same name are in the url, suffixed with [], both with values, the callback function receives the key and value as a hash containing an array.");
    QUnit.stop();
    return Rebound.router.navigate('test?foo=bar,foo=baz');
  })
  .then(function(){
    QUnit.start();
    deepEqual(window._queryParams, {foo: ['bar', 'baz']}, "If a query param with comma seperated values are in the url , both with values, the callback function receives the key and value as a hash containing an array.");
    QUnit.stop();
    return Rebound.router.navigate('test?foo[bar]=asdf&foo[baz]=fdsa');
  })
  .then(function(){
    QUnit.start();
    deepEqual(window._queryParams, {foo: {'bar': 'asdf', 'baz': 'fdsa'}}, "If a query param with named properties are in the url, both with values, the callback function receives the key and value as a hash containing an object with those values.");
    QUnit.stop();
    return Rebound.router.navigate('test?foo[bar][baz]=asdf&foo[baz]=fdsa');
  })
  .then(function(){
    QUnit.start();
    deepEqual(window._queryParams, {foo: {'bar': {'baz': 'asdf'}, 'baz': 'fdsa'}}, "If a query param with deeply nested named properties are in the url, both with values, the callback function receives the key and value as a hash containing an object with those values.");
    QUnit.stop();
    return Rebound.router.navigate('test', {data: {foo: 'bar'}});
  })
  .then(function(){
    QUnit.start();
    deepEqual(window._queryParams, {foo: 'bar'}, "Calling navigate can take a `data` option that is converted to query params.");
    equal(window.location.search, '?foo=bar', "Calling navigate with a `data` option adds query params to the url in the navigation bar.");
    QUnit.stop();
    return Rebound.router.navigate('test', {data: {foo: 'bar', biz: 'baz'}});
  })
  .then(function(){
    QUnit.start();
    deepEqual(window._queryParams, {foo: 'bar', biz: 'baz'}, "Calling navigate can take a `data` option with multiple properties that is converted to query params.");
    equal(window.location.search, '?foo=bar&biz=baz', "Calling navigate with a `data` option with multiple properties adds the query params to the url in the navigation bar with the apropreate seperator.");
    QUnit.stop();
    return Rebound.router.navigate('test?quux=norf', {data: {biz: 'baz', foo: 'bar'}});
  })
  .then(function(){
    QUnit.start();
    deepEqual(window._queryParams, {quux: 'norf', biz: 'baz', foo: 'bar'}, "Calling navigate with both a `data` option and a query string deliver both to the route callback.");
    equal(window.location.search, '?quux=norf&biz=baz&foo=bar', "Calling navigate with both a `data` option and a query string adds both to the url in the navigation bar.");
    QUnit.stop();
    return Rebound.router.navigate('');
  })
  .then(function(){
    Rebound.stop();
    return assert;
  });
}

function regexpRoutes( assert ){
  return Rebound.start({
    "container": "#content",
    "root": window.location.pathname,
    "assetRoot": "/test/dummy-apps/8",
    "jsPath": "/:app.js",
    "cssPath": "/:app.css"
  }).then(function(){
    return Rebound.router.navigate('test/baz');
  })
  .then(function(page){
    equal(page, 'baz', 'Routes defined as regular expressions receive their captured values.');
    equal(page, 'baz', 'Routes defined as regular expressions with no query params receive an empty object.');
    return Rebound.router.navigate('test/bar?foo=bar');
  })
  .then(function(page){
    equal(page, 'bar', 'Routes defined as regular expressions receive their captured values on re-route.');
    deepEqual(window._queryParams, {'foo': 'bar'}, 'Routes defined as regular expressions with query params receive a well formed query object.');
    return Rebound.router.navigate('test/biz?biz=baz');
  })
  .then(function(page){
    equal(page, 'biz', 'Routes defined as regular expressions, with ^ and $ for begining and end, receive their captured values on re-route.');
    deepEqual(window._queryParams, {'biz': 'baz'}, 'Routes defined as regular expressions, with ^ and $ for begining and end, with query params receive a well formed query object.');
    return Rebound.router.navigate('');
  })
  .then(function(){
    Rebound.stop();
    return assert;
  });
}


function lazyComponentLoading( assert ){
  return Rebound.start({
    "container": "#content",
    "root": window.location.pathname,
    "assetRoot": "/test/dummy-apps/9",
    "jsPath": "/:app.js",
    "cssPath": "/:app.css"
  }).then(function(page){
    var component = document.getElementsByTagName('test-component-9')[0].data;
    equal(component.isComponent, true, 'Lazy loaded components are inserted immediately in the dom with a dehydrated component instance.');
    var end = assert.async(1);
    component.onLoad(function(){
      equal(component.isHydrated, true, 'Lazy loaded components are asyncronously upgraded.');
      end();
    });
    return Rebound.router.navigate('');
  })
  .then(function(){
    Rebound.stop();
    return assert;
  });
}



QUnit.test('Rebound Router', function( assert ) {
  assert.expect(81);

  QUnit.stop();
  default404(assert)
  .then(custom404)
  .then(defaultIndex)
  .then(customIndex)
  .then(customIndex404)
  .then(routeTransitions)
  .then(serviceLoading)
  .then(queryParams)
  .then(regexpRoutes)
  .then(lazyComponentLoading)
  // Reset our path to home after all route tests are done
  .then(function(){
    Rebound.stop();
    QUnit.start();
  });
});
