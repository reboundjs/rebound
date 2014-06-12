module.exports = function(grunt) {

  grunt.initConfig({
    clean: {
      tmp: ["tmp"],
      dist: ["dist"],
      prod: ["prod"]
    },
    copy: {
      build: {
        files: [{
          expand: true,
          cwd: 'node_modules/htmlbars/lib',
          src: ['htmlbars.js', 'htmlbars/**/*'],
          dest: 'tmp',
        },{
          expand: true,
          cwd: 'node_modules/htmlbars/lib/vendor',
          src: ['*'],
          dest: 'tmp',
        },{
          expand: true,
          cwd: 'node_modules/handlebars/lib',
          src: ['handlebars.js', 'handlebars.runtime.js', 'handlebars/**/*'],
          dest: 'tmp',
        },{
          expand: true,
          cwd: 'lib',
          src: ['**/*'],
          dest: 'tmp'
        }]
      },
      htmlbarsCompiler: {
        files: [{
          expand: true,
          cwd: 'node_modules/htmlbars/lib/compiler.js',
          src: ['dist/htmlbars/compiler.js'],
          dest: 'dist'
        }]
      },
      deps: {
        files: [{
          expand: true,
          cwd: '.',
          src: ['almond.js'],
          dest: 'dist'
        }]
      }
    },
    'string-replace': {
      // Replaces relative imports in htmlbars compiler
      absoluteHtmlbars: {
        files: {
          'tmp/htmlbars/compiler/': 'tmp/htmlbars/compiler/*',
        },
        options: {
          replacements: [{
            pattern: /(import.*("|'))\.\/(.*("|').*;)/ig,
            replacement: '$1htmlbars/compiler/$3'
          }]
        }
      },
      absoluteHandlebarsCompiler: {
        files: {
          'tmp/handlebars/compiler/': 'tmp/handlebars/compiler/*',
        },
        options: {
          replacements: [{
            pattern: /(import.*("|'))\.\/(.*("|').*;)/ig,
            replacement: '$1handlebars/compiler/$3'
          },{
            pattern: /(import.*("|'))\.\.\/(.*("|').*;)/ig,
            replacement: '$1handlebars/$3'
          }]
        }
      },
      absoluteHandlebars: {
        files: {
          'tmp/handlebars/': 'tmp/handlebars/*.js',
        },
        options: {
          replacements: [{
            pattern: /(import.*("|'))\.\/(.*("|').*;)/ig,
            replacement: '$1handlebars/$3'
          },{
            pattern: /(module.*("|'))\.\/(.*("|').*;)/ig,
            replacement: '$1handlebars/$3'
          }]
        }
      },
      relativeDefines: {
        files: {
          'dist/': 'dist/*.js',
          'dist/': 'dist/**/*.js',
          'dist/': 'dist/**/**/*.js',
        },
        options: {
          replacements: [{
            pattern: /(define\(("|'))\/(.*("|'))/ig,
            replacement: '$1$3'
          }]
        }
      }
    },
    transpile: {
      main: {
        type: "amd",
        inferName: false,
        files: [{
          expand: true,
          cwd: 'tmp',
          src: [
            '**/*.js'
          ],
          dest: 'dist',
        }]
      }
    },
    concat_sourcemap: {
      browser: {
        files: [{
          src: [
            'wrap/start.frag',
            'wrap/almond.js',
            'dist/handlebars/**/*.js',
            'dist/htmlbars/**/*.js',
            'dist/boundback/**/*.js',
            'dist/*.js',
            'wrap/end.frag'
          ],
          dest: 'prod/boundback.amd.js'
        }]
      }
    },
    requirejs: {
      make: {
        options: {
          baseUrl: 'dist',
          name: 'almond.js',
          include: [
            'boundback.js'
          ],
          optimize: 'none',
          out: 'prod/boundback.js',
          wrap: {
              startFile: 'wrap/start.frag',
              endFile: 'wrap/end.frag'
          }
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-string-replace');
  grunt.loadNpmTasks('grunt-es6-module-transpiler');
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-concat-sourcemap');

  grunt.registerTask('build', [
    'clean',
    'copy:build',
    'string-replace',
    'transpile',
    'copy:htmlbarsCompiler',
    'string-replace:relativeDefines',
    'copy:deps',
    //'requirejs:make'
    'concat_sourcemap:browser'
  ]);

}
