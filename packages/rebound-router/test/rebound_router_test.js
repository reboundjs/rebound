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
  Backbone.history.handlers.forEach(function(handler){
    handlers += handler.route.toString();
  });
  return handlers;
}

function default404(){
  return Rebound.start({
    "container": "#content",
    "root": window.location.pathname,
    "jsPath": "/test/dummy-apps/0/:app.js",
    "cssPath": "/test/dummy-apps/0/:app.css"
  }).then(function(){
    QUnit.start();
    equal(container.querySelectorAll('h1')[0].innerHTML.trim(), "Oops! We couldn't find this page.", 'No index component and no error component displays default 404 page.');
    QUnit.stop();
    Rebound.stop();
  });
}

function custom404(){
  return Rebound.start({
    "container": "#content",
    "root": window.location.pathname,
    "jsPath": "/test/dummy-apps/1/:app.js",
    "cssPath": "/test/dummy-apps/1/:app.css"
  }).then(function(){
    QUnit.start();
    equal(container.querySelectorAll('h1')[0].innerHTML.trim(), "Custom 404!", 'No index component and a custom error component displays the custom 404 page.');
    equal(document.head.querySelectorAll("[href='/test/dummy-apps/1/error.css']")[0] instanceof Element, true, 'Custom error component loads its CSS document.');
    var handlers = getHandlers();
    equal(handlers, "/^(?:\\?([\\s\\S]*))?$//^([^?]*?)(?:\\?([\\s\\S]*))?$/", "When routing to a custom 404 with no sub routes, the current page's path is added to history's handlers to prevent infinite looping.");
    QUnit.stop();
    Rebound.stop();
  });
}

function defaultIndex(){
  return Rebound.start({
    "container": "#content",
    "root": window.location.pathname,
    "jsPath": "/test/dummy-apps/2/:app.js",
    "cssPath": "/test/dummy-apps/2/:app.css"
  }).then(function(){
    QUnit.start();
    equal(container.querySelectorAll('h1')[0].innerHTML.trim(), "Default Index!", 'If no custom index page is specified, index.html component is used.');
    equal(document.head.querySelectorAll("[href='/test/dummy-apps/2/index.css']")[0] instanceof Element, true, 'Default index component loads its CSS document.');
    QUnit.stop();
    Rebound.stop();
  });
}

function customIndex(){
  return Rebound.start({
    "container": "#content",
    "root": window.location.pathname,
    "jsPath": "/test/dummy-apps/3/:app.js",
    "cssPath": "/test/dummy-apps/3/:app.css",
    "routeMapping": {
      "": "there"
    }
  }).then(function(){
    QUnit.start();
    equal(document.head.querySelectorAll("[src='/test/dummy-apps/3/there.js']")[0] instanceof Element, true, 'Empty string in route mapping attempts to load the specified app for index.');
    equal(container.querySelectorAll('h1')[0].innerHTML.trim(), "Custom Index!", 'Custom mapped index loads properly if present.');
    var handlers = getHandlers();
    equal(handlers, "/^(?:\\?([\\s\\S]*))?$//^([^?]*?)(?:\\?([\\s\\S]*))?$/", "When routing to a custom index with no sub routes, the current route is still added to history's handlers");
    QUnit.stop();
    Rebound.stop();
  });
}

function customIndex404(){
  return Rebound.start({
    "container": "#content",
    "root": window.location.pathname,
    "jsPath": "/test/dummy-apps/4/:app.js",
    "cssPath": "/test/dummy-apps/4/:app.css",
    "routeMapping": {
      "": "not-there"
    }
  }).then(function(){
    QUnit.start();
    equal(document.head.querySelectorAll("[src='/test/dummy-apps/4/not-there.js']")[0] instanceof Element, true, 'Empty string in route mapping attempts to load the specified app for index.');
    equal(container.querySelectorAll('h1')[0].innerHTML.trim(), "Custom 404 v2!", 'Custom mapped index routes 404 properly if not present.');
    var handlers = getHandlers();
    equal(handlers, "/^(?:\\?([\\s\\S]*))?$//^([^?]*?)(?:\\?([\\s\\S]*))?$/", "When routing to custom index 404 page, the current route is added to history's handlers");
    QUnit.stop();
    Rebound.stop();
  });
}

