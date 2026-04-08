'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowLeft, Mail, ShieldCheck, Lock } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import '../globals.css';

export default function ForgotPasswordPage() {
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [currentSlide, setCurrentSlide] = useState(0);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    const router = useRouter();

    const slideshowImages = [
        '/image 1.jpeg',
        '/image 2.jpeg',
        '/image 3.jpeg',
        '/image 4.jpeg',
        '/image 5.jpeg'
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slideshowImages.length);
        }, 3000);
        return () => clearInterval(timer);
    }, [slideshowImages.length]);

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();
            if (res.ok) {
                setStep(2);
                setMessage('OTP sent to your email.');
            } else {
                setError(data.message || 'Error sending OTP');
            }
        } catch (err) {
            setError('Cannot connect to server');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) {
            setError('Please enter a 6-digit OTP');
            return;
        }
        setError('');
        setStep(3);
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setError('');
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, newPassword }),
            });

            const data = await res.json();
            if (res.ok) {
                setMessage('Password reset successful! Redirecting to login...');
                setTimeout(() => router.push('/'), 3000);
            } else {
                setError(data.message || 'Error resetting password');
            }
        } catch (err) {
            setError('Cannot connect to server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page-wrapper">
            <div className="left-panel">
                <div className="static-bg" />
            </div>

            <div className="right-panel">
                <div className="slideshow-container">
                    {slideshowImages.map((img, index) => (
                        <div
                            key={index}
                            className={`slide ${index === currentSlide ? 'active' : ''}`}
                            style={{ backgroundImage: `url("${img}")` }}
                        />
                    ))}
                </div>
                <div className="login-overlay">
                    <div className="login-card glass-morphism animate-fade-in">
                        <button
                            onClick={() => step === 1 ? router.push('/') : setStep(step - 1)}
                            className="back-btn"
                        >
                            <ArrowLeft size={20} /> Back
                        </button>

                        <div className="login-header">
                            <h1>{step === 1 ? 'Forgot Password' : step === 2 ? 'Verify OTP' : 'New Password'}</h1>
                            <p>
                                {step === 1 ? 'Enter your email to receive a reset code' :
                                    step === 2 ? `Enter the 6-digit code sent to ${email}` :
                                        'Create a strong new password'}
                            </p>
                        </div>

                        {error && <div className="error-msg">{error}</div>}
                        {message && <div className="success-msg">{message}</div>}

                        {step === 1 && (
                            <form onSubmit={handleRequestOtp} className="login-form">
                                <label>Email ID / Registration Number</label>
                                <div className="input-wrapper">
                                    <Mail className="input-icon" size={18} />
                                    <input
                                        type="text"
                                        required
                                        placeholder="Enter Email or Registration Number"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input-field with-icon"
                                    />
                                </div>
                                <button type="submit" disabled={loading} className="btn-primary login-btn">
                                    {loading ? 'Sending...' : 'Send OTP'}
                                </button>
                            </form>
                        )}

                        {step === 2 && (
                            <form onSubmit={handleVerifyOtp} className="login-form">
                                <label>Verification Code</label>
                                <div className="input-wrapper">
                                    <ShieldCheck className="input-icon" size={18} />
                                    <input
                                        type="text"
                                        required
                                        maxLength={6}
                                        placeholder="Enter 6-digit OTP"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        className="input-field with-icon"
                                    />
                                </div>
                                <button type="submit" className="btn-primary login-btn">
                                    Verify OTP
                                </button>
                            </form>
                        )}

                        {step === 3 && (
                            <form onSubmit={handleResetPassword} className="login-form">
                                <label>New Password</label>
                                <div className="password-wrapper">
                                    <Lock className="input-icon" size={18} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        placeholder="••••••••"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="input-field with-icon"
                                    />
                                </div>

                                <label>Confirm New Password</label>
                                <div className="password-wrapper">
                                    <Lock className="input-icon" size={18} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="input-field with-icon"
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>

                                <button type="submit" disabled={loading} className="btn-primary login-btn">
                                    {loading ? 'Resetting...' : 'Update Password'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
        .login-page-wrapper {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: #000;
        }
        .left-panel { flex: 0 0 45%; height: 100%; position: relative; border-right: 1px solid rgba(255, 255, 255, 0.1); }
        .static-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: url('/image 0.jpeg') center/cover no-repeat; }
        .right-panel { flex: 1; height: 100%; position: relative; }
        .slideshow-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
        .slide { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; opacity: 0; transition: opacity 1.5s ease-in-out; }
        .slide.active { opacity: 1; }
        .login-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; z-index: 10; }
        .glass-morphism { background: rgba(58, 62, 109, 0.75); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); border: 1px solid rgba(255, 255, 255, 0.125); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37); }
        .login-card { width: 100%; max-width: 440px; padding: 3rem 2.5rem; border-radius: 16px; color: #fff; position: relative; }
        .back-btn { background: none; border: none; color: rgba(255, 255, 255, 0.7); display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9rem; margin-bottom: 1.5rem; transition: color 0.3s; }
        .back-btn:hover { color: #fff; }
        .login-header h1 { font-size: 2rem; margin-bottom: 0.5rem; font-weight: 800; background: linear-gradient(45deg, #fff, #bbb); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .login-header p { color: rgba(255, 255, 255, 0.7); font-size: 0.95rem; margin-bottom: 2rem; }
        .login-form label { display: block; margin-bottom: 0.4rem; font-size: 0.9rem; color: rgba(255, 255, 255, 0.9); font-weight: 500; }
        .input-wrapper { position: relative; margin-bottom: 1.2rem; }
        .input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: rgba(255, 255, 255, 0.4); pointer-events: none; }
        .input-field { width: 100%; padding: 0.8rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; color: #fff; }
        .input-field.with-icon { padding-left: 40px; }
        .password-wrapper { position: relative; margin-bottom: 1.2rem; }
        .toggle-password { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: rgba(255, 255, 255, 0.6); }
        .login-btn { width: 100%; margin-top: 1.5rem; padding: 0.9rem; font-size: 1rem; background: #fff; color: #000; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; transition: all 0.3s ease; }
        .login-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.9); transform: translateY(-2px); box-shadow: 0 5px 15px rgba(255, 255, 255, 0.2); }
        .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .error-msg { background: rgba(255, 0, 85, 0.2); color: #ff4d4f; padding: 0.8rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid rgba(255, 0, 85, 0.4); text-align: center; font-size: 0.9rem; }
        .success-msg { background: rgba(74, 222, 128, 0.2); color: #4ade80; padding: 0.8rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid rgba(74, 222, 128, 0.4); text-align: center; font-size: 0.9rem; }
        @media (max-width: 768px) { .left-panel { display: none; } .right-panel { flex: 0 0 100%; } }
      `}</style>
        </div>
    );
}
