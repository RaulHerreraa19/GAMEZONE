// DTOs and pure domain helpers shared with the web app.
// Keep this file free of Node or Prisma imports: the frontend imports it directly.

export const CONSOLE_TYPES = ['Xbox', 'PS5', 'Switch2'] as const;
export type ConsoleType = (typeof CONSOLE_TYPES)[number];

export const ROLES = ['Admin', 'Reception'] as const;
export type Role = (typeof ROLES)[number];

export const PAY_METHODS = ['Cash', 'Card', 'Transfer'] as const;
export type PayMethod = (typeof PAY_METHODS)[number];

export type PaymentKind = 'Session' | 'Extension' | 'Refund' | 'Snack';
export type EndReason = 'Completed' | 'EndedEarly' | 'Cancelled';
export type StationState = 'free' | 'playing' | 'warning' | 'locked' | 'out';

export interface SessionDto {
  id: number;
  players: number;
  paidMinutes: number;
  startUtc: string;
  endUtc: string;
  warnedAt: string | null;
  lockedAt: string | null;
  employeeName: string;
  paidCents: number;
}

export interface StationDto {
  id: number;
  name: string;
  consoleType: ConsoleType;
  order: number;
  active: boolean;
  outOfService: boolean;
  session: SessionDto | null;
}

export interface StationsResponse {
  serverNowUtc: string;
  stations: StationDto[];
}

export interface PackageOption {
  minutes: number;
  label: string;
}

export interface SettingsDto {
  rateCentsPerPersonHour: number;
  packages: PackageOption[];
  extensions: PackageOption[];
  warnMinutes: number;
  warnMinutesShort: number;
  shortThreshold: number;
}

export interface EmployeeDto {
  id: number;
  name: string;
  username: string;
  role: Role;
  active: boolean;
}

export interface AuthResponse {
  token: string;
  employee: EmployeeDto;
}

export interface AuditDto {
  id: number;
  createdUtc: string;
  employeeName: string; // "Sistema" when no employee
  stationId: number | null;
  stationName: string | null;
  action: string;
  detail: string;
  amountCents: number;
}

export interface SummaryRow {
  label: string;
  value: number; // cents, or minutes for hours-per-station
}

export interface ShiftSummaryDto {
  shiftId: number | null;
  openedUtc: string | null;
  openedBy: string | null;
  totalCents: number;
  lastHourCents: number;
  chargeCount: number;
  sessionCount: number;
  extensionCount: number;
  cancelCount: number;
  byMethod: SummaryRow[];
  byConsole: SummaryRow[];
  minutesByStation: SummaryRow[];
  payments: { createdUtc: string; amountCents: number }[];
}

export interface ShiftCloseResponse {
  closedUtc: string;
  totalCents: number;
}

// Socket.IO events (server -> client)
export interface ServerToClientEvents {
  StationUpdated: (station: StationDto) => void;
  SessionWarning: (p: { stationId: number; minutesLeft: number }) => void;
  SessionLocked: (p: { stationId: number }) => void;
  AuditAppended: (entry: AuditDto) => void;
  ShiftChanged: () => void;
  /** A station was added, removed or put in/out of service: clients reload the list. */
  StationsChanged: () => void;
  ServerTime: (p: { nowUtc: string }) => void;
}

export const CONSOLE_LABEL: Record<ConsoleType, string> = { Xbox: 'Xbox', PS5: 'PS5', Switch2: 'Switch 2' };
export const ROLE_LABEL: Record<Role, string> = { Admin: 'Administrador', Reception: 'Recepción' };
export const METHOD_LABEL: Record<PayMethod, string> = { Cash: 'Efectivo', Card: 'Tarjeta', Transfer: 'Transferencia' };

export const MINUTE_MS = 60_000;

/** Longest time that can be sold in one charge (custom time). */
export const MAX_CUSTOM_MINUTES = 480;

/** All money is integer cents: rate × players × minutes / 60. */
export function priceCents(rateCentsPerPersonHour: number, players: number, minutes: number): number {
  return Math.round((rateCentsPerPersonHour * players * minutes) / 60);
}

/** Warning lead time: 1 min for sessions of 10 min or less, otherwise 5 min. */
export function warnMinutesFor(paidMinutes: number, s: Pick<SettingsDto, 'warnMinutes' | 'warnMinutesShort' | 'shortThreshold'>): number {
  return paidMinutes <= s.shortThreshold ? s.warnMinutesShort : s.warnMinutes;
}

export function stationState(
  station: Pick<StationDto, 'outOfService'> & { session: Pick<SessionDto, 'endUtc' | 'lockedAt' | 'paidMinutes'> | null },
  nowMs: number,
  s: Pick<SettingsDto, 'warnMinutes' | 'warnMinutesShort' | 'shortThreshold'>,
): StationState {
  const session = station.session;
  if (!session) return station.outOfService ? 'out' : 'free';
  const left = Date.parse(session.endUtc) - nowMs;
  if (session.lockedAt || left <= 0) return 'locked';
  if (left <= warnMinutesFor(session.paidMinutes, s) * MINUTE_MS) return 'warning';
  return 'playing';
}
