// Rebound Template Parser
// -----------------------

// Remove the contents of the component's `script` tag.
function getScript(str) {
  var start = str.lastIndexOf('</template>');
  str = str.slice(((start > -1) ? start : 0), str.length);
  start = str.indexOf('<script>');
  var end = str.lastIndexOf('</script>');

  if(start > -1 && end > -1)
    return '(function(){' + str.substring((start + 8), end) +  '})()';
  return '{}';
}

// Remove the contents of the component's `style` tag.
function getStyle(str) {
  return str.indexOf("<style>") > -1 && str.indexOf("</style>") > -1 ? str.replace(/([^]*<style>)([^]*)(<\/style>[^]*)/ig, "$2").replace(/"/g, "\\\"") : "";
}

function stripLinkTags(str){
  // Remove link tags from template, these are fetched in getDependancies
  return str.replace(/<link .*href=(['"]?)(.*).html\1[^>]*>/gi, '');
}

// Remove the contents of the component's `template` tag.
function getTemplate(str) {
  var start = str.indexOf("<template>");
  var end = str.lastIndexOf('</template>');

  // Get only the content between the template tags, or set to an empty string.
  str = (start > -1 && end > -1) ? str.substring((start + 10), end) : '';

  return stripLinkTags(str);
}

// Get the component's name from its `name` attribute.
function getName(str) {
  return str.replace(/[^]*?<element[^>]*name=(["'])?([^'">\s]+)\1[^<>]*>[^]*/ig, "$2").trim();
}

// Minify the string passed in by replacing all whitespace.
function minify(str) {
  return str.replace(/\s+/g, " ").replace(/\n|(>) (<)/g, "$1$2");
}

// Strip javascript comments
function removeComments(str) {
  return str.replace(/(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s])+\/\/(?:.*)$)/gm, "$1");
}

// TODO: This is messy, clean it up!
function getDependancies(template, base=''){
  var imports = [],
      partials = [],
      deps = [],
      match,
      importsre = /<link [^h]*href=(['"])?\/?([^.'"]*).html\1[^>]*>/gi,
      partialsre = /\{\{>\s*?(['"])?([^'"}\s]*)\1\s*?\}\}/gi,
      helpersre = /\{\{partial\s*?(['"])([^'"}\s]*)\1\s*?\}\}/gi,
      start = template.indexOf("<template>"),
      end = template.lastIndexOf('</template>');

  if(start > -1 && end > -1) { template = template.substring((start + 10), end); }

  // Assemble our imports dependancies
  (template.match(importsre) || []).forEach(function(importString, index){
    deps.push(base + importString.replace(importsre, '$2'));
  });

  // Assemble our partial dependancies
  (template.match(partialsre) || []).forEach(function(partial, index){
    deps.push(base + partial.replace(partialsre, '$2'));
  });

  // Assemble our partial dependancies
  (template.match(helpersre) || []).forEach(function(partial, index){
    deps.push(base + partial.replace(helpersre, '$2'));
  });

  return deps;
}

function parse(str, options={}){
  // If the element tag is present
  if(str.indexOf('<element') > -1 && str.indexOf('</element>') > -1){
    return {
      isPartial: false,
      name: getName(str),
      stylesheet: getStyle(str),
      template: getTemplate(str),
      script: getScript(str),
      deps: getDependancies(str, options.baseDest)
    };
  }

  return {
    isPartial: true,
    name: options.name,
    template: stripLinkTags(str),
    deps: getDependancies(str, options.baseDest)
  };

}

export default parse;