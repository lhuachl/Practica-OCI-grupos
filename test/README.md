# Pruebas de GymTurno

Desde la carpeta del proyecto, ejecuta `npm ci` y `npx cypress install` en la primera instalación. Para abrir el visor ejecuta `npm run cypress:open`, selecciona **E2E Testing** y elige **Chrome**. Los archivos de `test/e2e` abren las pantallas reales.

| Funcionalidad | Archivo en el visor | Comportamientos principales |
| --- | --- | --- |
| Registro y acceso | e2e/access.cy.js, e2e/gym.cy.js | Campos obligatorios, correo duplicado, corrección de contraseña, sesión persistente y cierre |
| Agenda y rutina | e2e/planning.cy.js, e2e/gym.cy.js | Crear, actualizar, cancelar, recuperar por fecha, mostrar las fotos y respetar el tiempo disponible |
| Alimentación | e2e/planning.cy.js | Cuatro comidas y fotografía de desayuno para cada uno de los cinco objetivos |
| Sala y equipos | e2e/room.cy.js | Entrar, usar, cambiar y liberar equipos, ver el cierre y actualizar la capacidad cuando otro socio llega o sale |
| Tablero mensual | e2e/room.cy.js, e2e/gym.cy.js | Meses anteriores, febrero bisiesto, progreso y varios ingresos en un día |
| Pantalla móvil | e2e/room.cy.js | Acceso a las secciones principales, logotipo, ancho de pantalla y cierre de sesión |
| API y SQLite | integration/api.cy.js, integration/behavior.cy.js | Autenticación, reservas de dos socios, disponibilidad actual y futura, persistencia, historial, entradas inválidas y capacidad |
| Reglas del gimnasio | unit/domain.cy.js, unit/planning.cy.js | Horario, progreso, menús, continuidad de los bloques, visitas de un minuto y límite de entrenamiento |

**Ejecución.** `npm test` compila y ejecuta todas las suites. Para ejecutar un nivel, usa `npm run test:unit`, `npm run test:integration` o `npm run test:e2e`. Cada push a `dev` ejecuta el conjunto completo en GitHub Actions.

**Datos.** [gym.json](fixtures/gym.json) contiene el socio de ejemplo, objetivos, asistencia y planificación básica. [functional.json](fixtures/functional.json) añade horarios límite, cambios de agenda, credenciales inválidas y desayunos esperados. Cada cuenta recibe un correo único y el servidor usa SQLite en memoria.

**Reloj.** El servidor de pruebas simula el mediodía en Bolivia. La prueba visual del gimnasio cerrado controla la respuesta de la sala. Una prueba adicional de integración verifica el comportamiento real del servidor al cerrar. Para comprobar la actualización entre socios se adelanta el temporizador de consulta de la pantalla y se conserva la API real.
