import type { Server } from 'socket.io';
import type { AuditDto, ServerToClientEvents, StationDto } from '../types.js';

export type GzServer = Server<Record<string, never>, ServerToClientEvents>;

/** Signed-in staff sockets join this room; audit and money events go only to them. */
export const STAFF_ROOM = 'staff';

let io: GzServer | null = null;

export function setIo(server: GzServer) {
  io = server;
}

// Services call these AFTER their transaction commits, so clients never see rolled-back data.
// Station state is public (the TV screens listen to it); audit and money data is staff-only.
export function publishStation(dto: StationDto) {
  io?.emit('StationUpdated', dto);
}
export function publishWarning(stationId: number, minutesLeft: number) {
  io?.emit('SessionWarning', { stationId, minutesLeft });
}
export function publishLocked(stationId: number) {
  io?.emit('SessionLocked', { stationId });
}
export function publishStationsChanged() {
  io?.emit('StationsChanged');
}
export function publishProductsChanged() {
  io?.to(STAFF_ROOM).emit('ProductsChanged');
}
export function publishServerTime() {
  io?.emit('ServerTime', { nowUtc: new Date().toISOString() });
}
export function publishAudit(entry: AuditDto) {
  io?.to(STAFF_ROOM).emit('AuditAppended', entry);
}
export function publishShiftChanged() {
  io?.to(STAFF_ROOM).emit('ShiftChanged');
}
