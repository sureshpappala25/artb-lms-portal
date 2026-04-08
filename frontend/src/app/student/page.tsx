'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import { apiRequest } from '@/lib/api';
import { ROUTES, USER_ROLES } from '@/constants';

export default function StudentDashboard() {
  const [user, setUser] = useState<any>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('exams');
  const [myResults, setMyResults] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const data = localStorage.getItem('user');
    if (!data) return router.push(ROUTES.LOGIN);
    const parsed = JSON.parse(data);
    if (parsed.role !== USER_ROLES.STUDENT) return router.push(ROUTES.LOGIN);
    setUser(parsed);
    fetchExams();
    fetchMyResults();
  }, [router]);

  const fetchMyResults = async () => {
    try {
      const data = await apiRequest('/attempts/results/my');
      setMyResults(data);
    } catch (err) {
      console.error('Error fetching my results:', err);
    }
  };

  const fetchExams = async () => {
    try {
      const data = await apiRequest('/exams');
      setExams(data);
    } catch (err) {
      console.error('Error fetching exams:', err);
    }
  };

  const navigate = (tab: string) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  if (!user) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard-layout fade-in">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Hamburger Button */}
      <button
        className="burger-btn"
        aria-label="Open menu"
        onClick={() => setSidebarOpen(true)}
      >
        <span /><span /><span />
      </button>

      <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
        {/* Close button inside sidebar for mobile */}
        <button
          className="sidebar-close-btn"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        >
          ✕
        </button>
        <div className="logo-area">
          <h3>ARTB - LMS</h3>
          <h2>Student Portal</h2>
        </div>
        <nav className="nav-menu">
          <button className={`nav-btn ${activeTab === 'exams' ? 'active' : ''}`} onClick={() => navigate('exams')}>Available Exams</button>
          <button className={`nav-btn ${activeTab === 'results' ? 'active' : ''}`} onClick={() => {
            navigate('results');
            fetchMyResults();
          }}>Results</button>
          <button className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => navigate('profile')}>Student Profile</button>
        </nav>
      </aside>

      <main className="main-content">
        <Header user={user} roleDescription="AVANTHI'S RESEARCH & TECHNOLOGICAL ACADEMY" />

        <div className="content-area">
          {activeTab === 'exams' ? (
            <div className="fade-in">
              <div className="section-header" style={{ marginBottom: '2rem' }}>
                <h2 style={{ color: 'var(--text-color)', fontSize: '1.8rem', fontWeight: '700', marginBottom: '1.5rem' }}>Your Assessments</h2>
              </div>

              <div className="grid">
                {exams.filter(exam => {
                  const matchesYear = exam.target_years?.includes(parseInt(user.year || '1', 10)) || exam.target_year === parseInt(user.year || '1', 10);
                  const matchesDept = !exam.departments || exam.departments.length === 0 || exam.departments.includes(user.department);
                  return matchesYear && matchesDept;
                }).length === 0 ? (
                  <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>No assessments currently available for your year and department.</p>
                  </div>
                ) : (
                  exams
                    .filter(exam => {
                      const matchesYear = exam.target_years?.includes(parseInt(user.year || '1', 10)) || exam.target_year === parseInt(user.year || '1', 10);
                      const matchesDept = !exam.departments || exam.departments.length === 0 || exam.departments.includes(user.department);
                      return matchesYear && matchesDept;
                    })
                    .map((exam) => {
                      const now = new Date();
                      const start = new Date(exam.start_time);
                      const end = new Date(exam.end_time);
                      const isScheduled = now < start;
                      const isEnded = now > end;
                      const isLive = !isScheduled && !isEnded;

                      const attempt = myResults.find(r => r.exam_title === exam.title);
                      const hasAttempted = !!attempt && (attempt.status === 'evaluated' || attempt.status === 'submitted' || attempt.status === 'disqualified');
                      const isOngoing = !!attempt && attempt.status === 'ongoing';

                      return (
                        <div key={exam._id} className="card exam-card">
                          <div className={`exam-status ${isLive ? 'status-live' : isEnded ? 'status-ended' : 'status-scheduled'}`}>
                            {isLive ? 'Live' : isEnded ? 'Ended' : 'Scheduled'}
                          </div>
                          <h3>{exam.title}</h3>
                          <div className="exam-meta" style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1rem' }}>
                            <div style={{ fontSize: '0.85rem', display: 'flex', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                              <span style={{ fontWeight: '600' }}>Start Time:</span>
                              <span>{start.toLocaleDateString('en-GB')} • {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', display: 'flex', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                              <span style={{ fontWeight: '600' }}>End Time:</span>
                              <span>{end.toLocaleDateString('en-GB')} • {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                          <div className="tags">
                            <span className="tag">Questions: {exam.questions?.length || 0}</span>
                          </div>
                          <button
                            className="btn btn-primary"
                            style={{
                              width: '100%',
                              marginTop: '1.5rem',
                              background: hasAttempted ? 'rgba(56, 139, 253, 0.1)' : undefined,
                              color: hasAttempted ? '#58a6ff' : undefined,
                              border: hasAttempted ? '1px solid rgba(56, 139, 253, 0.3)' : undefined,
                              opacity: isLive || hasAttempted ? 1 : 0.5,
                              cursor: isLive || hasAttempted ? 'pointer' : 'not-allowed'
                            }}
                            disabled={!isLive && !hasAttempted}
                            onClick={() => {
                              if (hasAttempted) {
                                setActiveTab('results');
                              } else {
                                router.push(`/exam/${exam._id}`);
                              }
                            }}
                          >
                            {hasAttempted ? 'View Result' : isOngoing ? 'Resume' : isLive ? 'Start Exam' : isEnded ? 'Exam Ended' : 'Not Started'}
                          </button>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          ) : activeTab === 'results' ? (
            <div className="fade-in">
              <div className="section-header" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'var(--text-color)' }}>My Performance</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Track your scores and evaluation history</p>
              </div>

              <div className="card" style={{ padding: '1.5rem' }}>
                {myResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>You haven't completed any assessments yet.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          <th style={{ padding: '1rem' }}>Exam Title</th>
                          <th style={{ padding: '1rem' }}>Date</th>
                          <th style={{ padding: '1rem' }}>Score</th>
                          <th style={{ padding: '1rem' }}>Percentage</th>
                          <th style={{ padding: '1rem' }}>Result</th>
                          <th style={{ padding: '1rem' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myResults.map((res: any) => (
                          <tr key={res._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '1rem', color: 'var(--text-color)', fontWeight: '500' }}>{res.exam_title}</td>
                            <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                              {res.date ? new Date(res.date).toLocaleDateString('en-GB') : 'N/A'}
                            </td>
                            <td style={{ padding: '1rem', color: 'var(--text-color)' }}>{res.obtained_marks} / {res.total_marks}</td>
                            <td style={{ padding: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ flex: '1', height: '6px', background: 'var(--input-bg)', borderRadius: '3px', overflow: 'hidden', maxWidth: '100px' }}>
                                  <div style={{ width: `${res.percentage}%`, height: '100%', background: parseFloat(res.percentage) >= 40 ? '#10b981' : '#ef4444' }}></div>
                                </div>
                                <span style={{ color: parseFloat(res.percentage) >= 40 ? '#10b981' : '#ef4444', fontWeight: '600' }}>{res.percentage}%</span>
                              </div>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{
                                background: parseFloat(res.percentage) >= 40 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: parseFloat(res.percentage) >= 40 ? '#10b981' : '#ef4444',
                                padding: '0.25rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600',
                                border: `1px solid ${parseFloat(res.percentage) >= 40 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                              }}>
                                {parseFloat(res.percentage) >= 40 ? 'Qualified' : 'Disqualified'}
                              </span>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{
                                fontSize: '0.8rem',
                                padding: '0.25rem 0.6rem',
                                borderRadius: '4px',
                                background: 'var(--muted-bg)',
                                color: 'var(--accent)'
                              }}>{res.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="fade-in">
              <div className="section-header" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'var(--text-color)' }}>Student Profile</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Your personal and academic information</p>
              </div>

              <div className="card profile-card" style={{ maxWidth: '600px', padding: '2.5rem' }}>
                <div className="profile-details">
                  <div className="detail-row">
                    <span className="label">Full Name</span>
                    <span className="value">{user.name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Registration Number</span>
                    <span className="value">{user.registration_number || 'Not Applied'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Email Address</span>
                    <span className="value">{user.email}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Mobile Number</span>
                    <span className="value">{user.mobile_number || 'Not Added'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Current Year</span>
                    <span className="value">{user.year || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Department / Branch</span>
                    <span className="value">{user.department || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main >

      <style jsx>{`
        /* ── Layout ── */
        .dashboard-layout {
          display: flex;
          height: 100vh;
          background: var(--bg-color);
          position: relative;
        }

        /* ── Sidebar ── */
        .sidebar {
          width: 260px;
          min-width: 260px;
          background: var(--secondary);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
          box-shadow: 4px 0 15px rgba(0, 0, 0, 0.03);
          position: relative;
          color: #4a4a4b;
          z-index: 200;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sidebar-close-btn {
          display: none;
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: transparent;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          color: var(--text-secondary);
          line-height: 1;
          padding: 0.3rem 0.5rem;
          border-radius: 6px;
        }
        .sidebar-close-btn:hover { background: var(--muted-bg); }
        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          z-index: 150;
        }
        .logo-area {
          padding: 1rem;
          margin-bottom: 2rem;
          color: var(--primary);
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .logo-area h3 {
          font-size: 1.4rem;
          margin: 0;
        }
        .logo-area h2 {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-secondary);
          margin: 0.3rem 0 0 0;
        }
        .nav-menu {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .nav-btn {
          padding: 0.9rem 1.25rem;
          color: #555 !important;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 8px;
          text-align: left;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 500;
          transition: all 0.2s ease;
          width: 100%;
        }
        .nav-btn:hover {
          background: rgba(0, 86, 179, 0.05);
          color: var(--primary) !important;
          transform: translateX(4px);
        }
        .nav-btn.active {
          background: rgba(0, 86, 179, 0.12);
          color: var(--primary) !important;
          border: 1px solid rgba(0, 86, 179, 0.2);
          font-weight: 700;
        }

        /* ── Burger button – hidden on desktop ── */
        .burger-btn {
          display: none;
          position: fixed;
          top: 1rem;
          left: 1rem;
          z-index: 140;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          width: 42px;
          height: 42px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          cursor: pointer;
          box-shadow: var(--card-shadow);
          padding: 0;
        }
        .burger-btn span {
          display: block;
          width: 20px;
          height: 2px;
          background: var(--text-color);
          border-radius: 2px;
          transition: 0.2s;
        }
        .burger-btn:hover { border-color: var(--primary); }

        /* ── Main content ── */
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }
        .content-area {
          padding: 0 2rem 2rem 2rem;
        }

        /* ── Card grid ── */
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.8rem;
        }
        .exam-status {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 1.25rem;
        }
        .status-live { background: rgba(0, 86, 179, 0.1); color: var(--primary); border: 1px solid rgba(0, 86, 179, 0.2); }
        .status-ended { background: rgba(217, 48, 37, 0.1); color: var(--danger); border: 1px solid rgba(217, 48, 37, 0.2); }
        .status-scheduled { background: rgba(0, 123, 255, 0.1); color: var(--accent); border: 1px solid rgba(0, 123, 255, 0.2); }

        .exam-card h3 {
          color: var(--text-color);
          margin-bottom: 0.5rem;
          font-size: 1.2rem;
        }
        .exam-meta {
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin-bottom: 1.25rem;
        }
        .tags {
          display: flex;
          gap: 0.6rem;
        }
        .tag {
          font-size: 0.75rem;
          background: var(--bg-color);
          padding: 0.3rem 0.8rem;
          border-radius: 4px;
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
        }

        /* ── Profile ── */
        .profile-details {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .detail-row {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding-bottom: 1.2rem;
          border-bottom: 1px solid var(--border-color);
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-row .label {
          color: var(--text-secondary);
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .detail-row .value {
          color: var(--text-color);
          font-size: 1.15rem;
          font-weight: 500;
        }

        /* ── Mobile / Tablet ── */
        @media (max-width: 900px) {
          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            transform: translateX(-100%);
            box-shadow: 6px 0 24px rgba(0,0,0,0.18);
            z-index: 200;
          }
          .sidebar--open {
            transform: translateX(0);
          }
          .sidebar-close-btn {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .sidebar-overlay {
            display: block;
          }
          .burger-btn {
            display: flex;
          }
          .content-area {
            padding: 1.2rem;
            padding-top: 4.5rem;
          }
          .grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 480px) {
          .grid {
            grid-template-columns: 1fr;
          }
          .exam-card h3 {
            font-size: 1rem;
          }
        }
      `}</style>
    </div >
  );
}
