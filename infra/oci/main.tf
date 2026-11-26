resource "oci_core_instance" "gym" {
  compartment_id      = var.compartment_ocid
  display_name        = var.deployment_id == null ? "gymturno-web" : "gymturno-web-${var.deployment_id}"
  availability_domain = var.availability_domain
  shape               = var.shape

  # Las unidades Flex necesitan OCPU y memoria. La Micro tiene tamaño fijo.
  dynamic "shape_config" {
    for_each = endswith(var.shape, "Flex") ? [1] : []
    content {
      ocpus         = var.ocpus
      memory_in_gbs = var.memory_in_gbs
    }
  }

  # OCI elige el dominio de errores disponible al crear la VM.
  source_details {
    source_type = "image"
    source_id   = var.ubuntu_2404_image_ocid
  }

  # Conecta la VM a la subred pública y solicita una IPv4 para acceder desde Internet.
  create_vnic_details {
    subnet_id        = local.subnet_id
    nsg_ids          = [oci_core_network_security_group.web.id]
    assign_public_ip = true
    display_name     = "gymturno-web-vnic"
    hostname_label   = local.create_network ? "gymturno-web" : null
  }

  # OCI instala la clave pública SSH cuando inicia Ubuntu.
  metadata = {
    ssh_authorized_keys = join("\n", compact([
      trimspace(file(pathexpand(var.ssh_public_key_path))),
      var.deploy_ssh_public_key,
    ]))
    # Publica únicamente la clave pública del servidor en su consola serial de OCI.
    user_data = base64encode("#cloud-config\n${yamlencode({
      runcmd = [["sh", "-c", "{ printf 'GYM_OCI_HOST_KEY '; cat /etc/ssh/ssh_host_ed25519_key.pub; } > /dev/ttyS0"]]
    })}")
  }

  lifecycle {
    precondition {
      condition     = local.create_network ? true : !data.oci_core_subnet.existing[0].prohibit_public_ip_on_vnic
      error_message = "La subred existente debe permitir direcciones IP públicas."
    }
  }
}
