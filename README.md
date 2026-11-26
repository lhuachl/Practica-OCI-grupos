# GymTurno — Práctica 4.1 Proyecto MVP

GymTurno ayuda a los socios de un gimnasio a planificar su visita: reservan horario, reciben una rutina ajustada al tiempo disponible y un menú según su objetivo, y ven en tiempo casi real qué equipos de la sala están libres. El tablero mensual muestra su progreso.

**Integrantes (2):** _completar nombre 1_ · _completar nombre 2_

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | React 19 + Vite |
| Backend | Node 24 + Express 5 |
| Base de datos | SQLite (volumen persistente en Docker) |
| Proxy / HTTPS | Caddy |
| Contenedores | Dockerfile multi-etapa + `compose.yml` |
| Infraestructura | Terraform (Oracle Cloud) + Ansible |
| CI/CD | GitHub Actions |

## Pipeline

| Rama | Workflow | Qué hace |
| --- | --- | --- |
| `dev` | `.github/workflows/dev-tests.yml` | Cada push ejecuta `npm test` (unitarias, integración y E2E con Cypress). |
| `main` | `.github/workflows/deploy-oci.yml` | Valida Terraform y Ansible, construye y publica la imagen en Docker Hub, crea la VM con Terraform y la configura con Ansible. |

## Requisitos de la práctica

| Requisito | Dónde está |
| --- | --- |
| Tests automáticos en `dev` | `dev-tests.yml` (rama `dev`) |
| Al menos 6 tests unitarios, de integración y E2E | `test/unit` (12), `test/integration` (15), `test/e2e` (21). Detalle en [test/README.md](test/README.md) |
| Docker: Dockerfile y Compose | [Dockerfile](Dockerfile), [compose.yml](compose.yml) |
| Subida a Docker Hub | job `deploy` de `deploy-oci.yml` (`docker/build-push-action`) |
| VM Ubuntu 24.04, VNC, subredes e IP pública con Terraform | [infra/oci](infra/oci) (VCN, subred pública y privada, IP pública) y [infra/ansible/vnc.yml](infra/ansible/vnc.yml) |
| Docker, Git, firewall e iptables con puertos 80 y 443 | [infra/ansible/site.yml](infra/ansible/site.yml) (UFW, iptables y NSG de OCI) |
| Extra: Ansible y dominio con Cloudflare | [infra/ansible/dns.yml](infra/ansible/dns.yml) y Caddy con HTTPS |

La preparación del entorno `production` (secretos, variables y cuenta de OCI) está en [infra/README.md](infra/README.md).

## Ejecutar en local

```bash
npm ci
npm run dev                         # API y sitio en http://localhost:3000
npm test                            # unitarias + integración + E2E
docker build -t gymturno:local . && docker compose up -d --wait
```
