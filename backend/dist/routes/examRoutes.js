"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const examController_1 = require("../controllers/examController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ dest: 'uploads/' });
router.route('/').get(authMiddleware_1.protect, examController_1.getExams).post(authMiddleware_1.protect, authMiddleware_1.facultyOrAdmin, examController_1.createExam);
router.route('/generate-from-doc').post(authMiddleware_1.protect, authMiddleware_1.facultyOrAdmin, upload.single('document'), examController_1.generateFromDoc);
router.route('/:id').get(authMiddleware_1.protect, examController_1.getExamById).put(authMiddleware_1.protect, authMiddleware_1.facultyOrAdmin, examController_1.updateExam).delete(authMiddleware_1.protect, authMiddleware_1.admin, examController_1.deleteExam);
exports.default = router;
