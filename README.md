## What is it?

It's AWS Lambda, which is a compute service that lets you run code without provisioning or managing servers.  
> _[Read more about AWS Lambda.](http://docs.aws.amazon.com/lambda/latest/dg/welcome.html)_


## Demo
https://sagidm.github.io/smartuploader/examples/4.s3-resizer.html


## What this lambda provides
Let's say we have some _shared image_ in **S3**, for example:  
`https://example.com/images/pretty_photo.jpg`  

to resize this image to _150x150_, for instance, on fly we can make a request like this:  
`https://example.com/images/150x150/pretty_photo.jpg`  

So, if there's not image in this path, it's redirected to lambda and, after a moment, lambda creates the suitable image and then redirects back. We'll obviously have a new image next time.

*** 
Instead of `WxH` there're some extra available _magic paths_:  
`.../AUTOx150/...`  
`.../150xAUTO/...`  
or  
`.../150x150_max/...`  
`.../150x150_min/...`  

> Note that **s3-resizer** **don't enlarge an image** if the original image width or height are already less than required dimensions. You can read about **[#withoutEnlargement](http://sharp.dimens.io/en/stable/api-resize/#withoutenlargement)** method.


## Setting up

#### To resize images we need a storage, which is _S3_, and _Lambda_ function. Then we should set up redirection rules.

* Create a **Bucket**  
* * Go to [Services -> Storage -> S3](https://s3.console.aws.amazon.com/s3/home)
* * Click on the blue button **Create bucket**
* * Enter the name and click on **Create**

* Create a **Lambda**
* * Go to [Services -> Compute -> Lambda](https://console.aws.amazon.com/lambda/home)
* * Click on the orange button **Create a function**
* * In the next page, click on the similar button **Author from scratch**
* * Add a trigger, which would listen to http requests (you also would be able to do it later)
* * * On the dotted square choose **API Gateway**
* * * You can use default **API name** or create new one
* * * In **Security** select **Open**, then click **Next**
* * In **Configure function** page
* * * Name a new lambda
* * * In **Runtime** select **Node.js 6.10**
* * * Upload a _.zip_ file (download it from [releases](https://github.com/sagidM/s3-resizer/releases))
* * * > You'll also need to set up two **Environment variables**, with _BUCKET_ and _URL_ as keys. But in this time, you don't know about that _URL_. It is **endpoint** which you'll see below.
* * * Choose role which has permission to put any object or create a new one. To do that
* * * * choose **Create a custom role** in role's list. It should open a new page in your browser. On that page
* * * * choose **Create a new IAM Role**
* * * * name you role, for example: *"access_to_putObject"*
* * * * Expand **View Policy Document**, click **Edit**, and write this content:
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

* * * That page should closes after that action. So go on creating a lambda. And take a look at **Advanced settings**
* * * * Allocate 768mb memory
* * * * Timeout could be 5 seconds
> It's mooore than enough. But you shouldn't care of limits because images caches, which means lambda is called only for the first time. For example, [large png 29mb image](http://www.berthiaumeescalier.com/images/contenu/file/Big__Small_Pumkins.png) converts to _150x150_ in 1.9s with 1024mb memory allocated, 3.7 with 512mb, and 7.2s with 256. _(I guess these such different results is because of [GC](https://en.wikipedia.org/wiki/Garbage_collection_(computer_science)))_. For normal images, results are nearly the same _(400-700 mls)_.
* * * Click **Next**, **Create function**. And wait for 20-30 seconds. Lambda is created.

***

* Public access to files in your bucket and relationships between lambda and bucket.
* * Firstly, you need Lambda's _url_
* * * Click the link of **API name** (in case you didn't change it in creating lambda, it should name like **LambdaMicroservice**)
* * * On the new page, look for **Actions** button, select **Deploy API** and choose **prod** in **Deployment stage**. Then click **Deploy**
* * * Expand **prod** in **Stages**, click on **GET** and copy URL that you see
* * Open your created bucket -> Permissions -> Bucket Policy
* * Paste this pease of code there and click **Save**
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
> Pay attention to `__BUCKET_NAME__`. By the way, you're able to open access not to whole bucket but to specific directory specifying it instead of __*__.
* * Go to Properties (near to Permissions) -> Static website hosting -> Select **"Use this bucket to host a website"**
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
> For example, lambda's url is `https://some-id.execute-api.us-east-1.amazonaws.com/prod/your-lambdas-name`, the correct xml nodes must looks like  
```xml
<HostName>some-id.execute-api.us-east-1.amazonaws.com</HostName>
<ReplaceKeyPrefixWith>prod/your-lambdas-name?path=</ReplaceKeyPrefixWith>
```
* * At this state, copy your **Endpoint** and click save
* * Go to your lambda -> **Code** and set up these two **Environment variables** _(format: key=value)_  
**BUCKET**=_your bucket's name_  
**URL**=**Endpoint** you copied before  
* * **Save** it. You've done!

***

* Test your lambda (optional)
* * Upload an image to your bucket and copy link to it. Check if the image shows in your browser
> Attention. That link must be of your **Endpoint** (website hosting). It make by concatinating **"$endpoint_url/$path_to_image/$image_name"**
* * Go to lambda, click on **Test**, and paste this json:
```json
{
  "queryStringParameters": {"path": __YOUR_IMAGE_PATH_WITH_SIZE_PREFIX__}
}
```
> `__YOUR_IMAGE_PATH_WITH_SIZE_PREFIX__` - for example: `150x150/pretty_image.jpg`

* * Go back to the bucket, a new directory _150x150_ must be created


## Some patterns
This is some pattern which you can use in the models:
```ruby
IMAGE_PATH = "#{YOUR_ENDPOINT_URL}/uploads/images/models/"

def images()
  img = self.image_name
  
  return {
    original: "#{IMAGE_PATH}#{img}",
    big: "#{IMAGE_PATH}1000x1000_max/#{img}",
    small: "#{IMAGE_PATH}450x450_max/#{img}",
    thumb: "#{IMAGE_PATH}128x128/#{img}"
  }
end
```
