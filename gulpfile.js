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

gulp.task('inject', ['wiredep', 'styles'], function () {
    return gulp
        .src(config.index)
        .pipe($.inject(gulp.src(config.css)))
        .pipe(gulp.dest(config.client));
});

gulp.task('serve-dev', ['inject'], function () {
    var isDev = true;
    var nodeOptions = {
        script: config.nodeServer,
        delayTime: 1,
        env: {
            PORT: port,
            NODE_ENV: isDev ? 'dev' : 'build'
        },
        watch: [config.server + '**/*.*']
    };

    return $.nodemon(nodeOptions)
        .on('restart', ['vet'], function (event) {
            log('node restarted, files changed are ' + event);
        })
        .on('start', function () {
            log('node started');
            startBrowserSync();
        })
        .on('crash', function () {
            log('node crashed');
        })
        .on('exit', function () {
            log('node exited');
        });

});

function startBrowserSync() {
    if (browserSync.active) {
        return;
    }
    log('starting browser sync on port' + port);
    var options = {
        proxy: 'localhost:' + port,
        port: 3000,
        files: [config.client + '**/*.*'],
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
        reloadDelay: 1000
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
