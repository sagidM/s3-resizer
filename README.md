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

s3-resizer can be easily bootstrapped using [Terraform](https://www.terraform.io/). If you would rather do it manually, you can take a look at the [old setup instructions](https://github.com/sagidM/s3-resizer/blob/75449094dea01c880d8bf253add2ca4326b9b1c8/README.md).

### Prerequisites

* The [Terraform CLI](https://www.terraform.io/downloads.html) installed in your system, version `v0.12.25` or above.
* The latest `s3-resizer` release for `nodejs_12.13.0`. You can grab it from [here](https://github.com/sagidM/s3-resizer/releases).
* An [Amazon S3](https://aws.amazon.com/s3/) bucket where the source images will be stored. This bucket does not necessarily have to be public.

    *Note: the Terraform plan does not create this bucket to facilitate integration with existing infrastructure.*

* An [AWS IAM](https://aws.amazon.com/iam/) user with administrator permissions and programmatic access. This user is temporary and should be deleted after the infrastructure creation finishes.

* Optionally, if you want to host the service in a custom subdomain, you will need to provision an [AWS Certificate Manager](https://aws.amazon.com/certificate-manager/) certificate for your subdomain. If you don't specify a domain, the default CloudFront endpoint will be used.

    *Note: the Terraform plan does not create either the certificate, nor the validation DNS entries in your behalf. This is also to facilitate integration with existing infrastructure. For example, you may not want or be able to host your DNS on [Amazon Route 53](https://aws.amazon.com/route53/).*

### Overview

The Terraform plan will create:

* The [AWS Lambda](https://aws.amazon.com/lambda/) function containing the `s3-resizer` code.
* An [API Gateway](https://aws.amazon.com/api-gateway/) API to interface with the function.
* An [Amazon S3](https://aws.amazon.com/s3/) bucket where the image outputs will be stored.

    *Note: this is a **different** bucket than the source bucket that **you must create manually**.*
* An [Amazon CloudFront](https://aws.amazon.com/cloudfront/) distribution that will cache the images from the S3 bucket and distribute them to the internet.
* All the necessary policies, roles and permissions to make everything work together.

### Bootstrapping instructions

1. Clone this repository:

    ```
    git clone https://github.com/sagidM/s3-resizer.git
    ```
   
2. Navigate to the `infra` directory:

    ```
    cd s3-resizer/infra
    ```
   
3. Place the `s3-resizer` code that you downloaded from the releases page inside the `infra` directory. It must be named exactly `s3-resizer_nodejs_12.13.0.zip`.

4. Run:

   ```
   terraform init
   ```
   
5. Add the AWS credentials to the environment:

    ```
    export AWS_ACCESS_KEY_ID="XXXXXXXXXXXXXXXXXXXX"
    export AWS_SECRET_ACCESS_KEY="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"   
    ```

6. Run the Terraform plan:

    ```
    terraform plan -out tfplan \
        -var 'source_bucket=my-source-s3-bucket-name' \
        -var 'service_domain_name=img.example.com' \
        -var 'size_whitelist=AUTOx150 300x200 100x100_max'
    ```
   
   * In `source_bucket`, pass the name of the source bucket that you created.
   * If you wish to use a custom domain, pass it in `service_domain_name`. If you want to use the default cloudfront generated domain, remove this line.
   * In `size_whitelist`, define your whitelisted sizes. If you wish to allow any size, remove this line.
   
   *Note: you may change these values at any time by running the `plan` command again and applying the changes.*
   
7. Review the Terraform plan. You should see something like this:

    ```
    Plan: 13 to add, 0 to change, 0 to destroy.
    
    ------------------------------------------------------------------------
    
    This plan was saved to: tfplan
    
    To perform exactly these actions, run the following command to apply:
        terraform apply "plan"
    ```
   
8. Apply the Terraform plan:

    ```
    terraform apply tfplan && rm tfplan
    ```

    It will take a while. Afterwards, you should see something like this:

    ```
    Apply complete! Resources: 13 added, 0 changed, 0 destroyed.
    
    Outputs:
    
    cloudfront_endpoint = d37qm260myncmt.cloudfront.net
    ```

9. If you used a custom domain, you will need to set up the ALIAS or CNAME record. If you use [Amazon Route 53](https://aws.amazon.com/route53/), [this document explains how to do it](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-cloudfront-distribution.html#routing-to-cloudfront-distribution-config).

    If you use a DNS provider other than Route 53, you will need to set up a CNAME record pointing to the generated CloudFront endpoint:
    
    ```
    img.example.com. CNAME d37qm260myncmt.cloudfront.net
    ```
   
10. A `terraform.tfstate` file will be created inside the `infra` directory. Keep this file somewhere safe, as it will allow to easily make modifications to the created infrastructure. For example, if you want to modify the whitelist, or add a custom domain, you will need this file.

    It will also allow you to easily destroy all provisioned resources instead of having to delete them manually. Please keep in mind that in order to destroy the output S3 bucket, you will need to delete all items on it first, else `terraform destroy` will fail.
