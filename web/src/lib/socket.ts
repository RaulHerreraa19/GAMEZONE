import { io, type Socket } from 'socket.io-client';
import type { ServerToClientEvents } from '@shared';
import { getToken } from './api';

export type GzSocket = Socket<ServerToClientEvents>;

/** One shared connection. The token (if any) is read on every (re)connect so staff join the private room. */
export const socket: GzSocket = io({ autoConnect: false, auth: (cb) => cb({ token: getToken() ?? '' }) });
