import { Router } from 'express';
import { getConversation, sendMessage, getConversations } from '../controllers/messageController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.get('/conversations', authenticate, getConversations);
router.get('/:ad_id/:other_user_id', authenticate, getConversation);
router.post('/', authenticate, sendMessage);

export default router;
