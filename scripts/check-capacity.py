"""Comprueba la capacidad de la unidad solicitada en el plan de Terraform."""
import json
import subprocess
import sys


def check_capacity(plan, config_path, tenancy):
    vm = next(item for item in plan["resource_changes"]
              if item["address"] == "oci_core_instance.gym")
    if "create" not in vm["change"]["actions"]:
        print("La VM ya existe. El plan no solicita capacidad nueva.")
        return

    target = vm["change"]["after"]
    shape = target["shape"]
    domain = target["availability_domain"]

    # Las unidades Flex piden también OCPU y memoria; la Micro tiene tamaño fijo.
    request = {"instanceShape": shape}
    if target.get("shape_config"):
        flex = target["shape_config"][0]
        request["instanceShapeConfig"] = {"ocpus": flex["ocpus"], "memoryInGBs": flex["memory_in_gbs"]}

    # La API requiere el compartimento raíz. Omitir faultDomain consulta todo el AD.
    report = subprocess.check_output([
        "oci", "--config-file", config_path, "compute", "compute-capacity-report", "create",
        "--compartment-id", tenancy, "--availability-domain", domain,
        "--shape-availabilities", json.dumps([request]), "--output", "json",
    ], text=True)
    available = False
    for row in json.loads(report)["data"]["shape-availabilities"]:
        if row["instance-shape"] == shape:
            status = row["availability-status"]
            count = row.get("available-count")
            location = row.get("fault-domain") or domain
            print(f"{shape} en {location}: {status}")
            if status == "AVAILABLE" and (count is None or count > 0):
                available = True
    if not available:
        raise SystemExit(f"OCI no confirmó capacidad para {shape}. Reintenta más tarde.")


if __name__ == "__main__":
    try:
        check_capacity(json.load(sys.stdin), *sys.argv[1:])
    except subprocess.CalledProcessError:
        sys.exit("Falló la consulta de capacidad. Revisa el error de OCI y los permisos del usuario del workflow.")
