import { Response } from 'express';
import { prisma } from '../utils/db';
import { AuthRequest } from '../middlewares/auth';
import { messaging } from '../utils/firebaseAdmin';
import * as admin from 'firebase-admin';

export const subscribe = async (req: AuthRequest, res: Response) => {
    try {
        const { token } = req.body;
        const user_id = req.user?.id || null;
        console.log(`[PushController] FCM Subscribe request for user: ${user_id}`);

        if (!token) return res.status(400).json({ error: 'Token is required' });

        // Upsert subscription
        await prisma.pushSubscription.upsert({
            where: { token },
            update: { user_id },
            create: { token, user_id }
        });

        res.status(201).json({ message: 'Token registered successfully' });
    } catch (error) {
        console.error('[PushController] Subscription error:', error);
        res.status(500).json({ error: 'Failed to subscribe to push notifications' });
    }
};

export const unsubscribe = async (req: AuthRequest, res: Response) => {
    try {
        const { token } = req.body;
        await prisma.pushSubscription.delete({
            where: { token }
        });
        res.json({ message: 'Unsubscribed successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to unsubscribe' });
    }
};

export const sendTestNotification = async (req: AuthRequest, res: Response) => {
    try {
        const user_id = req.user?.id;
        if (!user_id) return res.status(401).json({ error: 'Não autorizado' });

        const subs = await prisma.pushSubscription.findMany({ where: { user_id } });
        const tokens = subs.map(s => s.token);

        if (tokens.length === 0) {
            return res.status(404).json({ error: 'Nenhuma inscrição FCM encontrada para este usuário.' });
        }

        const message = {
            notification: {
                title: '🔔 Teste FCM TutShop',
                body: 'Suas notificações Firebase estão funcionando perfeitamente! 🚀'
            },
            data: {
                url: '/dashboard'
            },
            tokens: tokens
        };

        const isInitialized = (admin.apps.length > 0);
        
        const response = await messaging.sendEachForMulticast(message);
        
        // Clean up invalid tokens
        if (response.failureCount > 0) {
            response.responses.forEach(async (resp, idx) => {
                if (!resp.success) {
                    const error = resp.error;
                    if (error?.code === 'messaging/registration-token-not-registered' || 
                        error?.code === 'messaging/invalid-registration-token') {
                        await prisma.pushSubscription.delete({ where: { token: tokens[idx] } }).catch(() => {});
                    }
                }
            });
        }

        res.json({
            message: `Teste finalizado. Enviado: ${response.successCount}. Falhas: ${response.failureCount}.`,
            successCount: response.successCount,
            failureCount: response.failureCount,
            firebaseInitialized: isInitialized,
            tokensFound: tokens.length
        });
    } catch (error: any) {
        console.error('Test notification error:', error);
        res.status(500).json({ error: 'Erro ao enviar notificação FCM', details: error.message });
    }
};

export const deleteAllSubscriptions = async (req: AuthRequest, res: Response) => {
    try {
        const user_id = req.user?.id;
        if (!user_id) return res.status(401).json({ error: 'Não autorizado' });
        
        await prisma.pushSubscription.deleteMany({ where: { user_id } });
        res.json({ message: 'Todas as inscrições FCM foram removidas.' });
    } catch (error: any) {
        console.error('[PushController] Error deleting subscriptions:', error);
        res.status(500).json({ error: 'Erro ao remover inscrições.' });
    }
};
