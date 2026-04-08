import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';
import helmet from 'helmet';
import connectDB from './config/db';

import authRoutes from './routes/authRoutes';
import examRoutes from './routes/examRoutes';
import attemptRoutes from './routes/attemptRoutes';
import sandboxRoutes from './routes/sandboxRoutes';
import userRoutes from './routes/userRoutes';

dotenv.config();

// Ensure the uploads directory exists for multer
fs.mkdirSync('uploads', { recursive: true });

connectDB();

const app = express();

// Request logging middleware for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log(`Origin: ${req.get('origin') || 'no-origin'}`);
    next();
});

app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/sandbox', sandboxRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.send('ARTB LMS API is running...');
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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

