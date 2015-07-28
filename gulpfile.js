var gulp = require('gulp');
var args = require('yargs').argv;
var browserSync = require('browser-sync');
var config = require('./gulp.config')();
var del = require('del');
var $ = require('gulp-load-plugins')({lazy: true});
var port = process.env.port || config.defaultPort;
var _ = require('lodash');
var path = require('path');

/**
 * Bump the version
 * --type=pre will bump the pre release version*.*.*-x
 * --type=patch or no flag will bump the patch version *.*.x
 * --type=minor will bump the minor version *.x.*
 * --type=major will bump the major version x.*.*
 * --version=1.2.3 will bump to a specific version and ignore other flags
 * */

gulp.task('bump', function () {
    var msg = 'Bumping versions';
    var type = args.type;
    var version = args.version;
    var options = {};
    if (version) {
        options.version = version;
        msg += ' to ' + version;
    } else {
        options.type = type;
        msg += ' for a ' + type;
    }
    log(msg);
    return gulp.src(config.packages)
        .pipe($.print())
        .pipe($.bump(options))
        .pipe(gulp.dest(config.root));
});

gulp.task('clean-code', function (done) {
    var files = [].concat(
        config.temp + '**/*.js',
        config.build + '**/*.html',
        config.build + 'js/**/*.js'
    );
    clean(files, done);
});

gulp.task('clean', function (done) {
    var delConfig = [].concat(config.build, config.temp);
    log('Cleaning ' + delConfig);
    del(delConfig, done);
});
gulp.task('clean-fonts', function (done) {
    clean(config.build + 'fonts/**/*.*', done);
});
gulp.task('clean-images', function (done) {
    clean(config.build + 'images/**/*.*', done);
});
gulp.task('clean-styles', function (done) {
    var files = config.temp + '**/*.css';
    clean(files, done);
});

gulp.task('fonts', ['clean-fonts'], function () {
    log('Copying fonts...');
    return gulp.src(config.fonts)
        .pipe(gulp.dest(config.build + 'fonts'));
});

gulp.task('help', $.taskListing);

gulp.task('images', ['clean-images'], function () {
    log(' Copying and compressing images');
    return gulp.src(config.images)
        //.pipe($.imagemin({optimizationLevel: 4}))
        .pipe(gulp.dest(config.build + 'images'));
});

gulp.task('inject', ['wiredep', 'styles', 'templatecache'], function () {
    return gulp
        .src(config.index)
        .pipe($.inject(gulp.src(config.css)))
        .pipe(gulp.dest(config.client));
});

gulp.task('build', ['optimize', 'fonts', 'images'], function () {
    log('building everything...');
    var msg = {
        title: 'gulp build',
        subTitle: 'Deployed to build folder',
        message: 'Running gulp serve-build'
    };
    del(config.temp);
    log(msg);
    notify(msg);
});

gulp.task('optimize', ['inject', 'test'], function () {
    log('Optimizing html, js and css');
    var templateCache = config.temp + config.templateCache.file;
    var assets = $.useref.assets({searchPath: './'});
    var cssFilter = $.filter('**/*.css');
    var libjsFilter = $.filter('**/lib.js');
    var appjsFilter = $.filter('**/app.js');
    return gulp.src(config.index)
        .pipe($.plumber())
        .pipe($.inject(gulp.src(templateCache, {read: false}), {
                starttag: '<!--inject:templates:js-->'
            }
        ))
        .pipe(assets)
        //filter down to css
        .pipe(cssFilter)
        //csso
        .pipe($.csso())
        //filter restore
        .pipe(cssFilter.restore())
        //filter down to js
        .pipe(libjsFilter)
        //uglify
        .pipe($.uglify())
        //filter restore
        .pipe(libjsFilter.restore())
        //filter down to js
        .pipe(appjsFilter)
        //uglify
        .pipe($.uglify())
        .pipe($.ngAnnotate())
        //filter restore
        .pipe(appjsFilter.restore())
        //file revisions
        .pipe($.rev())
        .pipe(assets.restore())
        .pipe($.useref())
        .pipe($.revReplace())
        .pipe(gulp.dest(config.build))
        .pipe($.rev.manifest())
        .pipe(gulp.dest(config.build));
});
gulp.task('styles', ['clean-styles'], function () {
    log('compiling less --> css');
    return gulp
        .src(config.less)
        .pipe($.plumber())
        .pipe($.less())
        .pipe($.autoprefixer({browsers: ['last 2 versions', '> 5%']}))
        .pipe(gulp.dest(config.temp));
});

gulp.task('templatecache', function () {
    gulp.src(config.htmlTemplates)
        .pipe($.minifyHtml({empty: true}))
        .pipe($.angularTemplatecache(
            config.templateCache.file,
            config.templateCache.options
        ))
        .pipe(gulp.dest(config.temp))

    ;
});

gulp.task('vet', function () {
    log('working with gulp');
    return gulp
        .src(config.alljs)
        .pipe($.if(args.verbose, $.print()))
        .pipe($.jscs())
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish', {verbose: true}))
        .pipe($.jshint.reporter('fail'));
});
gulp.task('wiredep', function () {
    var options = config.getWiredepDefaultOptions();
    var wiredep = require('wiredep').stream;
    return gulp
        .src(config.index)
        .pipe(wiredep(options))
        .pipe($.inject(gulp.src(config.js)))
        .pipe(gulp.dest(config.client));
});

