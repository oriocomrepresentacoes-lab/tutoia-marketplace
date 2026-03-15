import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { AuthRequest } from '../middlewares/auth';
import { messaging } from '../utils/firebaseAdmin';
import { Server } from 'socket.io';
// Version: 2.2.0 - Forced High-Priority Push Update

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
                ad_id: null,
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
                image: images.length > 0 ? images[0] : null,
                user_id: ad.user_id
            });
        }

        // Broadcast notification to ALL push subscribers (FCM Background)
        const subscriptions = await prisma.pushSubscription.findMany();
        console.log(`[Push-Global] Found ${subscriptions.length} subscriptions in database.`);
        
        if (subscriptions.length > 0) {
            const tokens = subscriptions.map(s => s.token);
            const fcmMessage = {
                notification: {
                    title: '🎉 Novo Anúncio no TutShop!',
                    body: `${ad.title} acaba de ser postado. Confira agora!`
                },
                data: {
                    url: `/ad/${ad.id}`,
                    type: 'new_ad'
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
                        icon: '/app-icon-v3.png',
                        badge: '/app-icon-v3.png',
                        tag: 'new_ad'
                    }
                },
                tokens: tokens
            };

            const response = await messaging.sendEachForMulticast(fcmMessage);
            console.log(`[Push-Global] Multicast sent. Success: ${response.successCount}, Failure: ${response.failureCount}`);

            // Cleanup invalid tokens
            if (response.failureCount > 0) {
                response.responses.forEach(async (resp: any, idx: number) => {
                    if (!resp.success) {
                        const error = resp.error;
                        console.log(`[Push-Global] Error for token ${tokens[idx].substring(0, 10)}...:`, error?.message);
                        if (error?.code === 'messaging/registration-token-not-registered' || 
                            error?.code === 'messaging/invalid-registration-token') {
                            await prisma.pushSubscription.delete({ where: { token: tokens[idx] } }).catch(() => {});
                        }
                    }
                });
            }
        }

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

        // Check for expired premium status
        const premiumTransaction = await prisma.transaction.findFirst({
            where: {
                ad_id: id,
                type: 'AD_IMAGES',
                status: 'USED'
            },
            orderBy: { expires_at: 'desc' }
        });

        const now = new Date();
        const imagesArray = JSON.parse(ad.images);
        const isFeatured = premiumTransaction ? (premiumTransaction.status === 'USED' && premiumTransaction.expires_at && new Date(premiumTransaction.expires_at) >= now) : false;
        const isExpiredPremium = !isFeatured && (imagesArray.length > 4 || (premiumTransaction && premiumTransaction.expires_at && new Date(premiumTransaction.expires_at) < now));

        res.json({
            ...ad,
            images: imagesArray,
            isFeatured,
            isExpiredPremium
        });
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

export const updateAd = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const user_id = req.user?.id;
        const role = req.user?.role;

        if (!user_id) return res.status(401).json({ error: 'Não autorizado' });

        const existingAd = await prisma.ad.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!existingAd) return res.status(404).json({ error: 'Anúncio não encontrado' });

        // Permission check
        if (existingAd.user_id !== user_id && role !== 'ADMIN') {
            return res.status(403).json({ error: 'Não autorizado' });
        }

        const { title, description, price, type, city, category_id, keep_images } = req.body;

        // Manage Images
        let currentImages: string[] = [];
        try {
            if (keep_images) {
                currentImages = JSON.parse(keep_images);
            }
        } catch (e) {
            currentImages = [];
        }

        let newImages: string[] = [];
        if (req.files) {
            const files = req.files as Express.Multer.File[];
            newImages = files.map((file) => file.path);
        }

        const combinedImages = [...currentImages, ...newImages];

        // Check for active plan to permit more images (up to 10)
        let maxImages = 4;
        const hasActivePlan = await prisma.transaction.findFirst({
            where: {
                user_id,
                type: 'AD_IMAGES',
                status: 'APPROVED',
                ad_id: null,
                expires_at: { gte: new Date() }
            }
        });

        // Also check if this ad is ALREADY premium (has a USED transaction linked to it)
        const isAlreadyPremium = await prisma.transaction.findFirst({
            where: {
                ad_id: id,
                type: 'AD_IMAGES',
                status: 'USED',
                expires_at: { gte: new Date() }
            }
        });

        if (hasActivePlan || isAlreadyPremium) {
            maxImages = 10;
        }

        if (combinedImages.length > maxImages) {
            // Check if it's an expired premium ad just trying to KEEP its images
            const isJustKeepingImages = combinedImages.length === currentImages.length &&
                newImages.length === 0 &&
                JSON.stringify(combinedImages) === existingAd.images; // original images from DB

            if (!isJustKeepingImages) {
                return res.status(400).json({ error: `O destaque deste anúncio expirou. Para alterar ou adicionar novas fotos além de 4, você precisa renovar o plano.` });
            }
        }

        const priceFloat = parseFloat(price);

        const updatedAd = await prisma.ad.update({
            where: { id },
            data: {
                title: title || existingAd.title,
                description: description || existingAd.description,
                price: isNaN(priceFloat) ? existingAd.price : priceFloat,
                type: type || existingAd.type,
                city: city || existingAd.city,
                category_id: category_id || existingAd.category_id,
                images: JSON.stringify(combinedImages),
            }
        });

        // Upgrade Logic: If it wasn't premium but the user HAS an active plan, apply it now
        if (!isAlreadyPremium && hasActivePlan) {
            await prisma.transaction.update({
                where: { id: hasActivePlan.id },
                data: {
                    status: 'USED',
                    ad_id: updatedAd.id
                }
            });
            console.log(`[Upgrade] Ad ${updatedAd.id} upgraded to premium during edit.`);
        }

        res.json({ ...updatedAd, images: combinedImages });

    } catch (error) {
        console.error('Update ad error:', error);
        res.status(500).json({ error: 'Erro ao atualizar o anúncio.' });
    }
};
