'use client';

import { useEffect, useState, useRef, memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import { apiRequest, API_BASE_URL } from '@/lib/api';
import { ROUTES, USER_ROLES } from '@/constants';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Chart.js global configuration is handled inside the AdminDashboard component for theme awareness

const RichTextEditor = ({ value, onChange, placeholder }: { value: string; onChange: (val: string) => void; placeholder?: string }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const execCommand = (command: string, val?: string) => {
    document.execCommand(command, false, val);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      execCommand('insertHTML', `<img src="${base64}" style="max-width: 100%; border-radius: 8px; margin: 0.5rem 0;" />`);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) handleImageFile(file);
      }
    }
  };

  const addTable = () => {
    const rows = parseInt(prompt('Enter number of rows:', '3') || '0');
    const cols = parseInt(prompt('Enter number of columns:', '2') || '0');
    if (rows <= 0 || cols <= 0) return;

    let table = '<table style="width:100%; border-collapse: collapse; border: 1px solid #30363d; margin: 1rem 0;">';
    for (let i = 0; i < rows; i++) {
      table += '<tr>';
      for (let j = 0; j < cols; j++) {
        table += '<td style="border: 1px solid #30363d; padding: 0.5rem;">Cell</td>';
      }
      table += '</tr>';
    }
    table += '</table>';
    execCommand('insertHTML', table);
  };

  const addImage = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-color)', boxShadow: '0 0 20px rgba(0,0,0,0.4)' }}>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
        }}
      />
      <div style={{ background: 'var(--muted-bg)', padding: '0.6rem', display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-outline" title="Bold" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', height: 'auto' }} onClick={() => execCommand('bold')}><b>B</b></button>
        <button type="button" className="btn btn-outline" title="Italic" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', height: 'auto', fontStyle: 'italic' }} onClick={() => execCommand('italic')}><i>I</i></button>
        <button type="button" className="btn btn-outline" title="Underline" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', height: 'auto', textDecoration: 'underline' }} onClick={() => execCommand('underline')}><u>U</u></button>
        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 0.3rem' }}></div>
        <button type="button" className="btn btn-outline" title="Bullet List" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', height: 'auto' }} onClick={() => execCommand('insertUnorderedList')}>• List</button>
        <button type="button" className="btn btn-outline" title="Insert Table" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', height: 'auto' }} onClick={addTable}>+ Table</button>
        <button type="button" className="btn btn-outline" title="Upload Image" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', height: 'auto' }} onClick={addImage}>🖼 Image</button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onPaste={handlePaste}
        style={{ padding: '1.2rem', minHeight: '150px', outline: 'none', color: 'var(--text-color)', fontSize: '1rem', lineHeight: '1.6' }}
      ></div>
    </div>
  );
};

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [assessmentSearch, setAssessmentSearch] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [selectedResultExam, setSelectedResultExam] = useState('');
  const [examResults, setExamResults] = useState<any>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [resultSearch, setResultSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [resultDeptFilter, setResultDeptFilter] = useState('All');
  const [resultYearFilter, setResultYearFilter] = useState('All');
  const [overallResults, setOverallResults] = useState<any[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [examDraft, setExamDraft] = useState({
    title: '',
    departments: ['CSE'] as string[],
    date: '',
    time: '',
    end_date: '',
    end_time: '',
    description: '',
    target_years: [1] as number[],
    duration: 60,
    has_mcq: true,
    has_coding: true,
    mcq_duration: 30,
    coding_duration: 30
  });
  const [selectedYear, setSelectedYear] = useState(1);
  const [globalAnalytics, setGlobalAnalytics] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isNotificationExiting, setIsNotificationExiting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const updateChartDefaults = () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const color = isDark ? '#ffffff' : '#000000';
      const gridColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)';

      ChartJS.defaults.color = color;
      if (ChartJS.defaults.scale?.grid) {
        ChartJS.defaults.scale.grid.color = gridColor;
      }
      ChartJS.defaults.font.weight = 600;

      // Type-safe defensive updates for scale defaults to prevent crashes
      const scales = ChartJS.defaults.scales as any;
      if (scales) {
        if (scales.category) {
          if (scales.category.grid) scales.category.grid.color = 'transparent';
          if (scales.category.ticks) scales.category.ticks.color = color;
        }
        if (scales.linear) {
          if (scales.linear.grid) scales.linear.grid.color = gridColor;
          if (scales.linear.ticks) scales.linear.ticks.color = color;
        }
      }
    };

    updateChartDefaults();
    window.addEventListener('theme-change', updateChartDefaults);
    return () => window.removeEventListener('theme-change', updateChartDefaults);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (notification && notification.type === 'success') {
      const timer = setTimeout(() => {
        setIsNotificationExiting(true);
        setTimeout(() => {
          setNotification(null);
          setIsNotificationExiting(false);
        }, 400); // Wait for fade-out animation
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const closeNotification = useCallback(() => {
    setIsNotificationExiting(true);
    setTimeout(() => {
      setNotification(null);
      setIsNotificationExiting(false);
    }, 400);
  }, []);
  const closeConfirm = useCallback(() => setConfirmDialog(null), []);

  useEffect(() => {
    const data = localStorage.getItem('user');
    if (!data) return router.push(ROUTES.LOGIN);
    const parsed = JSON.parse(data);
    if (parsed.role !== USER_ROLES.ADMIN) return router.push(ROUTES.LOGIN);
    setUser(parsed);
    fetchExams();
    fetchUsers();
    fetchRecentActivity();
    fetchGlobalAnalytics();
  }, [router]);

  const fetchRecentActivity = async () => {
    try {
      const token = localStorage.getItem('token');
      // We'll repurpose the results API or add a new one for wide-scale activity
      // For now, let's fetch all exams and get their totals if a global activity API doesn't exist
      const res = await fetch(`${API_BASE_URL}/exams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        // Just mock some activity for now or fetch from a dedicated endpoint if available
        // Let's assume there's a way to get recent attempts
      }
    } catch (err) {
      console.error('Error fetching activity:', err);
    }
  };

  const AdminNotification = memo(({ message, type, onClose, isExiting }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void, isExiting?: boolean }) => (
    <div className={`admin-notification-container ${isExiting ? 'exit' : ''}`}>
      <div className={`admin-notification-card ${type}`}>
        <div style={{ fontSize: '1.2rem' }}>
          {type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem' }}>{message}</p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem', opacity: 0.7 }}>✕</button>
      </div>
      <style jsx>{`
      .admin-notification-container {
        position: fixed;
        top: 2rem;
        right: 2rem;
        z-index: 10002;
        animation: slideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      }
      .admin-notification-container.exit {
        animation: fadeOutRight 0.4s ease-in forwards;
      }
      .admin-notification-card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 1rem 1.5rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        min-width: 320px;
        box-shadow: 0 15px 35px rgba(0,0,0,0.3);
        border-left: 4px solid var(--primary);
      }
      .admin-notification-card.success { border-left-color: #2bf274; }
      .admin-notification-card.error { border-left-color: #ff1d1d; }
      .admin-notification-card.info { border-left-color: #f1c40f; }
      @keyframes slideIn {
        from { transform: translateX(120%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes fadeOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(120%); opacity: 0; }
      }
    `}</style>
    </div>
  ));

  const AdminConfirm = memo(({ message, onConfirm, onCancel }: { message: string, onConfirm: () => void, onCancel: () => void }) => (
    <div className="admin-confirm-overlay">
      <div className="admin-confirm-card fade-in">
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ color: 'var(--text-color)', marginBottom: '1.5rem', fontSize: '1.5rem' }}>Are you sure?</h2>

        <div style={{
          background: 'rgba(217, 48, 37, 0.05)',
          border: '1px solid rgba(217, 48, 37, 0.2)',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '2rem',
          textAlign: 'left'
        }}>
          <p style={{ color: 'var(--danger)', fontWeight: '700', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>⚠️ Warning</p>
          <p style={{ color: 'var(--text-color)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
            {message}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" style={{ flex: 1, background: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={onConfirm}>
            Confirm Action
          </button>
        </div>
      </div>
      <style jsx>{`
      .admin-confirm-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
      }
      .admin-confirm-card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        padding: 2.5rem;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        text-align: center;
      }
      .fade-in { animation: fadeIn 0.2s ease-out; }
      @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
    `}</style>
    </div>
  ));

  const fetchExams = async () => {
    try {
      const data = await apiRequest('/exams');
      setExams(data);
    } catch (err) {
      console.error('Error fetching exams:', err);
    }
  };

  const fetchGlobalAnalytics = async () => {
    try {
      const data = await apiRequest('/attempts/analytics/global');
      setGlobalAnalytics(data);
    } catch (err) {
      console.error('Error fetching global analytics:', err);
    }
  };

  const fetchResults = async (examId: string) => {
    try {
      if (!examId) return;
      const url = examId === 'overall'
        ? '/attempts/results/summary'
        : `/attempts/results/exam/${examId}`;

      const data = await apiRequest(url);
      if (examId === 'overall') {
        setOverallResults(data);
        setExamResults(null);
      } else {
        setExamResults(data);
        setOverallResults([]);
      }
    } catch (err) {
      console.error('Error fetching results:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await apiRequest('/users');
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const deleteExam = async (id: string) => {
    setConfirmDialog({
      message: 'Are you sure you want to delete this assessment?',
      onConfirm: async () => {
        try {
          await apiRequest(`/exams/${id}`, { method: 'DELETE' });
          setExams(exams.filter(e => e._id !== id));
          fetchGlobalAnalytics();
          setNotification({ message: 'Assessment deleted successfully', type: 'success' });
        } catch (err: any) {
          setNotification({ message: err.message || 'Error deleting exam', type: 'error' });
        }
        setConfirmDialog(null);
      }
    });
  };


  const saveModifiedExam = async () => {
    try {
      // Ensure date is properly formatted if it was changed via datetime-local
      const updateData = { ...selectedExam };

      // Ensure start_time is a Date object
      const startDate = typeof updateData.start_time === 'string'
        ? new Date(updateData.start_time)
        : updateData.start_time;

      const endDate = typeof updateData.end_time === 'string'
        ? new Date(updateData.end_time)
        : updateData.end_time;

      if (endDate <= startDate) {
        return setNotification({ message: "End time must be after start time.", type: 'error' });
      }

      updateData.start_time = startDate;
      updateData.end_time = endDate;
      // Auto-calculate total duration from section durations
      updateData.duration = ((updateData.has_mcq ? (updateData.mcq_duration || 0) : 0) + (updateData.has_coding ? (updateData.coding_duration || 0) : 0)) || updateData.duration || 60;

      await apiRequest(`/exams/${selectedExam._id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      setIsEditing(false);
      fetchExams();
      setNotification({ message: 'Assessment updated successfully!', type: 'success' });
    } catch (err: any) {
      setNotification({ message: err.message || 'Error saving assessment', type: 'error' });
    }
  };

  const publishExam = async () => {
    if (!examDraft.title || !examDraft.date || !examDraft.time || !examDraft.end_date || !examDraft.end_time) {
      return setNotification({ message: 'Missing exam metadata. Please go back and fill the basic details including End Date and Time.', type: 'error' });
    }

    setIsUploading(true);
    try {
      const start = new Date(`${examDraft.date}T${examDraft.time}`);
      const end = new Date(`${examDraft.end_date}T${examDraft.end_time}`);

      if (end <= start) {
        setIsUploading(false);
        return setNotification({ message: "End time must be after start time.", type: 'error' });
      }

      await apiRequest('/exams', {
        method: 'POST',
        body: JSON.stringify({
          title: examDraft.title,
          description: examDraft.description,
          start_time: start,
          end_time: end,
          questions: generatedQuestions,
          target_years: examDraft.target_years,
          departments: examDraft.departments,
          duration: (examDraft.has_mcq ? (examDraft.mcq_duration || 0) : 0) + (examDraft.has_coding ? (examDraft.coding_duration || 0) : 0) || 60,
          has_mcq: examDraft.has_mcq,
          has_coding: examDraft.has_coding,
          mcq_duration: examDraft.mcq_duration,
          coding_duration: examDraft.coding_duration,
          tab_switch_limit: 2,
          answer_reveal_mode: 'after_exam',
          auto_submit: true
        })
      });

      setNotification({ message: 'Exam published successfully!', type: 'success' });
      setGeneratedQuestions([]);
      setExamDraft({ title: '', departments: ['CSE'], date: '', time: '', end_date: '', end_time: '', description: '', target_years: [1], duration: 60, has_mcq: true, has_coding: true, mcq_duration: 30, coding_duration: 30 });
      setActiveTab('assessments');
      fetchExams();
      fetchGlobalAnalytics();
    } catch (err: any) {
      setNotification({ message: err.message || 'Error publishing exam', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const deleteUserAccount = async (id: string) => {
    setConfirmDialog({
      message: 'Are you sure you want to remove this user?',
      onConfirm: async () => {
        try {
          await apiRequest(`/users/${id}`, { method: 'DELETE' });
          setUsers(users.filter(u => u._id !== id));
          fetchGlobalAnalytics();
          setNotification({ message: 'User removed successfully', type: 'success' });
        } catch (err: any) {
          setNotification({ message: err.message || 'Error deleting user', type: 'error' });
        }
        setConfirmDialog(null);
      }
    });
  };

  const saveUserChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isNew = !editingUser._id;
      const url = isNew ? '/users' : `/users/${editingUser._id}`;
      const method = isNew ? 'POST' : 'PUT';

      await apiRequest(url, {
        method,
        body: JSON.stringify(editingUser)
      });
      setIsUserModalOpen(false);
      fetchUsers();
      fetchGlobalAnalytics();
      setNotification({ message: isNew ? 'User created successfully' : 'User updated successfully', type: 'success' });
    } catch (err: any) {
      setNotification({ message: err.message || 'Error saving user', type: 'error' });
    }
  };

  const importUsersFromFile = async (file: File) => {
    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await apiRequest('/users/import', {
        method: 'POST',
        body: formData,
        headers: {} // apiRequest will handle other headers, but we need to let browser set boundary for FormData
      });

      setNotification({ message: data.message, type: 'success' });
      fetchUsers();
      fetchGlobalAnalytics();
    } catch (err: any) {
      setNotification({ message: err.message || 'Error importing users', type: 'error' });
    } finally {
      setIsImporting(false);
    }
  };

  if (!user) return <div className="loading">Loading...</div>;

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setNotification({ message: 'Please select a file first.', type: 'info' });

    setIsUploading(true);
    const formData = new FormData();
    formData.append('document', file);

    try {
      const data = await apiRequest('/exams/generate-from-doc', {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set boundary
      });

      setGeneratedQuestions(data.questions);
      setActiveTab('review-questions');
    } catch (err: any) {
      setNotification({ message: err.message || 'Failed to generate questions', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const removeGeneratedQuestion = (index: number) => {
    const newQs = [...generatedQuestions];
    newQs.splice(index, 1);
    setGeneratedQuestions(newQs);
  };

  const renderContent = () => {
    const studentCount = users.filter(u => u.role === 'student').length;
    const adminCount = users.filter(u => u.role === 'admin' || u.role === 'faculty').length;
    const totalAssessments = exams.length;

    switch (activeTab) {
      case 'users':
        return (
          <div className="fade-in">
            <div className="sticky-panel" style={{ top: '-2.5rem', margin: '0 -2.5rem 2rem -2.5rem', padding: '1.5rem 2.5rem', borderTop: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderRadius: '0' }}>
              <div className="header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-color)' }}>Manage Students</h3>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="file"
                    id="user-import-input"
                    style={{ display: 'none' }}
                    accept=".doc,.docx,.pdf,.xlsx,.xls,.csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) importUsersFromFile(file);
                    }}
                  />
                  <button
                    className="btn btn-outline"
                    disabled={isImporting}
                    onClick={() => document.getElementById('user-import-input')?.click()}
                  >
                    {isImporting ? 'Importing...' : '📥 Import Students'}
                  </button>
                  <button
                    className="btn"
                    style={{ background: 'var(--primary)', color: 'var(--secondary)', padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', fontWeight: '600' }}
                    onClick={() => {
                      setEditingUser({ name: '', email: '', registration_number: '', role: 'student', department: '', year: '', mobile_number: '', password: '' });
                      setIsUserModalOpen(true);
                    }}
                  >
                    + Add Student
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    placeholder="Search by name, registration, or email..."
                    className="input-field"
                    style={{ background: 'var(--input-bg)', width: '100%', paddingLeft: '1rem', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-color)', marginBottom: 0 }}
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
                <select
                  className="input-field"
                  style={{ maxWidth: '180px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-color)', marginBottom: 0 }}
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="all">All Years</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
                <select
                  className="input-field"
                  style={{ maxWidth: '180px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-color)', marginBottom: 0 }}
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                >
                  <option value="all">All Branches</option>
                  <option value="CSE">CSE</option>
                  <option value="CSM">CSM</option>
                  <option value="CSC">CSC</option>
                  <option value="CSD">CSD</option>
                  <option value="ECE">ECE</option>
                  <option value="EEE">EEE</option>
                  <option value="MECH">MECH</option>
                </select>
              </div>
            </div>

            <div className="card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '1.2rem 1rem' }}>S.No</th>
                      <th style={{ padding: '1.2rem 1rem' }}>Name</th>
                      <th style={{ padding: '1.2rem 1rem' }}>Registration number</th>
                      <th style={{ padding: '1.2rem 1rem' }}>Email</th>
                      <th style={{ padding: '1.2rem 1rem' }}>Mobile Number</th>
                      <th style={{ padding: '1.2rem 1rem' }}>Year</th>
                      <th style={{ padding: '1.2rem 1rem' }}>Branch</th>
                      <th style={{ padding: '1.2rem 1rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.filter(u => {
                      const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                        (u.registration_number && u.registration_number.toLowerCase().includes(userSearch.toLowerCase()));
                      const matchesYear = roleFilter === 'all' ||
                        (u.year && u.year.toString().includes(roleFilter));
                      const matchesDept = departmentFilter === 'all' ||
                        (u.department && u.department.toUpperCase() === departmentFilter.toUpperCase());
                      return matchesSearch && matchesYear && matchesDept;
                    }).map((u, idx) => (
                      <tr key={u._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="table-row-hover">
                        <td style={{ padding: '1.2rem 1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{idx + 1}</td>
                        <td style={{ padding: '1.2rem 1rem', color: 'var(--text-color)' }}>{u.name}</td>
                        <td style={{ padding: '1.2rem 1rem', color: 'var(--text-secondary)' }}>{u.registration_number || 'N/A'}</td>
                        <td style={{ padding: '1.2rem 1rem', color: 'var(--text-secondary)' }}>{u.email}</td>
                        <td style={{ padding: '1.2rem 1rem', color: 'var(--text-secondary)' }}>{u.mobile_number || '---'}</td>
                        <td style={{ padding: '1.2rem 1rem', color: 'var(--text-color)' }}>{u.year || 'N/A'}</td>
                        <td style={{ padding: '1.2rem 1rem', color: 'var(--text-color)' }}>{u.department || 'N/A'}</td>
                        <td style={{ padding: '1.2rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }} onClick={() => {
                              setEditingUser(u);
                              setIsUserModalOpen(true);
                            }}>
                              ✏️
                            </button>
                            {u._id !== user._id && (
                              <button style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }} onClick={() => deleteUserAccount(u._id)}>
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'exams':
        return (
          <div className="fade-in">
            <div className="header-section" style={{ marginBottom: '1.5rem' }}>
              <h3>Create New Exam</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Define exam parameters and questions</p>
            </div>

            <div className="card" style={{ maxWidth: '800px' }}>
              <form
                className="login-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  setActiveTab('add-questions');
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-color)' }}>Exam Title</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Data Structures Mid-Term"
                      value={examDraft.title}
                      onChange={(e) => setExamDraft({ ...examDraft, title: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-color)' }}>Department</label>
                    <div style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '1rem',
                      background: 'var(--muted-bg)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}>
                      {['CSE', 'CSC', 'CSM', 'CSD', 'ECE', 'EEE', 'MECH'].map(dept => (
                        <label key={dept} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: 'var(--text-color)', fontSize: '0.9rem' }}>
                          <input
                            type="checkbox"
                            checked={examDraft.departments.includes(dept)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setExamDraft({ ...examDraft, departments: [...examDraft.departments, dept] });
                              } else {
                                setExamDraft({ ...examDraft, departments: examDraft.departments.filter(d => d !== dept) });
                              }
                            }}
                            style={{ accentColor: 'var(--primary)', width: '15px', height: '15px' }}
                          />
                          {dept}
                        </label>
                      ))}
                    </div>
                    {examDraft.departments.length === 0 && (
                      <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.3rem' }}>Please select at least one department.</p>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-color)' }}>Target Year(s)</label>
                  <div style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '1rem',
                    background: 'var(--muted-bg)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}>
                    {[1, 2, 3, 4].map(year => (
                      <label key={year} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: 'var(--text-color)', fontSize: '0.9rem' }}>
                        <input
                          type="checkbox"
                          checked={examDraft.target_years.includes(year)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setExamDraft({ ...examDraft, target_years: [...examDraft.target_years, year] });
                            } else {
                              setExamDraft({ ...examDraft, target_years: examDraft.target_years.filter(y => y !== year) });
                            }
                          }}
                          style={{ accentColor: 'var(--primary)', width: '15px', height: '15px' }}
                        />
                        {year}{year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem', background: 'var(--muted-bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', marginBottom: '1rem', fontWeight: '700' }}>
                      <input
                        type="checkbox"
                        checked={examDraft.has_mcq}
                        onChange={(e) => setExamDraft({ ...examDraft, has_mcq: e.target.checked })}
                        style={{ width: '18px', height: '18px' }}
                      />
                      Enable MCQ Section
                    </label>
                    {examDraft.has_mcq && (
                      <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>MCQ Section Duration (minutes)</label>
                        <input
                          type="number"
                          className="input-field"
                          value={examDraft.mcq_duration}
                          onChange={(e) => setExamDraft({ ...examDraft, mcq_duration: parseInt(e.target.value) })}
                          required
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', marginBottom: '1rem', fontWeight: '700' }}>
                      <input
                        type="checkbox"
                        checked={examDraft.has_coding}
                        onChange={(e) => setExamDraft({ ...examDraft, has_coding: e.target.checked })}
                        style={{ width: '18px', height: '18px' }}
                      />
                      Enable Coding Section
                    </label>
                    {examDraft.has_coding && (
                      <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Coding Section Duration (minutes)</label>
                        <input
                          type="number"
                          className="input-field"
                          value={examDraft.coding_duration}
                          onChange={(e) => setExamDraft({ ...examDraft, coding_duration: parseInt(e.target.value) })}
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-color)' }}>Start Date & Time</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="date"
                        className="input-field"
                        value={examDraft.date}
                        onChange={(e) => setExamDraft({ ...examDraft, date: e.target.value })}
                        required
                      />
                      <input
                        type="time"
                        className="input-field"
                        value={examDraft.time}
                        onChange={(e) => setExamDraft({ ...examDraft, time: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-color)' }}>End Date & Time</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="date"
                        className="input-field"
                        value={examDraft.end_date}
                        onChange={(e) => setExamDraft({ ...examDraft, end_date: e.target.value })}
                        required
                      />
                      <input
                        type="time"
                        className="input-field"
                        value={examDraft.end_time}
                        onChange={(e) => setExamDraft({ ...examDraft, end_time: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-color)' }}>Description / Instructions</label>
                  <RichTextEditor
                    value={examDraft.description}
                    onChange={(val) => setExamDraft({ ...examDraft, description: val })}
                  />
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', margin: '2rem 0', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button type="button" className="btn btn-outline" style={{ padding: '0.6rem 1.5rem' }}>Save Draft</button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.5rem' }}>Continue to Questions ➔</button>
                </div>
              </form>
            </div>
          </div>
        );
      case 'add-questions':
        return (
          <div className="fade-in">
            <div className="header-section" style={{ marginBottom: '1.5rem' }}>
              <h3>Add Assessment Questions</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Choose how you want to add questions to "{examDraft.title}"</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>✨</div>
                <h4 style={{ color: 'var(--text-color)', fontSize: '1.3rem', marginBottom: '1rem' }}>Extract Questions from Document</h4>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', minHeight: '3rem' }}>Upload a PDF, DOCX, or Excel file, and we'll automatically extract all MCQs and Coding problems found.</p>

                <input
                  type="file"
                  id="exam-doc-upload"
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.txt"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    setFile(e.target.files ? e.target.files[0] : null);
                  }}
                />

                {file ? (
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-color)' }}>📄 {file.name}</span>
                    <button style={{ marginLeft: '1rem', color: 'var(--danger)', background: 'none', border: 'none' }} onClick={() => setFile(null)}>✖</button>
                  </div>
                ) : null}

                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => file ? handleFileUpload(new Event('submit') as any) : document.getElementById('exam-doc-upload')?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? 'Generating...' : file ? 'Begin Generation' : 'Select Document'}
                </button>
              </div>

              <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>💻</div>
                <h4 style={{ color: 'var(--text-color)', fontSize: '1.3rem', marginBottom: '1rem' }}>Coding & Manual Entry</h4>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', minHeight: '3rem' }}>Manually add coding problems or MCQs directly to the assessment.</p>

                <button
                  className="btn btn-outline"
                  style={{ width: '100%' }}
                  onClick={() => {
                    setGeneratedQuestions([...generatedQuestions, { question_text: 'New Coding Problem', type: 'coding', marks: 10, test_cases: [{ input: '', expected_output: '' }] }]);
                    setActiveTab('review-questions');
                  }}
                >
                  Add Coding Question
                </button>
                <button
                  className="btn btn-outline"
                  style={{ width: '100%', marginTop: '1rem' }}
                  onClick={() => {
                    setGeneratedQuestions([...generatedQuestions, { question_text: '', type: 'mcq', options: ['', '', '', ''], correct_option: 0, marks: 2 }]);
                    setActiveTab('review-questions');
                  }}
                >
                  Add Manual MCQ
                </button>
              </div>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
              <button className="btn btn-outline" onClick={() => setActiveTab('exams')}>Back to data</button>
              {generatedQuestions.length > 0 && (
                <button className="btn btn-primary" style={{ marginLeft: '1rem' }} onClick={() => setActiveTab('review-questions')}>View Draft Questions ({generatedQuestions.length}) ➔</button>
              )}
            </div>
          </div>
        );
      case 'review-questions':
        return (
          <div className="fade-in">
            <div className="header-section" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              position: 'sticky',
              top: 0,
              zIndex: 100,
              background: 'var(--bg-color)',
              padding: '1rem 0',
              borderBottom: '1px solid var(--border-color)',
              marginTop: '-1rem' // Compensate for content area padding
            }}>
              <div>
                <h3>Review Generated Questions</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Verify and edit the generated questions before publishing.</p>
              </div>
              <button
                className="btn btn-primary"
                style={{ padding: '0.6rem 1.2rem' }}
                onClick={publishExam}
                disabled={isUploading}
              >
                {isUploading ? 'Publishing...' : 'Publish Exam'}
              </button>
            </div>

            <div className="questions-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {generatedQuestions.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: 'var(--text-secondary)' }}>No questions generated yet.</p>
                </div>
              ) : (
                generatedQuestions.map((q, i) => (
                  <div key={i} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: '1.2rem' }}>
                          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Question Statement & Details</label>
                          <RichTextEditor
                            value={q.question_text}
                            onChange={(val) => {
                              const newQs = [...generatedQuestions];
                              newQs[i].question_text = val;
                              setGeneratedQuestions(newQs);
                            }}
                          />
                        </div>

                        {q.type === 'mcq' && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            {q.options.map((opt: string, optIdx: number) => (
                              <div key={optIdx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                  type="radio"
                                  name={`correct-${i}`}
                                  checked={q.correct_option === optIdx}
                                  onChange={() => {
                                    const newQs = [...generatedQuestions];
                                    newQs[i].correct_option = optIdx;
                                    setGeneratedQuestions(newQs);
                                  }}
                                />
                                <input
                                  type="text"
                                  className="input-field"
                                  style={{ border: q.correct_option === optIdx ? '1px solid var(--accent)' : '1px solid var(--border-color)', background: 'var(--input-bg)' }}
                                  value={opt}
                                  onChange={(e) => {
                                    const newQs = [...generatedQuestions];
                                    newQs[i].options[optIdx] = e.target.value;
                                    setGeneratedQuestions(newQs);
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {q.type === 'coding' && (
                          <div style={{ background: 'var(--input-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Test Cases (Input | Expected Output)</label>
                            {q.test_cases?.map((tc: any, tcIdx: number) => (
                              <div key={tcIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', background: 'var(--card-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                  <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Input</label>
                                    <textarea
                                      className="input-field"
                                      style={{ minHeight: '80px', resize: 'vertical', padding: '0.6rem' }}
                                      placeholder="Multi-line input..."
                                      value={tc.input}
                                      onChange={(e) => {
                                        const newQs = [...generatedQuestions];
                                        newQs[i].test_cases[tcIdx].input = e.target.value;
                                        setGeneratedQuestions(newQs);
                                      }}
                                    />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Expected Output</label>
                                    <textarea
                                      className="input-field"
                                      style={{ minHeight: '80px', resize: 'vertical', padding: '0.6rem' }}
                                      placeholder="Multi-line expected output..."
                                      value={tc.expected_output}
                                      onChange={(e) => {
                                        const newQs = [...generatedQuestions];
                                        newQs[i].test_cases[tcIdx].expected_output = e.target.value;
                                        setGeneratedQuestions(newQs);
                                      }}
                                    />
                                  </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={tc.is_hidden}
                                      onChange={(e) => {
                                        const newQs = [...generatedQuestions];
                                        newQs[i].test_cases[tcIdx].is_hidden = e.target.checked;
                                        setGeneratedQuestions(newQs);
                                      }}
                                    />
                                    Mark as Hidden Test Case
                                  </label>
                                  <button
                                    className="btn btn-outline"
                                    style={{ color: 'var(--danger)', borderColor: 'rgba(248, 81, 73, 0.3)', padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                                    onClick={() => {
                                      const newQs = [...generatedQuestions];
                                      newQs[i].test_cases.splice(tcIdx, 1);
                                      setGeneratedQuestions(newQs);
                                    }}
                                  >
                                    ✖ Remove Test Case
                                  </button>
                                </div>
                              </div>
                            ))}
                            <button className="btn btn-outline" style={{ marginTop: '0.8rem', fontSize: '0.8rem' }} onClick={() => {
                              const newQs = [...generatedQuestions];
                              newQs[i].test_cases = [...(newQs[i].test_cases || []), { input: '', expected_output: '', is_hidden: false }];
                              setGeneratedQuestions(newQs);
                            }}>+ Add Test Case</button>
                          </div>
                        )}
                      </div>

                      <div style={{ marginLeft: '2rem', textAlign: 'right' }}>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Marks</label>
                          <input
                            type="number"
                            className="input-field"
                            style={{ width: '60px', textAlign: 'center' }}
                            value={q.marks}
                            onChange={(e) => {
                              const newQs = [...generatedQuestions];
                              newQs[i].marks = parseInt(e.target.value);
                              setGeneratedQuestions(newQs);
                            }}
                          />
                        </div>
                        <button
                          className="btn btn-outline"
                          style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '0.3rem 0.6rem' }}
                          onClick={() => removeGeneratedQuestion(i)}
                        >
                          ✖ Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
              <button className="btn btn-outline" onClick={() => setActiveTab('add-questions')}>+ Add More Questions</button>
              <button className="btn btn-outline" onClick={() => {
                setGeneratedQuestions([...generatedQuestions, { question_text: '', type: 'mcq', options: ['', '', '', ''], correct_option: 0, marks: 1 }]);
              }}>+ Manual MCQ</button>
              <button className="btn btn-outline" onClick={() => {
                setGeneratedQuestions([...generatedQuestions, { question_text: 'New Programming Task', type: 'coding', marks: 10, test_cases: [{ input: '', expected_output: '' }] }]);
              }}>+ Manual Coding</button>
            </div>
          </div>
        );
      case 'assessments':
        if (isEditing && selectedExam) {
          return (
            <div className="fade-in">
              <div className="header-section" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                background: 'var(--bg-color)',
                padding: '1rem 0',
                borderBottom: '1px solid var(--border-color)',
                marginTop: '-1rem'
              }}>
                <div>
                  <button className="btn btn-outline" style={{ marginBottom: '1rem', padding: '0.4rem 0.8rem' }} onClick={() => setIsEditing(false)}>← Back to List</button>
                  <h3>Edit Assessment: {selectedExam.title}</h3>
                </div>
                <button className="btn btn-primary" onClick={saveModifiedExam}>Save Changes</button>
              </div>

              <div className="card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '2rem' }}>
                <h4 style={{ color: 'var(--text-color)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Assessment Analytics & Data</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Exam Title</label>
                      <input
                        type="text"
                        className="input-field"
                        style={{ width: '100%' }}
                        value={selectedExam.title}
                        onChange={(e) => setSelectedExam({ ...selectedExam, title: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Target Year(s)</label>
                      <div style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '1rem',
                        background: 'var(--muted-bg)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.75rem'
                      }}>
                        {[1, 2, 3, 4].map(year => (
                          <label key={year} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: 'var(--text-color)', fontSize: '0.85rem' }}>
                            <input
                              type="checkbox"
                              checked={selectedExam.target_years?.includes(year) || selectedExam.target_year === year}
                              onChange={(e) => {
                                const currentYears = selectedExam.target_years || (selectedExam.target_year ? [selectedExam.target_year] : []);
                                if (e.target.checked) {
                                  setSelectedExam({ ...selectedExam, target_years: [...currentYears, year], target_year: undefined });
                                } else {
                                  setSelectedExam({ ...selectedExam, target_years: currentYears.filter((y: any) => y !== year), target_year: undefined });
                                }
                              }}
                              style={{ accentColor: 'var(--primary)', width: '15px', height: '15px' }}
                            />
                            {year}{year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Start Time (Current: {new Date(selectedExam.start_time).toLocaleString('en-GB')})</label>
                      <input
                        type="datetime-local"
                        className="input-field"
                        style={{ width: '100%' }}
                        onChange={(e) => setSelectedExam({ ...selectedExam, start_time: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>End Time (Current: {new Date(selectedExam.end_time).toLocaleString('en-GB')})</label>
                      <input
                        type="datetime-local"
                        className="input-field"
                        style={{ width: '100%' }}
                        onChange={(e) => setSelectedExam({ ...selectedExam, end_time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', background: 'var(--muted-bg)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', marginBottom: '0.6rem', fontWeight: '700' }}>
                          <input
                            type="checkbox"
                            checked={selectedExam.has_mcq}
                            onChange={(e) => setSelectedExam({ ...selectedExam, has_mcq: e.target.checked })}
                          />
                          Enable MCQ Section
                        </label>
                        {selectedExam.has_mcq && (
                          <div style={{ marginLeft: '1.5rem' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>MCQ Duration (min)</label>
                            <input
                              type="number"
                              className="input-field"
                              value={selectedExam.mcq_duration || 30}
                              style={{ padding: '0.4rem', marginBottom: 0 }}
                              onChange={(e) => setSelectedExam({ ...selectedExam, mcq_duration: parseInt(e.target.value) })}
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', marginBottom: '0.6rem', fontWeight: '700' }}>
                          <input
                            type="checkbox"
                            checked={selectedExam.has_coding}
                            onChange={(e) => setSelectedExam({ ...selectedExam, has_coding: e.target.checked })}
                          />
                          Enable Coding Section
                        </label>
                        {selectedExam.has_coding && (
                          <div style={{ marginLeft: '1.5rem' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Coding Duration (min)</label>
                            <input
                              type="number"
                              className="input-field"
                              value={selectedExam.coding_duration || 30}
                              style={{ padding: '0.4rem', marginBottom: 0 }}
                              onChange={(e) => setSelectedExam({ ...selectedExam, coding_duration: parseInt(e.target.value) })}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Target Department</label>
                      <div style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '1rem',
                        background: 'var(--muted-bg)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.75rem'
                      }}>
                        {['CSE', 'CSC', 'CSM', 'CSD', 'ECE', 'EEE', 'MECH'].map(dept => (
                          <label key={dept} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: 'var(--text-color)', fontSize: '0.85rem' }}>
                            <input
                              type="checkbox"
                              checked={selectedExam.departments?.includes(dept)}
                              onChange={(e) => {
                                const currentDepts = selectedExam.departments || [];
                                if (e.target.checked) {
                                  setSelectedExam({ ...selectedExam, departments: [...currentDepts, dept] });
                                } else {
                                  setSelectedExam({ ...selectedExam, departments: currentDepts.filter((d: any) => d !== dept) });
                                }
                              }}
                              style={{ accentColor: 'var(--primary)', width: '15px', height: '15px' }}
                            />
                            {dept}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <h4 style={{ margin: '1.5rem 0 1rem 0' }}>Questions ({selectedExam.questions?.length || 0})</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {selectedExam.questions?.map((q: any, idx: number) => (
                  <div key={idx} className="card" style={{ background: 'var(--muted-bg)', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <strong>Question {idx + 1}</strong>
                        <select
                          className="input-field"
                          style={{ padding: '0.2rem', height: 'auto', fontSize: '0.8rem', width: 'auto' }}
                          value={q.type}
                          onChange={(e) => {
                            const newQs = [...selectedExam.questions];
                            newQs[idx].type = e.target.value;
                            if (e.target.value === 'mcq' && !newQs[idx].options) newQs[idx].options = ['', ''];
                            setSelectedExam({ ...selectedExam, questions: newQs });
                          }}
                        >
                          <option value="mcq">MCQ</option>
                          <option value="coding">Coding</option>
                          <option value="descriptive">Descriptive</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Marks:</span>
                        <input
                          type="number"
                          style={{ width: '50px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px', padding: '2px' }}
                          value={q.marks}
                          onChange={(e) => {
                            const newQs = [...selectedExam.questions];
                            newQs[idx].marks = parseInt(e.target.value);
                            setSelectedExam({ ...selectedExam, questions: newQs });
                          }}
                        />
                        <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', color: 'var(--danger)', fontSize: '0.8rem' }} onClick={() => {
                          const newQs = [...selectedExam.questions];
                          newQs.splice(idx, 1);
                          setSelectedExam({ ...selectedExam, questions: newQs });
                        }}>✖</button>
                      </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Question Statement</label>
                      <RichTextEditor
                        value={q.question_text}
                        onChange={(val) => {
                          const newQs = [...selectedExam.questions];
                          newQs[idx].question_text = val;
                          setSelectedExam({ ...selectedExam, questions: newQs });
                        }}
                      />
                    </div>

                    {q.type === 'mcq' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: '1rem' }}>
                        {q.options?.map((opt: string, optIdx: number) => (
                          <div key={optIdx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                              type="radio"
                              name={`correct-${idx}`}
                              checked={q.correct_option === optIdx}
                              onChange={() => {
                                const newQs = [...selectedExam.questions];
                                newQs[idx].correct_option = optIdx;
                                setSelectedExam({ ...selectedExam, questions: newQs });
                              }}
                            />
                            <input
                              type="text"
                              className="input-field"
                              style={{ padding: '0.4rem', border: q.correct_option === optIdx ? '1px solid var(--accent)' : '1px solid var(--border-color)' }}
                              value={opt}
                              onChange={(e) => {
                                const newQs = [...selectedExam.questions];
                                newQs[idx].options[optIdx] = e.target.value;
                                setSelectedExam({ ...selectedExam, questions: newQs });
                              }}
                            />
                            <button style={{ color: 'var(--danger)', background: 'none', border: 'none' }} onClick={() => {
                              const newQs = [...selectedExam.questions];
                              newQs[idx].options.splice(optIdx, 1);
                              setSelectedExam({ ...selectedExam, questions: newQs });
                            }}>✖</button>
                          </div>
                        ))}
                        <button className="btn btn-outline" style={{ width: 'fit-content', fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--accent)', borderColor: 'rgba(63, 185, 80, 0.3)' }} onClick={() => {
                          const newQs = [...selectedExam.questions];
                          newQs[idx].options = [...(newQs[idx].options || []), ''];
                          setSelectedExam({ ...selectedExam, questions: newQs });
                        }}>+ Add Option</button>
                      </div>
                    )}

                    {q.type === 'coding' && (
                      <div style={{ marginLeft: '1rem' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Test Cases (Input | Output)</p>
                        {(q.test_cases || []).map((tc: any, tcIdx: number) => (
                          <div key={tcIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.2rem', background: 'var(--input-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                              <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Input</label>
                                <textarea
                                  className="input-field"
                                  style={{ minHeight: '80px', resize: 'vertical', padding: '0.6rem', fontSize: '0.85rem' }}
                                  placeholder="Multi-line input..."
                                  value={tc.input}
                                  onChange={(e) => {
                                    const newQs = [...selectedExam.questions];
                                    newQs[idx].test_cases[tcIdx].input = e.target.value;
                                    setSelectedExam({ ...selectedExam, questions: newQs });
                                  }}
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Expected Output</label>
                                <textarea
                                  className="input-field"
                                  style={{ minHeight: '80px', resize: 'vertical', padding: '0.6rem', fontSize: '0.85rem' }}
                                  placeholder="Multi-line expected output..."
                                  value={tc.expected_output}
                                  onChange={(e) => {
                                    const newQs = [...selectedExam.questions];
                                    newQs[idx].test_cases[tcIdx].expected_output = e.target.value;
                                    setSelectedExam({ ...selectedExam, questions: newQs });
                                  }}
                                />
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={tc.is_hidden}
                                  onChange={(e) => {
                                    const newQs = [...selectedExam.questions];
                                    newQs[idx].test_cases[tcIdx].is_hidden = e.target.checked;
                                    setSelectedExam({ ...selectedExam, questions: newQs });
                                  }}
                                />
                                Hidden Test Case
                              </label>
                              <button
                                style={{ padding: '0.4rem 0.8rem', color: 'var(--danger)', background: 'transparent', border: '1px solid rgba(248, 81, 73, 0.2)', borderRadius: '6px', fontSize: '0.8rem' }}
                                onClick={() => {
                                  const newQs = [...selectedExam.questions];
                                  newQs[idx].test_cases.splice(tcIdx, 1);
                                  setSelectedExam({ ...selectedExam, questions: newQs });
                                }}
                              >
                                ✖ Remove
                              </button>
                            </div>
                          </div>
                        ))}
                        <button className="btn btn-outline" style={{ fontSize: '0.8rem', color: 'var(--primary)', borderColor: 'rgba(88, 166, 255, 0.3)' }} onClick={() => {
                          const newQs = [...selectedExam.questions];
                          newQs[idx].test_cases = [...(newQs[idx].test_cases || []), { input: '', expected_output: '', is_hidden: false }];
                          setSelectedExam({ ...selectedExam, questions: newQs });
                        }}>+ Add Test Case</button>
                      </div>
                    )}
                  </div>
                ))}
                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => {
                  const newQs = [...(selectedExam.questions || []), { question_text: '', type: 'mcq', options: ['', ''], marks: 5 }];
                  setSelectedExam({ ...selectedExam, questions: newQs });
                }}>+ Add New Question</button>
              </div>
            </div>
          );
        }
        return (
          <div className="fade-in">
            <div className="header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-color)' }}>All Assessments</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage exams and evaluations across departments</p>
              </div>
              <button className="btn btn-primary" onClick={() => setActiveTab('exams')}>+ Create New Assessment</button>
            </div>

            <div className="section-filters" style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div className="year-filters">
                  {[1, 2, 3, 4].map((year) => (
                    <button
                      key={year}
                      className={`year-pill ${selectedYear === year ? 'active' : ''}`}
                      onClick={() => setSelectedYear(year)}
                    >
                      {year}{year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year
                    </button>
                  ))}
                </div>

                <div style={{ position: 'relative', width: '400px' }}>
                  <input
                    type="text"
                    placeholder="Search assessments..."
                    className="input-field"
                    style={{ marginBottom: 0, paddingLeft: '2.8rem', height: '42px', borderRadius: '10px' }}
                    value={assessmentSearch}
                    onChange={(e) => setAssessmentSearch(e.target.value)}
                  />
                  <span style={{
                    position: 'absolute',
                    left: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'var(--muted-bg)',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}>🔍</span>
                </div>
              </div>
            </div>

            <div className="card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '1.2rem 1rem' }}>Title</th>
                      <th style={{ padding: '1.2rem 1rem' }}>Questions</th>
                      <th style={{ padding: '1.2rem 1rem' }}>Start Date</th>
                      <th style={{ padding: '1.2rem 1rem' }}>End Date</th>
                      <th style={{ padding: '1.2rem 1rem' }}>Duration</th>
                      <th style={{ padding: '1.2rem 1rem' }}>Status</th>
                      <th style={{ padding: '1.2rem 1rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.filter(e => (e.target_years?.includes(selectedYear) || e.target_year === selectedYear) && e.title.toLowerCase().includes(assessmentSearch.toLowerCase())).length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          No assessments for Year {selectedYear}.
                        </td>
                      </tr>
                    ) : (
                      exams
                        .filter(e => (e.target_years?.includes(selectedYear) || e.target_year === selectedYear) && e.title.toLowerCase().includes(assessmentSearch.toLowerCase()))
                        .map((exam) => {
                          const now = new Date();
                          const start = new Date(exam.start_time);
                          const end = new Date(exam.end_time);
                          let status = 'scheduled';
                          if (now > end) status = 'ended';
                          else if (now >= start) status = 'active';

                          return (
                            <tr key={exam._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="table-row-hover">
                              <td style={{ padding: '1.2rem 1rem' }}>
                                <div style={{ color: 'var(--text-color)', fontWeight: '600' }}>{exam.title}</div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{exam.department || exam.departments?.join(', ')}</div>
                              </td>
                              <td style={{ padding: '1.2rem 1rem', color: 'var(--text-color)' }}>{exam.questions?.length || 0} Qs</td>
                              <td style={{ padding: '1.2rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                {new Date(exam.start_time).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td style={{ padding: '1.2rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                {new Date(exam.end_time).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td style={{ padding: '1.2rem 1rem', color: 'var(--text-color)' }}>{exam.duration || 60} m</td>
                              <td style={{ padding: '1.2rem 1rem' }}>
                                <span
                                  className={`status-tag ${status}`}
                                  style={{
                                    fontSize: '0.65rem',
                                    display: 'inline-block',
                                    minWidth: '70px',
                                    textAlign: 'center',
                                    color: status === 'active' ? '#2bf274' : status === 'ended' ? '#ff1d1d' : '#f1c40f',
                                    background: status === 'active' ? 'rgba(43, 242, 116, 0.15)' : status === 'ended' ? 'rgba(255, 29, 29, 0.15)' : 'rgba(241, 196, 15, 0.15)',
                                    border: `1px solid ${status === 'active' ? 'rgba(43, 242, 116, 0.3)' : status === 'ended' ? 'rgba(255, 29, 29, 0.3)' : 'rgba(241, 196, 15, 0.3)'}`
                                  }}
                                >
                                  {status.toUpperCase()}
                                </span>
                              </td>
                              <td style={{ padding: '1.2rem 1rem' }}>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                  <button
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', opacity: 0.7 }}
                                    title="Edit"
                                    onClick={() => {
                                      setSelectedExam(JSON.parse(JSON.stringify(exam)));
                                      setIsEditing(true);
                                    }}
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', opacity: 0.7 }}
                                    title="View Results"
                                    onClick={() => {
                                      setActiveTab('results');
                                      setSelectedResultExam(exam._id);
                                      fetchResults(exam._id);
                                    }}
                                  >
                                    📊
                                  </button>
                                  <button
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', opacity: 0.7 }}
                                    title="Delete"
                                    onClick={() => deleteExam(exam._id)}
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'analytics':
        const lineData = {
          labels: globalAnalytics?.weeklyLabels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [
            {
              label: 'Active Students',
              data: globalAnalytics?.weeklyActivity || [0, 0, 0, 0, 0, 0, 0],
              fill: false,
              borderColor: 'rgba(88, 166, 255, 1)',
              tension: 0.4
            }
          ]
        };

        const barData = {
          labels: ['< 50%', '50-70%', '70-90%', '> 90%'],
          datasets: [
            {
              label: 'Score Distribution',
              data: globalAnalytics?.performanceDistribution || [0, 0, 0, 0],
              backgroundColor: [
                'rgba(248, 81, 73, 0.6)',
                'rgba(210, 153, 34, 0.6)',
                'rgba(35, 134, 54, 0.6)',
                'rgba(88, 166, 255, 0.6)',
              ],
            }
          ]
        };

        return (
          <div className="analytics-dashboard fade-in">
            <div className="header-section">
              <h3>Analytics Overview</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Comprehensive insights into platform usage and performance</p>
            </div>

            <div className="stats-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.2rem',
              marginBottom: '2rem'
            }}>
              <div className="stat-card" style={{ background: 'rgba(56, 139, 253, 0.05)', border: '1px solid rgba(56, 139, 253, 0.2)', backdropFilter: 'blur(10px)', padding: '1.2rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(56, 139, 253, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🎓</div>
                <div>
                  <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.1rem' }}>Total Students</h3>
                  <p style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-color)', margin: 0 }}>{studentCount}</p>
                </div>
              </div>

              <div className="stat-card" style={{ background: 'rgba(56, 139, 253, 0.05)', border: '1px solid rgba(56, 139, 253, 0.2)', backdropFilter: 'blur(10px)', padding: '1.2rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(56, 139, 253, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>📊</div>
                <div>
                  <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.1rem' }}>Total Assessments</h3>
                  <p style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-color)', margin: 0 }}>{totalAssessments}</p>
                </div>
              </div>

              <div className="stat-card" style={{ background: 'rgba(63, 185, 80, 0.05)', border: '1px solid rgba(63, 185, 80, 0.2)', backdropFilter: 'blur(10px)', padding: '1.2rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(63, 185, 80, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🎯</div>
                <div>
                  <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.1rem' }}>Average Score</h3>
                  <p style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-color)', margin: 0 }}>{globalAnalytics?.averageScore || 0}%</p>
                </div>
              </div>

              <div className="stat-card" style={{ background: 'rgba(248, 81, 73, 0.05)', border: '1px solid rgba(248, 81, 73, 0.2)', backdropFilter: 'blur(10px)', padding: '1.2rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(248, 81, 73, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>👥</div>
                <div>
                  <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.1rem' }}>Active Users</h3>
                  <p style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-color)', margin: 0 }}>{globalAnalytics?.activeUsersToday || 0}</p>
                </div>
              </div>

              <div className="stat-card" style={{ background: 'rgba(210, 153, 34, 0.05)', border: '1px solid rgba(210, 153, 34, 0.2)', backdropFilter: 'blur(10px)', padding: '1.2rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(210, 153, 34, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>✅</div>
                <div>
                  <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.1rem' }}>Completion Rate</h3>
                  <p style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-color)', margin: 0 }}>{globalAnalytics?.completionRate || 0}%</p>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
              <div className="header-section" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <h4 style={{ color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📈</span> Assessments Summary (Last 10)
                </h4>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '1rem' }}>Assessment Title</th>
                      <th style={{ padding: '1rem' }}>Total Attempts</th>
                      <th style={{ padding: '1rem' }}>Qualified</th>
                      <th style={{ padding: '1rem' }}>Qualified (%)</th>
                      <th style={{ padding: '1rem' }}>Disqualified</th>
                      <th style={{ padding: '1rem' }}>Disqualified (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {globalAnalytics?.recentAssessmentsSummary?.map((summary: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '1.2rem 1rem', color: 'var(--text-color)', fontWeight: '600' }}>{summary.title}</td>
                        <td style={{ padding: '1.2rem 1rem', color: 'var(--text-color)' }}>{summary.totalAttempts}</td>
                        <td style={{ padding: '1.2rem 1rem', color: '#10b981', fontWeight: '600' }}>{summary.qualifiedCount}</td>
                        <td style={{ padding: '1.2rem 1rem' }}>
                          <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                            {summary.qualifiedPercent}%
                          </span>
                        </td>
                        <td style={{ padding: '1.2rem 1rem', color: '#ef4444', fontWeight: '600' }}>{summary.disqualifiedCount}</td>
                        <td style={{ padding: '1.2rem 1rem' }}>
                          <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                            {summary.disqualifiedPercent}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!globalAnalytics?.recentAssessmentsSummary || globalAnalytics.recentAssessmentsSummary.length === 0) && (
                      <tr>
                        <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No assessment data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>


            <div className="charts-grid mt-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="card chart-container">
                <h4 style={{ marginBottom: '1rem', color: 'var(--text-color)' }}>Weekly Activity</h4>
                <div style={{ height: '250px' }}>
                  <Line
                    data={lineData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: {
                          grid: { color: 'var(--chart-grid)', drawTicks: false },
                          ticks: { color: 'var(--chart-text)' },
                          border: { display: false }
                        },
                        x: {
                          grid: { display: false },
                          ticks: { color: 'var(--chart-text)' },
                          border: { display: false }
                        }
                      }
                    }}
                  />
                </div>
              </div>
              <div className="card chart-container">
                <h4 style={{ marginBottom: '1rem', color: 'var(--text-color)' }}>Performance Distribution</h4>
                <div style={{ height: '250px' }}>
                  <Bar
                    data={barData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: {
                          grid: { color: 'var(--chart-grid)', drawTicks: false },
                          ticks: { color: 'var(--chart-text)' },
                          border: { display: false }
                        },
                        x: {
                          grid: { display: false },
                          ticks: { color: 'var(--chart-text)' },
                          border: { display: false }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div >
        );
      case 'results':
        return (
          <div className="fade-in">
            <div className="sticky-panel" style={{ top: '-2.5rem', margin: '0 -2.5rem 2rem -2.5rem', padding: '1.5rem 2.5rem', borderTop: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderRadius: '0', zIndex: 10 }}>
              <div className="header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-color)', margin: 0 }}>Results</h2>
                </div>
                <button
                  className="btn"
                  style={{ background: 'var(--primary)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 1.2rem', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '0.9rem' }}
                  onClick={() => {
                    if (selectedResultExam === 'overall') {
                      if (!overallResults.length) return setNotification({ message: 'No overall results to export', type: 'info' });
                      const headers = 'Student Name,Registration number,Year,Branch,Assessments,Avg Percentage,Marks Scored,Last Attempt\n';
                      const rows = overallResults.map(r =>
                        `${r.student?.name || 'Deleted Student'},${r.student?.registration_number || ''},${r.student?.year || ''},${r.student?.department || ''},"${(r.exams || []).join(', ')}",${r.averagePercentage}%,${r.totalMarks},${r.lastAttemptDate ? new Date(r.lastAttemptDate).toLocaleDateString('en-GB') : 'N/A'}`
                      ).join('\n');
                      const blob = new Blob([headers + rows], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.setAttribute('hidden', ''); a.setAttribute('href', url); a.setAttribute('download', `overall_results.csv`);
                      document.body.appendChild(a); a.click(); document.body.removeChild(a);
                      return;
                    }

                    if (!examResults) return setNotification({ message: 'Please select an assessment first', type: 'info' });
                    const headers = 'Rank,Student Name,Registration number,Year,MCQs,Coding,Marks Scored,Total %,Tab Switches,Qualification,Date\n';
                    const rows = examResults.results
                      .sort((a: any, b: any) => {
                        const qualificationOrder: any = { 'Qualified': 0, 'Disqualified': 1, 'N/A': 2 };
                        const aOrder = qualificationOrder[a.qualification_status || 'N/A'];
                        const bOrder = qualificationOrder[b.qualification_status || 'N/A'];

                        if (aOrder !== bOrder) return aOrder - bOrder;
                        return parseFloat(b.percentage) - parseFloat(a.percentage);
                      })
                      .map((r: any, idx: number) =>
                        `#${idx + 1},${r.student?.name || 'Deleted Student'},${r.student?.registration_number || ''},${r.student?.year || ''},${r.mcq_percent || 0}%,${r.coding_percent || 0}%,${r.obtained_marks} / ${r.total_marks},${r.percentage}%,${r.auto_submitted ? 2 : (r.tab_switch_count > 0 ? 1 : 0)},${r.qualification_status || 'N/A'},${new Date(r.submitted_at).toLocaleDateString('en-GB')}`
                      ).join('\n');
                    const blob = new Blob([headers + rows], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.setAttribute('hidden', ''); a.setAttribute('href', url); a.setAttribute('download', `results_${selectedResultExam}.csv`);
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>📥</span> Export to Excel
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <select
                  className="input-field"
                  style={{ background: 'var(--muted-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)', padding: '0.6rem 1rem', borderRadius: '8px', minWidth: '100px', colorScheme: 'light dark', marginBottom: 0 }}
                  value={resultYearFilter}
                  onChange={(e) => setResultYearFilter(e.target.value)}
                >
                  <option value="All">All</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>

                <select
                  className="input-field"
                  style={{ background: 'var(--muted-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)', padding: '0.6rem 1rem', borderRadius: '8px', minWidth: '150px', colorScheme: 'light dark', marginBottom: 0 }}
                  value={resultDeptFilter}
                  onChange={(e) => setResultDeptFilter(e.target.value)}
                >
                  <option value="All">All Branches</option>
                  <option value="CSE">CSE</option>
                  <option value="CSM">CSM</option>
                  <option value="CSC">CSC</option>
                  <option value="CSD">CSD</option>
                  <option value="ECE">ECE</option>
                  <option value="EEE">EEE</option>
                  <option value="MECH">MECH</option>
                </select>

                <select
                  className="input-field"
                  style={{ background: 'var(--muted-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)', padding: '0.6rem 1rem', borderRadius: '8px', minWidth: '180px', colorScheme: 'light dark', marginBottom: 0 }}
                  value={selectedResultExam}
                  onChange={(e) => {
                    setSelectedResultExam(e.target.value);
                    fetchResults(e.target.value);
                  }}
                >
                  <option value="">Select Assessment</option>
                  <option value="overall" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>⭐ Overall Performance</option>
                  {exams.map(e => (
                    <option key={e._id} value={e._id}>{e.title}</option>
                  ))}
                </select>

                <div style={{ position: 'relative', width: '450px' }}>
                  <input
                    type="text"
                    placeholder="Search name, reg number, or assessment..."
                    className="input-field"
                    style={{
                      background: 'var(--input-bg)',
                      width: '100%',
                      paddingLeft: '2.8rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      color: 'var(--text-color)',
                      marginBottom: 0,
                      height: '42px'
                    }}
                    value={resultSearch}
                    onChange={(e) => setResultSearch(e.target.value)}
                  />
                  <span style={{
                    position: 'absolute',
                    left: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'var(--muted-bg)',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}>🔍</span>
                </div>
              </div>
            </div>

            {selectedResultExam === 'overall' ? (
              <div className="card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        <th style={{ padding: '1.2rem 1rem' }}>S.No</th>
                        <th style={{ padding: '1.2rem 1rem' }}>Student Name</th>
                        <th style={{ padding: '1.2rem 1rem' }}>Registration number</th>
                        <th style={{ padding: '1.2rem 1rem' }}>Year</th>
                        <th style={{ padding: '1.2rem 1rem' }}>Branch</th>
                        <th style={{ padding: '1.2rem 1rem' }}>Assessments</th>
                        <th style={{ padding: '1.2rem 1rem' }}>Status</th>
                        <th style={{ padding: '1.2rem 1rem' }}>Avg %</th>
                        <th style={{ padding: '1.2rem 1rem' }}>Marks Scored</th>
                        <th style={{ padding: '1.2rem 1rem' }}>Last Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overallResults
                        .filter((r: any) => {
                          if (!r.student) return false;
                          const matchesSearch = (r.student.name?.toLowerCase() || '').includes(resultSearch.toLowerCase()) ||
                            (r.student.registration_number && r.student.registration_number.toLowerCase().includes(resultSearch.toLowerCase())) ||
                            (r.exams && r.exams.some((exam: string) => exam.toLowerCase().includes(resultSearch.toLowerCase())));
                          const matchesYear = resultYearFilter === 'All' || (r.student.year && r.student.year.toString().includes(resultYearFilter));
                          const matchesDept = resultDeptFilter === 'All' || (r.student.department && r.student.department.toUpperCase() === resultDeptFilter.toUpperCase());
                          return matchesSearch && matchesYear && matchesDept;
                        })
                        .sort((a: any, b: any) => parseFloat(b.averagePercentage) - parseFloat(a.averagePercentage))
                        .map((res: any, idx: number) => (
                          <tr key={res.student?._id || Math.random()} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="table-row-hover">
                            <td style={{ padding: '1.2rem 1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{idx + 1}</td>
                            <td style={{ padding: '1.2rem 1rem', color: 'var(--text-color)', fontWeight: '600' }}>{res.student?.name || 'Deleted Student'}</td>
                            <td style={{ padding: '1.2rem 1rem', color: 'var(--text-color)', fontWeight: '600' }}>{res.student?.registration_number || '---'}</td>
                            <td style={{ padding: '1.2rem 1rem', color: 'var(--text-color)' }}>{res.student?.year || '---'}</td>
                            <td style={{ padding: '1.2rem 1rem', color: 'var(--text-color)' }}>{res.student?.department || '---'}</td>
                            <td style={{ padding: '1.2rem 1rem', color: 'var(--text-color)' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxWidth: '300px' }}>
                                {res.exams && res.exams.map((exam: string, i: number) => (
                                  <span key={i} style={{
                                    background: 'var(--input-bg)',
                                    color: 'var(--primary)',
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    border: '1px solid rgba(124, 58, 237, 0.2)',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {exam}
                                  </span>
                                ))}
                                {(!res.exams || res.exams.length === 0) && <span style={{ color: 'var(--text-secondary)' }}>---</span>}
                              </div>
                            </td>
                            <td style={{ padding: '1.2rem 1rem' }}>
                              <span style={{
                                background: parseFloat(res.averagePercentage) >= 40 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: parseFloat(res.averagePercentage) >= 40 ? '#10b981' : '#ef4444',
                                padding: '0.3rem 0.8rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700',
                                border: `1px solid ${parseFloat(res.averagePercentage) >= 40 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                              }}>
                                {parseFloat(res.averagePercentage) >= 40 ? 'Qualified' : 'Disqualified'}
                              </span>
                            </td>
                            <td style={{ padding: '1.2rem 1rem' }}>
                              <span style={{
                                background: parseFloat(res.averagePercentage) >= 40 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: parseFloat(res.averagePercentage) >= 40 ? '#10b981' : '#ef4444',
                                padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600'
                              }}>{res.averagePercentage}%</span>
                            </td>
                            <td style={{ padding: '1.2rem 1rem', color: 'var(--text-color)' }}>{res.totalMarks}</td>
                            <td style={{ padding: '1.2rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                              {res.lastAttemptDate ? new Date(res.lastAttemptDate).toLocaleDateString('en-GB') : 'N/A'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : examResults ? (
              <div className="card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        <th style={{ padding: '1.2rem 1rem' }}>S.No</th>
                        <th style={{ padding: '1.2rem 1rem' }}>Rank</th>
                        <th style={{ padding: '1.2rem 1rem' }}>Student Name</th>
                        <th style={{ padding: '1.2rem 1rem' }}>Registration number</th>
                        <th style={{ padding: '1.2rem 1rem' }}>Year</th>
                        <th style={{ padding: '1.2rem 1rem' }}>Branch</th>
                        <th style={{ padding: '1.2rem 1rem' }}>MCQs</th>
                        <th style={{ padding: '1.2rem 1rem' }}>Coding</th>
                        <th style={{ padding: '1.2rem 1rem' }}>Status</th>
                        <th style={{ padding: '1.2rem 1rem' }}>Total %</th>
                        <th style={{ padding: '1.2rem 1rem' }}>Marks Scored</th>
                        <th style={{ padding: '1.2rem 1rem' }}>Time Taken</th>
                        <th style={{ padding: '1.2rem 1rem' }}>Tab Switches</th>
                        <th style={{ padding: '1.2rem 1rem' }}>Date</th>
                        <th style={{ padding: '1.2rem 1rem' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examResults.results
                        .filter((r: any) => {
                          if (!r.student) return false;
                          const searchStr = resultSearch.toLowerCase();
                          const matchesSearch = (r.student.name?.toLowerCase() || '').includes(searchStr) ||
                            (r.student.registration_number && r.student.registration_number.toLowerCase().includes(searchStr)) ||
                            (r.student.email && r.student.email.toLowerCase().includes(searchStr));
                          const matchesYear = resultYearFilter === 'All' || (r.student.year && r.student.year.toString().includes(resultYearFilter));
                          const matchesDept = resultDeptFilter === 'All' || (r.student.department && r.student.department.toUpperCase() === resultDeptFilter.toUpperCase());
                          return matchesSearch && matchesYear && matchesDept;
                        })
                        .sort((a: any, b: any) => {
                          const qualificationOrder: any = { 'Qualified': 0, 'Disqualified': 1, 'N/A': 2 };
                          const aOrder = qualificationOrder[a.qualification_status || 'N/A'];
                          const bOrder = qualificationOrder[b.qualification_status || 'N/A'];

                          if (aOrder !== bOrder) return aOrder - bOrder;
                          return parseFloat(b.percentage) - parseFloat(a.percentage);
                        })
                        .map((res: any, idx: number) => (
                          <tr key={res._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="table-row-hover">
                            <td style={{ padding: '1.2rem 1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{idx + 1}</td>
                            <td style={{ padding: '1.2rem 1rem' }}>
                              {idx === 0 ? <span style={{ fontSize: '1.2rem' }}>🥇</span> :
                                idx === 1 ? <span style={{ fontSize: '1.2rem' }}>🥈</span> :
                                  idx === 2 ? <span style={{ fontSize: '1.2rem' }}>🥉</span> :
                                    <span style={{ color: 'var(--text-secondary)', paddingLeft: '0.2rem' }}>#{idx + 1}</span>}
                            </td>
                            <td style={{ padding: '1.2rem 1rem', color: 'var(--text-color)', fontWeight: '600' }}>{res.student?.name || 'Deleted Student'}</td>
                            <td style={{ padding: '1.2rem 1rem', color: 'var(--text-color)', fontWeight: '600' }}>{res.student?.registration_number || '---'}</td>
                            <td style={{ padding: '1.2rem 1rem', color: 'var(--text-color)' }}>{res.student?.year || '---'}</td>
                            <td style={{ padding: '1.2rem 1rem', color: 'var(--text-color)' }}>{res.student?.department || '---'}</td>
                            <td style={{ padding: '1.2rem 1rem' }}>
                              {res.mcq_percent !== null ? (
                                <span style={{
                                  background: parseFloat(res.mcq_percent) >= 40 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  color: parseFloat(res.mcq_percent) >= 40 ? '#10b981' : '#ef4444',
                                  padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600', border: `1px solid ${parseFloat(res.mcq_percent) >= 40 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                }}>{res.mcq_percent}%</span>
                              ) : 'N/A'}
                            </td>
                            <td style={{ padding: '1.2rem 1rem' }}>
                              {res.coding_percent !== null ? (
                                <span style={{
                                  background: parseFloat(res.coding_percent) >= 40 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  color: parseFloat(res.coding_percent) >= 40 ? '#10b981' : '#ef4444',
                                  padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600', border: `1px solid ${parseFloat(res.coding_percent) >= 40 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                }}>{res.coding_percent}%</span>
                              ) : 'N/A'}
                            </td>
                            <td style={{ padding: '1.2rem 1rem' }}>
                              <span style={{
                                background: res.qualification_status === 'Qualified' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: res.qualification_status === 'Qualified' ? '#10b981' : '#ef4444',
                                padding: '0.3rem 0.8rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700',
                                border: `1px solid ${res.qualification_status === 'Qualified' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                              }}>
                                {res.qualification_status || 'N/A'}
                              </span>
                            </td>
                            <td style={{ padding: '1.2rem 1rem' }}>
                              <span style={{
                                background: parseFloat(res.percentage) >= 40 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: parseFloat(res.percentage) >= 40 ? '#10b981' : '#ef4444',
                                padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600', border: `1px solid ${parseFloat(res.percentage) >= 40 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                              }}>{res.percentage}%</span>
                            </td>
                            <td style={{ padding: '1.2rem 1rem', color: 'var(--text-color)', fontWeight: '700' }}>
                              {res.obtained_marks} / {res.total_marks}
                            </td>
                            <td style={{ padding: '1.2rem 1rem', color: 'var(--text-color)', fontWeight: '600' }}>
                              {res.time_taken ? `${Math.floor(res.time_taken / 60)}m ${res.time_taken % 60}s` : '---'}
                            </td>
                            <td style={{ padding: '1.2rem 1rem', color: res.tab_switch_count > 0 ? 'var(--warning)' : 'var(--text-color)' }}>
                              {res.auto_submitted ? 2 : (res.tab_switch_count > 0 ? 1 : 0)}
                            </td>
                            <td style={{ padding: '1.2rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(res.submitted_at).toLocaleDateString('en-GB')}</td>
                            <td style={{ padding: '1.2rem 1rem' }}>
                              <button
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', opacity: 0.7 }}
                                title="Delete Result"
                                onClick={() => {
                                  setConfirmDialog({
                                    message: `Are you sure you want to delete the result for ${res.student?.name}? This will allow the student to re-take the exam.`,
                                    onConfirm: async () => {
                                      try {
                                        await apiRequest(`/attempts/${res._id}`, { method: 'DELETE' });
                                        setNotification({ message: 'Result deleted successfully', type: 'success' });
                                        fetchResults(selectedResultExam);
                                        closeConfirm();
                                      } catch (err: any) {
                                        setNotification({ message: err.message, type: 'error' });
                                      }
                                    }
                                  });
                                }}
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '6rem 2rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem', opacity: 0.5 }}>📊</div>
                <h4 style={{ color: 'var(--text-color)', marginBottom: '0.5rem' }}>No Data Selected</h4>
                <p style={{ color: 'var(--text-secondary)' }}>Please select an assessment or overall performance to view details.</p>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--text-color)' }}>AVANTHI'S RESEARCH & TECHNOLOGICAL ACADEMY</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', letterSpacing: '1px' }}>BASAVAPALEM, BHOGAPURAM, VIZIANAGARAM</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'var(--text-color)', fontSize: '1.2rem', fontWeight: '600' }}>
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {currentTime.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' })}
                </div>
              </div>
            </div>

            <div className="stats-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div className="stat-card" style={{
                background: 'rgba(56, 139, 253, 0.05)',
                border: '1px solid rgba(56, 139, 253, 0.2)',
                backdropFilter: 'blur(10px)',
                padding: '1.5rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '1.2rem',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: 'default'
              }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '10px',
                  background: 'rgba(56, 139, 253, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>📝</div>
                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Total Assessments</h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <p style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-color)', margin: 0 }}>{exams.length}</p>
                  </div>
                </div>
              </div>

              <div className="stat-card" style={{
                background: 'rgba(63, 185, 80, 0.05)',
                border: '1px solid rgba(63, 185, 80, 0.2)',
                backdropFilter: 'blur(10px)',
                padding: '1.5rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '1.2rem',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '10px',
                  background: 'rgba(63, 185, 80, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>🎓</div>
                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Total Students</h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <p style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-color)', margin: 0 }}>{studentCount}</p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Verified</span>
                  </div>
                </div>
              </div>

              <div className="stat-card" style={{
                background: 'rgba(210, 153, 34, 0.05)',
                border: '1px solid rgba(210, 153, 34, 0.2)',
                backdropFilter: 'blur(10px)',
                padding: '1.5rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '1.2rem',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '10px',
                  background: 'rgba(210, 153, 34, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>🛡️</div>
                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Staff Members</h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <p style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-color)', margin: 0 }}>{adminCount}</p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Admins</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card mt-2">
              <h4 style={{ color: 'var(--text-color)', marginBottom: '1.5rem' }}>⚡ Quick Actions</h4>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onClick={() => setActiveTab('exams')}>
                  <span>📝</span> Create New Exam
                </button>
                <button className="btn btn-outline" style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onClick={() => { setEditingUser({ name: '', email: '', role: 'student', department: '', mobile_number: '', password: '' }); setIsUserModalOpen(true); setActiveTab('users'); }}>
                  <span>👤</span> Add Individual Student
                </button>
                <button className="btn btn-outline" style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onClick={() => { setActiveTab('users'); setTimeout(() => document.getElementById('user-import-input')?.click(), 100); }}>
                  <span>📥</span> Bulk Import Batch
                </button>
                <button className="btn btn-outline" style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onClick={() => setActiveTab('results')}>
                  <span>📊</span> Review All Results
                </button>
              </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h4 style={{ color: 'var(--text-color)' }}>Platform Performance</h4>
                  <button className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => setActiveTab('analytics')}>View Details</button>
                </div>
                <div style={{ height: '300px' }}>
                  <Line
                    data={{
                      labels: globalAnalytics?.weeklyLabels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                      datasets: [{
                        label: 'Engagement',
                        data: globalAnalytics?.weeklyActivity || [0, 0, 0, 0, 0, 0, 0],
                        borderColor: '#47a1ff',
                        backgroundColor: 'rgba(71, 161, 255, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: '#47a1ff',
                        pointBorderColor: 'var(--card-bg)',
                        pointBorderWidth: 2,
                        pointHoverRadius: 6,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: 'var(--card-bg)',
                          titleColor: 'var(--text-color)',
                          bodyColor: 'var(--text-color)',
                          borderColor: 'var(--border-color)',
                          borderWidth: 1,
                          padding: 10,
                          displayColors: false
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          grid: { color: 'var(--chart-grid)', drawTicks: false },
                          ticks: { color: 'var(--chart-text)', padding: 10 },
                          border: { display: false }
                        },
                        x: {
                          grid: { display: false },
                          ticks: { color: 'var(--chart-text)', padding: 10 },
                          border: { display: false }
                        }
                      }
                    }}
                  />
                </div>
              </div>


            </div>



            <div className="card mt-2" style={{ marginTop: '1.5rem' }}>
              <h4 style={{ color: 'var(--text-color)', marginBottom: '1.5rem' }}>Platform Status</h4>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }}></div>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>API Server: Online</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }}></div>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Cloud Storage: Connected</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }}></div>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Sandbox: Active</span>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-layout fade-in">
      {notification && (
        <AdminNotification
          message={notification.message}
          type={notification.type}
          onClose={closeNotification}
          isExiting={isNotificationExiting}
        />
      )}

      {confirmDialog && (
        <AdminConfirm
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={closeConfirm}
        />
      )}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
        {/* Mobile close button inside sidebar */}
        <button
          className="sidebar-close-btn"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        >
          ✕
        </button>
        <div className="logo-area">
          <h3>ARTB - LMS</h3>
        </div>
        <nav className="nav-menu">
          <button className={`sidebar-nav-btn${activeTab === 'dashboard' ? ' sidebar-nav-btn--active' : ''}`} onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}>Dashboard</button>
          <button className={`sidebar-nav-btn${activeTab === 'users' ? ' sidebar-nav-btn--active' : ''}`} onClick={() => { setActiveTab('users'); setSidebarOpen(false); }}>Manage Students</button>
          <button className={`sidebar-nav-btn${activeTab === 'assessments' ? ' sidebar-nav-btn--active' : ''}`} onClick={() => { setActiveTab('assessments'); setSidebarOpen(false); }}>Assessments</button>
          <button className={`sidebar-nav-btn${activeTab === 'exams' ? ' sidebar-nav-btn--active' : ''}`} onClick={() => { setActiveTab('exams'); setSidebarOpen(false); }}>Create Exam</button>
          <button className={`sidebar-nav-btn${activeTab === 'analytics' ? ' sidebar-nav-btn--active' : ''}`} onClick={() => { setActiveTab('analytics'); setSidebarOpen(false); }}>Analytics</button>
          <button className={`sidebar-nav-btn${activeTab === 'results' ? ' sidebar-nav-btn--active' : ''}`} onClick={() => { setActiveTab('results'); setSidebarOpen(false); }}>Results</button>
        </nav>
      </aside>

      <main className="main-content">
        {/* Burger menu button – visible only on mobile */}
        <button
          className="burger-btn"
          aria-label="Open menu"
          onClick={() => setSidebarOpen(true)}
        >
          <span /><span /><span />
        </button>
        <Header user={user} roleDescription="System Administrator" />

        <div className="content-area">
          {renderContent()}
        </div>

        {isUserModalOpen && editingUser && (
          <div className="modal-overlay">
            <div className="card modal-content" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', maxWidth: '500px' }}>
              <h3 style={{ color: 'var(--text-color)', marginBottom: '1.5rem' }}>{editingUser._id ? 'Edit Student Details' : 'Add New Student'}</h3>
              <form onSubmit={saveUserChanges}>
                <div className="form-group mb-2">
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Full Name</label>
                  <input type="text" className="input-field" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)' }} value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} required />
                </div>
                <div className="form-group mb-2">
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Registration Number</label>
                  <input type="text" className="input-field" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)' }} value={editingUser.registration_number || ''} onChange={(e) => setEditingUser({ ...editingUser, registration_number: e.target.value })} required />
                </div>
                <div className="form-group mb-2">
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Email Address</label>
                  <input type="email" className="input-field" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)' }} value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} required />
                </div>
                <div className="form-group mb-2">
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Mobile Number</label>
                  <input type="text" className="input-field" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)' }} value={editingUser.mobile_number || ''} onChange={(e) => setEditingUser({ ...editingUser, mobile_number: e.target.value })} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group mb-2">
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Year</label>
                    <select className="input-field" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)' }} value={editingUser.year || ''} onChange={(e) => setEditingUser({ ...editingUser, year: e.target.value })} required>
                      <option value="">Select Year</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>
                  <div className="form-group mb-2">
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Branch</label>
                    <select className="input-field" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)' }} value={editingUser.department || ''} onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })} required>
                      <option value="">Select Branch</option>
                      <option value="CSE">CSE</option>
                      <option value="CSM">CSM</option>
                      <option value="CSC">CSC</option>
                      <option value="CSD">CSD</option>
                      <option value="ECE">ECE</option>
                      <option value="EEE">EEE</option>
                      <option value="MECH">MECH</option>
                    </select>
                  </div>
                </div>

                {!editingUser._id && (
                  <div className="form-group mb-2">
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Password</label>
                    <input type="password" placeholder="Default is Registration Number" className="input-field" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)' }} value={editingUser.password || ''} onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })} />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button type="submit" className="btn" style={{ flex: 1, background: 'var(--primary)', color: 'var(--secondary)', border: 'none', padding: '0.8rem', borderRadius: '8px', fontWeight: '600' }}>{editingUser._id ? 'Update Student' : 'Save Student'}</button>
                  <button type="button" className="btn btn-outline" style={{ flex: 1, padding: '0.8rem' }} onClick={() => setIsUserModalOpen(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; z-index: 1000;
        }
        .modal-content { 
          width: 100%; max-width: 450px; padding: 2.5rem; 
          background: var(--card-bg); border: 1px solid var(--border-color);
          box-shadow: var(--card-shadow);
        }
        .mb-2 { margin-bottom: 1.2rem; }

        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .dashboard-layout {
          display: flex;
          height: 100vh;
          background: var(--bg-color);
          position: relative;
        }
        /* ── Sidebar ── */
        .sidebar {
          width: 280px;
          min-width: 280px;
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
        /* Mobile close button – hidden on desktop */
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
        /* Mobile overlay */
        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          z-index: 150;
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
        /* ── Admin sidebar nav buttons (scoped, no conflict with exam nav-btn) ── */
        .sidebar-nav-btn {
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
          width: 100%;
        }
        .sidebar-nav-btn:hover {
          background: rgba(0, 86, 179, 0.05);
          color: var(--primary);
          transform: translateX(4px);
        }
        .sidebar-nav-btn--active {
          background: rgba(0, 86, 179, 0.12);
          color: var(--primary) !important;
          border: 1px solid rgba(0, 86, 179, 0.2);
          font-weight: 700;
        }
        .logout-btn {
          margin-top: auto;
          padding: 0.9rem;
          border: 1px solid var(--border-color);
          color: var(--danger);
          background: transparent;
          border-radius: 8px;
          transition: all 0.3s ease;
          font-weight: 600;
          text-align: center;
        }
        .logout-btn:hover {
          background: var(--danger);
          color: #fff;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 2rem;
        }
        .assessment-card {
          display: flex;
          flex-direction: column;
          padding: 1.8rem;
          height: 100%;
          transition: 0.2s ease;
        }
        .assessment-card:hover { border-color: var(--primary); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); }
        .status-tag {
          padding: 0.25rem 0.8rem;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .status-tag.active {
          background: rgba(0, 86, 179, 0.1);
          color: var(--primary) !important;
          border: 1px solid rgba(0, 86, 179, 0.2);
        }
        .status-tag.ended {
          background: rgba(217, 48, 37, 0.1);
          color: var(--danger) !important;
          border: 1px solid rgba(217, 48, 37, 0.2);
        }
        .status-tag.scheduled {
          background: rgba(0, 123, 255, 0.1);
          color: var(--accent) !important;
          border: 1px solid rgba(0, 123, 255, 0.2);
        }
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          position: relative;
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
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.8rem;
        }
        .stat-card {
          background: var(--card-bg);
          padding: 1.8rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          box-shadow: var(--card-shadow);
          transition: 0.2s;
          position: relative;
          overflow: hidden;
        }
        .stat-card:hover { transform: translateY(-2px); border-color: var(--primary); }
        .stat-card h3 {
          color: var(--text-secondary);
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .stat-flex {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-top: 0.75rem;
        }
        .stat-value {
          font-size: 2.8rem;
          font-weight: 800;
          color: var(--text-color);
        }
        .trend {
          font-size: 0.85rem;
          font-weight: 700;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
        }
        .chart-container {
          position: relative;
          padding: 2rem;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          box-shadow: var(--card-shadow);
        }
        .mt-2 { margin-top: 2.5rem; }

        /* ── Mobile / Small-screen responsive ── */
        @media (max-width: 768px) {
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
          .stats-grid {
            grid-template-columns: 1fr;
          }
          .grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
