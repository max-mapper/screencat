module.exports = function(grunt) {

// Project configuration.
	grunt.initConfig({
	compass: {
		dist: {
			options: {
				sassDir: 'scss',
				cssDir: 'css',
				raw: 'preferrex_syntax = :sass\n'
			}
		}
	},
	csslint: {
		strict: {
			options: {
				import: 2
			},
			src: ['css/*.css']
		},
		lax: {
			options: {
				import: false
			},
			src: ['css/*.css']
		}
	},
    cssmin: {
    	options: {
    		shorthandCompacting: false,
    		roundingPrecision: -1
    	},
    	target: {
    		files: [{
    			expand: true,
    			cwd: 'css',
    			src: ['*.css', '!*min.css'],
    			dest: 'css',
    			ext: '.min.css'
    		}]
    	}
    },
    watch: {
    	css: {
    		files: ['scss/*.scss'],
    		tasks: ['compass'],
    		options: {
    			livereload: true,
    		}
    	}
    }
  });

  // Load the plugins.
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-compass');
  grunt.loadNpmTasks('grunt-contrib-csslint');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Default task(s).
  grunt.registerTask('default', ['jshint', 'compass']);
};