import { Router } from 'express';
import { createAd, getAds, getAdById, deleteAd } from '../controllers/adController';
import { authenticate } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

router.get('/', getAds);
router.get('/:id', getAdById);
router.post('/', authenticate, upload.array('images', 5), createAd);
router.delete('/:id', authenticate, deleteAd);

export default router;
