'use strict';

let gulp = require('gulp');
let zip = require('gulp-zip');
let config = require('../config');
let http = require('http');
let https = require('https');
let util = require('util');
let browserSyncManager = require('../browserSyncManager');
let primoProxy = require('../primoProxy');
let glob = require('glob');
let prompt = require('prompt');
let runSequence = require('run-sequence');
const bodyParser = require('body-parser');
let viewForProxy;
let urlForProxy;
let dirForProxy;

gulp.task('setup_watchers', ['watch-js', 'watch-custom-scss', 'watch-css'], () => {
    gulp.watch(config.buildParams.customPath(),() => {
        return browserSyncManager.reloadServer();
    });
    gulp.watch(config.buildParams.customCssPath(),() => {
        return gulp.src(config.buildParams.customCssPath())
            .pipe(browserSyncManager.streamToServer());
    });
});

let viewProxy = {};

gulp.task('connect:primo_explore', function() {
    let appName = 'primo-explore';
    browserSyncManager.startServer({
        label: 'production',
        middleware:[
                function(req,res,next) {
                    let confPath = config.getVe() ? '/primaws/rest/pub/configuration' : '/primo_library/libweb/webservices/rest/v1/configuration';

                    var regex = /[?&]([^=#]+)=([^&#]*)/g,
                        url = req.url,
                        params = {},
                        match;
                    while(match = regex.exec(url)) {
                        params[match[1]] = match[2];
                        if(match[1] === 'vid'){
                            if(!viewForProxy)
                                viewForProxy = params[match[1]];
                        }
                        if(match[1] === 'url'){
                            if(!urlForProxy)
                                urlForProxy = params[match[1]];
                        }
                        if(match[1] === 'dirName'){
                            if(!dirForProxy)
                                dirForProxy = params[match[1]];
                        }


                    }


                    let fixConfiguration = function(res,res1){
                        let body = '';

                        res1.setEncoding('utf8');

                        res1.on("data", function(chunk) {
                            body = body + chunk;
                        });

                        res1.on("end", function(){

                            let vid = dirForProxy || config.view() || '';
                            let customizationProxy = primoProxy.getCustimazationObject(vid,appName);
                            let newBodyObject = JSON.parse(body);
                            newBodyObject.customization = customizationProxy;
                            let newBody = JSON.stringify(newBodyObject);

                            res.body = newBody;

                            /*console.log('newBody: ' +newBody);*/
                            res.end(newBody);

                        });
                    }
                    if(req.url.startsWith(confPath)) {
                        //console.log(util.inspect(req, {}));
                        let proxyUrl = urlForProxy || config.PROXY_SERVER;
                        let url = proxyUrl+req.url;
                        let base = proxyUrl.replace('http:\/\/','').replace('https:\/\/','');
                        let method = proxyUrl.split('://')[0];
                        let parts = base.split(':');
                        let hostname = parts[0];
                        let port = parts[1];


                        let options = {
                            hostname: hostname,
                            port: port,
                            path: req.url,
                            method: 'GET',
                            headers: {
                                'X-From-ExL-API-Gateway' : '1'
                            }
                        };
                        let requestObject = http;
                        if(method === 'https') {
                            requestObject = https;
                        }

                        let req2 = requestObject.request(options, (res1) => {
                            fixConfiguration(res, res1);
                        });

                        req2.on('error', (e) => {
                            next();
                        });

                        req2.write('');
                        req2.end();

                    }
                    else {
                        if(!viewProxy[viewForProxy]){
                            viewProxy[viewForProxy] = urlForProxy;
                        }
                        next();
                    }

                },
                    primoProxy.proxy_function(viewForProxy,urlForProxy)
                ],
        port: 8003,
        baseDir: appName
    });
});


gulp.task('run', ['connect:primo_explore','reinstall-primo-node-modules','setup_watchers','custom-js','custom-scss','custom-css']); //watch

gulp.task('web', ['serve']); //watch
