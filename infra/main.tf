terraform {
  required_version = ">= 0.12.25"
}

provider "aws" {
  region  = "us-east-1"
  version = "~> 2.64"
}

provider "random" {
  version = "~> 2.2"
}
