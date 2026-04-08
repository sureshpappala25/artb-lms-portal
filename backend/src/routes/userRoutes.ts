import express from 'express';
import { getUsers, updateUser, deleteUser, createUser, importUsers } from '../controllers/userController';
import { protect, admin, facultyOrAdmin } from '../middleware/authMiddleware';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.route('/').get(protect, facultyOrAdmin, getUsers).post(protect, facultyOrAdmin, createUser);
router.post('/import', protect, facultyOrAdmin, upload.single('file'), importUsers);
router.route('/:id').put(protect, facultyOrAdmin, updateUser).delete(protect, admin, deleteUser);

export default router;
