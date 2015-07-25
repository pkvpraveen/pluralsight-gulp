var gulp = require('gulp');
var args = require('yargs').argv;
var browserSync = require('browser-sync');
var config = require('./gulp.config');
var del = require('del');
var $ = require('gulp-load-plugins')({lazy: true});
var port = process.env.port || config.defaultPort;

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
gulp.task('styles', ['clean-styles'], function () {
    log('compiling less --> css');
    return gulp
        .src(config.less)
        .pipe($.plumber())
        .pipe($.less())
        .pipe($.autoprefixer({browsers: ['last 2 versions', '> 5%']}))
        .pipe(gulp.dest(config.temp));
});

gulp.task('clean-styles', function (done) {
    var files = config.temp + '**/*.css';
    clean(files, done);
});
gulp.task('clean-fonts', function (done) {
    clean(config.build + 'fonts/**/*.*', done);
});
gulp.task('clean-images', function (done) {
    clean(config.build + 'images/**/*.*', done);
});
gulp.task('clean', function (done) {
    var delConfig = [].concat(config.build, config.temp);
    log('Cleaning ' + delConfig);
    del(delConfig, done);
});

gulp.task('less-watcher', function () {
    gulp.watch(config.less, ['styles']);
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

gulp.task('inject', ['wiredep', 'styles', 'templatecache'], function () {
    return gulp
        .src(config.index)
        .pipe($.inject(gulp.src(config.css)))
        .pipe(gulp.dest(config.client));
});
gulp.task('serve-build', ['optimize'], function () {
    serve(false);
});

gulp.task('serve-dev', ['inject'], function () {
    serve(true)
});

gulp.task('help', $.taskListing);
gulp.task('default', ['help']);
gulp.task('fonts', ['clean-fonts'], function () {
    log('Copying fonts...');
    return gulp.src(config.fonts)
        .pipe(gulp.dest(config.build + 'fonts'))
});
gulp.task('images', ['clean-images'], function () {
    log(' Copying and compressing images');
    return gulp.src(config.images)
        .pipe($.imagemin({optimizationLevel: 4}))
        .pipe(gulp.dest(config.build + 'images'));
});

gulp.task('clean-code', function (done) {
    var files = [].concat(
        config.temp + '**/*.js',
        config.build + '**/*.html',
        config.build + 'js/**/*.js'
    );
    clean(files, done);
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

gulp.task('optimize', ['inject', 'fonts', 'images'], function () {
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

////////////////////
function serve(isDev) {
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
            startBrowserSync(isDev);
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

function startBrowserSync(isDev) {
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
                $.util.log($.util.colors.blue(msg[item]));
            }
        }
    } else {
        $.util.log($.util.colors.blue(msg));
    }
}
