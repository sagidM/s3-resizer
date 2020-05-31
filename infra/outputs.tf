output "cloudfront_endpoint" {
  value = aws_cloudfront_distribution.main.domain_name
}
