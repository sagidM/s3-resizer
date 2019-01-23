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

    var contentType;
    S3.getObject({Bucket: BUCKET, Key: dir + filename})
        .promise()
        .then(data => {
            contentType = data.ContentType;
            var img = Sharp(data.Body)
                .resize(
                    sizes[0] === 'AUTO' ? null : parseInt(sizes[0]),
                    sizes[1] === 'AUTO' ? null : parseInt(sizes[1]));

            switch (func){
                case 'max': img = img.max(); break;
                case 'min': img = img.min(); break;
                case null: break;
                default:
                    callback(null, {
                        statusCode: 400,
                        body: `Unknown func parameter "${func}"\n` +
                              'For query ".../150x150_func", "_func" must be either empty, "_min" or "_max"',
                        headers: {"Content-Type": "text/plain"}
                    })
                    return new Promise(() => {})  // the next then-blocks will never be executed
            }

            return img.withoutEnlargement().rotate().toBuffer();
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
