import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './api';

let socket: Socket | null = null;

export const getSocket = (token?: string) => {
    if (!socket && token) {
        socket = io(SOCKET_URL, {
            query: { token },
            transports: ['websocket', 'polling'] // Try websocket first
        });

        socket.on('connect', () => {
            console.log('[Socket] Global connected:', socket?.id);
        });

        socket.on('connect_error', (err) => {
            console.error('[Socket] Connection error:', err.message);
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
