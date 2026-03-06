import { Router } from 'express';
import { getCategories, createCategory } from '../controllers/categoryController';
import { authenticate, authorizeAdmin } from '../middlewares/auth';

const router = Router();

router.get('/', getCategories);
router.post('/', authenticate, authorizeAdmin, createCategory);

export default router;
