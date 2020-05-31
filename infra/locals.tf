resource "random_id" "bucket" {
  byte_length = 8
}

resource "random_password" "secret" {
  length = 8
}

locals {
  resources_name    = "s3-resizer.${random_id.bucket.hex}"
  lambda_name       = "s3-resizer_${random_id.bucket.hex}"
  user_agent        = base64sha512(random_password.secret.result)
  has_custom_domain = var.service_domain_name != ""
}