gulp.task('less-watcher', function () {
    gulp.watch(config.less, ['styles']);
});

gulp.task('serve-dev', ['inject'], function () {
    serve(true/* isDev */);
});

gulp.task('serve-build', ['build'], function () {
    serve(false/* isDev */);
});

gulp.task('test', ['vet', 'templatecache'], function (done) {
    startTests(true/* singleRun */, done);
});

gulp.task('autotest', ['vet', 'templatecache'], function (done) {
    startTests(false/* singleRun */, done);
});

gulp.task('serve-specs', ['build-specs'], function () {
    log('Running the spec Runner');
    serve(true /* isDev*/, true /* specRunner*/);
});

gulp.task('build-specs', ['templatecache'], function () {
    log('Building the spec runner...');
    var wiredep = require('wiredep').stream;
    var options = config.getWiredepDefaultOptions();
    var specs = config.specs;
    options.devDependencies = true;

    if (args.startServers) {
        specs = [].concat(specs, config.serverIntegrationSpecs)
    }
    return gulp
        .src(config.specRunner)
        .pipe(wiredep(options))
        .pipe($.inject(gulp.src(config.testLibraries), {name: 'inject:testlibraries', read: false}))
        .pipe($.inject(gulp.src(config.js)))
        .pipe($.inject(gulp.src(config.specHelpers), {name: 'inject:spechelpers', read: false}))
        .pipe($.inject(gulp.src(specs), {name: 'inject:specs', read: false}))
        .pipe($.inject(gulp.src(config.temp + config.templateCache.file), {name: 'inject:templates', read: false}))
        .pipe(gulp.dest(config.client));
});

gulp.task('default', ['help']);

////////////////////

function startTests(singleRun, done) {
    var child;
    var fork = require('child_process').fork;
    var karma = require('karma').server;
    var excludeFiles = [];
    if (args.startServers) {
        log('starting server...');
        var savedEnv = process.env;
        savedEnv.NODE_ENV = 'dev';
        savedEnv.PORT = 8888;
        child = fork(config.nodeServer);
    } else {
        if (config.serverIntegrationSpecs && config.serverIntegrationSpecs.length) {
            excludeFiles = config.serverIntegrationSpecs;
        }
    }
    karma.start({
        configFile: __dirname + '/karma.conf.js',
        exclude: excludeFiles,
        singleRun: !!singleRun
    }, karmaCompleted);

    function karmaCompleted(karmaResult) {
        log('Karma Completed');
        if (child) {
            log('Shutting down the child process...');
            child.kill();
        }
        if (karmaResult === 1) {
            done('karma : tests failed with code ' + karmaResult);
        } else {
            done();
        }
    }
}

function serve(isDev, specRunner) {
    var nodeOptions = {
        script: config.nodeServer,
        delayTime: 1,
        env: {
            'PORT': port,
            'NODE_ENV': isDev ? 'dev' : 'build'
        },
        watch: [config.server]
    };

    return $.nodemon(nodeOptions)
        .on('restart', function (event) {
            log('node restarted, files changed are ' + event);
            setTimeout(function () {

                browserSync.notify('Reloading now.....');
                browserSync.reload({stream: false});
            }, config.browserReloadDelay);
        })
        .on('start', function () {
            log('node started');
            startBrowserSync(isDev, specRunner);
        })
        .on('crash', function () {
            log('node crashed');
        })
        .on('exit', function () {
            log('node exited');
        });
}

function changeEvent(event) {
    var srcPattern = new RegExp('/.*(?=/' + config.source + ')/');
    log('File: ' + event.path.replace(srcPattern, '') + ' ' + event.type);
}

function notify(options) {
    var notifier = require('node-notifier');
    var notifyOptions = {
        sound: 'Bottle',
        contentImage: path.join(__dirname, 'gulp.png'),
        icon: path.join(__dirname, 'gulp.png')
    };
    _.assign(notifyOptions, options);
    notifier.notify(notifyOptions);
}

function startBrowserSync(isDev, specRunner) {
    if (args.nosync || browserSync.active) {
        log('browser sync is already active');
        return;
    }
    log('starting browser sync on port' + port);
    if (isDev) {

        gulp.watch([config.less], ['styles'])
            .on('change', function (event) {
                changeEvent(event);

            });
    } else {
        gulp.watch([config.less, config.js, config.html], ['optimize', browserSync.reload])
            .on('change', function (event) {
                changeEvent(event);
            });

    }
    var options = {
        proxy: 'localhost:' + port,
        port: 3000,
        files: isDev ? [config.client + '**/*.*',
            '!' + config.less,
            config.temp + '**/*.css'
        ] : [],
        ghostMode: {
            clicks: true,
            location: false,
            forms: true,
            scroll: true
        },
        injectChanges: true,
        logFileChanges: true,
        logLevel: 'debug',
        logPrefix: 'gulp-patterns',
        notify: true,
        reloadDelay: 0
    };
    if (specRunner) {
        options.startPath = config.specRunnerFile;
    }
    browserSync(options);

}

function clean(path, done) {
    log('deleting file' + path);
    del(path, done);
}

function log(msg) {
    if (typeof(msg) === Object) {
        for (var item in msg) {
            if (msg.hasOwnProperty(item)) {
                $.util.log($.util.colors.green(msg[item]));
            }
        }
    } else {
        $.util.log($.util.colors.green(msg));
    }
}
