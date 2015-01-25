"use strict";

var htmlbarsCompile = require("htmlbars").compile;
var htmlbarsCompileSpec = require("htmlbars").compileSpec;


function getScript(str) {
  return str.indexOf("<script>") > -1 && str.indexOf("</script>") > -1 ? "(function(){" + str.replace(/(.*<script>)(.*)(<\/script>.*)/ig, "$2") + "})()" : "{}";
}

function getStyle(str) {
  return str.indexOf("<style>") > -1 && str.indexOf("</style>") > -1 ? str.replace(/(.*<style>)(.*)(<\/style>.*)/ig, "$2").replace(/"/g, "\\\"") : "";
}

function getTemplate(str) {
  return str.replace(/.*<template>(.*)<\/template>.*/gi, "$1").replace(/(.*)<style>.*<\/style>(.*)/ig, "$1$2");
}

function getName(str) {
  return str.replace(/.*<element[^>]*name=(["'])?([^'">\s]+)\1[^<>]*>.*/ig, "$2");
}

function minify(str) {
  return str.replace(/\s+/g, " ").replace(/\n|(>) (<)/g, "$1$2");
}

function removeComments(str) {
  return str.replace(/(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s])+\/\/(?:.*)$)/gm, "$1");
}

function templateFunc(fn) {
  var src = fn.toString();
  src = src.slice(src.indexOf("{") + 1, -1);
  return function (data) {
    return !data ? src : src.replace(/(\$[a-zA-Z]+)/g, function ($rep) {
      var key = $rep.slice(1);
      return data[key] || "";
    });
  };
}

var COMPONENT_TEMPLATE = templateFunc(function () {
  return (function () {
    return window.Rebound.registerComponent("$name", {
      prototype: $script,
      template: $template,
      style: "$style"
    });
  })();
});

function precompile(str, options) {
  if (!str || str.length === 0) {
    return console.error("No template provided!");
  }

  // Remove comments
  str = removeComments(str);
  // Minify everything
  str = minify(str);

  options = options || {};
  options.baseDest = options.baseDest || "";
  options.name = options.name || "";
  options.baseUrl = options.baseUrl || "";

  var template = str,
      style = "",
      script = "{}",
      name = "",
      isPartial = true,
      imports = [],
      partials,
      require,
      deps = [];

  // If the element tag is present
  if (str.indexOf("<element") > -1 && str.indexOf("</element>") > -1) {
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
  imports.forEach(function (importString, index) {
    deps.push("\"" + options.baseDest + importString + "\"");
  });

  // Remove link tags from template
  template = template.replace(/<link .*href=(['"]?)(.*).html\1[^>]*>/gi, "");


  // Assemble our partial dependancies
  partials = template.match(/\{\{>\s*?['"]?([^'"}\s]*)['"]?\s*?\}\}/gi);

  if (partials) {
    partials.forEach(function (partial, index) {
      deps.push("\"" + options.baseDest + partial.replace(/\{\{>[\s*]?['"]?([^'"]*)['"]?[\s*]?\}\}/gi, "$1") + "\"");
    });
  }

  // Compile
  template = "" + htmlbarsCompileSpec(template);

  // If is a partial
  if (isPartial) {
    template = "(function(){var template = " + template + "\n window.Rebound.registerPartial( \"" + options.name + "\", template);})();\n";
  }
  // Else, is a component
  else {
    template = COMPONENT_TEMPLATE({
      name: name,
      script: script,
      style: style,
      template: template
    });
  }

  // Wrap in define
  template = "define( [" + deps.join(", ") + "], function(){\n" + template + "});";

  return template;
}

exports.precompile = precompile;