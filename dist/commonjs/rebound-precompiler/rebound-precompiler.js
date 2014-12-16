"use strict";
var htmlbarsCompile = require("../htmlbars-compiler/compiler").compile;
var htmlbarsCompileSpec = require("../htmlbars-compiler/compiler").compileSpec;
var merge = require("../htmlbars-runtime/utils").merge;

function getScript(str){
  return (str.indexOf('<script>') > -1 && str.indexOf('</script>') > -1) ? '(function(){' + str.replace(/(.*<script>)(.*)(<\/script>.*)/ig, '$2') + '})()' : '{}';
}

function getStyle(str){
  return (str.indexOf('<style>') > -1 && str.indexOf('</style>') > -1) ? str.replace(/(.*<style>)(.*)(<\/style>.*)/ig, '$2').replace(/"/g, '\\"') : '';
}

function getTemplate(str){
  return str.replace(/.*<template>(.*)<\/template>.*/gi, '$1').replace(/(.*)<style>.*<\/style>(.*)/ig, '$1$2');
}

function getName(str){
  return str.replace(/.*<element[^>]*name=(["'])?([^'">\s]+)\1[^<>]*>.*/ig, '$2');
}

function minify(str){
  return str.replace(/\s+/g, ' ').replace(/\n|(>) (<)/g, '$1$2');
}

function removeComments(str){
  return str.replace(/(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s])+\/\/(?:.*)$)/gm, '$1');
}

function precompile(str, options){
  if( !str || str.length === 0 ){
    return console.error('No template provided!');
  }

  // Remove comments
  str = removeComments(str);
  // Minify everything
  str = minify(str);

  options = options || {};
  options.baseDest = options.baseDest || '';
  options.name = options.name || '';
  options.baseUrl = options.baseUrl || '';

  var template = str,
      style = '',
      script = '{}',
      name = '',
      isPartial = true,
      imports = [],
      partials,
      require,
      deps = [];

  // If the element tag is present
  if(str.indexOf('<element') > -1 && str.indexOf('</element>') > -1){

    isPartial = false;

    name = getName(str);
    style = getStyle(str);
    template = getTemplate(str);
    script = getScript(str);

  }


  // Assemple our component dependancies by finding link tags and parsing their src
  var importsre = /<link [^h]*href=(['"]?)\/?([^.'"]*).html\1[^>]*>/gi,
      match;

  while ((match = importsre.exec(template)) != null) {
      imports.push(match[2]);
  }
  imports.forEach(function(importString, index){
    deps.push('"' + options.baseDest + importString + '"');
  });

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
               '  var component = Rebound.Component.extend(script, { __name: "'+name+'" });\n' +
               '  var proto = Object.create(HTMLElement.prototype, {});\n' +
               '  proto.createdCallback = function(){\n' +
                    // When element is created, instantiate its associated Rebound component object. User defined created callback called in the constructor
               '    this.__component__ = new component({template: template, outlet: this, data: Rebound.seedData});\n' +
               '  }\n' +
               '  proto.attachedCallback = function(){script.attachedCallback && script.attachedCallback.call(this.__component__)};\n' +
               '  proto.detachedCallback = function(){\n' +
               '    script.detachedCallback && script.detachedCallback.call(this.__component__);\n' +
                    // When element is removed, deinitilize its associated Rebound component object
               '    this.__component__.deinitialize();\n' +
               '    };\n' +
               '  proto.attributeChangedCallback = function(attrName, oldVal, newVal){\n' +
                    // When an element's attributes are changed, update the component to reflect it
               '    this.__component__._onAttributeChange(attrName, oldVal, newVal);\n' +
               '    script.attributeChangedCallback && script.attributeChangedCallback.call(this.__component__, attrName, oldVal, newVal);\n' +
               '  }\n' +
               '  return document.registerElement("' + name + '", {prototype: proto} );\n' +
               '})();\n';
  }

  // Wrap in define
  template = "define( ["+ deps.join(', ')  +"], function(){\n" + template + '});';

  return template;
}

exports.precompile = precompile;