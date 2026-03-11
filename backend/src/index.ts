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

// Trust proxy for Render deployment (Load Balancer)
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

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Diagnostics
    socket.on('ping_test', (data: any) => {
        console.log('[Socket] Ping received from:', socket.id, data);
        socket.emit('pong_test', { time: new Date().toISOString(), originalData: data });
    });

    socket.on('join', (userId: any) => {
        const uid = String(userId).trim();
        if (uid && uid !== 'undefined' && uid !== 'null') {
            socket.join(`user_${uid}`);
            console.log(`[Socket] User ${uid} joined room user_${uid}`);
            const roomSize = io.sockets.adapter.rooms.get(`user_${uid}`)?.size || 0;
            console.log(`[Socket] Current room user_${uid} size: ${roomSize}`);
        } else {
            console.warn('[Socket] Attempted join with invalid userId:', userId);
        }
    });

    socket.on('disconnect', () => {
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

