import { Router } from 'express';
import authRoutes from './authRoutes';
import adRoutes from './adRoutes';
import categoryRoutes from './categoryRoutes';
import bannerRoutes from './bannerRoutes';
import messageRoutes from './messageRoutes';
import adminRoutes from './adminRoutes';
import paymentRoutes from './paymentRoutes';
import planRoutes from './planRoutes';
import userRoutes from './userRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/ads', adRoutes);
router.use('/categories', categoryRoutes);
router.use('/banners', bannerRoutes);
router.use('/messages', messageRoutes);
router.use('/admin', adminRoutes);
router.use('/payments', paymentRoutes);
router.use('/payment', paymentRoutes); // Alias to avoid plural/singular confusion in webhook URL
router.use('/user-plans', planRoutes);
router.use('/users', userRoutes);

export default router;
