import express from 'express';
import multer from 'multer';
import { getExams, createExam, getExamById, generateFromDoc, updateExam, deleteExam } from '../controllers/examController';
import { protect, admin, facultyOrAdmin } from '../middleware/authMiddleware';

const router = express.Router();

const upload = multer({ dest: 'uploads/' });

router.route('/').get(protect, getExams).post(protect, facultyOrAdmin, createExam);
router.route('/generate-from-doc').post(protect, facultyOrAdmin, upload.single('document'), generateFromDoc);
router.route('/:id').get(protect, getExamById).put(protect, facultyOrAdmin, updateExam).delete(protect, admin, deleteExam);

export default router;
