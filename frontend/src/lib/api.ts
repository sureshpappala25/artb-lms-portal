const getSanitizedBaseUrl = () => {
    const rawUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001').trim();
    // Remove trailing slash if exists
    const baseUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
    // Ensure /api suffix
    return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
};

export const API_BASE_URL = getSanitizedBaseUrl();

export const getAuthToken = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('token');
    }
    return null;
};

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const token = getAuthToken();

    const headers = new Headers(options.headers);
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
    }
    return data;
};
