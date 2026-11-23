# GAME ZONE: sistema de control de tiempo, cobros y bloqueo de consolas

Proyecto freelance de **Vant** (José Raúl Herrera Plascencia) para **GAME ZONE**, un centro de videojuegos en Nuevo León, México.
Toda la interfaz, los mensajes y los textos visibles van en **español de México**. El código, los nombres de variables y los commits van en inglés.

## Contexto del negocio

- 8 estaciones independientes: **3 Xbox, 3 PS5 y 2 Nintendo Switch 2**. Cada consola tiene su propia TV (TCL / Hisense de 55").
- De 1 a 2 jugadores por estación.
- Tarifa inicial: **$50 MXN por persona por hora**, proporcional al tiempo (1 jugador 30 min = $25; 2 jugadores 60 min = $100). Debe ser configurable (por tipo de consola, horario o promoción, en el futuro).
- Paquetes de tiempo: 30, 60, 90 y 120 min, más tiempo libre en minutos. **Para la demo existe el paquete "Demo 3 min".**
- Personal: 4 empleados; dos turnos de lunes a viernes y uno el fin de semana.
- La computadora del POS de la caja será también el servidor local (Windows 11).
- Apertura del local: **martes 1 de diciembre de 2026**.
- Zona horaria del negocio: `America/Monterrey` (UTC-6, sin horario de verano).

## Requerimientos funcionales (los del cliente)

1. Iniciar y finalizar sesiones por estación, individualmente.
2. Ver las 8 estaciones a la vez con el tiempo restante.
3. Alerta 5 minutos antes del vencimiento (1 minuto en sesiones de 10 min o menos).
4. Agregar tiempo (extensiones) cobrándolo.
5. Registrar todas las sesiones, pagos, extensiones, cancelaciones y modificaciones, con el empleado responsable.
6. **Ningún tiempo de juego se activa sin un pago registrado.** Las cortesías y cancelaciones requieren PIN de administrador y motivo obligatorio.
7. Reportes diarios, semanales y mensuales: horas vendidas por estación e ingresos por tipo de consola. Exportar a Excel y PDF (Fase 3).
8. Roles: **Administrador, Encargado y Cajero**, con login por usuario + PIN.
9. Supervisión remota desde celular o PC (Fase 3; en la demo basta con ver el panel en vivo desde otro dispositivo de la red o por un túnel).
10. POS de snacks y bebidas: productos, venta ligada a la cuenta del jugador, ticket y corte de caja por turno (venta básica en Fase 1; inventario en Fase 3).
11. Bloqueo automático de la imagen de la consola al vencer el tiempo, **sin cortar nunca la electricidad** (Fase 2, con hardware).

## Fases y fechas comprometidas

| Fase | Fecha | Alcance |
|---|---|---|
| Demo al cliente | **Lunes 23 nov 2026, 7:30 pm** por videollamada | Ver la sección "Prioridad actual" |
| 1. Apertura | Martes 1 dic 2026 | Panel de 8 estaciones, sesiones, cobros, alertas, extensiones, usuarios y PIN, bitácora, venta básica de snacks, corte por turno |
| 2. Bloqueo | Sáb 12 y dom 13 dic 2026 | Módulos HDMI por estación + agente en Raspberry Pi |
| 3. Completo | Viernes 8 ene 2027 | Inventario, reportes completos, supervisión remota, respaldos a la nube |

## Prioridad actual: la demo del lunes

Construir **solo** lo necesario para la demostración, pero con la arquitectura definitiva (no es código desechable):

- Login con usuario + PIN (datos semilla: `Daniela R.` cajera PIN 1234, `Administrador` PIN 0000).
- Tablero de 8 estaciones con estado, cuenta regresiva, barra de progreso, jugadores, importe y empleado.
- Modal "Iniciar sesión": jugadores 1/2, paquete, forma de pago (Efectivo, Tarjeta, Transferencia), total calculado; "Cobrar e iniciar".
- Alerta de por terminar (toast + sonido) y bloqueo al llegar a cero.
- Extender (+15, +30, +60 min). Si la estación estaba bloqueada, el tiempo cuenta desde ahora y se desbloquea.
- Finalizar sesión y cancelar (motivo obligatorio; PIN de administrador si el usuario es cajero; registra devolución negativa).
- Bitácora con buscador y corte de caja del turno (total, por forma de pago, por tipo de consola, horas por estación).
- **Pantalla de estación** `/estacion/:id` que simula la TV: "Estación disponible" / imagen de juego simulada / "Tiempo terminado – pasa a caja para extender tu tiempo", con el semáforo LED (verde, ámbar, rojo). Se abre en otra ventana o en otro dispositivo y se actualiza en tiempo real.
- **Tiempo real entre dispositivos vía Socket.IO**: si abro el panel en el celular, veo los mismos cambios al instante.

Fuera de alcance para la demo: reportes semanales y mensuales, exportaciones, inventario, respaldos, hardware y agente.

## Referencia visual obligatoria

`docs/prototipo-caja.html` es el prototipo aprobado (HTML/JS autocontenido). **Replica su diseño, textos, flujos y estados**, pero con datos del backend en lugar de localStorage. Ábrelo y léelo antes de crear componentes.

- **Identidad de GAME ZONE:** logo neón morado ("GAME ZONE · Videojuegos • Snacks"). Usa `docs/brand/gz-horizontal.png` en el menú lateral y `docs/brand/gz-circular.png` en celular y en las pantallas de TV; son PNG transparentes recortados de los PDF del cliente.
- Tema oscuro fijo con tinte morado: `--bg #0c0a10`, `--panel #16121d`, `--panel2 #211a2b`, `--line #30273c`, `--ink #f3eef8`, `--mute #a89cb8`.
- Color de marca: `--play #b026ff` (también es el estado "en juego"), texto morado claro `#dcaaff`, degradado de botones principales `#b026ff → #7a00d9` con texto blanco.
- Estados: en juego `#b026ff`, por terminar `#ffb020`, bloqueada `#ff4d5e`.
- Navegación en **menú lateral** (barra superior de pestañas en celular) con animaciones al hover: fondo que entra deslizándose, barra indicadora y el ícono se desplaza. Tarjetas de resumen: Ingresos con gráfica escalonada, Ocupación con anillo de 8 segmentos, Por terminar y Bloqueadas con chips por estación.
- Etiquetas de consola: Xbox `#6cc36c`, PS5 `#5a95ff`, Switch 2 `#ff6b8a`.
- Tipografías: **Chakra Petch** (relojes, nombres, títulos) e **Inter** (texto).
- Cada tarjeta lleva arriba la **sala 3D en SVG** del prototipo: pared, piso en perspectiva, TV con su pantalla según estado, tira LED y luz ambiental del color del estado, mueble con la consola del tipo de estación y 2 sillas gamer; aparece un jugador con audífonos por cada jugador de la sesión. Conviértela en un componente `<StationScene type state players />` reutilizando los `<symbol>` y gradientes del prototipo (definidos una sola vez en la app). Los estados se cambian con clases CSS, sin volver a renderizar el SVG.
- Las consolas son ilustraciones genéricas sin logotipos ni marcas.
- Botones de al menos 44 px; grid de 4 columnas en laptop, 2 por debajo de 1100 px y 1 por debajo de 560 px.

## Stack

- **Backend:** **Node.js** (LTS instalada, 20 o superior) con **TypeScript** estricto, **Express** para la API REST, **Socket.IO** para tiempo real, **Prisma + SQLite** como ORM y base de datos (después migrará a PostgreSQL; no uses nada específico de SQLite), **Zod** para validar las entradas y `bcryptjs` para los PIN. En desarrollo se ejecuta con `tsx watch`. No uses NestJS.
- **Frontend:** React + Vite + TypeScript, cliente `socket.io-client`. Sin librerías de UI pesadas; CSS propio con las variables de arriba.
- **Fase 2 (todavía no):** agente en Python en Raspberry Pi Zero 2 W, comunicación por MQTT (Mosquitto) con el servidor, control de un switch HDMI 2.1 por IR (`ir-ctl`). Diseña el dominio para que un "módulo de estación" pueda suscribirse después a los eventos de su estación.

## Estructura del repositorio

```
/server        Node.js + TypeScript (Express API + Socket.IO + Prisma)
  /src/routes    rutas REST delgadas
  /src/services  lógica de dominio (sesiones, pagos, bitácora, turno)
  /src/realtime  Socket.IO y el ticker de avisos/bloqueos
  /prisma        schema.prisma, migraciones y seed
/web           React + Vite + TS
/agent         (Fase 2, vacío por ahora)
/docs          prototipo-caja.html, cotización y notas
```

## Modelo de dominio

- `Station`: Id, Name ("Xbox 1"), ConsoleType (Xbox | PS5 | Switch2), Order.
- `Employee`: Id, Name, Role (Admin | Manager | Cashier), PinHash.
- `PlaySession`: Id, StationId, Players (1–2), PaidMinutes, StartUtc, EndUtc, WarnedAt?, LockedAt?, EndedAt?, EndReason (Completed | EndedEarly | Cancelled), EmployeeId.
- `Payment`: Id, SessionId?, AmountCents (entero en centavos; negativo en devoluciones), Method (Cash | Card | Transfer), Minutes, Kind (Session | Extension | Refund | Snack), EmployeeId, CreatedUtc.
- `AuditLog`: Id, CreatedUtc, EmployeeId? (null = "Sistema"), StationId?, Action, Detail, Amount. **Solo inserción; nunca se edita ni se borra.**
- `Shift`: Id, EmployeeId, OpenedUtc, ClosedUtc?, Total (para el corte).
- `Setting`: tarifa por persona por hora, minutos de aviso, paquetes.

## Reglas de negocio clave

- **El servidor es la fuente de verdad del tiempo.** Guarda `EndUtc`; el cliente calcula la cuenta regresiva con `EndUtc - serverNow` (corrige el desfase del reloj del cliente con la hora que envía el servidor).
- Un ticker del servidor (`setInterval` de 1 s, arrancado junto con la app) marca `WarnedAt` al cruzar el umbral de aviso y `LockedAt` al llegar a cero. Emite eventos por Socket.IO y escribe en la bitácora (`Bloqueo automático`, empleado = Sistema). Al reiniciar el servidor, el ticker retoma las sesiones desde la base de datos.
- Importe = `tarifa × jugadores × minutos / 60`. **Todo el dinero se maneja en centavos enteros** (`5000` = $50.00); nunca con decimales de punto flotante. Las fechas se guardan en UTC.
- No se puede iniciar una sesión sin un `Payment` en la misma transacción.
- Extender una sesión bloqueada: `EndUtc = now + minutos`, limpia `LockedAt` y `WarnedAt`.
- Extender una sesión activa: `EndUtc += minutos`, limpia `WarnedAt`.
- Cancelar: motivo obligatorio; si el usuario no es Admin, requiere el PIN de un Admin. Genera un `Payment` negativo y libera la estación.
- Cada acción de un empleado escribe en `AuditLog` dentro de la misma transacción.
- Los PIN se guardan con hash (`bcryptjs`), nunca en texto plano. Las operaciones que escriben varias tablas usan `prisma.$transaction`.

## API y tiempo real (propuesta inicial)

REST (`/api`):
- `POST /auth/pin` → token simple (JWT o cookie) con el empleado y su rol.
- `GET /stations` → estaciones con su sesión activa y `serverNowUtc`.
- `POST /stations/{id}/sessions` {players, minutes, method}
- `POST /sessions/{id}/extend` {minutes, method}
- `POST /sessions/{id}/end`
- `POST /sessions/{id}/cancel` {reason, adminPin?}
- `GET /audit?q=` · `GET /shift/current/summary` · `POST /shift/close`

Socket.IO (namespace por defecto), eventos al cliente: `StationUpdated(stationDto)`, `SessionWarning(stationId, minutesLeft)`, `SessionLocked(stationId)`, `AuditAppended(entry)`.

## Convenciones

- Backend TS: `strict: true`, ESM, rutas delgadas que validan con Zod y llaman a servicios; los tipos de DTO se comparten con el frontend en `/server/src/types.ts` (o un paquete `shared` si crece).
- TS: modo estricto, componentes funcionales, un hook `useStations()` que combine la carga REST y los eventos de Socket.IO.
- Formato de dinero con `Intl.NumberFormat('es-MX', {style:'currency', currency:'MXN'})`.
- Horas en pantalla en la zona del negocio.
- Commits pequeños y descriptivos en inglés.

## Comandos

- Backend: `cd server && npm install && npm run dev` (`tsx watch src/index.ts`; escucha en `0.0.0.0` para probar desde el celular).
- Frontend: `cd web && npm install && npm run dev -- --host`.
- Base de datos: `npx prisma migrate dev --name <nombre>` y `npx prisma db seed` (8 estaciones, 2 empleados).
- Túnel para mostrar desde el celular del cliente: `cloudflared tunnel --url http://localhost:<puerto>`.

## Qué no hacer

- No cortar ni simular cortes de energía de consolas, en ningún flujo.
- No guardar el estado de las sesiones solo en el navegador.
- No meter cambios de alcance de fases posteriores mientras la demo no funcione de punta a punta.
- No usar `alert`/`confirm`; todo con modales propios como en el prototipo.
- No inventar datos del cliente; los datos semilla deben verse claramente como ejemplo.

## Definición de terminado (demo)

1. Puedo iniciar sesión con PIN, iniciar el paquete "Demo 3 min" en una estación, ver la alerta y el bloqueo, y extender para desbloquear.
2. La pantalla `/estacion/:id` cambia sola en otra ventana o dispositivo.
3. La bitácora y el corte reflejan todo lo anterior con el empleado correcto.
4. Reinicio el servidor y las sesiones siguen ahí con su tiempo correcto.
