# Rebound
### Automatic data binding for backbone using HTMLBars.

- - -


Backbone and HTMLBars are a match made in heaven :heart:

Now I know what you're thinking:

>"But Adam! The mind-numbingly repetative process of manually wiring all of my events in Backbone is my favorite part of application development!" 

But just trust me on this, this is going to be good.

#### Wait, what is this again?

The good people over at [tildeio](https://github.com/tildeio) have been working on a variant of Handlebars that emits DOM rather than relying on crazy string manipulation. Go google it for more nitty-gritty details, but the tl;dr is: we have a blazingly fast, syntactically beautiful templating library at our disposal that understands where it is and what is going on in your DOM.

Like Ember, we can use these features to allow for live data-binding with our backbone models - change a value in your model or collection, and your views update automagically.

Rebound + HTMLBars replaces Backbone's view layer, binding to backbone's models on first render. To make the conversation two-way, an event helper lets you respond to user interaction by defining event callbacks in your templates. It can function as a stand-alone replacement view for Backbone, or play nice with some other Backbone libraries I have in the works that will help to put the 'C' back in 'MV*' (stay tuned).

So we remove backbone's most annoying 'feature' - manual data binding – while avoiding the overhead, convention restrictions and learning curve of Ember, and unlike the few other data-binding libraries for Backbone out there (heres looking at you React), we get the known and loved Handlebars syntax for our templates. In the very near future, even server side rendering will be possible! Whats there not to love?!

#### Awesome. What does this mean for me?

Nothing yet, the project isn't quite ready to be unleashed on the world yet. If you like, feel free to clone this repo and run "grunt build". This will place rebound.amd.js in the dist directory. Loading this on your page will make Rebound.render, Rebound.registerHelper and Rebound.notify available to you. I won't tell you how to use all this quite yet, and it is subject to change in the coming weeks, but definately expect much better documentation here when the time comes!
