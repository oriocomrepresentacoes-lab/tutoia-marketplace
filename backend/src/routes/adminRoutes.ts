import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { getUsers, toggleUserStatus, toggleBannerStatus, getAllBanners, deleteBanner } from '../controllers/adminController';

const router = Router();

// Todas as rotas de admin exigem autenticação no mínimo, a verificação de role é feita no controller
router.use(authenticate);

router.get('/users', getUsers);
router.patch('/users/:id/status', toggleUserStatus);

router.get('/banners', getAllBanners);
router.patch('/banners/:id/status', toggleBannerStatus);
router.delete('/banners/:id', deleteBanner);

export default router;
