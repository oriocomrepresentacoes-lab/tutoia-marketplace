import { Router } from 'express';
import { prisma } from '../utils/db';
import { authenticate } from '../middlewares/auth';
import { AuthRequest } from '../middlewares/auth';

const router = Router();

router.get('/my-plans', authenticate, async (req: AuthRequest, res) => {
    try {
        const user_id = req.user?.id;
        if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

        const transactions = await prisma.transaction.findMany({
            where: {
                user_id,
                status: 'APPROVED',
                expires_at: { gte: new Date() }
            },
            orderBy: { created_at: 'desc' }
        });

        const activeBanners = await prisma.banner.findMany({
            where: {
                user_id,
                end_date: { gte: new Date() }
            }
        });

        res.json({
            transactions,
            hasBanner: activeBanners.length > 0
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch active plans' });
    }
});

export default router;
