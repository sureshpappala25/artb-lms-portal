import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User';
import connectDB from './src/config/db';

dotenv.config();

const checkUsers = async () => {
    try {
        await connectDB();
        const users = await User.find({});
        console.log('Total Users:', users.length);

        const faculties = users.filter(u => u.role === 'faculty');
        console.log('Faculties found:', faculties.length);
        faculties.forEach(f => {
            console.log(`- ${f.name} (${f.email})`);
        });

        if (faculties.length > 0) {
            const faculty = faculties[0];
            const isMatch = await faculty.matchPassword('faculty123');
            console.log(`Password Match Test for ${faculty.email} (faculty123):`, isMatch);
        }

        const admin = users.find(u => u.role === 'admin');
        if (admin) {
            console.log('Admin Found:', admin.email);
            const isMatch = await admin.matchPassword('admin@123');
            console.log('Password Match Test (admin@123):', isMatch);
        } else {
            console.log('Admin NOT Found in DB');
        }

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkUsers();
