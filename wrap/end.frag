    //The modules for your project will be inlined above
    //this snippet. Ask almond to synchronously require the
    //module value for 'main' here and return it as the
    //value to use for the public API for the built file.

    return (function(){
      var Rebound = require('rebound');

      function concat(one, two){
        return one + ' ' + two;
      }

      Rebound.registerHelper('concat', concat)

      function _if(value, options){
        console.log("IF OPTIONS", options)
          return value ? options.render(this, options) : options.inverse(this, options)
      }

      Rebound.registerHelper('if', _if)


      return window.Reboun = Rebound;


    })();
}));
