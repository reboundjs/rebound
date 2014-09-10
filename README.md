<p align="center">
  <img src="http://reboundjs.com/images/rebound.svg" alt="Rebound Logo" width="520px" />
  <br>
  <a href="https://travis-ci.org/epicmiller/rebound">
    <img src="https://travis-ci.org/epicmiller/rebound.svg?branch=master" alt="Build Status" />
    <br>
    <a href="https://trello.com/b/IKShh3Nt/rebound">Trello Board</a>
  </a>
  <h3 align="center">Automatic data binding for Backbone using HTMLBars.</h3>
</p>
- - -

#### Backbone and HTMLBars are a match made in heaven :heart:

Now I know what you're thinking:

>"But Adam! The mind-numbingly repetative process of manually wiring all of my events in Backbone is my favorite part of application development!"

But just trust me on this, this is going to be good.

#### Wait, what is this again?

**tl;dr**: We have a blazingly fast, syntactically beautiful templating library at our disposal that understands where it is and what is going on in your DOM. And, like Ember, we can use these features to allow for live data-binding with our Backbone models - change a value in your model or collection, and your views update automagically.

**The full version**: The good people over at [tildeio](https://github.com/tildeio) have been working hard on a variant of Handlebars that emits DOM rather than relying on crazy string manipulation. Go google it for more nitty-gritty details, but the

Rebound + HTMLBars is a Model-View-Component framework build on Backbone. Rebound replaces Backbone's view layer with HTMLBars, binding to your models on first render and live updating your dom as they change. To make the conversation two-way, an event helper lets you respond to user interaction by defining s in your HTMLBars templates. Combine with with a powerfully simple router and the new W3 Web Components syntax, and you get an amazingly small but powerful framework to develop data-bound single page apps.

So we remove Backbone's most annoying 'feature' - manual data binding – while avoiding the overhead, convention restrictions and learning curve of Ember. And unlike some of the very few other data-binding libraries out there (heres looking at you React, epoxyjs, knockoutjs, etc), we get the simple interface of the much-loved Handlebars syntax for our templates, without any extra elements or data attributes cluttering our DOM! Server side rendering of data-bound templates will be possible in the near future! Whats there not to love?!

#### Awesome. How do I use it?

The project is still in flux, so everything below is subject to change! Use at your own risk / pleasure:

##### To test what is already there:

 - Install all dependancies: ```npm install```

 - Just build the project: ```grunt build```

 - Test in the command line: ```npm test```

 - Start the test server: ```npm start```

 - Check to [localhost:8000/test](http://localhost:8000/test) to run the tests or [localhost:8000/test/demo](http://localhost:8000/test/demo) to see it in action.

<p align="center">
  <h3 align="center">Awesome, lets get to some code</h3>
</p>
- - -

#### NOTE: This project is not 100% ready yet and this documentation represents how Rebound will be used and not the current state of the project!

There will soon be a Bower repository for Rebound, but until then use what is is the /dist directory after running ```grunt build```, ```npm test``` or ```npm start```. There are two packaged files called ```rebound.runtime.pkg.js``` and ```rebound.compiler.pkg.js```. Both of these files contain [JQuery](http://www.jquery.com), [Underscore](http://www.underscorejs.org), [RequireJS](requirejs.org), [Backbone](backbonejs.org) and of course, the main Rebound library. The compiler package contains the extra code needed to compile HTMLBars templates and should rarely be needed on any client facing site. All templates should be precompiled on the server by the [Grunt-Rebound](https://github.com/epicmiller/grunt-rebound) plugin, or a similar pre-compiler.

### How do I get Rebound on my page?

You can include Rebound on your page like this:

```js
<script src="/javascripts/lib/rebound.runtime.pkg.js" id="Rebound">
{
  "appContext": "/",
  "globalComponents": {"chrome" : "nav"},
  "jsPrefix": "/javascripts/apps/",
  "jsSuffix": "",
  "cssPrefix": "/stylesheets/apps/",
  "cssSuffix": "",
  "triggerOnFirstLoad": true,
  "routeMapping": {
    "": "home"
  }
}
</script>
```
Because the script tag contains a src, nothing inside it gets executed, but is still accessable to the page as $('#Rebound').html(). We take advantage of this to load Rebound's config options right where you include the Rebound library itself. Convenient!

##### Config Options

 - __appContext__ - This is the equivelent to passing the ```root``` option to Backbone.history.start. If your application is not being served from the root url ```/``` of your domain, be sure to tell History where the root really is.
 - __globalComponents__ - By default, as will be talked about in the next section, there is only one page level component loaded at a time. The components specified here are for page elements you want to live the entire length of the user's session, like a global nav bar, footer, site-wide chat, etc. The object specifies ```{ "componentName": "cssSelector" }```. The output of the component will be loaded into the first matching element for the provided css selector on the page.
 - __jsPrefix__ - Used by Rebound to construct the path to each page's js file. See routing for more details.
 - __jsSuffix__ - Used by Rebound to construct the path to each page's js file. See routing for more details.
 - __cssPrefix__ - Used by Rebound to construct the path to each page's css file. See routing for more details.
 - __cssSuffix__ - Used by Rebound to construct the path to each page's css file. See routing for more details.
 - __triggerOnFirstLoad__ - If false, Rebound will not try and trigger the route  once the page is loaded. Equivalent to passing ```{ silent: true }``` to Backbone.history.start
 - __routeMapping__ - Object which defines custom base route path to component name mappings. ex: if the root url ```/``` should load the home component, pass ```{ "": "home" }```

### Routing

Rebound adds a three bits of functionality to Backbone's router to make navigation in a single page app even easier:
 - Relative urls will always try and trigger a route. You can now write ```<a href="/profile/1234"></a>``` and have that route be triggered on the router. No need for wiring click events, or helpers to trigger routes.
 - Absolute urls like ```<a href="www.google.com"></a>``` will be ignored by the router and load normally.
 - If a route does not exist in the router, Rebound will try and automatically load that page's resources from ```jsPrefix``` + ```baseRoute``` + ```jsSuffix``` and then re-trigger the route.

By loading routes and page resources as they are needed, your initial __page load size is greatly reduced__. Your application also __does not need to know every route on page load - every page in your application manages its own routing__. This way there is no central router to manage, a major benefit for larger applications.

Here's a walkthrough of how Rebound's automatic resource loading works:

>A page is loaded at /profile/1234, with the jsPrefix "javascripts/apps/" and jsSuffix "Page". Rebound will start the router and try to trigger the route /profile/1234. Because this route doesn't exits, the wildcard route is executed. Rebound then tries to load the javascript file ```/javascripts/apps/profilePage.js```. Inside this file is all the resources needed for the profile page, including its template, component, and additional routes as you'll see below in the components section. The routes defined in this page component are then loaded into the router and the /profile/1234 route is triggered again. This time, because the page's resources have been loaded, the /profile/:uid route has now presumably been defined and the route will execute.

>When the user clicks on another link, say, /discover, the router sees that it does not have a /discover route loaded. The router again hits the wildcard route and fetches ```/javascripts/apps/discoverPage.js```. The old profile app is then uninstalled, its routes removed, and the discover page is loaded as before.

### Components

Rebound is a Model View Component library. This means the basic building blocks of Rebound are data bound components which adhere closely to the W3 Web Components syntax.

##### Okay, cool, what do they look like?

A Rebound component looks like this:

```html
<element name="edit-todo">
  <template>
    <input class="edit" value="{{value}}" type="text" {{on "blur" "doneEditing"}} {{on "keyup" "inputModified"}}>
  </template>
  <script>
    return ({

      /********* Lifecycle Methods ********/
      createdCallback: function(event){
        this.oldValue = this.get("value");
        console.log("I've been created!");
      },
      attachedCallback: function(event){
        this.$('input.edit').focus();
        console.log("I've been inserted into the dom!");
      },
      detachedCallback: function(){
        console.log("I've been removed from the dom!");
      },

      /********* Config Options ********/
      // Any of these special config options would go here:
      // routes, outlet, url, urlRoot, idAttributes, id

      /********* Default Properties ********/
      value: 'Default Value',
      awesomeValue: function(){
        return this.get('value') + ' is AWESOME!';
      },

      /********* Component Methods ********/
      doneEditing: function(event){
        this.set('editing', false);
      },
      inputModified: function(event){
        // If enter key is pressed
        if(event.keyCode == 13)
          this.doneEditing(event);
        // If escape key is pressed
        if(event.keyCode == 27){
          this.set('value', this.oldValue);
          this.doneEditing(event);
        }
      }
    })
  </script>
</element>
```

and used like this

```html
<edit-todo value={{title}} editing={{editing}}></edit-todo>
```

The above is actually very close to what is used by the TodoMVC demo in the Rebound repository's demo application. Go take a look to see it in action!

#### Sure, but how do they work?

Every function in the component is called in the scope of the component itself. That means that the ```this``` variable will always be the current component.

Here are the convenience methods you get when working in a component:

 - __get__ - ```this.get()``` is used to get the properties defined on your component just like in Backbone models. Because properties can be of any data type, either string together multiple gets to retreive nested data ```this.get('users').at(0).get('firstName')``` or, for your convenience, just pass it the path you want ```this.get('users.[0].firstName')```.
 - __set__ = ```this.set()``` is used to set component properties just like in Backbone models. Because properties can be any of any data type, either string together multiple gets followed by a set to set nested data items ```this.get('users').at(0).set('firstName', 'Adam')``` or, for your convenience, just pass it the path you want ```this.set('users.[0].firstName', 'Adam')```.
 - __$__ - Each component has a $ function that runs queries scoped within the view's element. Use like ```this.$('any#css.selector')```
 - __$el__ - All components have a DOM element at all times, accessable through the el property, whether they've already been inserted into the page or not.
 - __el__ - A cached jQuery object for the view's element. A handy reference instead of re-wrapping the DOM element all the time.

#### Sweet!! How do I make one?!

When creating a Rebound component, think about it like you're defining a public API for the rest of the program to interface with your custom element. You'll be defining:
 - __Default Properties__ - which are accessable to your template for rendering and overridable by the properties you pass to your component.
 - __Lifecycle Methods__ - which define callback function for element creation, insertion into the dom, and removal from the dom.
 - __Component Methods__ - which are callable from the view via user input events.
 - A number of special __Config Options__ which are available to allow you to take advantage of all that Backbone model goodness.

##### Default Properties

Default properties come it two types. __Primitive Properties__ and __Computed Properties__.

Primitive properties are exactly like they sound. They are any string, interger, boolean, object or array.

```js
return ({
  value: 'Default Value',
  count: 0,
  bool: true,
  arr: ['Default', 'Values'],
  obj: { 'Default': 'Value' }
})
```

Computed properties are a little more advanced. Computed properteis are functions that take no arguments and return a computed value based off other properties stored in the component. For example, ```awesomeValue``` is a computed property, and if I referance ```{{awesomeValue}}``` in my template it will output "Default Value is AWESOME!"

***In order for a computed property to be valid it must take no variables and have a ```return``` value***

```js
return ({
  value: 'Default Value',
  awesomeValue: function(){ // Takes no variables
    return this.get('value') + ' is AWESOME!'; // Must have a return value
  }
})
```

Computed properteis automatically set up their dependancy chains. This means that ```awesomeValue``` knows it depends on ```value``` and will re-render itself in the template any time ```value``` changes.

Computed properties are always called in the scope of the component. You can access all of the component's properties and methods through the ```this``` variable.

When using a Rebound component in your templates, any attributes passed to the component will override any default property of the same name you have set. The you may pass any type of data to a component this way – strings, objects or arrays.

```html
<edit-todo value={{title}} name="Works with inline strings too."></edit-todo>
```

##### Lifecycle Methods

Lifecycle methods are called when certain events happen to a component over its lifecycle. These are:

```javascript
return ({
  createdCallback: function(event){
    console.log("I've been created!");
  },
  attachedCallback: function(event){
    console.log("I've been inserted into the dom!");
  },
  detachedCallback: function(){
    console.log("I've been removed from the dom!");
  }
})
```

##### Component Methods

Component Methods are called when a user takes an action on a dom element.

***In order for a component method to be valid it must take at least one variable or have no ```return``` statement***

```javascript
return ({
  elementClicked: function(event){ // Takes at least one variable
    alert("OMG! I've been clicked!!");
    // Or, has no return statement
  },
})
```

Attach these callbacks to the dom using the "on" helper in your templates.

```html
<div {{on 'click' 'elementClicked'}}>Click me!</div>
```

Component methods may also be called by other functions on the component.

```javascript
return ({
  otherMethod: function(event){
    this.elementCalled('otherMethod');
  },
  elementCalled: function(caller){ // Takes at least one variable
    alert("OMG! I've been called by " + caller +"!!");
    // Or, has no return statement
  },
})
```

Component methods are always called in the scope of the component. You can access all of the component's properties and methods through the ```this``` variable.

##### Config Options

Config options are reserved words that serve a special function in Rebound components.
Valid config options are:
 - __routes__ - For page level components this is where the custom routes are defined. See routing for more information.
 - __url__ - Returns the relative URL where the model's resource would be located on the server. May be a function or string.
 - __urlRoot__ - Specify a urlRoot if you're using a model outside of a collection, to enable the default url function to generate URLs based on the model id. "[urlRoot]/id". May be a function or string.
 - __idAttribute__ - A model's unique identifier is stored under the id attribute. If you're directly communicating with a backend that uses a different unique key, you may set a Model's idAttribute to transparently map from that key to id.

Under the covers, components are just special instances of Backbone models. This gives you all the niceties of Backbone, but it does mean that there are a few other reserved words that will yell at you if you try and use them as property or method names. These are: ```constructor, get, set, has, extend, escape, unset, clear, cid, attributes, changed, toJSON validationError, isValid, isNew, hasChanged, changedAttributes, previous, previousAttributes```

