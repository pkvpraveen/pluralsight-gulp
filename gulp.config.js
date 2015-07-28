module.exports = (function () {
    var build = './build/';
    var client = './src/client/';
    var clientApp = client + 'app/';
    var root = './';
    var server = './src/server/';
    var temp = './.tmp/';
    return {
        /**
         *   File paths
         * */
        alljs: ['./src/**/*.js',
            './*.js'],
        build: build,
        client: client,
        css: temp + 'styles.css',
        fonts: './bower_components/font-awesome/fonts/**/*.*',
        index: client + 'index.html',
        html: clientApp + '**/*.html',
        htmlTemplates: clientApp + '**/*.html',
        images: client + 'images/**/*.*',
        js: [
            clientApp + '**/*.module.js',
            clientApp + '**/*.js',
            '!' + clientApp + '**/*.spec.js'
        ],
        less: client + 'styles/styles.less',
        root: root,
        server: server,
        temp: temp,
        /**
         * Template Cache
         */
        templateCache: {
            file: 'templates.js',
            options: {
                module: 'app.core',
                standAlone: false,
                root: 'app/'
            }
        },

        /**
         * Package paths for bump
         */

        packages: ['./package.json', './bower.json'],

        /**
         *  browser sync
         */
        browserReloadDelay: 1000,

        getWiredepDefaultOptions: function () {
            return {
                bowerJson: require('./bower.json'),
                directory: './bower_components/',
                ignorePath: '../..'
            };
        },
        /*
         Node settings
         */
        defaultPort: 7203,
        nodeServer: './src/server/app.js'
    };
}());
