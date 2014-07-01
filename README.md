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

**The actual version**: The good people over at [tildeio](https://github.com/tildeio) have been working hard on a variant of Handlebars that emits DOM rather than relying on crazy string manipulation. Go google it for more nitty-gritty details, but the 

Rebound + HTMLBars replaces Backbone's view layer, binding to your Backbone's models on first render. To make the conversation two-way, an event helper lets you respond to user interaction by defining event callbacks in your templates. It can either function as a stand-alone replacement view for Backbone, or play nice with some other Backbone libraries I have in the works that will help to put the 'C' back in 'MV*', and make routing for larger-scale applications a breeze (stay tuned).

So we remove Backbone's most annoying 'feature' - manual data binding – while avoiding the overhead, convention restrictions and learning curve of Ember. And unlike some of the very few other data-binding libraries out there (heres looking at you React, epoxyjs, knockoutjs, etc), we get the simple interface of the much-loved Handlebars syntax for our templates, without any extra elements or data attributes cluttering our DOM! Server side rendering of data-bound templates will be possible in the near future! Whats there not to love?!

#### Awesome. How do I use it?


The project isn't 100% ready to be unleashed on the world. I won't tell you how to use all this quite yet, and it is subject to change in the coming weeks, but definately expect much better documentation here when the time comes!

##### To test what is already there:

 - Install server dependancies: ```npm install```

 - Install client dependancies: ```bower install```

 - Start the test server: ```npm start```

 - Check to [localhost:8000/test](http://localhost:8000/test) to run the tests or [localhost:8000/test/example.html](http://localhost:8000/test/example.html) to see it in action.

##### Other options:

 - Just build the project: ```grunt build```

 - Test in the command line: ```npm test```



