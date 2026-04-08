'use client';

import { useRouter } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import { APP_NAME, ROUTES } from '@/constants';

interface HeaderProps {
    user: {
        name: string;
        registration_number?: string;
        email?: string;
        year?: string;
        role?: string;
        department?: string;
    } | null;
    roleDescription?: string;
    showLogout?: boolean;
}

export default function Header({ user, roleDescription, showLogout = true }: HeaderProps) {
    const router = useRouter();

    const handleLogout = () => {
        localStorage.clear();
        router.push(ROUTES.LOGIN);
    };

    return (
        <header className="header" style={{
            padding: '1.2rem 2rem',
            marginBottom: '1rem',
            background: 'var(--card-bg)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: 'var(--card-shadow)'
        }}>
            <div>
                <h3 style={{ color: 'var(--primary)', margin: 0, fontSize: '1rem', fontWeight: '800' }}>{APP_NAME}</h3>
                {user && (
                    <>
                        {user.role === 'admin' ? (
                            <h2 style={{ color: 'var(--text-color)', margin: '0.2rem 0', fontSize: '1.4rem' }}>
                                Welcome, Admin
                            </h2>
                        ) : (
                            <>
                                <h2 style={{ color: 'var(--text-color)', margin: '0.2rem 0', fontSize: '1.4rem' }}>
                                    Welcome back, {user.name}
                                </h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                                    {user.registration_number || user.email}
                                    {user.department && ` • ${user.department}`}
                                    {user.year && ` • Year: ${user.year}${user.year.toString().match(/^[1-4]$/) ? ['st', 'nd', 'rd', 'th'][parseInt(user.year) - 1] : ''}`}
                                </p>
                            </>
                        )}
                    </>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <ThemeToggle />
                {showLogout && (
                    <button
                        className="btn btn-outline"
                        style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.9rem',
                            borderColor: 'var(--danger)',
                            color: 'var(--danger)'
                        }}
                        onClick={handleLogout}
                    >
                        Logout
                    </button>
                )}
            </div>
        </header>
    );
}
