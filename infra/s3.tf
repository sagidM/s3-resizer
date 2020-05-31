data "aws_s3_bucket" "source" {
  bucket = var.source_bucket
}

resource "aws_s3_bucket" "main" {
  bucket = local.resources_name
  acl    = "private"
  policy = data.aws_iam_policy_document.bucket_policy.json

  website {
    index_document = "index.html"
    error_document = "index.html"

    routing_rules = jsonencode(
      [
        {
          Condition = {
            HttpErrorCodeReturnedEquals = "404"
          }
          Redirect = {
            Protocol = "https"
            HostName = replace(
              aws_apigatewayv2_api.main.api_endpoint,
              "https://",
              ""
            )
            HttpRedirectCode = "307"
          }
        }
      ]
    )
  }
}

data "aws_iam_policy_document" "bucket_policy" {
  statement {
    actions = [
      "s3:GetObject",
    ]

    resources = [
      "arn:aws:s3:::${local.resources_name}/*",
    ]

    condition {
      test     = "StringEquals"
      variable = "aws:UserAgent"
      values   = [local.user_agent]
    }

    principals {
      type        = "*"
      identifiers = ["*"]
    }
  }
}
