import bcrypt from 'bcrypt';

const hashPassword = (password: string) => {
    return bcrypt.hashSync(password, 10);
};

export const users = [
    {
        name: 'Admin',
        email: 'admin@college.edu',
        password_hash: hashPassword('admin@123'),
        role: 'admin',
        department: 'Management',
    },
    {
        name: 'Prof. John Doe',
        email: 'faculty1@college.edu',
        password_hash: hashPassword('faculty123'),
        role: 'faculty',
        department: 'Computer Science',
    },
];
