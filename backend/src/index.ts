import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import apiRoutes from './routes';

dotenv.config();

const app = express();
const server = http.createServer(app);

console.log('--- SYSTEM BOOT (v2.3.0-smart-push-unread) ---'); // Poke Render v4
console.log('Current Time:', new Date().toISOString());
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Socket.io Setup
export const io = new Server(server, {
    cors: {
        origin: '*',
    },
    pingInterval: 20000,
    pingTimeout: 60000,
});

app.set('io', io);

// Track online users: userId -> Set of socket IDs
const onlineUsers = new Map<string, Set<string>>();
// Track active chat focus: socketId -> { adId, otherId }
const focusedChats = new Map<string, { adId: string; otherId: string } | null>();

app.set('onlineUsers', onlineUsers);
app.set('focusedChats', focusedChats);

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    let currentUserId: string | null = null;

    // Diagnostics
    socket.on('ping_test', (data: any) => {
        socket.emit('pong_test', { time: new Date().toISOString(), originalData: data });
    });

    socket.on('join', (userId: any) => {
        const uid = String(userId).trim();
        if (uid && uid !== 'undefined' && uid !== 'null') {
            currentUserId = uid;
            socket.join(`user_${uid}`);

            // Track online status
            if (!onlineUsers.has(uid)) {
                onlineUsers.set(uid, new Set());
            }
            onlineUsers.get(uid)?.add(socket.id);

            // Broadcast that this user is online
            io.emit('user_online', uid);

            console.log(`[Socket] User ${uid} joined. Total sockets for user: ${onlineUsers.get(uid)?.size}`);
        }
    });

    socket.on('get_user_status', (userId: string) => {
        const uid = String(userId).trim();
        const isOnline = onlineUsers.has(uid) && (onlineUsers.get(uid)?.size || 0) > 0;
        socket.emit('user_status_response', { userId: uid, isOnline });
    });

    socket.on('focus_chat', (data: { adId: string; otherId: string }) => {
        focusedChats.set(socket.id, data);
        console.log(`[Socket] Socket ${socket.id} focused on chat ad:${data.adId} with user:${data.otherId}`);
    });

    socket.on('blur_chat', () => {
        focusedChats.delete(socket.id);
        console.log(`[Socket] Socket ${socket.id} blurred chat`);
    });

    socket.on('disconnect', () => {
        if (currentUserId && onlineUsers.has(currentUserId)) {
            const sockets = onlineUsers.get(currentUserId);
            sockets?.delete(socket.id);

            if (sockets?.size === 0) {
                onlineUsers.delete(currentUserId);
                io.emit('user_offline', currentUserId);
                console.log(`[Socket] User ${currentUserId} is now fully offline`);
            }
        }
        focusedChats.delete(socket.id);
        console.log('[Socket] User disconnected:', socket.id);
    });
});

// API Routes
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.send('TutShop API is running!');
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('--- GLOBAL ERROR ---');
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    if (err.name === 'MulterError') {
        console.error('Multer Error Code:', err.code);
        return res.status(400).json({ error: `Erro no upload: ${err.message}`, details: err.code });
    }
    res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT} `);
});
