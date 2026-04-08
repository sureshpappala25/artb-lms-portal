'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import './globals.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data));

        if (data.role === 'admin') router.push('/admin');
        else if (data.role === 'faculty') router.push('/faculty');
        else router.push('/student');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err: any) {
      setError('Cannot connect to server');
    }
  };

  return (
    <div className="login-page-wrapper">
      {/* Left Panel - 45% Static Image */}
      <div className="left-panel">
        <div className="static-bg" />
      </div>

      {/* Right Panel - 55% Slideshow + Login Card */}
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
            <div className="login-header">
              <h1>ARTB LMS PORTAL</h1>
              <p>Sign in to your account</p>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <form onSubmit={handleLogin} className="login-form">
              <label>Username</label>
              <input
                type="text"
                required
                placeholder="Enter Email or Registration Number"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
              />

              <label>Password</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="forgot-password-container">
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={() => router.push('/forgot-password')}
                >
                  Forgot Password?
                </button>
              </div>

              <button type="submit" className="btn btn-primary login-btn">
                Login
              </button>
            </form>
          </div>
        </div>
      </div>

      {notification && (
        <div className="admin-notification-overlay">
          <div className={`admin-notification-card ${notification.type} fade-in-notif`}>
            <div className="notif-icon">
              {notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'}
            </div>
            <div className="notif-content">
              <div className="notif-title">
                {notification.type === 'success' ? 'Success' : notification.type === 'error' ? 'Error' : 'Notification'}
              </div>
              <p className="notif-message">{notification.message}</p>
            </div>
            <button className="notif-close" onClick={() => setNotification(null)}>×</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .login-page-wrapper {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: #000;
        }

        .left-panel {
          flex: 0 0 45%;
          height: 100%;
          position: relative;
          border-right: 1px solid rgba(255, 255, 255, 0.1);
        }

        .static-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: url('/image 0.jpeg') center/cover no-repeat;
        }

        .right-panel {
          flex: 1;
          height: 100%;
          position: relative;
        }

        .slideshow-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .slide {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
          opacity: 0;
          transition: opacity 1.5s ease-in-out;
        }

        .slide.active {
          opacity: 1;
        }

        .login-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }

        .glass-morphism {
          background: rgba(58, 62, 109, 0.75);
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.125);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }

        .login-card {
          width: 100%;
          max-width: 380px;
          padding: 3rem 2.5rem;
          border-radius: 16px;
          color: #fff;
        }

        .login-header h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          font-weight: 800;
          background: linear-gradient(45deg, #fff, #bbb);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .login-header p {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.95rem;
          margin-bottom: 2rem;
          text-align: center;
        }

        .login-form label {
          display: block;
          margin-bottom: 0.4rem;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 500;
        }

        .input-field {
          width: 100%;
          padding: 0.8rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: #f7f1f1ff;
          margin-bottom: 1.2rem;
        }

        .input-field::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .select-role {
          appearance: none;
          background: rgba(58, 62, 109, 0.75) url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat calc(100% - 12px) center;
        }

        .password-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .toggle-password {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(255, 255, 255, 0.6);
          display: flex;
          align-items: center;
          top: 13px;
        }

        .login-btn {
          width: 100%;
          margin-top: 1rem;
          padding: 0.9rem;
          font-size: 1rem;
          background: #fff;
          color: #000;
          font-weight: 700;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .login-btn:hover {
          background: rgba(255, 255, 255, 0.9);
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(255, 255, 255, 0.2);
        }

        .forgot-password-link {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85rem;
          cursor: pointer;
          margin-bottom: 1rem;
          display: block;
          text-align: right;
          width: 100%;
        }

        .error-msg {
          background: rgba(255, 0, 85, 0.2);
          color: #ff4d4f;
          padding: 0.8rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          border: 1px solid rgba(255, 0, 85, 0.4);
          text-align: center;
          font-size: 0.9rem;
        }

        @media (max-width: 768px) {
          .left-panel {
            display: none;
          }
          .right-panel {
            flex: 0 0 100%;
          }
        }

        .admin-notification-overlay {
          position: fixed;
          top: 2rem;
          right: 2rem;
          z-index: 10000;
          pointer-events: none;
        }

        .admin-notification-card {
          pointer-events: auto;
          min-width: 320px;
          max-width: 450px;
          background: rgba(30, 30, 46, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
          position: relative;
        }

        .admin-notification-card.success { border-left: 4px solid #4ade80; }
        .admin-notification-card.error { border-left: 4px solid #f87171; }
        .admin-notification-card.info { border-left: 4px solid #60a5fa; }

        .notif-icon { font-size: 1.25rem; flex-shrink: 0; }
        .notif-content { flex: 1; }
        .notif-title { font-weight: 700; color: #fff; font-size: 0.95rem; margin-bottom: 0.25rem; }
        .notif-message { color: rgba(255, 255, 255, 0.7); font-size: 0.85rem; line-height: 1.5; margin: 0; }
        .notif-close {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.4);
          font-size: 1.5rem;
          cursor: pointer;
          line-height: 1;
          padding: 0;
          margin-top: -0.25rem;
        }
        .notif-close:hover { color: #fff; }

        .fade-in-notif { animation: fadeInNotif 0.3s ease-out; }
        @keyframes fadeInNotif {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
