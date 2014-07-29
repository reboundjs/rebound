import { compile as htmlbarsCompile, compileSpec as htmlbarsCompileSpec } from "htmlbars-compiler/compiler";
import { merge } from "htmlbars-runtime/utils";
import defaultHelpers from "rebound/helpers";
import defaultHooks from "rebound/hooks";

function compile(string, options){
  // Ensure we have a well-formed object as var options
  options = options || {};
  options.helpers = options.helpers || {};
  options.hooks = options.hooks || {};

  // Merge our default helpers with user provided helpers
  options.helpers = merge(defaultHelpers, options.helpers);
  options.hooks = merge(defaultHooks, options.hooks);

  // Compile our template function
  var func = htmlbarsCompile(string, {
    helpers: options.helpers,
    hooks: options.hooks
  });

  // Return a wrapper function that will merge user provided helpers with our defaults
  return function(data, options){
    // Ensure we have a well-formed object as var options
    options = options || {};
    options.helpers = options.helpers || {};
    options.hooks = options.hooks || {};

    // Merge our default helpers and hooks with user provided helpers
    options.helpers = merge(defaultHelpers, options.helpers);
    options.hooks = merge(defaultHooks, options.hooks);

    // Call our func with merged helpers and hooks
    return func.call(this, data, {
      helpers: options.helpers,
      hooks: options.hooks
    })
  }
}

var defaultPrecompileOptions = {
  baseDest: '',
  baseUrl: ''
}

function precompile(str, options){
  if( !str || str.length === 0 )
    return console.error('No template provided!');

  // Remove comments
  str = str.replace(/(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s])+\/\/(?:.*)$)/gm, '$1');
  // Minify everything
  str = str.replace(/\s+/g, ' ').replace(/\n|(>) (<)/g, '$1$2');

  options = options || {};
  options.baseDest = options.baseDest || '';
  options.filepath = options.filepath || '';
  options.baseUrl = options.baseUrl || '';

  var template = str,
      style = '',
      script = '{}',
      name = '',
      isPartial = true,
      imports,
      partials,
      require,
      deps = [];

  // If the element tag is present
  if(str.indexOf('<element') > -1 && str.indexOf('</element>') > -1){

    isPartial = false;

    name = str.replace(/.*<element[^>]*name=(["'])?([^'">\s]+)\1[^<>]*>.*>/ig, '$2');

    // If the template tag exists, extract it.
    if(str.indexOf('<template>') > -1 && str.indexOf('</template>') > -1){
      // If style tag exists, extract it and remove it from the template
      if(str.indexOf('<style>') > -1 && str.indexOf('</style>') > -1){
        style = str.replace(/(.*<style>)(.*)(<\/style>.*)/ig, '$2');
        style = style.replace(/"/g, '\\"');
        template = str.replace(/(.*)<style>.*<\/style>(.*)/ig, '$1$2');
      }
      template = template.replace(/.*<template>(.*)<\/template>.*/gi, '$1');
    }

    // If script tag exists, extract it
    if(str.indexOf('<script>') > -1 && str.indexOf('</script>') > -1){
      script = str.replace(/(.*<script>)(.*)(<\/script>.*)/ig, '$2');
      script = '(function(){' + script + '})() || {}';
    }
  }

  // Assemple our component dependancies by finding link tags and parsing their src
  imports = template.match(/<link .*href=(['"]?)(.*).html\1[^>]*>/gi);
  if(imports){
    imports.forEach(function(importString, index){
      deps.push('"' + options.baseDest + importString.replace(/<link .*href=(["']?)\/?([^'"]*).html\1.*>/gi, '$2') + '"');
    });
  }
  // Remove link tags from template
  template = template.replace(/<link .*href=(['"]?)(.*).html\1[^>]*>/gi, '');

  // Assemble our partial dependancies
  partials = template.match(/\{\{>\s*?['"]?([^'"}\s]*)['"]?\s*?\}\}/gi);

  if(partials){
    partials.forEach(function(partial, index){
      deps.push('"' + options.baseDest + partial.replace(/\{\{>[\s*]?['"]?([^'"]*)['"]?[\s*]?\}\}/gi, '$1') + '"');
    });
  }

  // Compile
  template = '' + htmlbarsCompileSpec(template);

  // If is a partial
  if(isPartial){
    template = '(function(){var template = '+template+' window.Rebound.registerPartial( "'+ options.baseDest + options.filepath +'", template);})();\n';
  }
  // Else, is a component
  else{
    template = '(function(){\n'+
               '  var template = '+template+'\n' +
               '  var script = '+ script +';\n' +
               '  var style = "'+ style +'";\n' +
               '  window.Rebound.registerComponent({\n' +
               '    name:"'+ name +'",\n' +
               '    template: template,\n' +
               '    script: script,\n' +
               '    style: style\n' +
               '  });\n' +
               '})();\n' +
               'return Rebound.components["'+name+'"];\n';
  }

  // Wrap in define
  template = "define( ["+ deps.join(', ')  +"], function(){\n" + template + '});';

  return template;
}

export { compile, precompile };
