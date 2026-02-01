
import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
});

export const fetchExams = (session = null, group = null) =>
    api.get('/exams', { params: { session, group } });
export const fetchSessions = () => api.get('/sessions');
export const loginUser = (roll) => api.post('/login', { roll });
export const fetchResult = (roll, examId, accessorRoll = null) => {
    const config = { params: { exam_id: examId } };
    if (accessorRoll) {
        config.headers = { 'X-Accessor-Roll': accessorRoll };
    }
    return api.get(`/results/${roll}`, config);
};
export const fetchAnalytics = (examId) => api.get('/analytics', { params: { exam_id: examId } });
export const fetchMeritList = (sortBy = 'gpa', section = 'All', examId, session = null, group = null) =>
    api.get('/merit-list', { params: { sort_by: sortBy, section, exam_id: examId, session, group } });

// Admin API functions
export const adminLogin = (password) => api.post('/admin/login', { password });

export const getAdminDashboard = () => {
    const token = localStorage.getItem('token');
    return api.get('/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
    });
};

export const fetchAllStudents = () => {
    const token = localStorage.getItem('token');
    return api.get('/admin/students', {
        headers: { Authorization: `Bearer ${token}` }
    });
};

export const deleteStudent = (roll) => {
    const token = localStorage.getItem('token');
    return api.delete(`/admin/students/${roll}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
};

export const updateStudent = (roll, data) => {
    const token = localStorage.getItem('token');
    return api.put(`/admin/students/${roll}`, data, {
        headers: { Authorization: `Bearer ${token}` }
    });
};

// =============================================================================
// ACTIVITY LOGGING & ANALYTICS API
// =============================================================================

/**
 * Log user activity (view result, compare, etc.)
 * @param {string} action - Action type: VIEW_RESULT, COMPARE_RESULT, LOGIN, UPDATE_EXAM
 * @param {string|null} targetRoll - The student being viewed/compared
 * @param {object|null} metadata - Additional context (exam info, etc.)
 * @param {string|null} actorRoll - The user performing the action
 */
export const logActivity = (action, targetRoll = null, metadata = null, actorRoll = null) => {
    const config = {};
    if (actorRoll) {
        config.headers = { 'X-User-Roll': String(actorRoll) };
    }
    const safeTargetRoll = targetRoll ? String(targetRoll) : null;
    return api.post('/log-activity', { action, target_roll: safeTargetRoll, metadata }, config);
};

/**
 * Get paginated activity logs (Admin only)
 */
export const getActivityLogs = (page = 1, pageSize = 50, actionFilter = null) => {
    const token = localStorage.getItem('token');
    return api.get('/admin/logs', {
        params: { page, page_size: pageSize, action_filter: actionFilter },
        headers: { Authorization: `Bearer ${token}` }
    });
};

/**
 * Update exam name (Admin only)
 */
export const updateExam = (examId, name) => {
    const token = localStorage.getItem('token');
    return api.put(`/admin/exams/${examId}`, { name }, {
        headers: { Authorization: `Bearer ${token}` }
    });
};

/**
 * Get filtered students with pagination (Admin only)
 */
export const getFilteredStudents = (session = null, group = null, section = null, page = 1, pageSize = 50) => {
    const token = localStorage.getItem('token');
    return api.get('/admin/students/filtered', {
        params: { session, group, section, page, page_size: pageSize },
        headers: { Authorization: `Bearer ${token}` }
    });
};

export default api;
