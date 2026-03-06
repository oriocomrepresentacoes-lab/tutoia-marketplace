import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { AuthRequest } from '../middlewares/auth';

export const getActiveBanners = async (req: Request, res: Response) => {
    try {
        const banners = await prisma.banner.findMany({
            where: {
                active: true,
                OR: [
                    { end_date: null },
                    { end_date: { gte: new Date() } }
                ]
            }
        });

        // We don't increment views here directly for all to avoid massive DB writes,
        // usually we'd do it per component render or batch it. 
        // The requirement says "Controle de visualizações", we'll create a special endpoint for tracking.

        res.json(banners);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar os banners.' });
    }
};

export const createBanner = async (req: AuthRequest, res: Response) => {
    try {
        console.log('--- Incoming Banner Request ---');
        console.log('Body:', req.body);
        console.log('File:', req.file);
        const { title, link, position, start_date, end_date } = req.body;
        const user_id = req.user?.id;
        let image = '';

        if (!user_id) return res.status(401).json({ error: 'Não autorizado' });

        if (req.file) {
            image = req.file.path;
        } else {
            return res.status(400).json({ error: 'A imagem é obrigatória para o banner.' });
        }

        // Verify if user has an active banner transaction
        const activeTransaction = await prisma.transaction.findFirst({
            where: {
                user_id,
                type: 'BANNER',
                status: 'APPROVED',
                expires_at: { gte: new Date() }
            },
            orderBy: { created_at: 'desc' }
        });

        const user = await prisma.user.findUnique({ where: { id: user_id } });
        const isAdmin = user?.role === 'ADMIN';

        if (!isAdmin && !activeTransaction) {
            return res.status(403).json({ error: 'Você não possui uma assinatura de Destaque com Banner ativa.' });
        }

        // Check if they already have an active banner to UPDATE instead of creating a new one
        const existingBanner = await prisma.banner.findFirst({
            where: {
                user_id,
                end_date: { gte: new Date() }
            }
        });

        const calculatedEndDate = isAdmin && end_date
            ? new Date(end_date)
            : activeTransaction?.expires_at || new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);

        let banner;
        if (existingBanner) {
            // Upsert / Update existing banner
            banner = await prisma.banner.update({
                where: { id: existingBanner.id },
                data: {
                    title,
                    link,
                    image,
                    position: position || 'home_topo',
                }
            });
        } else {
            // Create new
            banner = await prisma.banner.create({
                data: {
                    title,
                    link,
                    image,
                    position: position || 'home_topo',
                    start_date: start_date ? new Date(start_date) : new Date(),
                    end_date: calculatedEndDate,
                    user_id
                }
            });
        }

        res.status(201).json(banner);
    } catch (error: any) {
        console.error('Error creating banner:', error);
        res.status(500).json({ error: String(error), details: error.message });
    }
};

export const trackBannerView = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        await prisma.banner.update({ where: { id }, data: { views: { increment: 1 } } });
        res.status(200).send();
    } catch (error) {
        res.status(500).send();
    }
};

export const trackBannerClick = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        await prisma.banner.update({ where: { id }, data: { clicks: { increment: 1 } } });
        res.status(200).send();
    } catch (error) {
        res.status(500).send();
    }
};
