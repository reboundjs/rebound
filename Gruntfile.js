module.exports = function(grunt) {

  grunt.initConfig({
    clean: {
      tmp:  ["tmp"],  // ES6 files are first consolidated in tmp
      amd: ["amd"],   // ES6 files are transpiled and placed in amd
      dist: ["dist"]  // AMD files are concatted with loader and placed in dist
    },
    copy: {
      build: {
        files: [{
          expand: true,
          cwd: 'node_modules/htmlbars/packages/htmlbars-compiler/lib',
          src: ['**/*'],
          dest: 'tmp/htmlbars-compiler',
        },{
          expand: true,
          cwd: 'node_modules/htmlbars/packages/htmlbars-runtime/lib',
          src: ['**/*'],
          dest: 'tmp/htmlbars-runtime',
        },{
          'tmp/morph.js': 'node_modules/htmlbars/packages/morph/lib/main.js',
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
      deps: {
        files: [{
          expand: true,
          cwd: '.',
          src: ['almond.js'],
          dest: 'amd'
        },{
          expand: true,
          cwd: 'node_modules/htmlbars/vendor',
          src: ['*'],
          dest: 'amd',
        }]
      }
    },
    'string-replace': {
      // Replaces any leading slashes placed in front of module names
      relativeDefines: {
        files: {
          'amd/': 'amd/*.js',
          'amd/': 'amd/**/*.js',
          'amd/': 'amd/**/**/*.js',
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
          dest: 'amd',
        }]
      }
    },
    concat_sourcemap: {
      browser: {
        files: [{
          src: [
            'wrap/start.frag',
            'wrap/almond.js',
            'amd/handlebars/**/*.js',
            'amd/htmlbars-compiler/**/*.js',
            'amd/htmlbars-runtime/**/*.js',
            'amd/rebound/**/*.js',
            'amd/*.js',
            'wrap/end.frag'
          ],
          dest: 'dist/rebound.amd.js'
        }]
      }
    },
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-string-replace');
  grunt.loadNpmTasks('grunt-es6-module-transpiler');
  grunt.loadNpmTasks('grunt-concat-sourcemap');

  grunt.registerTask('build', [
    'clean',
    'copy:build',
    'transpile',
    'string-replace:relativeDefines',
    'copy:deps',
    'concat_sourcemap:browser',
    'clean:amd',
    'clean:tmp'
  ]);

grunt.registerTask('dev', [
  'clean',
  'copy:build',
  'transpile',
  'string-replace:relativeDefines',
  'copy:deps',
  'concat_sourcemap:browser',
]);

}
