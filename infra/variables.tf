variable "source_bucket" {
  description = "The source S3 bucket where the images are stored"
}

variable "service_domain_name" {
  description = "The name of the subdomain where the service will be hosted. (i.e: img.example.com). If no subdomain is specified, the Cloudfront url will be used."
  default     = ""
}

variable "size_whitelist" {
  description = "A list of allowed size options, separated by spaces (e.g. AUTOx150 300x200 100x100_max). If no whitelist is specified, the lambda will process everything."
  default     = ""
}
