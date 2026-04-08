import { Request, Response } from 'express';
import User from '../models/User';
import generateToken from '../utils/generateToken';
import sendEmail from '../utils/sendEmail';

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const authUser = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        // Find user by email OR registration_number
        const user = await User.findOne({
            $or: [
                { email: email },
                { registration_number: email }
            ]
        });

        if (user) {
            const isMatch = await user.matchPassword(password);

            if (isMatch) {
                res.json({
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    registration_number: user.registration_number,
                    role: user.role,
                    year: user.year,
                    department: user.department,
                    token: generateToken(user._id.toString(), user.role),
                });
            } else {
                res.status(401).json({ message: 'Invalid credentials' });
            }
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
    const { name, email, password, role, year, department } = req.body;

    try {
        // Students must be created by admin — no self-registration allowed
        const requestedRole = role || 'student';
        if (requestedRole === 'student') {
            return res.status(403).json({ message: 'Student accounts can only be created by an administrator.' });
        }

        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
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
                token: generateToken(user._id.toString(), user.role),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Forgot Password - Request OTP
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({
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

        await user.save();

        const message = `Your password reset OTP is: ${otp}. It will expire in 10 minutes.`;

        await sendEmail({
            email: user.email,
            subject: 'Password Reset OTP',
            message,
        });

        res.status(200).json({ message: 'OTP sent to email' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset Password with OTP
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req: Request, res: Response) => {
    const { email, otp, newPassword } = req.body;

    try {
        const user = await User.findOne({
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

        await user.save();

        res.status(200).json({ message: 'Password reset successful' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
