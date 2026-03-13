import { Response } from 'express';
import { prisma } from '../utils/db';
import { AuthRequest } from '../middlewares/auth';

export const subscribe = async (req: AuthRequest, res: Response) => {
    try {
        const { endpoint, keys } = req.body;
        const user_id = req.user?.id || null;

        // Check if subscription already exists
        const existing = await prisma.pushSubscription.findUnique({
            where: { endpoint }
        });

        if (existing) {
            // Update user_id if it's different (user logged in)
            if (user_id && existing.user_id !== user_id) {
                await prisma.pushSubscription.update({
                    where: { id: existing.id },
                    data: { user_id }
                });
            }
            return res.status(200).json({ message: 'Subscription updated' });
        }

        await prisma.pushSubscription.create({
            data: {
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
                user_id
            }
        });

        res.status(201).json({ message: 'Subscription registered' });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ error: 'Failed to subscribe to push notifications' });
    }
};

export const unsubscribe = async (req: AuthRequest, res: Response) => {
    try {
        const { endpoint } = req.body;
        await prisma.pushSubscription.deleteMany({
            where: { endpoint }
        });
        res.status(200).json({ message: 'Subscription removed' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to unsubscribe' });
    }
};

export const sendTestNotification = async (req: AuthRequest, res: Response) => {
    try {
        const user_id = req.user?.id;
        if (!user_id) return res.status(401).json({ error: 'Não autorizado' });

        const subs = await prisma.pushSubscription.findMany({ where: { user_id } });
        if (subs.length === 0) return res.status(404).json({ error: 'Nenhuma inscrição encontrada para este dispositivo. Tente ativar as notificações primeiro.' });

        const payload = {
            title: '🔔 Teste de Notificação TutShop',
            body: 'Se você recebeu isso, suas notificações estão funcionando perfeitamente! 🚀',
            icon: 'https://tutshop.com.br/app-icon-v3.png',
            data: { url: 'https://tutshop.com.br/dashboard' }
        };

        const { sendPushNotification } = await import('../utils/webPush');

        let successCount = 0;
        for (const sub of subs) {
            const result = await sendPushNotification({
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth }
            }, payload);

            if (result.shouldRemove) {
                await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => { });
            } else {
                successCount++;
            }
        }

        res.json({ message: `Teste enviado com sucesso para ${successCount} inscrição(ões).` });
    } catch (error) {
        console.error('Test notification error:', error);
        res.status(500).json({ error: 'Erro ao enviar notificação de teste.' });
    }
};
