<p align="center">
  <img src="http://reboundjs.com/images/rebound.svg" alt="Rebound Logo" width="520px" />
  <br>
  <a href="https://travis-ci.org/epicmiller/rebound">
    <img src="https://travis-ci.org/epicmiller/rebound.svg?branch=master" alt="Build Status" />
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

Rebound + HTMLBars replaces Backbone's view layer, binding to your Backbone's models on first render. To make the conversation two-way, an event helper lets you respond to user interaction by defining event callbacks in your templates. It can either function as a stand-alone replacement view for Backbone, or play nice with some other Backbone libraries I have in the works that will help to put the 'C' back in 'MV*', and make routing for larger-scale applications a breeze (stay tuned).

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

There will soon be a Bower repository for Rebound, but until then use what is is the /dist directory after running ```grunt build```, ```npm test``` or ```npm start```. There are two packaged files called ```rebound.runtime.pkg.js``` and ```rebound.compiler.pkg.js```. Both of these files contain [JQuery](http://www.jquery.com), [Underscore](http://www.underscorejs.org), [RequireJS](requirejs.org), [Backbone](backbonejs.org) and of course, the main Rebound library. The compiler package contains the extra code needed to compile HTMLBars templates and should rarely be needed on any client facing site. All templates should be precompiled on the server by the [Grunt-Rebound](https://github.com/epicmiller/grunt-rebound) plugin, or a similar pre-compiler.

### How do I get Rebound on my page?

You can include Rebound on your page like this:

```js
<script src="/javascripts/lib/rebound.runtime.pkg.js" id="Rebound">
{
  "appContext": "/",
  "globalControllers": {"chrome" : "nav"},
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
 - __globalControllers__ - By default, as will be talked about in the next section, there is only one controller loaded at a time, your page-level controller. The controllers specified here are for page elements you want to live the entire length of the user's session, like a global nav bar, footer, site-wide chat, etc. The object specifies ```{ "controllerName": "cssSelector" }```. The output of the controller will be loaded into the first matching element for the provided css selector on the page.
 - __jsPrefix__ - Used by Rebound to construct the path to each page's js file. See routing for more details.
 - __jsSuffix__ - Used by Rebound to construct the path to each page's js file. See routing for more details.
 - __cssPrefix__ - Used by Rebound to construct the path to each page's css file. See routing for more details.
 - __cssSuffix__ - Used by Rebound to construct the path to each page's css file. See routing for more details.
 - __triggerOnFirstLoad__ - If true, Rebound will try and trigger each the route callback once the page is loaded. Equivalent to passing ```{ silent: false }``` to Backbone.history.start
 - __routeMapping__ - Object which defines custom base route path to controller name mappings. ex: if the root url ```/``` should load the home controller, pass ```{ "": "home" }```

### Routing

Rebound adds functionality to Backbone's router to include automatic loading of page resources if a route doesn't exist. When the page loads Rebound has a single wildcard route.


