// Used to test a specific component.
// Marks constructor as in "test" mode so dom updates are syncrynous.
// TODO: Turn this into an override of Component's _onchange function.
window.Rebound.test = function(component, callback){
  require([component], function(constructor){
    constructor.prototype.testing = true;
    callback.call(this, constructor);
  });
};

// Insert our test viewer onto the page
document.addEventListener("DOMContentLoaded", function() {
  var container = document.createElement('main');
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

  // TODO: Allow the user to provide the content that goes into the test viewer.
  var nav = document.createElement('nav');
  var content = document.createElement('content');
  container.appendChild(nav);
  container.appendChild(content);

  document.body.appendChild(container);
});

// Route to the specified url
var visit = function visit(url){

}

var click = function click(selector){

}

// Fill in the selected input with the text. Should trigger appropreate keyboard events
var fillIn = function fillIn(selector, text){

}

// Triggers an event on an element
var trigger = function trigger(url){

}

// Calls a synchronous callback
var then = function then(callback){

}