import express from 'express';
import { executeCode } from '../controllers/sandboxController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/execute', protect, executeCode);

export default router;
