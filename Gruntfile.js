module.exports = function(grunt) {

  grunt.initConfig({
    qunit: {
      all: {
        options: {
          urls: ['http://127.0.0.1:8000/test/index.html']
        }
      }
    },
    jshint: {
      options: {
        curly: false,
        loopfunc: true,
        eqnull: true,
        browser: true,
        esnext: true,
        '-W058': true, // Allow prens-less constructors (new Object;)
        '-W093': true, // Allow returning assignment (return a = b;)
        '-W030': true, // Allow unused expressions. Good for conditional assignment.
        globals: {
          jQuery: true
        },
      },
      uses_defaults: ['lib/**/*.js']
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
        files: ['packages/**/*.js'],
        tasks: ['build'],
        options: {
          spawn: false,
        }
      },
      demo: {
        files: ['test/demo/templates/**/*', 'test/demo/templates/*', '!test/demo/templates/*.js', '!test/demo/templates/**/*.js'],
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
        },
        {
          expand: true,
          cwd: 'packages/property-compiler/lib',
          src: ['**/*'],
          dest: 'tmp/property-compiler'
        },
        {
          expand: true,
          cwd: 'packages/rebound-compiler/lib',
          src: ['**/*'],
          dest: 'tmp/rebound-compiler'
        },
        {
          expand: true,
          cwd: 'packages/rebound-data/lib',
          src: ['**/*'],
          dest: 'tmp/rebound-data'
        },
        {
          expand: true,
          cwd: 'packages/rebound-precompile/lib',
          src: ['**/*'],
          dest: 'tmp/rebound-precompile'
        },
        {
          expand: true,
          cwd: 'packages/rebound-router/lib',
          src: ['**/*'],
          dest: 'tmp/rebound-router'
        },
        {
          expand: true,
          cwd: 'packages/rebound-runtime/lib',
          src: ['**/*'],
          dest: 'tmp/rebound-runtime'
        },
        {
          expand: true,
          cwd: 'wrap',
          src: ['almond.js'],
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
          'dist/commonjs/rebound-compiler/': 'dist/commonjs/rebound-compiler/*.js',
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

    requirejs: {
      runtime: {
        options: {
          optimize: "none",
          name: "rebound-runtime/rebound-runtime",
          baseUrl: "./dist/amd",
          out: "dist/rebound.runtime.js",
          wrap: {
            startFile: [
              'bower_components/WeakMap/weakmap.js',
              'bower_components/MutationObservers/MutationObserver.js',
              'bower_components/custom-elements/src/scope.js',
              'bower_components/custom-elements/src/Observer.js',
              'bower_components/custom-elements/src/CustomElements.js',
              // 'bower_components/lodash/dist/lodash.js',
              'bower_components/underscore/underscore.js',
              'bower_components/jquery/dist/jquery.js',
              'bower_components/backbone/backbone.js',
              //'bower_components/almond/almond.js',
              'bower_components/requirejs/require.js',
              'wrap/start.frag'
            ],
            endFile: ["wrap/end.runtime.frag"]
          },
        }
      },
      compiler: {
        options: {
          optimize: "none",
          name: "rebound-compiler/rebound-compiler",
          baseUrl: "./dist/amd",
          out: "dist/rebound.compiler.js",
          wrap: {
            startFile: [
              'bower_components/WeakMap/weakmap.js',
              'bower_components/MutationObservers/MutationObserver.js',
              'bower_components/custom-elements/src/scope.js',
              'bower_components/custom-elements/src/Observer.js',
              'bower_components/custom-elements/src/CustomElements.js',
              // 'bower_components/lodash/dist/lodash.js',
              'bower_components/underscore/underscore.js',
              'bower_components/jquery/dist/jquery.js',
              'bower_components/backbone/backbone.js',
              //'bower_components/almond/almond.js',
              'bower_components/requirejs/require.js',
              'wrap/start.frag'
            ],
            endFile: ["wrap/end.compiler.frag"]
          },
        }
      },
      runtimeMin: {
        options: {
          optimize: "uglify",
          name: "rebound-runtime/rebound-runtime",
          baseUrl: "./dist/amd",
          out: "dist/rebound.runtime.min.js",
          wrap: {
            startFile: [
              'bower_components/WeakMap/weakmap.js',
              'bower_components/MutationObservers/MutationObserver.js',
              'bower_components/custom-elements/src/scope.js',
              'bower_components/custom-elements/src/Observer.js',
              'bower_components/custom-elements/src/CustomElements.js',
              // 'bower_components/lodash/dist/lodash.js',
              'bower_components/underscore/underscore.js',
              'bower_components/jquery/dist/jquery.js',
              'bower_components/backbone/backbone.js',
              //'bower_components/almond/almond.js',
              'bower_components/requirejs/require.js',
              'wrap/start.frag'
            ],
            endFile: ["wrap/end.runtime.frag"]
          },
        }
      },
      compilerMin: {
        options: {
          optimize: "uglify",
          name: "rebound-compiler/rebound-compiler",
          baseUrl: "./dist/amd",
          out: "dist/rebound.compiler.min.js",
          wrap: {
            startFile: [
              'bower_components/WeakMap/weakmap.js',
              'bower_components/MutationObservers/MutationObserver.js',
              'bower_components/custom-elements/src/scope.js',
              'bower_components/custom-elements/src/Observer.js',
              'bower_components/custom-elements/src/CustomElements.js',
              // 'bower_components/lodash/dist/lodash.js',
              'bower_components/underscore/underscore.js',
              'bower_components/jquery/dist/jquery.js',
              'bower_components/backbone/backbone.js',
              //'bower_components/almond/almond.js',
              'bower_components/requirejs/require.js',
              'wrap/start.frag'
            ],
            endFile: ["wrap/end.compiler.frag"]
          },
        }
      }
    }
  });


  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-string-replace');
  grunt.loadNpmTasks('grunt-es6-module-transpiler');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('precompileDemo', 'Precompiles our demo template.', function(){
    var precompile = require('./dist/commonjs/rebound-compiler/precompile').default,
        fs = require('fs');


    var data = fs.readFile('./test/demo/templates/demo.html', 'utf8', function (err,data) {
      if (err) {
        return console.log(err);
      }

      var template = precompile(data);

      fs.writeFile('./test/demo/templates/demo.js', template, function(err) {
          if(err) {
              console.log(err);
          } else {
              console.log("Demo template compiled successfully!");
          }
      });
    });

    data = fs.readFile('./test/demo/templates/components/editing.html', 'utf8', function (err,data) {
      if (err) {
        return console.log(err);
      }

      var template = precompile(data);

      fs.writeFile('./test/demo/templates/components/editing.js', template, function(err) {
          if(err) {
              console.log(err);
          } else {
              console.log("Editing component template compiled successfully!");
          }
      });
    });

  })

  grunt.registerTask('compileAMD', 'Build the project as AMD', [
    'copy',
    'transpile:amd',
    'string-replace:amdDefines',
    'requirejs:runtime',
    'requirejs:runtimeMin',
    'requirejs:compiler',
    //'requirejs:compilerMin'
  ]);

  // TODO: generate our cjs runtime deps off of htmlbars'
  grunt.registerTask('compileCJS', 'Build the project as CJS', [
    'copy',
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
    'jshint',
    'clean:tmp'
  ]);

  grunt.registerTask('test', 'Run the test suite', function() {
    grunt.task.run(['build', 'connect:test', 'qunit']);
  });

  grunt.registerTask('start', 'Run the test server', function() {
    grunt.task.run(['build', 'precompileDemo', 'connect:test', 'watch']);
  });

}
