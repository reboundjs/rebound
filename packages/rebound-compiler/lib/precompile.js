// Rebound Pre-Compiler
// ----------------

import parse from "./parser";
import { precompile as compileTemplate } from "../rebound-htmlbars/compile";

export default function precompile(str, options={}){

  if( !str || str.length === 0 ){
    return console.error('No template provided!');
  }

  var template;
  str = parse(str, options);

  // Compile
  str.template = '' + compileTemplate(str.template);

  // If is a partial
  if (str.isPartial) {
    template = [
      "(function(R){",
      "  R.router._loadDeps([ " + (str.deps.length ? ('"' + str.deps.join('", "') + '"') : '') + " ]);",
      "  R.registerPartial(\"" + str.name + "\", " + str.template + ");",
      "})(window.Rebound);"].join('\n');
  }
  // Else, is a component
  else {
    template = [
      "(function(R){",
      "  R.router._loadDeps([ " + (str.deps.length ? ('"' + str.deps.join('", "') + '"') : '') + " ]);",
      "  document.currentScript.dataset.name = \"" + str.name + "\";",
      "  return R.registerComponent(\"" + str.name + "\", {",
      "    prototype: " + str.script + ",",
      "    template: " + str.template + ",",
      "    stylesheet: \"" + str.stylesheet + "\"",
      "   });",
      "})(window.Rebound);"].join('\n');
  }
  return {src: template, deps: str.deps};
}
