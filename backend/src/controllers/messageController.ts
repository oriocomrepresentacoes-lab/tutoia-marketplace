import { Response } from 'express';
import { prisma } from '../utils/db';
import { AuthRequest } from '../middlewares/auth';
import { messaging } from '../utils/firebaseAdmin';
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
        // AND calculate unread counts
        const chatMap = new Map();
        
        for (const msg of conversations) {
            const otherUser = msg.sender_id === user_id ? msg.receiver : msg.sender;
            const chatKey = `${msg.ad_id}_${otherUser.id}`;

            if (!chatMap.has(chatKey) && msg.ad) {
                // Count unread messages RECEIVED by the current user in THIS conversation
                const unreadCount = await prisma.message.count({
                    where: {
                        ad_id: msg.ad.id,
                        receiver_id: user_id,
                        sender_id: otherUser.id,
                        read: false
                    }
                });

                chatMap.set(chatKey, {
                    ad_id: msg.ad.id,
                    ad_title: msg.ad.title,
                    other_user_id: otherUser.id,
                    other_user_name: otherUser.name,
                    last_message: msg.content,
                    unread_count: unreadCount,
                    created_at: msg.created_at
                });
            }
        }

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

export const markAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const { ad_id, other_user_id } = req.body;
        const user_id = req.user?.id;

        if (!user_id) return res.status(401).json({ error: 'Não autorizado' });

        await prisma.message.updateMany({
            where: {
                ad_id,
                receiver_id: user_id,
                sender_id: other_user_id,
                read: false
            },
            data: { read: true }
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao marcar as mensagens como lidas.' });
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
            },
            include: {
                sender: { select: { name: true } },
                ad: { select: { title: true } }
            }
        });

        // Add helper fields for easier notification handling
        const enrichedMessage = {
            ...message,
            sender_name: message.sender?.name,
            ad_title: message.ad?.title
        };

        // Real-time notification via Socket.io
        const io: Server = req.app.get('io');
        if (io) {
            console.log(`[Socket] Emitting new_message to sender user_${sender_id} and receiver user_${receiver_id}`);
            io.to(`user_${receiver_id}`).to(`user_${sender_id}`).emit('new_message', enrichedMessage);
        } else {
            console.warn('[Socket] IO instance not found in req.app');
        }

        // Background Push Notification (FCM) - Smart logic
        // Only send if the recipient is NOT currently focusing on this specific chat
        const onlineUsers: Map<string, Set<string>> = req.app.get('onlineUsers');
        const focusedChats: Map<string, { adId: string, otherId: string }> = req.app.get('focusedChats');
        
        const recipientSocketIds = onlineUsers?.get(receiver_id);
        let isFocused = false;

        console.log(`[Push] Checking push for receiver ${receiver_id}. Online sockets: ${recipientSocketIds?.size || 0}`);

        if (recipientSocketIds) {
            for (const socketId of recipientSocketIds) {
                const focus = focusedChats.get(socketId);
                console.log(`[Push] Socket ${socketId} focus:`, focus);
                // Sender is sender_id, recipient is receiver_id.
                // The recipient is focused if their 'otherId' is the sender.
                if (focus && String(focus.adId) === String(ad_id) && String(focus.otherId) === String(sender_id)) {
                    isFocused = true;
                    console.log(`[Push] User is FOCUSED on this chat. Skipping push.`);
                    break;
                }
            }
        }

        if (!isFocused) {
            const recipientSubscriptions = await prisma.pushSubscription.findMany({
                where: { user_id: receiver_id }
            });
            
            console.log(`[Push] Found ${recipientSubscriptions.length} subscriptions for user ${receiver_id}`);

            if (recipientSubscriptions.length > 0) {
                const tokens = recipientSubscriptions.map(s => s.token);
                const sender = await prisma.user.findUnique({ where: { id: sender_id }, select: { name: true } });
                const ad = await prisma.ad.findUnique({ where: { id: ad_id }, select: { title: true } });

                const fcmMessage = {
                    notification: {
                        title: `💬 Nova mensagem de ${sender?.name || 'Alguém'}`,
                        body: `${content.substring(0, 50)}${content.length > 50 ? '...' : ''}\nRef: ${ad?.title || 'Anúncio'}`
                    },
                    data: {
                        url: `/messages?adId=${ad_id}&otherId=${sender_id}`,
                        type: 'chat_message'
                    },
                    android: {
                        priority: 'high' as any,
                        notification: {
                            sound: 'default',
                        }
                    },
                    apns: {
                        payload: {
                            aps: {
                                'content-available': 1,
                                sound: 'default'
                            }
                        }
                    },
                    webpush: {
                        headers: {
                            Urgency: 'high'
                        },
                        notification: {
                            title: `💬 Nova mensagem de ${sender?.name || 'Alguém'}`,
                            body: `${content.substring(0, 50)}${content.length > 50 ? '...' : ''}\nRef: ${ad?.title || 'Anúncio'}`,
                            icon: '/app-icon-v3.png',
                            badge: '/app-icon-v3.png',
                            tag: `chat_${ad_id}_${sender_id}`
                        },
                        fcm_options: {
                            link: `/messages?adId=${ad_id}&otherId=${sender_id}`
                        }
                    },
                    tokens: tokens
                };

                const response = await messaging.sendEachForMulticast(fcmMessage);

                // Cleanup invalid tokens
                if (response.failureCount > 0) {
                    response.responses.forEach(async (resp: any, idx: number) => {
                        if (!resp.success) {
                            const error = resp.error;
                            if (error?.code === 'messaging/registration-token-not-registered' || 
                                error?.code === 'messaging/invalid-registration-token') {
                                await prisma.pushSubscription.delete({ where: { token: tokens[idx] } }).catch(() => {});
                            }
                        }
                    });
                }
            }
        }

        res.status(201).json(message);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Erro ao enviar a mensagem.' });
    }
};
