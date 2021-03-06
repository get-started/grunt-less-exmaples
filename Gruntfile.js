module.exports = function (grunt) {

    grunt.initConfig({
        clean: {
            product: {
                src: ['out']
            },
            build: {
                src: ['out/app.css']
            }
        },
        newer: {
            options: {
                override: (function () {
                    var fs = require('fs');
                    var path = require('path');

                    function includeIfImportedFileChanged(lessFile, mTime, include) {
                        function fileChanged(file) {
                            return fs.existsSync(file) && fs.statSync(file).mtime > mTime;
                        }

                        function whenFileChanged(file, include, process) {
                            fs.readFile(file, "utf8", function (err, data) {
                                var lessDir = path.dirname(file),
                                    regex = /@import\s*(?:\(.*?\))?\s*"(.*?)(?:\.less)?"\s*;/g,
                                    result, imports = [];
                                while (result = regex.exec(data)) {
                                    // All of my less files are in the same directory,
                                    // other paths may need to be traversed for different setups...
                                    var baseName = result[1];
                                    var importFile = lessDir + '/' + baseName + '.less';
                                    imports.push(importFile);
                                    if (fileChanged(importFile)) {
                                        include(true);
                                        return;
                                    }
                                }
                                process(imports);
                            });
                        }

                        var files = [];
                        var processed = {lessFile: true};
                        whenFileChanged(lessFile, include, function (imports) {
                            files = files.concat(imports);
                            while (files.length) {
                                var filename = files.pop();
                                if (!processed[filename]) {
                                    processed[filename] = true;
                                    whenFileChanged(filename, include, arguments.callee);
                                    return;
                                }
                            }
                            include(false);
                        });
                    }

                    return function (details, include) {
                        if (details.task === 'less') {
                            includeIfImportedFileChanged(details.path, details.time, include);
                        } else {
                            include(true);
                        }
                    }
                })()
            }
        },
        cssmin: {
            product: {
                files: [{
                    expand: true,
                    cwd: 'out',
                    src: ['**/*.css'],
                    dest: 'out'
                }]
            }
        },
        copy: {
            product: {
                files: [{
                    expand: true,
                    cwd: 'src',
                    src: ['**/*.css'],
                    dest: 'out'
                }]
            }
        },
        less: {
            dev: {
                options: {
                    paths: ['src'],
                    sourceMap: true
                },
                files: [{
                    src: ['**/*.less'],
                    cwd: 'src',
                    dest: 'out',
                    expand: true,
                    ext: '.css'
                }]
            },
            product: {
                options: {
                    paths: ['src'],
                    compress: true,
                    optimization: 8,
                    sourceMap: false
                },
                files: [{
                    src: ['**/*.less'],
                    cwd: 'src',
                    dest: 'out',
                    expand: true,
                    filter: function (file) {
                        return !/_.*?\.less$/.test(file);
                    },
                    ext: '.css'
                }]
            }
        },
        watch: {
            less: {
                files: ['src/**/*.less', 'src/**/*.css', '!*.min.css'],
                tasks: ['newer:less:dev']
            }
        }
    });
    grunt.loadNpmTasks('grunt-newer');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.registerTask('default', ['copy', 'less:product', 'cssmin:product', 'clean:build']);
};