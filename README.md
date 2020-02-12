## What is it?

It's AWS Lambda, which is a compute service that lets you run code without provisioning or managing servers.  
> _[Read more about AWS Lambda.](http://docs.aws.amazon.com/lambda/latest/dg/welcome.html)_


## Demo
https://sagidm.github.io/smartuploader/examples/4.s3-resizer.html


## What this lambda provides
Let's say we have some _shared image_ in **S3**, for example:  
`https://example.com/images/pretty_photo.jpg`  

to resize on fly this image to, say, _150x150_, we can make a request like this:  
`https://example.com/images/150x150/pretty_photo.jpg`  

So, if there's not image in this path, it's redirected to lambda and, after a moment, lambda creates the suitable image and then redirects back. We'll obviously have a new image next time.

*** 
Instead of `WxH` there're some extra available _magic paths_:  
`.../AUTOx150/...`  
`.../150xAUTO/...`  
or  
`.../150x150_max/...`  
`.../150x150_min/...`  

> Note that **s3-resizer** **does not enlarge an image** if the original image width or height are less than the requested dimensions. You can read about **[withoutEnlargement](https://sharp.pixelplumbing.com/en/stable/api-resize/#parameters)** method.


## Setting up

#### To resize images we need a storage, which is _S3_ (but could be CloudFront), and _Lambda_ function. Then we should set up all the permissions and redirection rules.

* Create a **Bucket**  
* * Go to [Services -> Storage -> S3](https://s3.console.aws.amazon.com/s3/home)
* * Click on the blue button **Create bucket**
* * Enter the name and click on **Create**

* Create a **Lambda**
* * Go to [Services -> Compute -> Lambda](https://console.aws.amazon.com/lambda/home)
* * **Create a function -> Author from scratch**
* * Enter a name (e.g. s3-resizer)
* * Select the latest version of Node.js according to [Releases](https://github.com/sagidM/s3-resizer/releases) (you can change it later)
* * You need a role that has permission to **put** objects to your storage (aka policy). If you click on **Create function**, a default role will be created. You can edit it later or you can create and set up a role right now. To do that,
* * There should be a link to [IAM console](https://console.aws.amazon.com/iam/home#/roles), go to there.
* * * then **Create role -> Lambda -> Next: Permissions -> Create policy**, a new tab should open
* * * on that tab, you can use **Visual Editor** or add this JSON
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::__BUCKET_NAME__/*"
    }
  ]
}
```
> Pay attention to `__BUCKET_NAME__`

* * * Name your policy, for example: *"access_to_putObject_policy"* and click on **Create policy**; you can close the tab

* * * On the previous tab, update the policy list clicking on the button with reload image or reloading the page.
* * * Select your policy clicking on the checkbox
* * * Click on **Next: tags -> Next: Review**, name your role, for example, *"access_to_putObject_role"*
* * * Click on **Create role**; you can close the tab.

* * Now you are again on the lambda creating page.
* * Select **Use an existing role** and choose your role in the list, update the list if necessary.
* * After clicking on **Create function**, the lambda should be created.

* Add a trigger, which will listen to http requests
* * **YOUR_LAMBDA -> Add trigger -> API Gateway**
* * You can select api that has prefix **-API** or **Create a new API**
* * In **Security**, select **Open**, then click **Add**
* * Now if you click on **API Gateway**, you should see **API endpoint**, something like  
`https://some-id.execute-api.eu-central-1.amazonaws.com/your-stage/your-lambdas-name`

* Set up Static website hosting
* * Having an API endpoint, go to your bucket created at the beginning and add permissions
* * * **YOUR_BUCKET -> Permissions -> Block public access -> Edit**, uncheck **Block all public access**, **Save -> Confirm**
* * * **YOUR_BUCKET -> Permissions -> Bucket policy** and paste
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AddPerm",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::__BUCKET_NAME__/*"
        }
    ]
}
```
> Pay attention to `__BUCKET_NAME__`. By the way, you are able to give an access not only to the whole bucket but also to a specific directory providing its path instead of __*__.
* * Go to **Properties (next to Permissions) -> Static website hosting -> Select "Use this bucket to host a website"**
* * In **Index document** paste any file, it'd be logical to name it _"index.html"_
* * Paste this **Redirection rules**
```xml
<RoutingRules>
  <RoutingRule>
    <Condition>
      <KeyPrefixEquals/>
      <HttpErrorCodeReturnedEquals>404</HttpErrorCodeReturnedEquals>
    </Condition>
    <Redirect>
      <Protocol>https</Protocol>
      <HostName>__DOMAIN__</HostName>
      <ReplaceKeyPrefixWith>__PATH_TO_LAMBDA__?path=</ReplaceKeyPrefixWith>
      <HttpRedirectCode>307</HttpRedirectCode>
    </Redirect>
  </RoutingRule>
</RoutingRules>
```
> Pay attention to `__DOMAIN__` and `__PATH_TO_LAMBDA__` (protocol is always _https_)  
> This is your **API endpoint**. For example, if the url is `https://some-id.execute-api.us-east-1.amazonaws.com/your-stage/your-lambdas-name`, the correct xml nodes shall look like  
```xml
<HostName>some-id.execute-api.us-east-1.amazonaws.com</HostName>
<ReplaceKeyPrefixWith>your-stage/your-lambdas-name?path=</ReplaceKeyPrefixWith>
```
* * At this state, before clicking on **Save**, copy your **Endpoint**. Do not mix it up. This is an endpoint of your Static website hosting, and it is http, not https.

* Add `s3-resizer.zip` and make lambda work
* * Go to your lambda and select Lambda layer (presumably, the API Gateway layer was selected instead)
* * **Function code -> Code entry type -> Upload a .zip file** upload a zip file
* * In **Runtime**, select the latest version of Node.js that you found on [Releases](https://github.com/sagidM/s3-resizer/releases)
* * [You can now click on **Save** to save your time because it takes a while to upload a zip file]
* * Set up the following **Environment variables** _(format: key=value)_  
**BUCKET**=_your bucket's name_  
**URL**=**Endpoint** you copied before (from Static website hosting)  
**WHITELIST**=your list (space-separated) of allowed size options (e.g. AUTOx150 300x200 100x100_max). This parameter is optional, if not provided, the lambda will process everything  
* * In **Basic settings**
* * * Allocate 768mb memory
* * * Timeout could be 5 seconds
> It's mooore than enough. But you shouldn't care of limits because images cache, which means the lambda is called only for the first time. For example, [large png 29mb image](http://www.berthiaumeescalier.com/images/contenu/file/Big__Small_Pumkins.png) converts to _150x150_ in 1.8s with 1024mb memory allocated, 2.3 with 768, 3.5 with 512mb, and ~7s with 256 on Node.js 12.13. _(I guess these such different results is because of [GC](https://en.wikipedia.org/wiki/Garbage_collection_(computer_science)))_. For normal images, results are nearly the same _(400-700 mls)_.
* * **Save** it. You are done!

***

* Test your lambda (optional)
* * Upload an image to your bucket and copy the full path to it. Check whether the image shows in your browser entering **"ENDPOINT/FULL_PATH"**
> Attention. **Endpoint**  is your Static website hosting (http). If you added the image to the root of your bucket, than **FULL_PATH** should be just a name of the image.
* * Go to lambda, click on **Test**, and paste this json:
```json
{
  "queryStringParameters": {"path": __YOUR_IMAGE_PATH_WITH_SIZE_PREFIX__}
}
```
> `__YOUR_IMAGE_PATH_WITH_SIZE_PREFIX__` - for example: `150x150/pretty_image.jpg`

* * Go back to the bucket, a new directory _150x150_ must be created


## How to use HTTPS
The Amazon S3 website endpoints do not support HTTPS  
https://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html  
As a workaround, you have to use your own domain.  
Please check out https://github.com/sagidM/s3-resizer/issues/7  
