module.exports = (function () {
    var client = './src/client/';
    var clientApp = client + 'app/';
    var temp = './.tmp/';
    var server = './src/server/';
    var build = './build/';
    var root ='./';
    return {
        //file paths
        client: client,
        index: client + 'index.html',
        htmlTemplates: clientApp + '**/*.html',
        less: client + 'styles/styles.less',
        alljs: ['./src/**/*.js',
            './*.js'],
        js: [
            clientApp + '**/*.module.js',
            clientApp + '**/*.js',
            '!' + clientApp + '**/*.spec.js'
        ],
        html: clientApp + '**/*.html',
        css: temp + 'styles.css',
        server: server,
        temp: temp,
        build: build,
        fonts: './bower_components/font-awesome/fonts/**/*.*',
        images: client + 'images/**/*.*',
        root:root,
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

        packages: ['./package.json','./bower.json'],

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
