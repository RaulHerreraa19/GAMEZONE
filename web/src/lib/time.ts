// The server is the source of truth for time. We keep the offset between the
// server clock and this device's clock and derive every countdown from it.
const TZ = 'America/Monterrey';
let offsetMs = 0;

export function syncServerTime(serverNowUtc: string) {
  offsetMs = Date.parse(serverNowUtc) - Date.now();
}

export function serverNow(): number {
  return Date.now() + offsetMs;
}

export function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const x = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(x).padStart(2, '0');
}

const hm = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
const hms = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: TZ });
const longDate = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });

export const hhmm = (t: string | number) => hm.format(new Date(t));
export const hhmmss = (t: number) => hms.format(new Date(t));
export const dateLong = (t: number) => longDate.format(new Date(t));

const stampDay = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: TZ });
const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });

/** "14:05" for today, "22 nov 14:05" for earlier days (business time zone). */
export function stamp(t: string | number, nowMs: number): string {
  const d = new Date(t);
  return ymd.format(d) === ymd.format(new Date(nowMs)) ? hm.format(d) : `${stampDay.format(d)} ${hm.format(d)}`;
}

const full = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: TZ });
/** "23/11/2026, 19:30" in the business time zone (tickets). */
export const dateTime = (t: string | number) => full.format(new Date(t));
