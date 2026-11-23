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
