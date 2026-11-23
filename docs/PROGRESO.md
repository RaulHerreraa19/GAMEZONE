# Progreso de la demo GAME ZONE

Demo: **lunes 23 nov 2026, 7:30 pm**. Última actualización: domingo 22 nov 2026, noche.

## Estado actual

**Terminados: pasos 0 a 5 y 7, más administración de estaciones (sin commit todavía).**
**Siguiente: paso 6 (pantalla de TV `/estacion/:id`).** El socket público ya emite `StationUpdated`, `SessionWarning`, `SessionLocked` y `StationsChanged`; usa `socket` de `web/src/lib/socket.ts`. Ojo: `StationDto` ahora trae `outOfService` y el estado `out` ("Fuera de servicio") debe verse en la TV.

| Paso | Qué es | Estado | Commit |
|---|---|---|---|
| 0 | Repo git, prototipo en `docs/`, logos extraídos | ✅ | `a544e79`, `01da344` |
| 1 | Backend: Prisma, seed, `GET /stations` | ✅ | `aa80807` |
| 2 | Tablero React igual al prototipo | ✅ | `1e41530` |
| 3 | Login usuario + contraseña, roles Admin/Recepción, pantalla Usuarios | ✅ | `6775893` |
| 4 | Iniciar, extender, finalizar y cancelar (pago + bitácora en la misma transacción) | ✅ | — |
| 5 | Ticker de aviso/bloqueo en el servidor + Socket.IO | ✅ | — |
| 6 | Pantalla de TV `/estacion/:id` con semáforo LED, en tiempo real | ⏭️ **siguiente** | — |
| 7 | Bitácora con buscador + corte de caja del turno | ✅ | — |

> Cambio de alcance pedido el 22 nov: login por **usuario + contraseña** (ya no PIN), roles **Admin y Recepción** (sin Encargado), y solo el admin registra usuarios. CLAUDE.md ya está actualizado. Por eso los pasos se recorrieron uno.

## Cómo arrancar

```bash
cd server && npm install && npm run dev        # API en :3000
cd web && npm install && npm run dev -- --host # panel en :5173 (proxy a /api y /socket.io)
```

- Usuario de ejemplo del seed: `admin` / `admin123`.
- En tu base local también quedaron usuarios de prueba (`daniela` / `dani123`, `carlos` / `carlos1`). Para dejarla limpia: `cd server && npx prisma migrate reset` (borra la base local y vuelve a correr el seed).
- Si `prisma/dev.db` aparece como "ocupado" en Windows, detén el servidor (`npm run dev`) antes de migrar.

## Lo que ya existe

**Server** (`/server`)
- `prisma/schema.prisma`: Station, Employee (username, role, passwordHash, active), PlaySession, Payment, AuditLog, Shift, Setting. Los enums son `String` validados con Zod.
- `src/types.ts`: DTO compartidos con el web + `priceCents()`, `warnMinutesFor()` y `stationState()`.
- `src/lib/auth.ts`: JWT, `requireAuth` (recarga al empleado; los desactivados quedan fuera al instante) y `requireAdmin`.
- `src/services/`: `stations.ts` (`listStations`, `getStation(id, tx)`), `employees.ts` (alta/edición/contraseña y `findAdminByPassword` **para autorizar cancelaciones**), `auth.ts` (login con bloqueo tras 5 intentos), `audit.ts` (`appendAudit(tx, …)`, solo inserción), `settings.ts`.
- Rutas: `GET /api/settings`, `GET /api/stations`, `GET /api/stations/:id`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, y `/api/employees` (solo Admin).

**Web** (`/web`)
- `styles.css` y `components/sceneMarkup.ts` se generaron del prototipo (las breakpoints siguen CLAUDE.md: 1100 px).
- `StationScene` (la sala 3D; cambia de estado solo con clases CSS), `StationCard`, `Kpis`, `Sidebar` (pestaña Usuarios solo para Admin), `Modal` + `Chips`, `Toasts` (reciben JSX, sin innerHTML).
- `hooks/`: `useAuth` (token en sessionStorage), `useStations` (solo REST por ahora; tiene `applyStation(dto)`), `useNow` (hora corregida con la del servidor).
- `pages/`: `Login`, `Dashboard`, `UsersPage`. Bitácora y Corte muestran "Disponible en un paso siguiente".
- El botón **TV** abre `/estacion/:id`, que por ahora solo muestra un texto (ver `main.tsx`).

## Paso 4: qué falta hacer (diseño ya decidido)

**Server**
1. `src/realtime/io.ts`: funciones `publishStation(dto)`, `publishAudit(entry)` y `publishShiftChanged()` que no hacen nada mientras no haya Socket.IO (en el paso 5 solo se conecta el `Server`). Los servicios las llaman **después** de confirmar la transacción.
2. `src/services/shift.ts`:
   - `getOrOpenShift(tx, employeeId)`: busca el turno con `closedUtc` nulo o crea uno.
   - `getCurrentSummary()`: total, `lastHourCents`, `chargeCount`, conteos (sesiones, extensiones, cancelaciones), `byMethod` (las 3 formas de pago), `byConsole` (3 tipos), `minutesByStation` (las 8; las devoluciones restan minutos) y `payments[]` para la gráfica escalonada.
