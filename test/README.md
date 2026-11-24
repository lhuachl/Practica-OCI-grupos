# Pruebas de GymTurno
Instala las dependencias con `npm ci` y el navegador de Cypress con `npx cypress install`.
Ejecuta las tres suites con `npm test` o abre el visor interactivo con `npm run cypress:open`.
En el visor selecciona **E2E Testing** y luego el archivo que deseas ejecutar.

| Archivo | Qué comprueba |
| --- | --- |
| unit/domain.cy.js | Horario de Bolivia, progreso, comidas y planificación por objetivo, duración y disponibilidad. |
| integration/api.cy.js | Registro y cookie, correo duplicado, fecha inválida, privacidad de agendas, cierre de sesión, equipos y asistencia. |
| e2e/gym.cy.js | Registro, reingreso, desayuno con imagen, generación y cancelación de rutinas, calendario y progreso desde la interfaz. |

Los tres niveles usan los datos de [fixtures/gym.json](fixtures/gym.json). El correo recibe un sufijo distinto en cada prueba para que puedas repetir un caso desde el visor. Cypress abre su propio servidor con SQLite en memoria. La sesión de pruebas simula el mediodía en Bolivia para poder registrar entradas a cualquier hora.

En GitHub Actions cada push a `dev` ejecuta los tres grupos. Solo los recorridos de interfaz navegan por las pantallas del gimnasio.
La suite de integración también verifica con SQLite la recuperación de entradas anteriores y el límite de equipos hasta la hora de cierre.
