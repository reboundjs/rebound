// Rebound Compiler
// ----------------

import parse from "rebound-compiler/parser";
import { compile as compileTemplate } from "rebound-htmlbars/compile";
import { registerPartial } from "rebound-htmlbars/rebound-htmlbars";
import render from "rebound-htmlbars/render";
import Component from "rebound-component/factory";
import loader from "rebound-router/loader";

function compile(str, options={}){
  /* jshint evil: true */

  // Parse the component
  var defs = parse(str, options);

  // Compile our template
  defs.template = compileTemplate(defs.template);

  // For client side rendered templates, put the render function directly on the
  // template result for convenience. To sue templates rendered server side will
  // consumers will have to invoke the view layer's render function themselves.
  defs.template.render = function(data, options){
    return render(this, data, options);
  };

  // Fetch any dependancies
  loader.load(defs.deps);

  // If this is a partial, register the partial
  if(defs.isPartial){
    if(options.name){ registerPartial(options.name, defs.template); }
    return defs.template;
  }

  // If this is a component, register the component
  else{
    return Component.registerComponent(defs.name, {
      prototype: new Function("return " + defs.script)(),
      template: defs.template,
      stylesheet: defs.stylesheet
    });
  }
}

export default { compile };
