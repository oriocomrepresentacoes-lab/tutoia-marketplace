import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './api';

let socket: Socket | null = null;

export const getSocket = (token?: string) => {
    if (!socket && token) {
        console.log('[Socket] Initializing with URL:', SOCKET_URL);
        socket = io(SOCKET_URL, {
            query: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
            console.log('[Socket] Global connected:', socket?.id, 'Transport:', socket?.io.engine.transport.name);
        });

        socket.on('connect_error', (err) => {
            console.error('[Socket] Global connection error:', err.message);
        });
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
