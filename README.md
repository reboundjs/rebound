<p align="center">
  <img src="http://reboundjs.com/images/rebound.svg" alt="Rebound Logo" width="520px" />
  <br>
  <a href="https://travis-ci.org/epicmiller/rebound">
    <img src="https://travis-ci.org/epicmiller/rebound.svg?branch=master" alt="Build Status" />
    <br>
  </a>
  <a href="https://gitter.im/epicmiller/rebound?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge">
    <img src="https://badges.gitter.im/Join%20Chat.svg" alt="Gitter" />
    <br>
  </a>
  <a href="http://zenhub.io" target="_blank">
    <img src="https://raw.githubusercontent.com/ZenHubIO/support/master/zenhub-badge.png" height="18px" alt="Powered by ZenHub"/>
  </a>

  <h3 align="center">Automatic data binding for Backbone using HTMLBars.</h3>
</p>
- - -

#### Backbone and HTMLBars are a match made in heaven :heart:

Now I know what you're thinking:

>"But Adam! The mind-numbingly repetative process of manually wiring all of my events in Backbone is my favorite part of application development!"

But just trust me on this, this is going to be good.

#### Wait, what is this again?

**tl;dr**: We have a blazingly fast, syntactically beautiful templating library at our disposal that understands where it is and what is going on in your DOM. And, like Ember, we can use these features to allow for live data-binding with our Backbone models - change a value in your model or collection, and your views update automagically. Throw in a brilliant Custom-Elements polyfill and *bam* – Rebound.

