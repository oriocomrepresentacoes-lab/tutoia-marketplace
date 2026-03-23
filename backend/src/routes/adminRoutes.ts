import { Router } from 'express';
import { authenticate, authorizeAdmin } from '../middlewares/auth';
import { getUsers, toggleUserStatus, toggleBannerStatus, getAllBanners, deleteBanner, getAdminAds, getFinancialStats } from '../controllers/adminController';

const router = Router();

// Todas as rotas de admin exigem autenticação e cargo ADMIN
router.use(authenticate, authorizeAdmin);

router.get('/users', getUsers);
router.put('/users/:id/status', toggleUserStatus);
router.get('/banners', getAllBanners);
router.put('/banners/:id/status', toggleBannerStatus);
router.delete('/banners/:id', deleteBanner);
router.get('/ads', getAdminAds);
router.get('/finances', getFinancialStats);

export default router;
