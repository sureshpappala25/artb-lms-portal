import express from 'express';
import {
    startAttempt,
    reportViolation,
    submitAttempt,
    saveProgress,
    getAllResults,
    getMyResults,
    getGlobalAnalytics,
    getOverallResults,
    deleteAttempt
} from '../controllers/attemptController';
import { protect, facultyOrAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// Define explicit routes
router.get('/results/summary', protect, facultyOrAdmin, getOverallResults);
router.get('/results/my', protect, getMyResults);
router.get('/results/exam/:examId', protect, facultyOrAdmin, getAllResults);
router.get('/analytics/global', protect, facultyOrAdmin, getGlobalAnalytics);

router.post('/start/:examId', protect, startAttempt);
router.post('/:attemptId/violation', protect, reportViolation);
router.post('/:attemptId/submit', protect, submitAttempt);
router.post('/:attemptId/save', protect, saveProgress);
router.delete('/:attemptId', protect, facultyOrAdmin, deleteAttempt);

export default router;
