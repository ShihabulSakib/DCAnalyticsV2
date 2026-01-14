
import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000',
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

export default api;
