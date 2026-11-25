# Despliegue de GymTurno en Oracle Cloud

Cada push a `dev` ejecuta únicamente las pruebas de Cypress. El workflow de `main` valida la infraestructura antes de publicar la imagen y desplegar. Un push a `main` crea producción la primera vez y la actualiza en despliegues posteriores. En **Actions → Despliegue de GymTurno en OCI → Run workflow**, sobre `main`, cada ejecución manual nueva crea una VM de demostración independiente. Para retomar una demostración existente indica su número de ejecución (el ID de la URL de Actions) en `resume_run_id`. Un reintento del mismo run conserva el mismo estado.

## Preparar el entorno production

1. En OCI, elige un compartimento, una región, un dominio de disponibilidad y una imagen **Ubuntu 24.04** compatible con la forma solicitada. Verifica la cuota de Compute. Cada demostración consume capacidad y puede generar cargos. Terraform descubre el namespace y crea el bucket privado Standard `gymturno-tfstate` en ese compartimento antes de iniciar el estado remoto. En ejecuciones posteriores verifica el bucket existente. La identidad del workflow necesita permiso para consultar el namespace y listar, leer y crear buckets. El usuario de la API necesita acceso a objetos y bloqueo de estado, red, instancias, volúmenes y captura/lectura/eliminación de historial de consola.
2. En Docker Hub, prepara un repositorio público llamado **gymturno** y un token con permiso de escritura.
3. En este repositorio, abre **Settings → Environments → New environment**, crea **production** y permite despliegues desde **main**. Configura estos nombres en ese entorno.

| Variables | Valor |
| --- | --- |
| DOCKERHUB_USERNAME | Usuario propietario del repositorio gymturno |
| OCI_STATE_BUCKET, OCI_STATE_NAMESPACE | Opcionales. Permiten conservar un nombre de bucket existente y verificar el namespace esperado |
| GYM_VM_SSH_PUBLIC_KEY | Línea completa de la clave SSH pública de tu PC |
| SITE_DOMAIN, CLOUDFLARE_ZONE_ID | Opcionales. Subdominio exclusivo para GymTurno y zona Cloudflare |

| Secretos | Valor |
| --- | --- |
| DOCKERHUB_TOKEN | Token de escritura del usuario de Docker Hub |
| OCI_API_PRIVATE_KEY | Contenido PEM de la clave de firma registrada en OCI |
| GYM_DEPLOY_SSH_KEY | Clave OpenSSH privada de despliegue sin frase de paso. El workflow deriva su clave pública para Ubuntu |
| VNC_PASSWORD | Contraseña de VNC de 6 a 8 caracteres ASCII imprimibles, sin espacios |
| OCI_TFVARS_JSON | JSON con las variables que aparecen abajo |
| CLOUDFLARE_API_TOKEN | Solo con dominio propio. Token con permiso de edición DNS para la zona indicada |

Ejemplo de estructura para `OCI_TFVARS_JSON`. Sustituye los marcadores con los valores de tu cuenta.

```json
{
  "tenancy_ocid": "<OCID de la tenencia>",
  "user_ocid": "<OCID del usuario>",
  "fingerprint": "<huella de la clave API>",
  "region": "sa-saopaulo-1",
  "compartment_ocid": "<OCID del compartimento>",
  "availability_domain": "<nombre completo del AD>",
  "ubuntu_2404_image_ocid": "<OCID regional de Ubuntu 24.04>",
  "shape": "VM.Standard.E2.1.Micro",
  "admin_cidr": "<IPv4 pública del administrador>/32"
}
```

El despliegue solicita la unidad AMD `VM.Standard.E2.1.Micro` con una imagen Ubuntu 24.04 x86 y deja que OCI elija el dominio de errores. Si OCI informa falta de capacidad después de crear la red, inicia el workflow actualizado desde `main` e indica el ID de la demostración original en `resume_run_id` para reutilizar su estado. La VCN predeterminada usa 10.41.0.0/16, subred pública 10.41.1.0/24 y privada 10.41.2.0/24. Terraform guarda el estado de producción en `gymturno/production.tfstate` y las demostraciones en `gymturno/manual/<run-id>.tfstate`. El directorio `gymturno/hosts/` conserva la identidad SSH pública verificada de cada VM.

## Qué ocurre durante el despliegue

Terraform planifica los cambios. GitHub publica una imagen para AMD64 y ARM64, aplica el plan y abre SSH temporalmente a la IPv4 del runner. Ansible prepara Docker, Git, UFW, iptables y TigerVNC. Compose inicia la aplicación por digest y conserva SQLite en un volumen del host. Los datos sobreviven al reemplazo de contenedores. Una VM nueva inicia con su propio volumen.

Con dominio propio, Ansible registra la IP de producción en Cloudflare y Caddy atiende HTTPS. Sin dominio, el contenedor cloudflared genera una URL HTTPS temporal, que puede cambiar al reiniciarse. Las demostraciones siempre usan esa URL temporal. Abre el enlace del **resumen de Actions** después de que el workflow confirme `/api/health`.

Para VNC, abre en PowerShell `ssh -N -L 5901:127.0.0.1:5901 -i "$env:USERPROFILE\.ssh\gym-oci" ubuntu@IP_PUBLICA` y conecta TigerVNC Viewer a `127.0.0.1::5901`. SSH debe salir desde la IP indicada en `admin_cidr`. HTTP/HTTPS se publican en 80 y 443; el escritorio VNC escucha en loopback.
