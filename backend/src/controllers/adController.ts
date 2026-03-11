import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { AuthRequest } from '../middlewares/auth';
import { sendPushNotification } from '../utils/webPush';
import { Server } from 'socket.io';

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

        // Real-time broadcast for active users
        const io: Server = req.app.get('io');
        if (io) {
            console.log(`[Socket] Broadcasting new_ad: ${ad.title}`);
            io.emit('new_ad', {
                id: ad.id,
                title: ad.title,
                price: ad.price,
                image: images.length > 0 ? images[0] : null
            });
        }

        // Broadcast notification to all push subscribers (Background)
        const subscriptions = await prisma.pushSubscription.findMany();
        const notificationPayload = {
            title: '🎉 Novo Anúncio no TutShop!',
            body: `${ad.title} acaba de ser postado. Confira agora!`,
            icon: '/app-icon-v3.png',
            data: { url: `/ad/${ad.id}` }
        };

        subscriptions.forEach(async (sub) => {
            const pushSub = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };
            const result = await sendPushNotification(pushSub, notificationPayload);
            if (result.shouldRemove) {
                await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => { });
            }
        });

    } catch (error) {
        console.error('Create ad error:', error);
        res.status(500).json({ error: 'Erro ao criar o anúncio.' });
    }
};

export const getAds = async (req: Request, res: Response) => {
    try {
        const { search, category, city, type, sort, user_id, status, page, limit } = req.query;

        const p = parseInt(String(page)) || 1;
        const l = parseInt(String(limit)) || 20;
        const skip = (p - 1) * l;

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

        const [totalCount, ads] = await Promise.all([
            prisma.ad.count({ where: filter }),
            prisma.ad.findMany({
                where: filter,
                orderBy,
                skip,
                take: l,
                include: {
                    category: true,
                    user: {
                        select: { name: true, phone: true, profile_picture: true }
                    }
                },
            })
        ]);

        // Find active highlight transactions linked to specific ads (20-day limit valid)
        // Optimization: only check highlights for the returned 'ads' subset
        const adIds = ads.map(a => a.id);
        const activeHighlights = await prisma.transaction.findMany({
            where: {
                type: 'AD_IMAGES',
                status: 'USED',
                expires_at: { gte: new Date() },
                ad_id: { in: adIds }
            },
            select: { ad_id: true }
        });

        const allImageTransactions = await prisma.transaction.findMany({
            where: {
                type: 'AD_IMAGES',
                ad_id: { in: adIds }
            },
            select: { ad_id: true, expires_at: true }
        });

        // Create lookup Sets
        const featuredAdIds = new Set(activeHighlights.map(t => t.ad_id));
        const adWithPremiumHistory = new Set(allImageTransactions.map(t => t.ad_id));

        // map images JSON to array and attach flags
        const formattedAds = ads.map(ad => {
            const isFeatured = featuredAdIds.has(ad.id);
            const hadPremium = adWithPremiumHistory.has(ad.id);
            const imagesArray = JSON.parse(ad.images);

            // It's an "Expired Premium" if it has > 4 images (or had a plan) but is not currently featured
            const isExpiredPremium = !isFeatured && (imagesArray.length > 4 || hadPremium);

            const { user, ...adData } = ad;

            return {
                ...adData,
                images: imagesArray,
                isFeatured,
                isExpiredPremium,
                user
            };
        });

        // Sort to bring featured ads to the top within this page
        formattedAds.sort((a, b) => {
            if (a.isFeatured && !b.isFeatured) return -1;
            if (!a.isFeatured && b.isFeatured) return 1;
            return 0;
        });

        res.json({
            ads: formattedAds,
            meta: {
                totalCount,
                page: p,
                limit: l,
                totalPages: Math.ceil(totalCount / l),
                hasNextPage: skip + l < totalCount
            }
        });
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
