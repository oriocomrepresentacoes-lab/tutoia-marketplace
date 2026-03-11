import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './api';

let socket: Socket | null = null;
let currentToken: string | null = null;

export const getSocket = (token?: string) => {
    // If we have a new token, disconnect the old socket
    if (socket && token && token !== currentToken) {
        console.log('[Socket] Token changed, disconnecting old socket...');
        socket.disconnect();
        socket = null;
    }

    if (!socket && token) {
        console.log('[Socket] Initializing with URL:', SOCKET_URL);
        currentToken = token;
        socket = io(SOCKET_URL, {
            auth: { token },
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
