"use strict";
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
exports.resetPassword = exports.forgotPassword = exports.registerUser = exports.authUser = void 0;
const User_1 = __importDefault(require("../models/User"));
const generateToken_1 = __importDefault(require("../utils/generateToken"));
const sendEmail_1 = __importDefault(require("../utils/sendEmail"));
// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        // Find user by email OR registration_number
        const user = yield User_1.default.findOne({
            $or: [
                { email: email },
                { registration_number: email }
            ]
        });
        if (user) {
            const isMatch = yield user.matchPassword(password);
            if (isMatch) {
                res.json({
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    registration_number: user.registration_number,
                    role: user.role,
                    year: user.year,
                    department: user.department,
                    token: (0, generateToken_1.default)(user._id.toString(), user.role),
                });
            }
            else {
                res.status(401).json({ message: 'Invalid credentials' });
            }
        }
        else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.authUser = authUser;
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password, role, year, department } = req.body;
    try {
        // Students must be created by admin — no self-registration allowed
        const requestedRole = role || 'student';
        if (requestedRole === 'student') {
            return res.status(403).json({ message: 'Student accounts can only be created by an administrator.' });
        }
        const userExists = yield User_1.default.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const user = yield User_1.default.create({
            name,
            email,
            password_hash: password,
            role: requestedRole,
            year,
            department,
        });
        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: (0, generateToken_1.default)(user._id.toString(), user.role),
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
exports.registerUser = registerUser;
// @desc    Forgot Password - Request OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    try {
        const user = yield User_1.default.findOne({
            $or: [
                { email: email },
                { registration_number: email }
            ]
        });
        if (!user) {
            // To prevent email enumeration, we could return a success message anyway, 
            // but for this specific flow requested by user, we'll return mapping errors if needed.
            return res.status(404).json({ message: 'Invalid email or registration number' });
        }
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.reset_password_otp = otp;
        user.reset_password_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        yield user.save();
        const message = `Your password reset OTP is: ${otp}. It will expire in 10 minutes.`;
        yield (0, sendEmail_1.default)({
            email: user.email,
            subject: 'Password Reset OTP',
            message,
        });
        res.status(200).json({ message: 'OTP sent to email' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.forgotPassword = forgotPassword;
// @desc    Reset Password with OTP
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, otp, newPassword } = req.body;
    try {
        const user = yield User_1.default.findOne({
            email,
            reset_password_otp: otp,
            reset_password_expires: { $gt: new Date() },
        });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
        // Update password
        user.password_hash = newPassword;
        user.reset_password_otp = undefined;
        user.reset_password_expires = undefined;
        yield user.save();
        res.status(200).json({ message: 'Password reset successful' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.resetPassword = resetPassword;
