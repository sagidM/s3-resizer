resource "aws_lambda_function" "main" {
  filename      = "s3-resizer_nodejs_12.13.0.zip"
  function_name = local.lambda_name
  handler       = "index.handler"
  memory_size   = 768
  role          = aws_iam_role.lambda_role.arn
  runtime       = "nodejs12.x"
  timeout       = 15

  environment {
    variables = {
      SOURCE_BUCKET      = data.aws_s3_bucket.source.bucket
      DESTINATION_BUCKET = aws_s3_bucket.main.bucket
      URL                = local.has_custom_domain ? "https://${var.service_domain_name}" : "https://${aws_cloudfront_distribution.main.domain_name}"
      WHITELIST          = var.size_whitelist
    }
  }
}

resource "aws_lambda_permission" "api_gateway" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.main.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
  statement_id  = "AllowAPIGatewayInvoke"
}

resource "aws_iam_role" "lambda_role" {
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role_policy.json
  name               = "${local.resources_name}.labmda_role"
}

resource "aws_iam_policy" "lambda_policy" {
  policy = data.aws_iam_policy_document.lambda_permissions.json
  name   = "${local.resources_name}.lambda_policy"
}

resource "aws_iam_role_policy_attachment" "lambda_policy_attachment" {
  policy_arn = aws_iam_policy.lambda_policy.arn
  role       = aws_iam_role.lambda_role.name
}

data "aws_iam_policy_document" "lambda_assume_role_policy" {
  statement {
    actions = [
      "sts:AssumeRole"
    ]

    principals {
      identifiers = ["lambda.amazonaws.com"]
      type        = "Service"
    }
  }
}

data "aws_iam_policy_document" "lambda_permissions" {
  statement {
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]

    resources = [
      "arn:aws:logs:*:*:*",
    ]
  }

  statement {
    actions = [
      "s3:ListBucket",
    ]

    resources = [
      "arn:aws:s3:::${data.aws_s3_bucket.source.bucket}",
      "arn:aws:s3:::${aws_s3_bucket.main.bucket}",
    ]
  }

  statement {
    actions = [
      "s3:GetObject",
    ]

    resources = [
      "arn:aws:s3:::${data.aws_s3_bucket.source.bucket}/*",
    ]
  }

  statement {
    actions = [
      "s3:PutObject",
    ]

    resources = [
      "arn:aws:s3:::${aws_s3_bucket.main.bucket}/*",
    ]
  }
}