3. `src/services/sessions.ts`, todo dentro de `prisma.$transaction`:
   - **iniciar** `{players 1–2, minutes ∈ paquetes, method}`: 409 si la estación ya tiene una sesión con `endedAt` nulo. Crea PlaySession + Payment(Session) + audit "Inicio de sesión" `"2 jugadores · 60 min · Efectivo"`.
   - **extender** `{minutes ∈ extensiones, method}`: si estaba bloqueada (`lockedAt` o `endUtc <= now`), `endUtc = now + m` y se limpian `lockedAt` y `warnedAt`; si no, `endUtc += m` y se limpia `warnedAt`. Suma a `paidMinutes`, crea Payment(Extension) y audit "Extensión" `"+30 min · Tarjeta · desbloqueo"`.
   - **finalizar**: `endedAt = now`, `endReason` Completed o EndedEarly; audit "Sesión finalizada" ("Tiempo cumplido" / "Antes de tiempo").
   - **cancelar** `{reason, adminPassword?}`: motivo obligatorio; si quien cancela no es Admin, valida con `findAdminByPassword` (403 "Contraseña de administrador incorrecta."). Crea un Payment(Refund) **negativo por cada forma de pago original** (los minutos van en el primero), `endReason` Cancelled, y audit "Cancelación" `"<motivo> · autorizó <admin>"` con el importe negativo.
   - Cada función regresa `getStation(id, tx)` ya actualizado.
4. `src/routes/sessions.ts` (con `requireAuth`): `POST /stations/:id/sessions`, `POST /sessions/:id/extend`, `POST /sessions/:id/end`, `POST /sessions/:id/cancel` y `GET /shift/current/summary`.

**Web**
1. `hooks/useSummary.ts`: carga `/shift/current/summary` y expone `reload()`. Pásalo a `Dashboard` en lugar de `summary={null}` y úsalo para la etiqueta de turno del menú.
2. `modals/StartModal`, `ExtendModal`, `EndModal` y `CancelModal`, con los textos exactos del prototipo (`docs/prototipo-caja.html`, funciones `startModal`…`cancelModal`). La cancelación pide "Contraseña de un administrador" solo si el usuario es de Recepción.
3. En `App.tsx`, `onAction` abre el modal correspondiente. Al terminar: `applyStation(dto)`, recargar el resumen y mostrar el toast (por ejemplo "**PS5 2** activa · $100 cobrados.").

**Cómo probar el paso 4:** inicia "Demo 3 min" con 2 jugadores ($5.00), extiende +15 y finaliza. Cancela como Recepción: sin contraseña de admin debe fallar, con ella debe pasar. Revisa en `npx prisma studio` que Payment y AuditLog tengan cada movimiento con el empleado correcto.

## Pasos 5 a 7 (resumen)

- **5. Ticker + Socket.IO:** `setInterval` de 1 s que marca `warnedAt` (1 min antes en sesiones de 10 min o menos, 5 min en las demás) y `lockedAt` al llegar a cero, con `updateMany … where lockedAt null` para no duplicar. Escribe audit "Bloqueo automático" (empleado = Sistema) y emite `StationUpdated`, `SessionWarning`, `SessionLocked`, `AuditAppended`, `ShiftChanged` y `ServerTime` cada 10 s. En el web, `useStations` escucha los eventos y vuelve a hacer `GET /stations` al reconectar; toasts con beep (880 Hz aviso, 440 Hz bloqueo) y badge del menú.
- **6. TV `/estacion/:id`:** página pública con el bezel del prototipo: "Estación disponible" / imagen de juego simulada / "Tiempo terminado – pasa a caja para extender tu tiempo". LED verde en juego, ámbar por terminar, rojo bloqueada, apagado si está libre.
- **7. Bitácora y corte:** `GET /audit?q=` (últimos 300) con buscador y filas nuevas en vivo; Corte con total, por forma de pago, por consola, horas por estación y "Cerrar turno" (`POST /shift/close`, audit "Corte de caja").

**Si no alcanza el tiempo, recortar en este orden:** gráfica de ingresos → cerrar turno → buscador del lado del servidor. **No recortar nunca:** el pago en la misma transacción, el ticker en el servidor, Socket.IO, la TV ni la persistencia al reiniciar.

## Verificación final (definición de terminado)

1. El admin registra un usuario de Recepción y entra con él.
2. Inicia "Demo 3 min" en PS5 2 y abre `/estacion/5` en el celular.
3. A 1:00 llegan el toast y el LED ámbar; en 0:00, el bloqueo y "Tiempo terminado".
4. Extender +15 desbloquea la estación.
5. La bitácora y el corte cuadran con el empleado correcto.
6. Reinicias el servidor y la sesión sigue con su tiempo.

Túnel para la demo: `cloudflared tunnel --url http://localhost:5173` (un solo túnel; Vite hace proxy al API y al WebSocket).

## Notas

- En Chrome, los clics de la automatización de Claude no llegaban a la página (las teclas sí). Las pruebas de UI se hicieron disparando los clics con JavaScript. Vale la pena dar clics a mano.
- Plan completo aprobado: `C:\Users\RAHER\.claude\plans\pasted-content-id-dfd2-lee-completo-vivid-cray.md`.
