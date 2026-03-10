import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { AuthRequest } from '../middlewares/auth';

export const createAd = async (req: AuthRequest, res: Response) => {
    try {
        const { title, description, price, type, city, category_id } = req.body;
        const user_id = req.user?.id;

        if (!user_id) return res.status(401).json({ error: 'Não autorizado' });

        let maxImages = 4;

        // Check for active plan to increase limits
        const hasActivePlan = await prisma.transaction.findFirst({
            where: {
                user_id,
                type: 'AD_IMAGES',
                status: 'APPROVED',
                expires_at: { gte: new Date() }
            }
        });

        if (hasActivePlan) {
            maxImages = 10;
        }

        let images: string[] = [];
        if (req.files) {
            const files = req.files as Express.Multer.File[];
            if (files.length > maxImages) {
                return res.status(400).json({ error: `Você pode enviar no máximo ${maxImages} imagens. Adquira o plano Mais Imagens para enviar até 10.` });
            }
            images = files.map((file) => file.path);
        }

        const priceFloat = parseFloat(price);

        const ad = await prisma.ad.create({
            data: {
                title,
                description,
                price: isNaN(priceFloat) ? 0 : priceFloat,
                type,
                city,
                category_id,
                user_id,
                images: JSON.stringify(images),
            },
        });

        // In this model, the plan is consumed for a single ad.
        // It remains linked to this specific ad to provide highlight for 20 days.
        if (hasActivePlan) {
            await prisma.transaction.update({
                where: { id: hasActivePlan.id },
                data: {
                    status: 'USED', // Burn the token for this usage
                    ad_id: ad.id    // Tie the 20-day benefit to this ad
                }
            });
        }

        res.status(201).json(ad);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar o anúncio.' });
    }
};

export const getAds = async (req: Request, res: Response) => {
    try {
        const { search, category, city, type, sort, user_id, status } = req.query;

        let filter: any = { status: status ? String(status) : 'ACTIVE' };

        if (user_id) filter.user_id = String(user_id);

        if (search) {
            const searchTerm = String(search);
            filter.OR = [
                { title: { contains: searchTerm, mode: 'insensitive' } },
                { description: { contains: searchTerm, mode: 'insensitive' } },
                { category: { name: { contains: searchTerm, mode: 'insensitive' } } }
            ];
        }
        if (category) filter.category_id = String(category);
        if (city) filter.city = String(city);
        if (type) filter.type = String(type);

        let orderBy: any = { created_at: 'desc' };
        if (sort === 'views') orderBy = { views: 'desc' };
        if (sort === 'price_asc') orderBy = { price: 'asc' };

        const ads = await prisma.ad.findMany({
            where: filter,
            orderBy,
            include: {
                category: true,
                user: {
                    select: { name: true, phone: true, profile_picture: true }
                }
            },
        });

        // Find active highlight transactions specific to ads (20-day limit valid)
        const activeHighlights = await prisma.transaction.findMany({
            where: {
                type: 'AD_IMAGES',
                status: 'USED',
                expires_at: { gte: new Date() },
                ad_id: { not: null }
            }
        });

        // Create a fast lookup Set for featured ad ids
        const featuredAdIds = new Set(activeHighlights.map(t => t.ad_id));

        // map images JSON to array and attach isFeatured flag
        const formattedAds = ads.map(ad => {
            const isFeatured = featuredAdIds.has(ad.id);
            // Remove full user data from response to keep payload clean, just keep what's needed
            const { user, ...adData } = ad;

            return {
                ...adData,
                images: JSON.parse(ad.images),
                isFeatured,
                user
            };
        });

        // Sort to bring featured ads to the top (only if no specific sort was requested, or as secondary sort)
        // If sort by price_asc or views was requested, we still prioritize featured, then apply the requested sort
        formattedAds.sort((a, b) => {
            if (a.isFeatured && !b.isFeatured) return -1;
            if (!a.isFeatured && b.isFeatured) return 1;

            // If they have the same featured status, they keep the prisma ordering (created_at desc, views desc, or price asc)
            return 0; // Stable sort relies on Node's native Array.prototype.sort stability or we just leave Prisma's order intact within groups
        });

        res.json(formattedAds);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar anúncios.' });
    }
};

export const getAdById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const ad = await prisma.ad.findUnique({
            where: { id },
            include: { user: { select: { name: true, phone: true, profile_picture: true } }, category: true },
        });

        if (!ad) return res.status(404).json({ error: 'Anúncio não encontrado.' });

        // increment view count
        await prisma.ad.update({ where: { id }, data: { views: { increment: 1 } } });

        res.json({ ...ad, images: JSON.parse(ad.images) });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar o anúncio.' });
    }
};

export const deleteAd = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const user_id = req.user?.id;
        const role = req.user?.role;

        const ad = await prisma.ad.findUnique({ where: { id } });
        if (!ad) return res.status(404).json({ error: 'Anúncio não encontrado' });

        if (ad.user_id !== user_id && role !== 'ADMIN') {
            return res.status(403).json({ error: 'Não autorizado' });
        }

        await prisma.ad.delete({ where: { id } });
        res.json({ message: 'Anúncio excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir o anúncio' });
    }
};
