'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import { apiRequest } from '@/lib/api';
import { ROUTES, USER_ROLES } from '@/constants';

export default function FacultyDashboard() {
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('monitoring');
    const [exams, setExams] = useState<any[]>([]);
    const router = useRouter();

    useEffect(() => {
        const data = localStorage.getItem('user');
        if (!data) return router.push(ROUTES.LOGIN);
        const parsed = JSON.parse(data);
        if (parsed.role !== USER_ROLES.FACULTY) return router.push(ROUTES.LOGIN);
        setUser(parsed);
        fetchExams();
    }, [router]);

    const fetchExams = async () => {
        try {
            const data = await apiRequest('/exams');
            setExams(data);
        } catch (err) {
            console.error('Error fetching exams:', err);
        }
    };

    if (!user) return <div className="loading">Loading...</div>;

    const renderContent = () => {
        switch (activeTab) {
            case 'assessments':
                return (
                    <div className="fade-in">
                        <div className="header-section" style={{ marginBottom: '1.5rem' }}>
                            <h3>View All Assessments</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Comprehensive list of all platform exams</p>
                        </div>
                        <div className="card">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ padding: '1rem' }}>Title</th>
                                        <th style={{ padding: '1rem' }}>Questions</th>
                                        <th style={{ padding: '1rem' }}>Year(s)</th>
                                        <th style={{ padding: '1rem' }}>Date</th>
                                        <th style={{ padding: '1rem' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {exams.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No assessments found.</td>
                                        </tr>
                                    ) : (
                                        exams.map((exam) => (
                                            <tr key={exam._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '1rem' }}>{exam.title}</td>
                                                <td style={{ padding: '1rem' }}>{exam.questions?.length || 0}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    {exam.target_years?.join(', ') || exam.target_year || 'N/A'}
                                                </td>
                                                <td style={{ padding: '1rem' }}>{new Date(exam.start_time).toLocaleDateString('en-GB')}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span className="tag" style={{ background: 'rgba(56, 139, 253, 0.15)', color: '#58a6ff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>Active</span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'evaluate':
                return (
                    <div className="card fade-in">
                        <h3>Evaluate Answers</h3>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Answer evaluation module coming soon...</p>
                    </div>
                );
            case 'attempts':
                return (
                    <div className="card fade-in">
                        <h3>Student Attempts</h3>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Student attempts module coming soon...</p>
                    </div>
                );
            case 'monitoring':
            default:
                return (
                    <div className="card fade-in">
                        <h3>Live Exam Monitoring</h3>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>No active exams to monitor currently.</p>
                    </div>
                );
        }
    };

    return (
        <div className="dashboard-layout fade-in">
            <aside className="sidebar">
                <div className="logo-area" style={{ color: 'var(--accent)' }}>
                    <h3>Faculty Portal</h3>
                </div>
                <nav className="nav-menu">
                    <button className={activeTab === 'monitoring' ? 'active' : ''} onClick={() => setActiveTab('monitoring')}>Live Monitoring</button>
                    <button className={activeTab === 'assessments' ? 'active' : ''} onClick={() => setActiveTab('assessments')}>Assessments</button>
                    <button className={activeTab === 'evaluate' ? 'active' : ''} onClick={() => setActiveTab('evaluate')}>Evaluate Answers</button>
                    <button className={activeTab === 'attempts' ? 'active' : ''} onClick={() => setActiveTab('attempts')}>Student Attempts</button>
                </nav>
            </aside>

            <main className="main-content">
                <Header user={user} roleDescription="Faculty Member" />

                <div className="content-area">
                    {renderContent()}
                </div>
            </main>

            <style jsx>{`
        .dashboard-layout {
          display: flex;
          height: 100vh;
          background: var(--bg-color);
        }
        .sidebar {
          width: 280px;
          background: var(--secondary);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
          box-shadow: 4px 0 15px rgba(0, 0, 0, 0.03);
          position: relative;
          color: #4a4a4b; 
        }
        .logo-area {
          padding: 1rem;
          margin-bottom: 2.5rem;
          color: var(--primary);
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .logo-area h3 { font-size: 1.4rem; margin: 0; }
        .nav-menu {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .nav-menu button {
          padding: 0.9rem 1.25rem;
          color: var(--text-secondary);
          background: transparent;
          border: 1px solid transparent;
          border-radius: 8px;
          text-align: left;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 500;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
        }
        .nav-menu button:hover {
          background: rgba(0, 86, 179, 0.05);
          color: var(--primary);
          transform: translateX(4px);
        }
        .nav-menu button.active {
          background: rgba(0, 86, 179, 0.1);
          color: var(--primary);
          border: 1px solid rgba(0, 86, 179, 0.15);
          font-weight: 600;
        }
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }
        .user-role {
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .content-area {
          padding: 2.5rem;
        }
      `}</style>
        </div>
    );
}
