import { Router } from 'express';
import { updateProfile, getProfile } from '../controllers/userController';
import { authenticate } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

router.get('/me', authenticate, getProfile);
router.put('/me', authenticate, upload.single('profile_picture'), updateProfile);

export default router;
