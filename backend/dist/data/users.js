"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const hashPassword = (password) => {
    return bcrypt_1.default.hashSync(password, 10);
};
exports.users = [
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
