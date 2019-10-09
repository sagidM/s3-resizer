// this file is for lambda@Edge function for the CloudFront Origin Response event,
// required to prevent caching responses with redirect to resize  API GateWay.

'use strict';

const PathPattern = new RegExp("^/(images/).+");
const maxAge = '31536000'

exports.handler = (event, context, callback) => {
    const response = event.Records[0].cf.response;
    var requestPath = event.Records[0].cf.request.uri;
    //var requestPath = "/images/4.jpg";
    var isRrszPath = PathPattern.test(requestPath);
    
    if (response.status >= 301 && response.status <= 308) {
        response.headers['cache-control'] =  [{ key: 'Cache-Control', value: 'no-store, no-cache' }];
        response.headers['expires'] =  [{ key: 'Expires', value: '0' }];
    }
    else {
        if(isRrszPath){
            console.log(`setting max-age=${maxAge}`);
            response.headers['cache-control'] =  [{ key: 'Cache-Control', value: `max-age=${maxAge}` }];
        }
    }
    callback(null,response);
};
