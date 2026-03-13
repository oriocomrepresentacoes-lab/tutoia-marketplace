import { Router } from 'express';
import * as pushController from '../controllers/pushController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Endpoint to register a new subscription
// Optional authentication to link subscription to a user
router.post('/subscribe', authenticate, pushController.subscribe);
router.post('/unsubscribe', pushController.unsubscribe);
router.post('/test', authenticate, pushController.sendTestNotification);

export default router;
