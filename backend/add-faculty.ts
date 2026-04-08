import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User';
import connectDB from './src/config/db';
import * as bcrypt from 'bcrypt';

dotenv.config();

const addFaculty = async () => {
    try {
        await connectDB();

        const email = 'faculty1@college.edu';
        const existing = await User.findOne({ email });

        if (existing) {
            console.log('Faculty user already exists:', email);
        } else {
            // Hash the password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('faculty123', salt);

            await User.create({
                name: 'Prof. John Doe',
                email: email,
                password_hash: 'faculty123', // Model hook will hash it if we use User.create and the hook is correct
                role: 'faculty',
                department: 'Computer Science',
            });
            console.log('Faculty user created successfully:', email);
        }

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

addFaculty();
