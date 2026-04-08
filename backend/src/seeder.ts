import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db';
import User from './models/User';
import Exam from './models/Exam';
import Attempt from './models/Attempt';
import { users } from './data/users';
import { exams } from './data/exams';

dotenv.config();

connectDB();

const importData = async () => {
    try {
        // Clear existing data
        await Attempt.deleteMany();
        await Exam.deleteMany();
        await User.deleteMany();

        // Insert Users (admin + faculty only)
        const createdUsers = await User.insertMany(users);

        // Find the faculty user to act as creator of exams
        const facultyUser = createdUsers.find(user => user.role === 'faculty');

        if (!facultyUser) throw new Error('Failed to find faculty user');

        // Attach creator ref to exams (will be empty array since demo exams removed)
        const sampleExams = exams.map(exam => {
            return { ...exam, created_by: facultyUser._id };
        });

        if (sampleExams.length > 0) {
            await Exam.insertMany(sampleExams);
        }

        console.log('Data Imported successfully!');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
    }
};

const destroyData = async () => {
    try {
        await Attempt.deleteMany();
        await Exam.deleteMany();
        await User.deleteMany();

        console.log('Data Destroyed!');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
    }
};

if (process.argv[2] === '-d') {
    destroyData();
} else {
    importData();
}
