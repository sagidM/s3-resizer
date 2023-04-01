import {S3Client, GetObjectCommand} from "@aws-sdk/client-s3";
import {Upload} from '@aws-sdk/lib-storage';
import Sharp from 'sharp';

const PathPattern = /(.*\/)?(.*)\/(.*)/;

// parameters
const {BUCKET, URL} = process.env;
const WHITELIST = process.env.WHITELIST
    ? Object.freeze(process.env.WHITELIST.split(' '))
    : null;

const s3Client = new S3Client();

export const handler = async (event) => {
    const path = event.queryStringParameters?.path;
    if (!path) {
        return errorResponse('Parameter "?path=" is empty or missing');
    }

    const parts = PathPattern.exec(path);
    if (!parts || !parts[2] || !parts[3]) {
        return errorResponse('Parameter "?path=" should look like: path/150x150_max/image.jpg');
    }
    const dir = parts[1] || '';
    const resizeOption = parts[2];  // e.g. "150x150_max"
    const sizeAndAction = resizeOption.split('_');
    const filename = parts[3];

    const sizes = sizeAndAction[0].split("x");
    const action = sizeAndAction.length > 1 ? sizeAndAction[1] : null;

    // Whitelist validation.
    if (WHITELIST && !WHITELIST.includes(resizeOption)) {
        return errorResponse(`WHITELIST is set but does not contain the size parameter "${resizeOption}"`, 403);
    }

    // Action validation.
    if (action && action !== 'max' && action !== 'min') {
        return errorResponse(
            `Unknown func parameter "${action}"\n` +
            'For query ".../150x150_func", "_func" must be either empty, "_min" or "_max"'
        );
    }

    try {
        const originImage = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET,
            Key: dir + filename,
        }));

        const width = sizes[0] === 'AUTO' ? null : parseInt(sizes[0]);
        const height = sizes[1] === 'AUTO' ? null : parseInt(sizes[1]);
        let fit;
        switch (action) {
            case 'max':
                fit = 'inside';
                break;
            case 'min':
                fit = 'outside';
                break;
            default:
                fit = 'cover';
                break;
        }
        const sharp = Sharp({failOn: 'none'})
            .resize(width, height, {withoutEnlargement: true, fit})
            .rotate();

        // This does not work: await s3Client.send(new PutObjectCommand({params})
        // Solution: https://github.com/aws/aws-sdk-js-v3/issues/1920#issuecomment-761298908
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: BUCKET,
                Key: path,
                Body: originImage.Body.pipe(sharp),
                ContentType: originImage.ContentType,
                CacheControl: 'public, max-age=86400'
            },
        });
        await upload.done();

        return {
            statusCode: 301,
            headers: {"Location" : `${URL}/${path}`}
        };
    } catch (e) {
        return errorResponse('Exception: ' + e.message, e.statusCode || 400);
    }
}

function errorResponse(body, statusCode = 400) {
    return {
        statusCode,
        body,
        headers: {"Content-Type": "text/plain"}
    }
}
