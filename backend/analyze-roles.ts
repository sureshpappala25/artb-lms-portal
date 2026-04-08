import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User';
import connectDB from './src/config/db';

dotenv.config();

const analyzeRoles = async () => {
    try {
        await connectDB();
        const users = await User.find({});
        console.log('Total Users:', users.length);

        const roles: { [key: string]: number } = {};
        users.forEach(u => {
            const role = u.role || 'undefined';
            roles[role] = (roles[role] || 0) + 1;
        });
        console.log('Role distribution:', roles);

        const faculty = users.filter(u => u.role === 'faculty');
        if (faculty.length > 0) {
            console.log('Faculty details:');
            faculty.forEach(f => console.log(`- ${f.name} (${f.email})`));
        } else {
            console.log('No faculty found in database.');
        }

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

analyzeRoles();
