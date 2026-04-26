import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({ baseURL: BASE_URL, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }
      try {
        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken } = res.data.data;
        useAuthStore.setState({ accessToken });
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Typed API helpers
export const authAPI = {
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const studentsAPI = {
  list: (params?: any) => api.get('/students', { params }),
  get: (id: string) => api.get(`/students/${id}`),
  create: (data: any) => api.post('/students', data),
  update: (id: string, data: any) => api.put(`/students/${id}`, data),
  delete: (id: string) => api.delete(`/students/${id}`),
  grades: (id: string) => api.get(`/students/${id}/grades`),
  attendance: (id: string) => api.get(`/students/${id}/attendance`),
};

export const teachersAPI = {
  list: (params?: any) => api.get('/teachers', { params }),
  get: (id: string) => api.get(`/teachers/${id}`),
};

export const classesAPI = {
  list: () => api.get('/classes'),
  get: (id: string) => api.get(`/classes/${id}`),
  timetable: (id: string) => api.get(`/classes/${id}/timetable`),
};

export const attendanceAPI = {
  list: (params?: any) => api.get('/attendance', { params }),
  markBulk: (data: any) => api.post('/attendance', data),
  summary: (params?: any) => api.get('/attendance/summary', { params }),
};

export const examsAPI = {
  list: (params?: any) => api.get('/exams', { params }),
  create: (data: any) => api.post('/exams', data),
  results: (id: string) => api.get(`/exams/${id}/results`),
  addResults: (id: string, data: any) => api.post(`/exams/${id}/results`, data),
};

export const feesAPI = {
  list: () => api.get('/fees'),
  payments: () => api.get('/fees/payments'),
  recordPayment: (data: any) => api.post('/fees/payments', data),
  statement: (studentId: string) => api.get(`/fees/payments/${studentId}/statement`),
};

export const assignmentsAPI = {
  list: (params?: any) => api.get('/assignments', { params }),
  create: (data: any) => api.post('/assignments', data),
  submit: (id: string, data: any) => api.post(`/assignments/${id}/submit`, data),
  grade: (id: string, subId: string, data: any) => api.put(`/assignments/${id}/submissions/${subId}/grade`, data),
};

export const notificationsAPI = {
  list: () => api.get('/notifications'),
  broadcast: (data: any) => api.post('/notifications/broadcast', data),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export const dashboardAPI = {
  stats: () => api.get('/dashboard'),
};

export const reportsAPI = {
  academic: (params?: any) => api.get('/reports/academic', { params }),
  attendance: (params?: any) => api.get('/reports/attendance', { params }),
  financial: (params?: any) => api.get('/reports/financial', { params }),
};
