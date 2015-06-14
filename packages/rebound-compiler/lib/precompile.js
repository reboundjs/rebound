// Rebound Pre-Compiler
// ----------------

import parse from "./parser";
import { compileSpec } from "htmlbars";

function precompile(str, options={}){

  if( !str || str.length === 0 ){
    return console.error('No template provided!');
  }

  var template;
  str = parse(str, options);

  // Compile
  str.template = '' + compileSpec(str.template);

  // If is a partial
  if(str.isPartial){
    template = `
      define( [ ${str.deps.join(', ')} ], function(){
        var template = ${str.template};
        window.Rebound.registerPartial("${str.name}", template);
      });`;
  }
  // Else, is a component
  else{
    template = `
      define( [ ${str.deps.join(', ')} ], function(){
        return window.Rebound.registerComponent("${str.name}", {
          prototype: ${str.script},
          template: ${str.template},
          style: "${str.style}"
        });
      });`;
  }

  return template;
}

export default precompile;

