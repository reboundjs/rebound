"use strict";
var htmlbarsCompile = require("../htmlbars-compiler/compiler").compile;
var htmlbarsCompileSpec = require("../htmlbars-compiler/compiler").compileSpec;
var merge = require("../htmlbars-runtime/utils").merge;

function precompile(str, options){
  if( !str || str.length === 0 ){
    return console.error('No template provided!');
  }

  // Remove comments
  str = str.replace(/(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s])+\/\/(?:.*)$)/gm, '$1');
  // Minify everything
  str = str.replace(/\s+/g, ' ').replace(/\n|(>) (<)/g, '$1$2');

  options = options || {};
  options.baseDest = options.baseDest || '';
  options.name = options.name || '';
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

    name = str.replace(/.*<element[^>]*name=(["'])?([^'">\s]+)\1[^<>]*>.*/ig, '$2');

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
    template = '(function(){var template = '+template+'\n window.Rebound.registerPartial( "'+ options.name +'", template);})();\n';
  }
  // Else, is a component
  else{
    template = 'return (function(){\n'+
               '  var template = '+template+'\n' +
               '  var script = '+ script +';\n' +
               '  var style = "'+ style +'";\n' +
               '  var component = Backbone.Component.extend(script, { __name: "'+name+'" });\n' +
               '  var proto = Object.create(HTMLElement.prototype, {});\n' +
               '  proto.createdCallback = function(){\n' +
                    // When element is created, instantiate its associated Rebound component object
               '    this.__template = new component({template: template, outlet: this, data: Rebound.seedData});\n' +
               '    script.createdCallback && script.createdCallback.call(this.__template);\n' +
               '  }\n' +
               '  proto.attachedCallback = function(){script.attachedCallback && script.attachedCallback.call(this.__template)};\n' +
               '  proto.detachedCallback = function(){\n' +
                    // When element is removed, deinitilize its associated Rebound component object
               '    this.__template.deinitialize();\n' +
               '    script.detachedCallback && script.detachedCallback.call(this.__template);\n' +
               '    };\n' +
               '  proto.attributeChangedCallback = function(attrName, oldVal, newVal){\n' +
               '    try{ newVal = JSON.parse(newVal); } catch (e){ newVal = newVal; }\n' +
               '    if(newVal === null){ this.__template.unset(attrName); }\n' +
               '    else{ this.__template.set(attrName, newVal); }\n' +
               '    script.attributeChangedCallback && script.attributeChangedCallback.call(this.__template);\n' +
               '  }\n' +
               '  return document.registerElement("' + name + '", {prototype: proto} );\n' +
               '})();\n';
  }

  // Wrap in define
  template = "define( ["+ deps.join(', ')  +"], function(){\n" + template + '});';

  return template;
}

exports.precompile = precompile;