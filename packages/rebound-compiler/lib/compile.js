// Rebound Compiler
// ----------------

import parse from "rebound-compiler/parser";
import { compileSpec as htmlbars } from "htmlbars-compiler/compiler";
import { merge } from "htmlbars-util/object-utils";
import DOMHelper from "dom-helper";
import helpers from "rebound-component/helpers";
import hooks from "rebound-component/hooks";
import Component from "rebound-component/component";

function compile(str, options={}){
  /* jshint evil: true */
  // Parse the template and compile our template function
  var defs = parse(str, options),
      template = new Function("return " + htmlbars(defs.template))();

  if(defs.isPartial){
    if(options.name) helpers.registerPartial(options.name, template);
    return hooks.wrap(template);
  } else{
    return Component.registerComponent(defs.name, {
      prototype: new Function("return " + defs.script)(),
      template: hooks.wrap(template),
      style: defs.style
    });
  }
}

export default { compile };
