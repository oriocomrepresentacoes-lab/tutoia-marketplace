import { Router } from 'express';
import { createPayment, paymentWebhook } from '../controllers/paymentController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/checkout', authenticate, createPayment);
router.post('/webhook', paymentWebhook); // No auth for webhook

export default router;
