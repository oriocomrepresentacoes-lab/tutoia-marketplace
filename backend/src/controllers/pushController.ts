import { Response } from 'express';
import { prisma } from '../utils/db';
import { AuthRequest } from '../middlewares/auth';
import { sendPushNotification } from '../utils/webPush';

export const subscribe = async (req: AuthRequest, res: Response) => {
    try {
        const { endpoint, keys } = req.body;
        const user_id = req.user?.id || null;
        console.log(`[PushController] Subscribe request for user: ${user_id}`);

        // Check if subscription already exists
        const existing = await prisma.pushSubscription.findUnique({
            where: { endpoint }
        });

        if (existing) {
            console.log(`[PushController] Updating existing subscription: ${existing.id}`);
            await prisma.pushSubscription.update({
                where: { id: existing.id },
                data: {
                    user_id,
                    p256dh: keys.p256dh,
                    auth: keys.auth
                }
            });
            return res.status(200).json({ message: 'Subscription updated' });
        }

        console.log(`[PushController] Creating NEW subscription...`);
        const newSub = await prisma.pushSubscription.create({
            data: {
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
                user_id
            }
        });
        console.log(`[PushController] Created subscription: ${newSub.id}`);

        res.status(201).json({ message: 'Subscription registered' });
    } catch (error) {
        console.error('[PushController] Subscription error:', error);
        res.status(500).json({ error: 'Failed to subscribe to push notifications' });
    }
};

export const unsubscribe = async (req: AuthRequest, res: Response) => {
    try {
        const { endpoint } = req.body;
        await prisma.pushSubscription.delete({
            where: { endpoint }
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
        if (subs.length === 0) return res.status(404).json({ error: 'Nenhuma inscrição encontrada para este dispositivo. Tente ativar as notificações primeiro.' });

        const payload = {
            title: '🔔 Teste de Notificação TutShop',
            body: 'Se você recebeu isso, suas notificações estão funcionando perfeitamente! 🚀',
            icon: '/app-icon-v3.png',
            data: { url: 'https://tutshop.com.br/dashboard' }
        };

        let successCount = 0;
        let errors = [];

        for (const sub of subs) {
            try {
                const result = await sendPushNotification({
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth }
                }, payload);

                if (result.success) {
                    successCount++;
                } else {
                    errors.push(`${sub.endpoint.substring(0, 20)}... : ${result.error}`);
                    if (result.shouldRemove) {
                        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => { });
                    }
                }
            } catch (err: any) {
                errors.push(`${sub.endpoint.substring(0, 20)}... : ${err.message || 'Erro inesperado'}`);
            }
        }

        if (successCount === 0 && subs.length > 0) {
            return res.status(500).json({
                error: 'Falha crítica na entrega.',
                details: errors.join('; ')
            });
        }

        res.json({
            message: `Teste finalizado. Enviado: ${successCount}. Falhas: ${errors.length}.`,
            details: errors.length > 0 ? errors.join('; ') : undefined
        });
    } catch (error: any) {
        console.error('Test notification error:', error);
        res.status(500).json({
            error: 'Erro interno no servidor ao processar teste.',
            details: error.message || String(error)
        });
    }
};

export const deleteAllSubscriptions = async (req: AuthRequest, res: Response) => {
    try {
        const user_id = req.user?.id;
        if (!user_id) return res.status(401).json({ error: 'Não autorizado' });
        console.log(`[PushController] DELETING ALL subscriptions for user: ${user_id}`);

        const result = await prisma.pushSubscription.deleteMany({ where: { user_id } });
        console.log(`[PushController] Deleted ${result.count} subscriptions.`);

        res.json({ message: 'Todas as inscrições foram removidas com sucesso.' });
    } catch (error: any) {
        console.error('[PushController] Error deleting all subscriptions:', error);
        res.status(500).json({ error: 'Erro ao remover inscrições.' });
    }
};
