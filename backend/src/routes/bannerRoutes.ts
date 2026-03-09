import { Router } from 'express';
import { getActiveBanners, createBanner, trackBannerView, trackBannerClick, getMyBanners, deleteBanner } from '../controllers/bannerController';
import { authenticate, authorizeAdmin } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

router.get('/active', getActiveBanners);
router.get('/my-banners', authenticate, getMyBanners);
router.post('/view/:id', trackBannerView);
router.post('/click/:id', trackBannerClick);
router.post('/', authenticate, upload.single('image'), createBanner);
router.delete('/:id', authenticate, deleteBanner);

export default router;
