import $ from "rebound-utils/rebound-utils";

var MODULE_CACHE = {};

// Given an array of dependancy urls, add them all to the head in their own script tags
var loader = {

  loadJS(url, id){
    return new Promise(function(resolve, reject){

      // If we have already tried to load this js module, resolve or reject appropreately
      if(MODULE_CACHE[url]){
        if (_.isElement(MODULE_CACHE[url]) && MODULE_CACHE[url].hasAttribute('data-error')){ return reject(); }
        return resolve(MODULE_CACHE[url]);
      }

      // Construct the script element and save it in the `MODULE_CACHE`
      var e = document.createElement('script');
      e.setAttribute('type', 'text/javascript');
      e.setAttribute('src', url);
      e.setAttribute('id', (id || _.uniqueId('module')) );
      MODULE_CACHE[url] = e;

      // All browsers support loading events on `<script>` elements, bind to these
      // events and resolve our promise appropreately
      $(e).on('load', function(){ resolve(this); });
      $(e).on('error', function(err){ reject(err) });

      // And add it do to the dom
      document.head.appendChild(e);

    })
  },

  // Load multiple dependancies
  load(deps){
    if(!deps){ return void 0; }
    deps = _.isArray(deps) ? deps : [deps];

    // For each dependancy passed, call loadJS
    deps.forEach(function (url){
      url = url.trim();
      url = '/' + url + '.js';
      loader.loadJS(url);
    });
  },

  register(url){
    MODULE_CACHE[url] = true;
  }
};

export default loader;