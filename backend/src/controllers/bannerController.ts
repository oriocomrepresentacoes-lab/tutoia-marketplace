import { messaging } from '../utils/firebaseAdmin';
import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { AuthRequest } from '../middlewares/auth';
import { Server } from 'socket.io';

export const getActiveBanners = async (req: Request, res: Response) => {
    try {
        const now = new Date();

        // 1. Strict Auto-cleanup: Delete physically from DB if end_date < now
        // This keeps the database lean and follows user's rules strictly.
        await prisma.banner.deleteMany({
            where: {
                end_date: { lt: now }
            }
        });

        const banners = await prisma.banner.findMany({
            where: {
                active: true,
                OR: [
                    { end_date: null },
                    { end_date: { gte: now } }
                ]
            }
        });

        res.json(banners);
    } catch (error) {
        console.error('Error fetching active banners:', error);
        res.status(500).json({ error: 'Erro ao buscar os banners.' });
    }
};

export const getMyBanners = async (req: AuthRequest, res: Response) => {
    try {
        const user_id = req.user?.id;
        if (!user_id) return res.status(401).json({ error: 'Não autorizado' });

        const banners = await prisma.banner.findMany({
            where: { user_id },
            orderBy: { created_at: 'desc' }
        });

        res.json(banners);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar seus banners.' });
    }
};

export const deleteBanner = async (req: AuthRequest, res: Response) => {
    try {
        const user_id = req.user?.id;
        const id = req.params.id as string;

        if (!user_id) return res.status(401).json({ error: 'Não autorizado' });

        const banner = await prisma.banner.findUnique({ where: { id } });

        if (!banner) return res.status(404).json({ error: 'Banner não encontrado.' });

        // Permitir se for o dono OU se for ADMIN
        if (banner.user_id !== user_id && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Você não tem permissão para excluir este banner.' });
        }

        await prisma.banner.delete({ where: { id } });

        res.json({ message: 'Banner excluído com sucesso.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir banner.' });
    }
};

export const createBanner = async (req: AuthRequest, res: Response) => {
    try {
        const { title, link, position, start_date, end_date, id: explicitId } = req.body;
        const user_id = req.user?.id;
        let image = '';

        if (!user_id) return res.status(401).json({ error: 'Não autorizado' });

        const user = await prisma.user.findUnique({ where: { id: user_id } });
        const isAdmin = user?.role === 'ADMIN';

        // 1. Prioriade: Se for Admin e enviou um ID explícito, ou se usuário quer trocar a arte de um banner específico
        if (explicitId) {
            const existing = await prisma.banner.findUnique({ where: { id: explicitId } });
            if (!existing) return res.status(404).json({ error: 'Banner não encontrado para substituição.' });

            // Verificar permissão
            if (!isAdmin && existing.user_id !== user_id) {
                return res.status(403).json({ error: 'Sem permissão para alterar este banner.' });
            }

            const updatedBanner = await prisma.banner.update({
                where: { id: explicitId },
                data: {
                    title: title || existing.title,
                    link: link || existing.link,
                    image: req.file ? req.file.path : existing.image,
                    position: position || existing.position,
                }
            });
            return res.json(updatedBanner);
        }

        // 2. Fluxo Normal: Criação de novo (com plano ativo)
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
            orderBy: { expires_at: 'desc' } // Pegar o que vence mais tarde
        });

        if (!isAdmin && !activeTransaction) {
            return res.status(403).json({ error: 'Você não possui uma assinatura de Destaque com Banner ativa.' });
        }

        const calculatedEndDate = isAdmin && end_date
            ? new Date(end_date)
            : activeTransaction?.expires_at || new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);

        // No novo modelo, sempre criamos um NOVO registro se chegar aqui sem explicitId
        const banner = await prisma.banner.create({
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

        res.status(201).json(banner);

        // Real-time broadcast
        const io: Server = req.app.get('io');
        if (io) {
            console.log(`[Socket] Broadcasting new_banner: ${banner.title}`);
            io.emit('new_banner', {
                id: banner.id,
                title: banner.title,
                image: banner.image,
                link: banner.link,
                user_id: banner.user_id
            });
        }

        // Global FCM Notification for all users
        const subscriptions = await prisma.pushSubscription.findMany();
        console.log(`[Push-Banner] Found ${subscriptions.length} subscriptions in database.`);

        if (subscriptions.length > 0) {
            const tokens = subscriptions.map(s => s.token);
            const fcmMessage = {
                notification: {
                    title: '📢 Novo Destaque no TutShop!',
                    body: `${banner.title} acaba de entrar em destaque. Veja agora!`
                },
                data: {
                    url: banner.link || '/',
                    type: 'new_banner'
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
                        tag: 'new_banner'
                    }
                },
                tokens: tokens
            };

            const response = await messaging.sendEachForMulticast(fcmMessage);
            console.log(`[Push-Banner] Multicast sent. Success: ${response.successCount}, Failure: ${response.failureCount}`);

            // Cleanup invalid tokens
            if (response.failureCount > 0) {
                response.responses.forEach(async (resp: any, idx: number) => {
                    if (!resp.success) {
                        const error = resp.error;
                        console.log(`[Push-Banner] Error for token ${tokens[idx].substring(0, 10)}...:`, error?.message);
                        if (error?.code === 'messaging/registration-token-not-registered' || 
                            error?.code === 'messaging/invalid-registration-token') {
                            await prisma.pushSubscription.delete({ where: { token: tokens[idx] } }).catch(() => {});
                        }
                    }
                });
            }
        }
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
