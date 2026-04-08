"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const attemptController_1 = require("../controllers/attemptController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Define explicit routes
router.get('/results/summary', authMiddleware_1.protect, authMiddleware_1.facultyOrAdmin, attemptController_1.getOverallResults);
router.get('/results/my', authMiddleware_1.protect, attemptController_1.getMyResults);
router.get('/results/exam/:examId', authMiddleware_1.protect, authMiddleware_1.facultyOrAdmin, attemptController_1.getAllResults);
router.get('/analytics/global', authMiddleware_1.protect, authMiddleware_1.facultyOrAdmin, attemptController_1.getGlobalAnalytics);
router.post('/start/:examId', authMiddleware_1.protect, attemptController_1.startAttempt);
router.post('/:attemptId/violation', authMiddleware_1.protect, attemptController_1.reportViolation);
router.post('/:attemptId/submit', authMiddleware_1.protect, attemptController_1.submitAttempt);
router.post('/:attemptId/save', authMiddleware_1.protect, attemptController_1.saveProgress);
router.delete('/:attemptId', authMiddleware_1.protect, authMiddleware_1.facultyOrAdmin, attemptController_1.deleteAttempt);
exports.default = router;
