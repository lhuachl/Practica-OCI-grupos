"""Conserva la clave pública de host por OCID para despliegues posteriores."""
import os
import sys
from pathlib import Path

import oci

mode, directory, instance, address = sys.argv[1:]
folder = Path(directory)
key_file = folder / "known_hosts"
miss = folder / "cache-miss"
miss.unlink(missing_ok=True)
client = oci.object_storage.ObjectStorageClient(oci.config.from_file(str(folder / "oci-config")))
args = (os.environ["OCI_STATE_NAMESPACE"], os.environ["OCI_STATE_BUCKET"], "gymturno/hosts/" + instance)
if mode == "write":
    public_key = key_file.read_text().split(" ", 1)[1].strip()
    client.put_object(*args, public_key.encode(), if_none_match="*")
elif mode == "read":
    try:
        public_key = client.get_object(*args).data.content.decode().strip()
    except oci.exceptions.ServiceError as error:
        if error.status == 404 and error.code == "ObjectNotFound":
            miss.touch()
            sys.exit(1)
        raise
    key_file.write_text(f"{address} {public_key}\n")
else:
    raise ValueError("Operación de caché desconocida")
