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
