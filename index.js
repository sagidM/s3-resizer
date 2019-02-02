'use strict'


const AWS = require('aws-sdk')
const S3 = new AWS.S3({signatureVersion: 'v4'});
const Sharp = require('sharp');
const PathPattern = new RegExp("(.*/)?(.*)/(.*)");

// parameters
const {BUCKET, URL} = process.env


exports.handler = function(event, _context, callback) {
    var path = event.queryStringParameters.path;
    var parts = PathPattern.exec(path);
    var dir = parts[1] || '';
    var options = parts[2].split('_');
    var filename = parts[3];


    var sizes = options[0].split("x");
    var func = options.length > 1 ? options[1] : null;

    if (func && func !== 'max' && func !== 'min') {
        callback(null, {
            statusCode: 400,
            body: `Unknown func parameter "${func}"\n` +
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
            var options = { withoutEnlargement: true };
            return Sharp(data.Body)
                .resize(width, height, options)
                .rotate()
                .toBuffer();
        })
        .then(result =>
            S3.putObject({
                Body: result,
                Bucket: BUCKET,
                ContentType: contentType,
                Key: path
            }).promise()
        )
        .then(() =>
            callback(null, {
                statusCode: 301,
                headers: {"Location" : `${URL}/${path}`}
            })
        )
        .catch(e => {
            callback(null, {
                statusCode: e.statusCode || 400,
                body: 'Exception: ' + e.message,
                headers: {"Content-Type": "text/plain"}
            })
        });
}
