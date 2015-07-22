module.exports = (function () {
    var client = './src/client/';
    var clientApp = client + 'app/';
    var temp = './.tmp/';
    var server = './src/server/';
    return {
        //file paths
        client: client,
        index: client + 'index.html',
        less: client + 'styles/styles.less',
        alljs: ['./src/**/*.js',
            './*.js'],
        js: [
            clientApp + '**/*.module.js',
            clientApp + '**/*.js',
            '!' + clientApp + '**/*.spec.js'
        ],
        css: temp + 'styles.css',
        server: server,
        temp: temp,

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
