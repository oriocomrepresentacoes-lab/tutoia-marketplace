import { Response } from 'express';
import { prisma } from '../utils/db';
import { AuthRequest } from '../middlewares/auth';
import { io } from '../index'; // import Socket server to emit if needed, though usually socket logic is separate

export const getConversations = async (req: AuthRequest, res: Response) => {
    try {
        const user_id = req.user?.id;
        if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

        // Get distinct conversations for the user
        const conversations = await prisma.message.findMany({
            where: {
                OR: [
                    { sender_id: user_id },
                    { receiver_id: user_id }
                ]
            },
            include: {
                sender: { select: { id: true, name: true } },
                receiver: { select: { id: true, name: true } },
                ad: { select: { id: true, title: true } }
            },
            orderBy: { created_at: 'desc' }
        });

        // Deduplicate conversations (unique ad + other user combination)
        const chatMap = new Map();
        conversations.forEach(msg => {
            const otherUser = msg.sender_id === user_id ? msg.receiver : msg.sender;
            const chatKey = `${msg.ad_id}_${otherUser.id}`;

            if (!chatMap.has(chatKey) && msg.ad) {
                chatMap.set(chatKey, {
                    ad_id: msg.ad.id,
                    ad_title: msg.ad.title,
                    other_user_id: otherUser.id,
                    other_user_name: otherUser.name,
                    last_message: msg.content,
                    created_at: msg.created_at
                });
            }
        });

        res.json(Array.from(chatMap.values()));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch conversations.' });
    }
};

export const getConversation = async (req: AuthRequest, res: Response) => {
    try {
        const other_user_id = req.params.other_user_id as string;
        const ad_id = req.params.ad_id as string;
        const user_id = req.user?.id;

        if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

        const messages = await prisma.message.findMany({
            where: {
                ad_id,
                OR: [
                    { sender_id: user_id, receiver_id: other_user_id },
                    { sender_id: other_user_id, receiver_id: user_id }
                ]
            },
            orderBy: { created_at: 'asc' }
        });

        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages.' });
    }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
    try {
        const { receiver_id, ad_id, content } = req.body;
        const sender_id = req.user?.id;

        if (!sender_id) return res.status(401).json({ error: 'Unauthorized' });

        const message = await prisma.message.create({
            data: {
                sender_id,
                receiver_id,
                ad_id,
                content
            }
        });

        // Real-time notification if recipient is connected (we can just emit a global event and let client filter, 
        // or use Socket.io rooms per user)
        io.to(`user_${receiver_id}`).emit('new_message', message);

        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ error: 'Failed to send message.' });
    }
};
