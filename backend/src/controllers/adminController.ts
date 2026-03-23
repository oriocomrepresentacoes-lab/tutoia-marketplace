import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { AuthRequest } from '../middlewares/auth';

// Get list of all users and their status
export const getUsers = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                city: true,
                role: true,
                active: true,
                created_at: true,
                _count: {
                    select: { ads: true, banners: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
};

// Toggle User Ban
export const toggleUserStatus = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });

        const { id } = req.params;
        const { active } = req.body;

        const user = await prisma.user.update({
            where: { id: String(id) },
            data: { active: Boolean(active) }
        });

        // Se desativar o usuário, desativar os anúncios associados também
        if (!active) {
            await prisma.ad.updateMany({
                where: { user_id: id as string },
                data: { status: 'INACTIVE' }
            });
            await prisma.banner.updateMany({
                where: { user_id: id as string },
                data: { active: false }
            });
        }

        res.json({ message: `Usuário ${active ? 'ativado' : 'desativado'} com sucesso`, user });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao alterar status do usuário' });
    }
};

// Toggle Banner Status (Admin)
export const toggleBannerStatus = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });

        const { id } = req.params;
        const { active } = req.body; // Can forcefully set to false manually

        const banner = await prisma.banner.update({
            where: { id: String(id) },
            data: { active: Boolean(active) }
        });

        res.json({ message: 'Banner atualizado', banner });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao desativar banner' });
    }
};

// Delete Banner (Admin)
export const deleteBanner = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });

        const { id } = req.params;

        await prisma.banner.delete({
            where: { id: String(id) }
        });

        res.json({ message: 'Banner excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir banner' });
    }
};

// Get all banners for Admin panel
export const getAllBanners = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });

        const banners = await prisma.banner.findMany({
            include: {
                user: { select: { name: true, email: true } }
            },
            orderBy: { created_at: 'desc' }
        });

        res.json(banners);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar banners' });
    }
};

// Get all ads for Admin panel
export const getAdminAds = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });

        const ads = await prisma.ad.findMany({
            include: {
                user: { select: { name: true, email: true } },
                category: { select: { name: true } }
            },
            orderBy: { created_at: 'desc' }
        });

        // Format ads to parse images JSON
        const formattedAds = ads.map(ad => ({
            ...ad,
            images: JSON.parse(ad.images)
        }));

        res.json(formattedAds);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar anúncios' });
    }
};

// Get financial statistics for Admin dashboard
export const getFinancialStats = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });

        const approvedTransactions = await prisma.transaction.findMany({
            where: { status: 'APPROVED' },
            select: { transaction_amount: true, type: true }
        });

        const stats = {
            totalRevenue: 0,
            bannerRevenue: 0,
            adImagesRevenue: 0
        };

        approvedTransactions.forEach(tx => {
            stats.totalRevenue += tx.transaction_amount;
            if (tx.type === 'BANNER') stats.bannerRevenue += tx.transaction_amount;
            if (tx.type === 'AD_IMAGES') stats.adImagesRevenue += tx.transaction_amount;
        });

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar estatísticas financeiras' });
    }
};
