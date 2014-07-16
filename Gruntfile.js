module.exports = function(grunt) {

  grunt.initConfig({
    qunit: {
      all: {
        options: {
          urls: ['http://127.0.0.1:8000/test/index.html']
        }
      }
    },
    connect: {
      test: {
        options: {
          port: 8000,
          hostname: '127.0.0.1',
          base: '.'
        }
      }
    },
    watch: {
      scripts: {
        files: ['lib/**/*.js'],
        tasks: ['build'],
        options: {
          spawn: false,
        }
      },
      demo: {
        files: ['test/demo/templates/**/*.hbs', 'test/demo/templates/*.hbs'],
        tasks: ['precompileDemo'],
        options: {
          spawn: false,
        }
      }
    },
    clean: {
      tmp:  ["tmp"],  // ES6 files are first consolidated in tmp
      amd: ["dist/amd"],   // ES6 files are transpiled and placed in amd
      cjs: ["dist/commonjs"],   // ES6 files are transpiled and placed in commonjs
      dist: ["dist"]  // AMD files are concatted with loader and placed in dist
    },
    copy: {
      amd: {
        files: [{
          expand: true,
          cwd: 'bower_components/htmlbars/packages/htmlbars-compiler/lib',
          src: ['**/*'],
          dest: 'tmp/htmlbars-compiler',
        },{
          expand: true,
          cwd: 'bower_components/htmlbars/packages/htmlbars-runtime/lib',
          src: ['**/*'],
          dest: 'tmp/htmlbars-runtime',
        },{
          'tmp/morph/morph.js': 'bower_components/htmlbars/packages/morph/lib/morph.js',
          'tmp/morph/dom-helper.js': 'bower_components/htmlbars/packages/morph/lib/dom-helper.js'
        },{
          expand: true,
          cwd: 'bower_components/handlebars/lib',
          src: ['handlebars.js', 'handlebars.runtime.js', 'handlebars/**/*'],
          dest: 'tmp',
        },{
          expand: true,
          cwd: 'bower_components/simple-html-tokenizer/lib',
          src: ['**/*'],
          dest: 'tmp',
        },{
          expand: true,
          cwd: 'lib',
          src: ['rebound.js', 'rebound.runtime.js', 'rebound/**/*'],
          dest: 'tmp'
        }]
      },
      cjs: {
        files: [{
          expand: true,
          cwd: 'bower_components/htmlbars/packages/htmlbars-compiler/lib',
          src: ['**/*'],
          dest: 'tmp/htmlbars-compiler',
        },{
          expand: true,
          cwd: 'bower_components/htmlbars/packages/htmlbars-runtime/lib',
          src: ['**/*'],
          dest: 'tmp/htmlbars-runtime',
        },{
          'tmp/morph/morph.js': 'bower_components/htmlbars/packages/morph/lib/morph.js',
          'tmp/morph/dom-helper.js': 'bower_components/htmlbars/packages/morph/lib/dom-helper.js'
        },{
          expand: true,
          cwd: 'bower_components/handlebars/lib',
          src: ['handlebars.js', 'handlebars.runtime.js', 'handlebars/**/*'],
          dest: 'tmp',
        },{
          expand: true,
          cwd: 'bower_components/simple-html-tokenizer/lib',
          src: ['**/*'],
          dest: 'tmp',
        },{
          expand: true,
          cwd: 'lib',
          src: ['rebound.js', 'rebound/**/*'],
          dest: 'tmp'
        }]
      }
    },
    'string-replace': {
      // Replaces any leading slashes placed in front of module names
      amdDefines: {
        files: {
          'dist/amd/': 'dist/amd/*.js',
          'dist/amd/': 'dist/amd/**/*.js',
          'dist/amd/': 'dist/amd/**/**/*.js',
        },
        options: {
          replacements: [{
            pattern: /(define\(["|'])\/(.*["|'])/ig,
            replacement: '$1$2'
          }]
        }
      },
      cjsRequires0: {
        files: {
          'dist/commonjs/': 'dist/commonjs/*.js',
        },
        options: {
          replacements: [{
            pattern: /(require\(["|'])([^\.\/].*["|']\))/ig,
            replacement: '$1./$2'
          }]
        }
      },
      cjsRequires1: {
        files: {
          'dist/commonjs/rebound/': 'dist/commonjs/rebound/*.js',
          'dist/commonjs/morph/': 'dist/commonjs/morph/*.js',
          'dist/commonjs/handlebars/': 'dist/commonjs/handlebars/*.js',
          'dist/commonjs/htmlbars-compiler/': 'dist/commonjs/htmlbars-compiler/*.js',
          'dist/commonjs/htmlbars-runtime/': 'dist/commonjs/htmlbars-runtime/*.js',
          'dist/commonjs/simple-html-tokenizer/': 'dist/commonjs/simple-html-tokenizer/*.js'
        },
        options: {
          replacements: [{
            pattern: /(require\(["|'])([^\.\/].*["|']\))/ig,
            replacement: '$1../$2'
          }]
        }
      },
      cjsRequires2: {
        files: {
          'dist/commonjs/handlebars/compiler/': 'dist/commonjs/handlebars/compiler/*.js',
          'dist/commonjs/htmlbars-compiler/compiler/': 'dist/commonjs/htmlbars-compiler/compiler/*.js',
          'dist/commonjs/htmlbars-compiler/html-parser/': 'dist/commonjs/htmlbars-compiler/html-parser/*.js'
        },
        options: {
          replacements: [{
            pattern: /(require\(["|'])([^\.\/].*["|']\))/ig,
            replacement: '$1../../$2'
          }]
        }
      }
    },
    transpile: {
      amd: {
        type: "amd",
        inferName: false,
        files: [{
          expand: true,
          cwd: 'tmp',
          src: [
            '**/*.js'
          ],
          dest: 'dist/amd',
        }]
      },
      cjs: {
        type: "cjs",
        inferName: true,
        files: [{
          expand: true,
          cwd: 'tmp',
          src: [
            '**/*.js'
          ],
          dest: 'dist/commonjs',
        }]
      }
    },
    concat_sourcemap: {
      amd: {
        files: [{
          src: [
            'wrap/start.frag',
            'wrap/almond.js',
            'dist/amd/handlebars/**/*.js',
            'dist/amd/morph/*.js',
            'dist/amd/htmlbars-compiler/**/*.js',
            'dist/amd/htmlbars-runtime/**/*.js',
            'dist/amd/simple-html-tokenizer/**/*.js',
            'dist/amd/rebound/**/*.js',
            'dist/amd/*.js',
            'wrap/end.frag'
          ],
          dest: 'dist/rebound.amd.js'
        }]
      },
      package: {
        files: [{
          src: [
            'wrap/start.frag',
            'bower_components/underscore/underscore.js',
            'bower_components/jquery/dist/jquery.js',
            'bower_components/backbone/backbone.js',
            'wrap/almond.js',
            'dist/amd/handlebars/**/*.js',
            'dist/amd/morph/*.js',
            'dist/amd/htmlbars-compiler/**/*.js',
            'dist/amd/htmlbars-runtime/**/*.js',
            'dist/amd/simple-html-tokenizer/**/*.js',
            'dist/amd/rebound/**/*.js',
            'dist/amd/*.js',
            'wrap/end.compiler.frag'
          ],
          dest: 'dist/rebound.compiler.pkg.js'
        },
        {
          src: [
            'wrap/start.frag',
            'bower_components/underscore/underscore.js',
            'bower_components/jquery/dist/jquery.js',
            'bower_components/backbone/backbone.js',
            'wrap/almond.js',
            'dist/amd/handlebars/*.js',
            'dist/amd/morph/*.js',
            'dist/amd/htmlbars-runtime/**/*.js',
            'dist/amd/simple-html-tokenizer/**/*.js',
            'dist/amd/rebound/hooks.js',
            'dist/amd/rebound/lazy-value.js',
            'dist/amd/rebound/runtime.js',
            'dist/amd/handlebars.runtime.js',
            'dist/amd/morph.js',
            'dist/amd/rebound.runtime.js',
            'dist/amd/simple-html-tokenizer.js',
            'wrap/end.runtime.frag'
          ],
          dest: 'dist/rebound.runtime.pkg.js'
        }]
      }
    },
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-string-replace');
  grunt.loadNpmTasks('grunt-es6-module-transpiler');
  grunt.loadNpmTasks('grunt-concat-sourcemap');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('precompileDemo', 'Precompiles our demo template.', function(){
    var rebound = require('./dist/commonjs/rebound/compiler'),
        fs = require('fs');

    var data = fs.readFile('./test/demo/templates/demo.hbs', 'utf8', function (err,data) {
      if (err) {
        return console.log(err);
      }

      var template = 'var template = ' + rebound.precompile(data);

      fs.writeFile('./test/demo/templates/demo.js', template, function(err) {
          if(err) {
              console.log(err);
          } else {
              console.log("Demo template compiled successfully!");
          }
      });
    });

    var partial = fs.readFile('./test/demo/templates/partials/_editing.hbs', 'utf8', function (err,data) {
      if (err) {
        return console.log(err);
      }

      var template = '(function(){var template = '+rebound.precompile(data)+' window.Rebound.registerPartial( "test/demo/templates/editing", template);})();';

      fs.writeFile('./test/demo/templates/partials/_editing.js', template, function(err) {
          if(err) {
              console.log(err);
          } else {
              console.log("Partial template compiled successfully!");
          }
      });
    });

  })

  grunt.registerTask('compileAMD', 'Build the project as AMD', [
    'copy:amd',
    'transpile:amd',
    'string-replace:amdDefines',
    'concat_sourcemap:amd'
  ]);

  // TODO: generate our cjs runtime deps off of htmlbars'
  grunt.registerTask('compileCJS', 'Build the project as CJS', [
    'copy:cjs',
    'transpile:cjs',
    // TODO: This is dumb, should be a way to write it as one string-replace job
    'string-replace:cjsRequires0',
    'string-replace:cjsRequires1',
    'string-replace:cjsRequires2'
  ]);

  grunt.registerTask('build', 'Build the project in AMD and CJS', [
    'clean',
    'compileAMD',
    'compileCJS',
    'concat_sourcemap:package',
    'clean:tmp'
  ]);

  grunt.registerTask('test', 'Run the test suite', function() {
    grunt.task.run(['build', 'connect:test', 'qunit']);
  });

  grunt.registerTask('start', 'Run the test server', function() {
    grunt.task.run(['build', 'precompileDemo', 'connect:test', 'watch']);
  });

}
