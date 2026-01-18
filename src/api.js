
import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
});

export const fetchExams = () => api.get('/exams');
export const loginUser = (roll) => api.post('/login', { roll });
export const fetchResult = (roll, examId, accessorRoll = null) => {
    const config = { params: { exam_id: examId } };
    if (accessorRoll) {
        config.headers = { 'X-Accessor-Roll': accessorRoll };
    }
    return api.get(`/results/${roll}`, config);
};
export const fetchAnalytics = (examId) => api.get('/analytics', { params: { exam_id: examId } });
export const fetchMeritList = (sortBy = 'gpa', section = 'All', examId) =>
    api.get('/merit-list', { params: { sort_by: sortBy, section, exam_id: examId } });

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

export default api;

