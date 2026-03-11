import { Response } from 'express';
import { prisma } from '../utils/db';
import { AuthRequest } from '../middlewares/auth';
import { sendPushNotification } from '../utils/webPush';
import { Server } from 'socket.io';

export const getConversations = async (req: AuthRequest, res: Response) => {
    try {
        const user_id = req.user?.id;
        if (!user_id) return res.status(401).json({ error: 'Não autorizado' });

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
        res.status(500).json({ error: 'Erro ao buscar as conversas.' });
    }
};

export const getConversation = async (req: AuthRequest, res: Response) => {
    try {
        const other_user_id = req.params.other_user_id as string;
        const ad_id = req.params.ad_id as string;
        const user_id = req.user?.id;

        if (!user_id) return res.status(401).json({ error: 'Não autorizado' });

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
        res.status(500).json({ error: 'Erro ao buscar as mensagens.' });
    }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
    try {
        const { receiver_id, ad_id, content } = req.body;
        const sender_id = req.user?.id;

        if (!sender_id) return res.status(401).json({ error: 'Não autorizado' });

        const message = await prisma.message.create({
            data: {
                sender_id,
                receiver_id,
                ad_id,
                content
            }
        });

        // Real-time notification via Socket.io
        const io: Server = req.app.get('io');
        if (io) {
            console.log(`[Socket] Emitting new_message to sender user_${sender_id} and receiver user_${receiver_id}`);
            io.to(`user_${receiver_id}`).to(`user_${sender_id}`).emit('new_message', message);
        } else {
            console.warn('[Socket] IO instance not found in req.app');
        }

        // Background Push Notification
        const recipientSubscriptions = await prisma.pushSubscription.findMany({
            where: { user_id: receiver_id }
        });

        if (recipientSubscriptions.length > 0) {
            const sender = await prisma.user.findUnique({ where: { id: sender_id }, select: { name: true } });
            const ad = await prisma.ad.findUnique({ where: { id: ad_id }, select: { title: true } });

            const payload = {
                title: `💬 Nova mensagem de ${sender?.name || 'Alguém'}`,
                body: `${content.substring(0, 50)}${content.length > 50 ? '...' : ''}\nRef: ${ad?.title || 'Anúncio'}`,
                icon: '/app-icon-v3.png',
                data: { url: `/messages?adId=${ad_id}&sellerId=${sender_id}` }
            };

            recipientSubscriptions.forEach(async (sub) => {
                const result = await sendPushNotification({
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth }
                }, payload);
                if (result.shouldRemove) {
                    await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => { });
                }
            });
        }

        res.status(201).json(message);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Erro ao enviar a mensagem.' });
    }
};
