data "aws_acm_certificate" "cert" {
  domain = var.service_domain_name
  count  = local.has_custom_domain ? 1 : 0
}
