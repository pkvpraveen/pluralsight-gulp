module.exports = function () {
    var build = './build/';
    var client = './src/client/';
    var clientApp = client + 'app/';
    var report = './report/';
    var root = './';
    var server = './src/server/';
    var temp = './.tmp/';
    var wiredep = require('wiredep');
    var bowerFiles = wiredep({devDependencies: true})['js'];
    var specHelpers = [client + 'test-helpers/*.js'];
    var specRunnerFile = 'specs.html';
    var templateCache = {
        file: 'templates.js',
        options: {
            module: 'app.core',
            standAlone: false,
            root: 'app/'
        }
    };
    var serverIntegrationSpecs = [client + 'tests/server-integration/**/*.spec.js'];

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
        report: report,
        root: root,
        server: server,
        temp: temp,
        /**
         * Template Cache
         */
        templateCache: templateCache,

        /**
         * specs.html our java test runner
         */
        specRunner: client + specRunnerFile,
        specRunnerFile: specRunnerFile,
        testLibraries: [
          'node_modules/mocha/mocha.js',
          'node_modules/chai/chai.js',
          'node_modules/mocha-clean/index.js',
          'node_modules/sinon-chai/lib/sinon-chai.js'
        ],
        specs: clientApp + '**/*.spec.js',

        /**
         * karma settings
         */
        specHelpers: specHelpers,
        serverIntegrationSpecs: serverIntegrationSpecs,
        karma: getKarmaOptions(),
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

    function getKarmaOptions() {
        var preprocessors = {};
        preprocessors[client + '**/!(*.spec)+(.js)'] = ['coverage'];
        return {
            files: [].concat(
                bowerFiles,
                specHelpers,
                client + '**/*.module.js',
                client + '**/*.js',
                temp + templateCache.file,
                serverIntegrationSpecs
            ),
            reporters: ['progress', 'coverage'],
            exclude: [],
            coverage: {
                dir: report + 'coverage',
                reporters: [
                    {type: 'html', subdir: 'report-html'},
                    {type: 'lcov', subdir: 'report-lcov'},
                    {type: 'text-summary'}
                ]
            },
            preprocessors: preprocessors
        };
    }
};
