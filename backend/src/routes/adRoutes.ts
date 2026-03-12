import { Router } from 'express';
import { createAd, getAds, getAdById, deleteAd, updateAd } from '../controllers/adController';
import { authenticate } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

router.get('/', getAds);
router.get('/:id', getAdById);
router.post('/', authenticate, upload.array('images', 10), createAd);
router.put('/:id', authenticate, upload.array('images', 10), updateAd);
router.delete('/:id', authenticate, deleteAd);

export default router;
