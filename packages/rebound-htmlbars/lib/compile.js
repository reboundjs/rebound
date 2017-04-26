import { compileSpec } from "htmlbars";

// Return an executable function (object) version of the compiled template string
export function compile(string){
  return new Function("return " + compileSpec(string))(); // eslint-disable-line
}

// Return a precompiled (string) version of the compiled template string
export function precompile(string){
  return compileSpec(string);
}