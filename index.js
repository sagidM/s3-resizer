'use strict'


const AWS = require('aws-sdk')
const S3 = new AWS.S3({signatureVersion: 'v4'});
const Sharp = require('sharp');
const PathPattern = new RegExp("/(images/)rsz/(.*)/(.*)");

// parameters
const BUCKET = "cdn.pay.super.com"


exports.handler = function(event, _context, callback) {
    const response = event.Records[0].cf.response;
    console.log('Request uri: '+path);
    if (response.status >= 400 && response.status <= 599) {
        var path = event.Records[0].cf.request.uri;
        var parts = PathPattern.exec(path);
        var dir = parts[1] || '';
        var options = parts[2].split('_');
        var filename = parts[3];
        var resizedKey = dir + 'rsz/'+parts[2]+'/'+filename;
        console.log('Dir: '+dir+', File name: '+filename);
        console.log('resizedKey: '+resizedKey);

        var sizes = options[0].split("x");
        var action = options.length > 1 ? options[1] : null;

        if (action && action !== 'max' && action !== 'min') {
            callback(null, {
                statusCode: 400,
                body: `Unknown func parameter "${action}"\n` +
                    'For query ".../150x150_func", "_func" must be either empty, "_min" or "_max"',
                headers: {"Content-Type": "text/plain"}
            });
            return;
        }

        var contentType;
        S3.getObject({Bucket: BUCKET, Key: dir + filename})
        .promise()
        .then(data => {
            contentType = data.ContentType;
            var width = sizes[0] === 'AUTO' ? null : parseInt(sizes[0]);
            var height = sizes[1] === 'AUTO' ? null : parseInt(sizes[1]);
            var fit;
            switch (action) {
                case 'max':
                    fit = 'inside';
                    break;
                case 'min':
                    fit = 'outside';
                    break
                default:
                    fit = 'cover';
                    break;
            }
            var options = {
                withoutEnlargement: true,
                fit
            };
            return Sharp(data.Body)
                .resize(width, height, options)
                .rotate()
                .toBuffer();
        })
        .then(result => {
            var pr = S3.putObject({
                Body: result,
                Bucket: BUCKET,
                ContentType: contentType,
                Key: resizedKey
            }
            //}).promise()
            ).promise();
            pr.then(function(data) {
                console.log('Put Success');
            }).catch(function(err) {
                console.log(err);
            });
            if(result.length >= 1048576){
                console.log("response size > 1 MB");
                response = {
                    statusCode: 301,
                    headers: {'Location' : [{key:'Location', value: `https://cdn.pay.super.com${path}`}]}
                }
            }
            else {
                console.log("output from lambda");
                response = {
                    status: '200',
                    statusDescription: 'OK',
                    // headers: {
                    //     'cache-control': [{
                    //         key: 'Cache-Control',
                    //         value: 'max-age=100'
                    //     }],
                    //     'content-type': [{
                    //         key: 'Content-Type',
                    //         value: 'text/html'
                    //     }],
                    //     'content-encoding': [{
                    //         key: 'Content-Encoding',
                    //         value: 'UTF-8'
                    //     }],
                    // },
                    body: result.toString('base64'),
                    bodyEncoding: 'base64'
                };
            }                            
            callback(null, response);
        })
        .catch(e => {
            callback(null, {
                statusCode: e.statusCode || 400,
                body: 'Exception: ' + e.message,
                headers: {
                    "Content-Type": [{key:'Content-Type', value: "text/plain"}]
                }
            })
        });
    }
    else {
        callback(null, response);
    }
}
