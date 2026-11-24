terraform {
  required_version = ">= 1.14.0"
  required_providers {
    oci = {
      source = "oracle/oci"
    }
  }
}

variable "settings" {
  type = object({
    tenancy_ocid     = string
    user_ocid        = string
    fingerprint      = string
    private_key_path = string
    region           = string
    compartment_ocid = string
  })
}

variable "bucket_name" {
  type    = string
  default = "gymturno-tfstate"
}

variable "expected_namespace" {
  type    = string
  default = ""
}

provider "oci" {
  tenancy_ocid     = var.settings.tenancy_ocid
  user_ocid        = var.settings.user_ocid
  fingerprint      = var.settings.fingerprint
  private_key_path = var.settings.private_key_path
  region           = var.settings.region
}

# Oracle identifica el namespace de la cuenta que firma la solicitud.
data "oci_objectstorage_namespace" "account" {
  lifecycle {
    postcondition {
      condition     = var.expected_namespace == "" || self.namespace == var.expected_namespace
      error_message = "El namespace configurado no coincide con la cuenta de Oracle."
    }
  }
}

data "oci_objectstorage_bucket_summaries" "project" {
  compartment_id = var.settings.compartment_ocid
  namespace      = data.oci_objectstorage_namespace.account.namespace
}

locals {
  exists = contains([for bucket in data.oci_objectstorage_bucket_summaries.project.bucket_summaries : bucket.name], var.bucket_name)
}

# Cada arranque usa un directorio temporal nuevo. OCI conserva el bucket entre ejecuciones.
resource "oci_objectstorage_bucket" "state" {
  count          = local.exists ? 0 : 1
  name           = var.bucket_name
  namespace      = data.oci_objectstorage_namespace.account.namespace
  compartment_id = var.settings.compartment_ocid
  access_type    = "NoPublicAccess"
  storage_tier   = "Standard"

  lifecycle {
    prevent_destroy = true
  }
}

# Comprueba el bucket existente antes de confiarle el estado del proyecto.
data "oci_objectstorage_bucket" "existing" {
  count     = local.exists ? 1 : 0
  name      = var.bucket_name
  namespace = data.oci_objectstorage_namespace.account.namespace

  lifecycle {
    postcondition {
      condition     = self.access_type == "NoPublicAccess" && self.storage_tier == "Standard" && self.compartment_id == var.settings.compartment_ocid
      error_message = "El bucket del proyecto debe ser privado, Standard y estar en el compartimento configurado."
    }
  }
}

output "namespace" {
  value = data.oci_objectstorage_namespace.account.namespace
}