**The full version**: The good people over at [tildeio](https://github.com/tildeio) have been working hard on a variant of Handlebars that emits DOM rather than relying on crazy string manipulation. Go google it for more nitty-gritty details. But long story short is this new library makes data binding very fast and very powerful.

Powerful polyfills for the new custom elements api that allows us to start using this exceptionally powerfull technology today.

[Backbone](https://github.com/jashkenas/backbone), for those of you living under a rock, is a client side MV* framework that makes creating data heavy web pages a breeze. Its evented Models and Collections are exceptionally powerful, and it has a  robust Router which makes navigating in singe page apps possible. However, its views are notoriously minimal and it makes no assumptions about application structure, leaving much up to the developer.

[Rebound](https://github.com/epicmiller/rebound) is a Model-View-Component framework build on Backbone. Rebound replaces Backbone's view layer with HTMLBars templates, binding to your models to the dom on render and live updating your page as they change. To make the conversation two-way, event helpers and automatic binding to form elements lets you respond to user interaction. Combine this with an augmented but still powerfully simple router and the new W3 Web Components syntax, and you get an amazingly small but powerful framework to develop data-bound single page apps.

So we remove Backbone's most annoying 'feature' - manual data binding – while avoiding the overhead, proprietary convention restrictions and learning curve of Ember. And unlike some of the very few other data-binding libraries out there (heres looking at you React, epoxyjs, knockoutjs, etc), we get the simple interface of the much-loved Handlebars syntax for our templates, without any extra elements or data attributes cluttering our DOM! Server side rendering of data-bound templates will be possible in the near future! Whats there not to love?!

#### Awesome. How do I use it?

The project is still in flux, so everything below is subject to change! Use at your own risk / pleasure:

##### To test what is already there:

 - Install all dependancies: ```npm install```

 - Start the test server: ```npm start```

 - Check out [localhost:8000/test](http://localhost:8000/test) to run the tests or [localhost:8000/test/demo](http://localhost:8000/test/demo) to see it in action.

<p align="center">
  <h3 align="center">Awesome, lets get to some code</h3>
</p>
- - -

Rebound is available via bower if you so please:
```bower install reboundjs```

There are two packaged files called ```rebound.runtime.js``` and ```rebound.compiler.js```. Both of these files contain [JQuery](http://www.jquery.com), [Underscore](http://www.underscorejs.org), [RequireJS](requirejs.org), [Backbone](backbonejs.org), [CustomElements](https://github.com/Polymer/CustomElements), [HTMLBars](https://github.com/tildeio/htmlbars) and of course, the main Rebound library. The compiler package contains the extra code needed to compile HTMLBars templates client side and should rarely be needed on any user facing site. All templates should be precompiled on the server by the [Grunt-Rebound](https://github.com/epicmiller/grunt-rebound) plugin, or a similar pre-compiler.

### How do I get Rebound on my page?

You can include Rebound on your page like this:

```js
<script src="/javascripts/lib/rebound.runtime.js" id="Rebound">
{
  "root": "/",
  "globalComponents": {"chrome" : "nav"},
  "jsPrefix": "/javascripts/apps/:route/",
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
Because the Rebound script tag contains a src, nothing inside it gets executed, but is still accessable to the page as $('#Rebound').html(). We take advantage of this to load Rebound's config options right where you include the Rebound library itself. Convenient!

##### Config Options

 - __root__ - This is the equivelent to passing the ```root``` option to Backbone.history.start. If your application is not being served from the root url ```/``` of your domain, be sure to tell History where the root really is.
 - __globalComponents__ - By default, as will be talked about in the next section, there is only one page level component loaded at a time. The components specified here are for page elements you want to live the entire length of the user's session, like a global nav bar, footer, site-wide chat, etc. The object specifies ```{ "componentName": "cssSelector" }```. The output of the component will be loaded into the first matching element for the provided css selector on the page.
 - __jsPrefix__ - Used by Rebound to construct the path to each page's js file. Use :route as a placeholder for the top level route's name (ex: /profile/1/activity is 'profile'). See routing for more details.
 - __jsSuffix__ - Used by Rebound to construct the path to each page's js file. Use :route as a placeholder for the top level route's name (ex: /profile/1/activity is 'profile'). See routing for more details.
 - __cssPrefix__ - Used by Rebound to construct the path to each page's css file. See routing for more details.
 - __cssSuffix__ - Used by Rebound to construct the path to each page's css file. See routing for more details.
 - __triggerOnFirstLoad__ - If false, Rebound will not try and trigger the route  once the page is loaded. Equivalent to passing ```{ silent: true }``` to Backbone.history.start
 - __routeMapping__ - Object which defines custom base route path to component name mappings. ex: if the root url ```/``` should load the home component, pass ```{ "": "home" }```

<p align="center">
  <h3 align="center">Routing</h3>
</p>
- - -
Rebound adds a three bits of functionality to Backbone's router to make navigation in a single page app even easier:
 - Relative urls will always try and trigger a route. You can now write ```<a href="/profile/1234"></a>``` and have that route be triggered on the router. No need for wiring click events, or using helpers to trigger routes.
 - Absolute urls like ```<a href="www.google.com"></a>``` will be ignored by the router and load normally.
 - If a route does not exist in the router, Rebound will try and automatically load that page's resources in AMD format from ```jsPrefix``` + ```baseRoute``` + ```jsSuffix``` and then re-trigger the route.
 - If for some reason you need to access the router directly, the router instance can be found at Rebound.router

By loading routes and page resources as they are needed, your initial __page load size is greatly reduced__. Your application also __does not need to know every route on page load - every page in your application manages its own routing__ using the syntax show below in the components section. This way there is no central router to manage, a major benefit for larger applications.

Here's a walkthrough of how Rebound's automatic resource loading works:

>A page is loaded at /profile/1234, with the jsPrefix "javascripts/apps/" and jsSuffix "Page". Rebound will start the router and try to trigger the route /profile/1234. Because this route doesn't exits, the wildcard route is executed. Rebound then tries to load the javascript file ```/javascripts/apps/profilePage.js```, which is the profile page's  component code. Inside this file are all the resources needed for the profile page, including its template, component properties, and additional routes, as you'll see below in the components section. The routes defined in this page component are then loaded into the router and the /profile/1234 route is triggered again. This time, because the page's resources have been loaded, the /profile/:uid route has now presumably been defined and the route will execute.

>When the user clicks on another link, say, /discover, the router sees that it does not have a /discover route loaded. The router again hits the wildcard route and fetches ```/javascripts/apps/discoverPage.js```. The profile page is then uninstalled, its routes removed, and the discover page is loaded in its place.

<p align="center">
  <h3 align="center">Components</h3>
</p>
- - -

Rebound is a Model View Component library. This means the basic building blocks of Rebound are data bound components which adhere closely to the W3 Custom Elements spec.

##### Okay, cool, what do they look like?

A Rebound component looks like this:

```html
<element name="example-element">
  <template>
    <input class="edit" value="{{awesomeValue}}" type="text" {{on "blur" "doneEditing"}}>
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
        console.log("I just can't seem to focus!");
      }
    })
  </script>
</element>
```

and used like this

```html
<example-element value={{foo}}></example-element>
```

Go take a look at the TodoMVC demo app in the Rebound repository to see the power of this syntax this in action!

#### Sweet!! How do I make one?!

When creating a Rebound component, think about it like you're defining a public API for the rest of the program to interface with your custom element. You'll be defining:
 - __Component Properties__ - which are accessable to your template for rendering and overridable by the properties you pass to your component.
 - __Lifecycle Methods__ - which define callback function for element creation, insertion into the dom, and removal from the dom.
 - __Component Methods__ - which are callable from the view via user input events.
 - A number of special __Config Options__ which are available to allow you to take advantage of all that Backbone model goodness.

Every function in the component is called in the scope of the component itself. That means that the ```this``` variable will always be the current component.

Here are the convenience methods you get when working in a component method or computed property:

 - __get__ - ```this.get()``` is used to get the properties defined on your component just like in Backbone models. Because properties can be of any data type, either string together multiple gets to retreive nested data ```this.get('users').at(0).get('firstName')``` or, for your convenience, just pass it the path you want ```this.get('users.[0].firstName')```.
 - __set__ = ```this.set()``` is used to set component properties just like in Backbone models. Because properties can be any of any data type, either string together multiple gets followed by a set to set nested data items ```this.get('users').at(0).set('firstName', 'Adam')``` or, for your convenience, just pass it the path you want ```this.set('users[0].firstName', 'Adam')```.
 - __el__ - All components have a DOM element at all times, accessable through the el property, whether they've already been inserted into the page or not.
 - __$__ - Each component has a $ function that runs queries scoped within the view's element. Use like ```this.$('any#css.selector')```
 - __$el__ - A cached jQuery object for the view's element. A handy reference instead of re-wrapping the DOM element all the time.

##### Component Properties

Component properties come it two types. __Primitive Properties__ and __Computed Properties__.

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
<custom-input value={{title}} name="Works with inline strings too."></custom-input>
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
  elementClicked: function(event){ // Takes at least one variable.
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

<p align="center">
  <h3 align="center">Templates</h3>
</p>
- - -

#### Referencing Data
So in the above examples you've seen some simple Rebound templates, but lets dive down and see what we can actually do.

Your component's template is always rendered in the scope of your component. Take a look at this component:

```html
<element name="example-element">
  <template>
    <div class="FirstClass {{className}}" {{on "click" "upgrade"}}>{{awesomeContent}}</div>
  </template>
  <script>
    return ({

      /********* Default Properties ********/
      className: 'SomeClass',
      content: {
        'first' : 'This Content', 
        'last' : 'AWESOME!'
      }
      awesomeContent: function(){
        return this.get('content.first') + ' Is ' + this.get('content.last');
      },

      /********* Component Methods ********/
      upgrade: function(event){
        this.set('content.last', 'SUPER AWESOME!!');
      }
      
    })
  </script>
</element>
```
It does exactly as you'd expect. The dom output of this element is:

```html
<example-element><div class="FirstClass SomeClass">This Content Is AWESOME!</div></example-element>
```

You'll notice that, because of HTMLBars, we can simply write a variable, or "handlebar", anywhere in our template. It does not care if it is inside of an element, inside of a property, or even on the element itself! 

Also for free, all of these properties are automatically data bound to your property's data structure, no matter how deeply nested the data is. When the component method ```upgrade``` is run, ```content.last``` is updated and you would see the dom automatically update itself to:

```html
<example-element><div class="FirstClass SomeClass">This Content Is SUPER AWESOME!</div></example-element>
```

This data nesting, data selection and data binding works with any mixture of objects and arrays. For example, this:

```html
<element name="example-element">
  <template>
    <div class="{{content[0].biz}}">{{awesomeContent}}</div>
  </template>
  <script>
    return ({

      /********* Default Properties ********/

      content: [{'bar': 'foo'}, {'biz': 'baz'}],
      
      awesomeContent: function(){
        return this.get('content[0].bar');
      }

    })
  </script>
</element>
```

Again, outputs exactly what you'd expect:

```html
<div class="baz">foo</div>
```

#### Helpers

For the most part, any complicated logic should be handled in a computed property that can then be outputted on the page. However, that doesn't mean that we aren't without some help when rendering our templates!

Rebound comes with a powerful set of default helpers that you can use when creating your component templates.

##### on
The ```{{on}}``` helper binds a component method to an element in your template to be triggered by an event of your choice.
```html
<div {{on 'click' 'methodName'}}></div>
```


##### if
The ```{{#if}}``` helper has two forms. 

Used as a block helper it looks like this:
```html
<div>
  {{#if someValue}}
    Value is true!
  {{else}}
    Value is false
  {{/if}}
</div>
```
If ```someValue``` is truthy the if helper will render whatever is in the first block. The else block is optional and may be left out, but if ```someValue``` is falsy the else block will render in its place. These blocks may be as complex as you'd like and are rendered in the same scope as its parent.

As an inline helper the if helper looks like this:

```html
<div class="{{if someValue 'truthy' 'falsy'}}">{{if someValue someVariable}}</div>
```
If ```someValue``` is truthy, the first argument is printed, otherwise, if provided, the second argument is. This form is able to be used inside of attributes, where as the block form isnt, and is very helpful with assigning classes based on a conditional variable. Both strings and component properties are valid arguments.


##### unless
The ```{{#unless}}``` helper works the exact opposite of our if helper and has both a block and an inline form.

Block:
```html
<div>
  {{#unless someValue}}
    Value is false!
  {{else}}
    Value is true
  {{/if}}
</div
```

Inline:
```html
<div class="{{unless someValue 'falsy' 'truthy'}}">{{if someValue someVariable}}</div>
```


##### each

```{{#each}}``` is a block helper which renders arrays of objects. Its contents are rendered in the scope of the object it is iterating over. In this scope it has access to ```{{@index}}```, an interger representing its index in the array, and the ```{{@first}}``` and ```{{@last}}``` variables – booleans which are true if the element is the first or last element in the array.

```html
{{#each users}}
  <div>
    Name: {{firstName}} {{lastName}}
    Index: {{@index}}
    isFirst: {{@first}}
    isLast: {{@last}}
{{/each}}
```

##### with

Sometimes you may want to invoke a section of your template with a different context. ```{{#with}}``` changes the context of the block you pass to it. 

```html
{{user.firstName}} {{user.lastName}}
{{#with user}}
  Welcome back, <b>{{firstName}} {{lastName}}</b>!
{{/with}}
```

##### partial

The ```{{partial}}``` helper renders a registered partial. 

Unlike components, partials are templates with no functionality and are literally just a HTMLBars template. They can be a conveinent way of breaking up and organizing what may otherwise be a very large template. When rendered they inherit the context of its parent template. 

The variable passed to this helper is the path to a .hbs template file on the server. When using the precompiler, Rebound will add a dependancy for the partial's template to the parent component / template so you don't need to worry about getting it on the page. Otherwise, the partial's template must be loaded on the page for it to appear. It is convention for partials to begin with an underscore. This underscore and the file extension are absent from the variable passed to the partial, so ```{{partial /public/demo/partial }}``` referances ```http://domain.com/public/demo/_partial.hbs```.

/public/demo/_partial.hbs:
```html
{{firstName}} {{lastName}}
```

Parent Component:
```html
{{#each users}}
  {{partial public/demo/partial}}
{{/each}}
```

#### Including Other Components

The whole point behind components is modularity, so a Model-View-Component framework wouldn't be complete without components and their templates being able to include other components! And with Rebound, its as simple as including the custom-element's tag:

Your page level component:
```html
<element name="home-page">
  <template>
  	<link href="/public/components/user-card.html">
  	<ul>
    {{#each users}}
      <li>
        <user-card first={{firstName}} last={{lastName}}></user-card>
      </li>
    {{/each}}
    </ul>
  </template>
  <script>
    return ({
      users: [
        { 
          firstName: 'Adam',
          lastName: 'Miller'
        },{
          firstName: 'Bob',
          lastName: 'Saget'
      ]
    })
  </script>
</element>
```

The user-card component:
```html
<element name="user-card">
  <template>
    {{fullName}}'s user card!
  </template>
  <script>
    return ({
      first: 'Default Value',
      last: 'Default Value',
      fullName: function(){
        return this.get('first') + ' ' + this.get('last');
      }
    })
  </script>
</element>
```

The above example is very simple, but your new component can have all of the bells and whistles described above in the components section.

Rebound knows that home-page requires user-card because of the ```<link href="/public/components/user-card.html">``` in its template. When Rebound sees this link tag it will will add user-card to home-page's dependancies list.

By default, child components inherit no scope from their parent components. You can pass in attributes by adding them right on to the tag, as the above example does with ```{{firstName}}``` and ```{{lastName}}```. And the values passed in are not limited to primitives! Any object, array or combination of the two can also be passed in to components. 

Attributes passed in on the tag will override any values set in the component declaration. So, the above code will render:

```html
<ul>
  <li>Adam Miller's User Card!</li>
  <li>Bob Saget's User Card!</li>
</ul>
```
