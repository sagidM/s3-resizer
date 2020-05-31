resource "aws_cloudfront_distribution" "main" {
  is_ipv6_enabled = true
  http_version    = "http2"

  origin {
    origin_id   = "origin-${local.resources_name}"
    domain_name = aws_s3_bucket.main.website_endpoint

    custom_origin_config {
      origin_protocol_policy = "http-only"
      http_port              = "80"
      https_port             = "443"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    custom_header {
      name  = "User-Agent"
      value = local.user_agent
    }
  }

  enabled             = true
  default_root_object = "index.html"

  aliases = local.has_custom_domain ? [var.service_domain_name] : []

  default_cache_behavior {
    target_origin_id = "origin-${local.resources_name}"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    compress         = true

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"

    // The default ttl is 0 because we don't want CloudFront the S3 -> Api
    // Gateway redirect. To keep images cached, we specify a custom "max-age"
    // value when storing the resized image in S3. CloudFront will respect that
    // value.
    default_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn            = local.has_custom_domain ? data.aws_acm_certificate.cert[0].arn : null
    cloudfront_default_certificate = ! local.has_custom_domain
    minimum_protocol_version       = "TLSv1"
    ssl_support_method             = "sni-only"
  }
}
