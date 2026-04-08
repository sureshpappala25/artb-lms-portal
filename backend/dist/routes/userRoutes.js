"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const multer_1 = __importDefault(require("multer"));
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
router.route('/').get(authMiddleware_1.protect, authMiddleware_1.facultyOrAdmin, userController_1.getUsers).post(authMiddleware_1.protect, authMiddleware_1.facultyOrAdmin, userController_1.createUser);
router.post('/import', authMiddleware_1.protect, authMiddleware_1.facultyOrAdmin, upload.single('file'), userController_1.importUsers);
router.route('/:id').put(authMiddleware_1.protect, authMiddleware_1.facultyOrAdmin, userController_1.updateUser).delete(authMiddleware_1.protect, authMiddleware_1.admin, userController_1.deleteUser);
exports.default = router;
