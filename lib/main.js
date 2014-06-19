
var htmlbarsCompiler = require ('../dist/commonjs/htmlbars-compiler/compiler')

function precompile(str){
  if( !str || str.length === 0 )
    return console.error('No template provided!');

  return '' + htmlbarsCompiler.compileSpec(str);
}

exports.precompile = precompile;