function routeTransitions(){
  return Rebound.start({
    "container": "#content",
    "root": window.location.pathname,
    "jsPath": "/test/dummy-apps/5/:app.js",
    "cssPath": "/test/dummy-apps/5/:app.css",
    "routeMapping": {
      "foo": "test"
    }
  }).then(function(){
    QUnit.start();
    equal(container.querySelectorAll('h1')[0].innerHTML.trim(), 'Index Page 5!', 'App with multiple routes loads index page.');
    equal(document.head.querySelectorAll("[href='/test/dummy-apps/5/index.css']")[0] instanceof Element, true, 'App with multiple routes loads index page\'s css.');
    QUnit.stop();
    return Rebound.router.navigate('test')
  })
  .then(function(){
    QUnit.start();
    equal(container.querySelectorAll('h1')[0].innerHTML.trim(), 'Test Page 5!', 'When route is triggered, new app is loaded and rendered.');
    equal(document.head.querySelectorAll("[href='/test/dummy-apps/5/index.css']")[0] instanceof Element, true, 'Second app loads it\'s css document.');

    var handlers = getHandlers();
    equal(handlers, "/^test\\/foo(?:\\?([\\s\\S]*))?$//^test\\/bar(?:\\?([\\s\\S]*))?$//^test(?:\\?([\\s\\S]*))?$//^([^?]*?)(?:\\?([\\s\\S]*))?$/", "Second app's subroutes are loaded into the history's handlers in the apropreate order.");
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
    equal(handlers, "/^test\\/non\\-existant(?:\\?([\\s\\S]*))?$//^([^?]*?)(?:\\?([\\s\\S]*))?$/", "Navigating to an error page from another route removed the installed handlers and adds the route it is on.");
    QUnit.stop();
    return Rebound.router.navigate('test/bar');
  })
  .then(function(res){
    QUnit.start();
    equal(res, 'bar', 'Navigating to a subroute from the error page loads the subroute proprely and returns the value via a promise.');
    equal(container.querySelectorAll('h1')[0].innerHTML.trim(), 'Test Page 5!', 'Navigating to a subroute from an error route loads the subroute page properly.');

    var handlers = getHandlers();
    equal(handlers, "/^test\\/foo(?:\\?([\\s\\S]*))?$//^test\\/bar(?:\\?([\\s\\S]*))?$//^test(?:\\?([\\s\\S]*))?$//^([^?]*?)(?:\\?([\\s\\S]*))?$/", "Navigating to a route from an error route loads its subroutes into the history's handlers in the apropreate order.");
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
    equal(handlers, "/^(?:\\?([\\s\\S]*))?$//^([^?]*?)(?:\\?([\\s\\S]*))?$/", "Navigating back to index from another app uninstalls the app's handlers and installs indes'");
    QUnit.stop();
    Rebound.stop();
  });
}

function serviceLoading(){
  window.foo = true;
  var app = Rebound.start({
    "container": "#content",
    "services": {
      "service1": "#nav",
      "service2": "#footer"
    },
    "root": window.location.pathname,
    "jsPath": "/test/dummy-apps/6/:app.js",
    "cssPath": "/test/dummy-apps/6/:app.css",
    "routeMapping": {
      "foo": "test"
    }
  });

  QUnit.start();
  equal(Rebound.services.service1.isLazyComponent, true, 'Before services are loaded, lazy components hold their place on the global Rebound object.');
  QUnit.stop();

  app.then(function(){
    // Block until services are loaded
    var check = new Promise(function(resolve, reject){
      var count = 0;
      function checkServices(){
        if(++count == 2) resolve();
      };
      Rebound.services.service1.onLoad(checkServices);
      Rebound.services.service2.onLoad(checkServices);
    });
    return check;
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
    QUnit.stop();
    return Rebound.router.navigate('test');
  })
  .then(function(){
    QUnit.start();
    equal(container.querySelectorAll('#content h1')[0].innerHTML.trim(), 'Test Page 6!', 'With services present, when route is triggered, new app is loaded and rendered.');
    equal(typeof Rebound.services.service1.cid, 'string', 'When a page component consuming a service is destroyed, the service it is consuming is left uneffected.');
    equal(Rebound.services.service1.consumers.length, 0, "Pages consuming services remove themselves from the service's `consumers` array on deinit.");

    var handlers = getHandlers();
    equal(handlers, "/^test\\/foo(?:\\?([\\s\\S]*))?$//^test\\/bar(?:\\?([\\s\\S]*))?$//^test(?:\\?([\\s\\S]*))?$//^([^?]*?)(?:\\?([\\s\\S]*))?$/", "With services present, the new app's subroutes are loaded into the history's handlers in the apropreate order.");

    equal(container.querySelectorAll('#nav h1')[0].innerHTML.trim(), 'Service 1!', 'After transition to new app, and app with multiple services still has the first service rendered.');
    equal(container.querySelectorAll('#footer h1')[0].innerHTML.trim(), 'Service 2!', 'After transition to new app, and app with multiple services still has the subsequent services rendered.');

    return Rebound.router.navigate('');
  });
  return app;
}


QUnit.test('Rebound Router', function() {
  // Start off at a standard url and save what our page was loaded at
  var oldLocation = window.location.pathname;
  // history.pushState({}, "Router Tests Start", "/test");
  QUnit.stop();
  default404()
  .then(custom404)
  .then(defaultIndex)
  .then(customIndex)
  .then(customIndex404)
  .then(routeTransitions)
  .then(serviceLoading)
  .then(function(){
    // Reset our path to home after all route tests are done
    Rebound.stop();
    // history.pushState({}, "Router Tests Done", oldLocation);
  })
});
