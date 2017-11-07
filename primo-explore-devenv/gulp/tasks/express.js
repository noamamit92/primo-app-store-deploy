var gulp = require('gulp');
var gls = require('gulp-live-server');
const browserify = require("browserify");
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'))
const fstream = require('fstream')
const path = require('path')
const unzip = require('unzip')
const template = require('lodash/template');
const bodyParser = require('body-parser');
const childP = require('child_process');
const configG = require('../config');
/*const requireNPM = require('require-npm').decorate(require);*/
const rimrafAsync = Promise.promisify(require('rimraf'));
 const streamToPromise = require('./streamToPromise');

gulp.task('serve', function() {
    //1. serve with default settings
   /* var server = gls.static(); //equals to gls.static('public', 3000);
    server.start();*/

    //2. serve at custom port
    buildByBrowserify();

    if (gulp.tasks.run) {
        gulp.start('run')
    }

    //var server = gls.static(['primo-explore/www','primo-explore/api'], 8888);
    const express = require('express')
    const appS = express()
    appS.use( bodyParser.json() );
    appS.use(express.static('primo-explore/www'))


    appS.get('/feature', function (req, res) {
        childP.exec('npm install --prefix primo-explore/custom/'+req.query.dirName+' '+req.query.id);

        var response = {data:'noam'};
        res.send(response);
    })
    appS.get('/restart',function(req,res){
        if(!process.cwd().includes("primo-explore-devenv")) {
            process.chdir("primo-explore-devenv");
        }
        configG.setView(req.query.dirName);

        gulp.start('custom-js')
        gulp.start('setup_watchers')
    })

    appS.post('/colors', function (req, res) {
        var colors = req.body.data.colors;
        var conf = req.body.data.conf;
        var baseDir = 'primo-explore/custom/'+conf.dirName;
        process.argv = ["","", "","--view="+conf.dirName];

        console.log('aaa'+baseDir);
        if(!process.cwd().includes("primo-explore-devenv")) {
            process.chdir("primo-explore-devenv");
        }
        configG.setView(conf.dirName);
        fs.writeFileAsync(baseDir+'/colors.json', JSON.stringify(colors), { encoding: 'utf-8' })
            .then(() => {
            gulp.start('app-css')
        });

        var response = {status:'200'};
        res.send(response);
    })



    appS.get('/start', function (req, res) {
        var confObj = {"view":req.query.view,
            "url": req.query.url}
        var d = new Date();
        var n = d.getTime();

        //create a directory from MOCK
        let readStream = fs.createReadStream('templatePackage/VIEW_CODE.zip');
        /*writeStream2 = fstream.Writer({
            path: path.resolve(__dirname, '../../primo-explore/custom/' + n),
            type: 'Directory'
        });*/
        let writeStream = fstream.Writer({
            path: path.resolve(__dirname, '../../tmp'),
            type: 'Directory'
        });
        let p1 = rimrafAsync('../../tmp')
                .then(
                    () => {
                let zipStream = readStream
                    .pipe(unzip.Parse())
                    .pipe(writeStream)
                return streamToPromise(zipStream)
            });
        //let p2 = rimrafAsync("primo-explore-devenv/primo-explore/custom/" + n);
        Promise.join(p1).then(() => {
            return fs.renameAsync("./tmp/VIEW_CODE", "primo-explore/custom/" + n);





    })



        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({status:'200',dirName:n}));
    })

    appS.listen(8004, function () {
        console.log('Example app listening on port 8004!')
    })
    /*server.start();*/


/*    server.get('/app', function (req, res) {
        console.log('22222');
        res.send('Hello World!')
    })*/
    /*//3. serve multi folders
    var server = gls.static(['dist', '.tmp']);
    server.start();*/

    //use gulp.watch to trigger server actions(notify, start or stop)
    /*gulp.watch(['primo-explore/app/!**!/!*','primo-explore/www/!**!/!*.css', 'primo-explore/www/!**!/!*.css'], function (file) {
        console.log('11111');
        server.notify.apply(server, [file]);
    });*/
});

gulp.task('custom', function() {
    var server = gls('primo-explore/app/server.js');
    server.start().then(function(result) {
        console.log('Server exited with result:', result);
        process.exit(result.code);
    });
    gulp.watch(['primo-explore/www/**/*.css', 'primo-explore/www/**/*.css'], function(file) {
        server.notify.apply(server, [file]);
    });
    gulp.watch('primo-explore/app/server.js', server.start);
});





function buildByBrowserify() {
    return browserify({
        ignore: ['gulpfile'],
        debug: true,
        entries: './primo-explore/www/renderer.js',
        path: './primo-explore/app/**/*.js'

    })
        .bundle()
        .pipe(fs.createWriteStream('./primo-explore/www/bundle.js'));
}