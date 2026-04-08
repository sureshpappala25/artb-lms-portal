"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importUsers = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUsers = void 0;
const User_1 = __importDefault(require("../models/User"));
const mammoth_1 = __importDefault(require("mammoth"));
const XLSX = __importStar(require("xlsx"));
const pdf = require('pdf-parse');
// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield User_1.default.find({}).select('-password_hash');
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getUsers = getUsers;
// @desc    Create a new user
// @route   POST /api/users
// @access  Private/Admin
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password, role, department, year, registration_number } = req.body;
        const userExists = yield User_1.default.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }
        // If it's a student and no password provided, use registration number as password
        const finalPassword = password || (role === 'student' ? registration_number : 'password123');
        const user = yield User_1.default.create({
            name,
            email,
            registration_number,
            password_hash: finalPassword,
            role: role || 'student',
            department,
            year,
        });
        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                registration_number: user.registration_number,
                role: user.role,
                department: user.department,
                year: user.year,
            });
        }
        else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.createUser = createUser;
// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.default.findById(req.params.id);
        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.registration_number = req.body.registration_number || user.registration_number;
            user.role = req.body.role || user.role;
            user.department = req.body.department || user.department;
            user.year = req.body.year || user.year;
            if (req.body.password) {
                user.password_hash = req.body.password;
            }
            const updatedUser = yield user.save();
            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                registration_number: updatedUser.registration_number,
                role: updatedUser.role,
                department: updatedUser.department,
                year: updatedUser.year,
            });
        }
        else {
            res.status(404).json({ message: 'User not found' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateUser = updateUser;
// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.default.findById(req.params.id);
        if (user) {
            if (req.user && req.user._id.toString() === user._id.toString()) {
                return res.status(400).json({ message: 'You cannot delete your own account' });
            }
            yield user.deleteOne();
            res.json({ message: 'User removed' });
        }
        else {
            res.status(404).json({ message: 'User not found' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteUser = deleteUser;
// @desc    Import users from file
// @route   POST /api/users/import
// @access  Private/Admin
const importUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }
        const { buffer, originalname } = req.file;
        const extension = (_a = originalname.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        let students = [];
        if (extension === 'docx' || extension === 'doc') {
            const result = yield mammoth_1.default.extractRawText({ buffer });
            students = parseTextToStudents(result.value);
        }
        else if (extension === 'pdf') {
            const data = yield pdf(buffer);
            students = parseTextToStudents(data.text);
        }
        else if (extension === 'xlsx' || extension === 'xls' || extension === 'csv') {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet);
            students = data.map((row) => {
                const reg = row.RegistrationNumber || row.RegistrationNo || row.RegNo
                    || row['Registration number'] || row['Registration Number']
                    || row['Reg No'] || row['Reg no'] || row.registration_number
                    || row.regno || row.regNo || row['Roll No'] || row['Roll Number']
                    || row['Rollno'] || row.rollno || row['Hall Ticket'] || row['HallTicket'];
                const rawEmail = row.Email || row.email || row.EmailID
                    || row['Email ID'] || row['Email Id'] || row.email_id
                    || row['E-mail'] || row['E-Mail'];
                // Auto-generate an email from registration number if not provided
                const email = rawEmail ||
                    (reg ? `${reg.toString().toLowerCase()}@arta.ac.in` : undefined);
                const rawYear = row.Year || row.year || row['Year of Study']
                    || row['Study Year'] || row['Semester'] || row['Sem'];
                return {
                    name: row.Name || row.name || row.FullName
                        || row['Full Name'] || row['Student Name'] || row['STUDENT NAME'],
                    email,
                    registration_number: reg,
                    department: row.Department || row.department || row.Dept
                        || row.dept || row.Branch || row.branch || row['Branch Name']
                        || row['Course'] || row.course,
                    year: rawYear,
                    role: 'student'
                };
            }).filter(s => s.name && (s.email || s.registration_number));
        }
        else {
            return res.status(400).json({ message: 'Unsupported file format' });
        }
        if (students.length === 0) {
            return res.status(400).json({ message: 'No valid student data found in file' });
        }
        let importedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        const skippedNames = [];
        console.log(`Attempting to import ${students.length} students...`);
        for (const student of students) {
            // Skip rows with no valid email
            if (!student.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email)) {
                console.log(`Skipping student ${student.name} due to invalid email: ${student.email}`);
                skippedCount++;
                skippedNames.push(student.name || 'unknown');
                continue;
            }
            // Check if user exists by email or registration number
            let user = yield User_1.default.findOne({
                $or: [
                    { email: student.email },
                    { registration_number: student.registration_number }
                ].filter(q => q.email || q.registration_number)
            });
            if (user) {
                // Update existing user
                user.name = student.name || user.name;
                user.department = student.department || user.department;
                user.year = student.year || user.year;
                user.registration_number = student.registration_number || user.registration_number;
                yield user.save();
                updatedCount++;
                console.log(`Updated existing student: ${student.name}`);
            }
            else {
                // Create new user
                const password = student.registration_number || Math.random().toString(36).slice(-10);
                yield User_1.default.create({
                    name: student.name,
                    email: student.email,
                    registration_number: student.registration_number,
                    password_hash: password,
                    role: 'student',
                    department: student.department || 'General',
                    year: student.year || '1st Year'
                });
                importedCount++;
                console.log(`Imported new student: ${student.name}`);
            }
        }
        res.json({
            message: `Import completed: ${importedCount} new, ${updatedCount} updated, ${skippedCount} skipped`,
            importedCount,
            updatedCount,
            skippedCount,
            skippedNames,
            v: "1.1.1" // Version tag to verify update
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.importUsers = importUsers;
const parseTextToStudents = (text) => {
    const students = [];
    // Regex to match "Name: ... Email: ..." or similar patterns
    // This is a basic parser; more complex logic could be added
    const lines = text.split('\n');
    lines.forEach(line => {
        const emailMatch = line.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
        if (emailMatch) {
            const email = emailMatch[0];
            const name = line.replace(email, '').replace(/[:,-]/g, '').trim() || 'New Student';
            students.push({ name, email });
        }
    });
    return students;
};
