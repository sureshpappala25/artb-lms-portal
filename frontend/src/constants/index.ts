export const APP_NAME = 'ARTB LMS';
export const FULL_APP_NAME = 'ARTB LMS PORTAL';

export const USER_ROLES = {
    STUDENT: 'student',
    FACULTY: 'faculty',
    ADMIN: 'admin',
};

export const ROUTES = {
    LOGIN: '/',
    STUDENT_DASHBOARD: '/student',
    FACULTY_DASHBOARD: '/faculty',
    ADMIN_DASHBOARD: '/admin',
    EXAM: (id: string) => `/exam/${id}`,
};
