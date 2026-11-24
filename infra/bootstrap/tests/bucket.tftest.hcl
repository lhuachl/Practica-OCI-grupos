mock_provider "oci" {}

variables {
  settings = {
    tenancy_ocid     = "tenant", user_ocid = "user", fingerprint = "fingerprint"
    private_key_path = "unused", region = "sa-saopaulo-1", compartment_ocid = "project"
  }
}

override_data {
  target = data.oci_objectstorage_namespace.account
  values = { namespace = "testnamespace" }
}

run "first_deployment" {
  command = plan
  override_data {
    target = data.oci_objectstorage_bucket_summaries.project
    values = { bucket_summaries = [] }
  }
  assert {
    condition     = length(oci_objectstorage_bucket.state) == 1 && oci_objectstorage_bucket.state[0].access_type == "NoPublicAccess"
    error_message = "El primer despliegue debe crear un bucket privado."
  }
}

run "reuse_private_bucket" {
  command = plan
  override_data {
    target = data.oci_objectstorage_bucket_summaries.project
    values = { bucket_summaries = [{ name = "gymturno-tfstate" }] }
  }
  override_data {
    target = data.oci_objectstorage_bucket.existing
    values = { access_type = "NoPublicAccess", storage_tier = "Standard", compartment_id = "project" }
  }
  assert {
    condition     = length(oci_objectstorage_bucket.state) == 0 && length(data.oci_objectstorage_bucket.existing) == 1
    error_message = "Un bucket existente debe reutilizarse."
  }
}

run "reject_public_bucket" {
  command = plan
  override_data {
    target = data.oci_objectstorage_bucket_summaries.project
    values = { bucket_summaries = [{ name = "gymturno-tfstate" }] }
  }
  override_data {
    target = data.oci_objectstorage_bucket.existing
    values = { access_type = "ObjectRead", storage_tier = "Standard", compartment_id = "project" }
  }
  expect_failures = [data.oci_objectstorage_bucket.existing]
}
