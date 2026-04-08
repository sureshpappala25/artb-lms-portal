"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const helmet_1 = __importDefault(require("helmet"));
const db_1 = __importDefault(require("./config/db"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const examRoutes_1 = __importDefault(require("./routes/examRoutes"));
const attemptRoutes_1 = __importDefault(require("./routes/attemptRoutes"));
const sandboxRoutes_1 = __importDefault(require("./routes/sandboxRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
dotenv_1.default.config();
// Ensure the uploads directory exists for multer
fs_1.default.mkdirSync('uploads', { recursive: true });
(0, db_1.default)();
const app = (0, express_1.default)();
// Request logging middleware for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log(`Origin: ${req.get('origin') || 'no-origin'}`);
    next();
});
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL,
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/api/auth', authRoutes_1.default);
app.use('/api/exams', examRoutes_1.default);
app.use('/api/attempts', attemptRoutes_1.default);
app.use('/api/sandbox', sandboxRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/', (req, res) => {
    res.send('ARTB LMS API is running...');
});
// Global Error Handler
app.use((err, req, res, next) => {
    console.error(`[Global Error] ${new Date().toISOString()}`);
    console.error(err.stack);
    res.status(err.status || 500).json({
        message: err.message || 'An unexpected error occurred on the server',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server v1.1.1 running on port ${PORT}`);
});
