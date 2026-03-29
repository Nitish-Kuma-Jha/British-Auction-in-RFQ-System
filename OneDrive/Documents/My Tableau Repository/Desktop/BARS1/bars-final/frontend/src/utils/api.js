import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// RFQ
export const rfqAPI = {
  create: (data) => api.post('/rfq/create', data),
  list: (params) => api.get('/rfq/list', { params }),
  get: (id) => api.get(`/rfq/${id}`),
  updateStatus: (id, status) => api.put(`/rfq/${id}/status`, { status }),
  getActivity: (id) => api.get(`/rfq/${id}/activity`),
};

// Bids
export const bidAPI = {
  place: (data) => api.post('/bids/place', data),
  getByRFQ: (rfqId) => api.get(`/bids/${rfqId}`),
  getMyBids: (rfqId) => api.get(`/bids/my/${rfqId}`),
};

// Rooms
export const roomAPI = {
  create: (data) => api.post('/rooms/create', data),
  join: (data) => api.post('/rooms/join', data),
  getPublic: () => api.get('/rooms/public'),
  getMy: () => api.get('/rooms/my'),
  get: (id) => api.get(`/rooms/${id}`),
  updateConfig: (id, config) => api.put(`/rooms/${id}/config`, { config }),
  updateStatus: (id, status) => api.put(`/rooms/${id}/status`, { status }),
};

// Admin
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  getAllRFQs: () => api.get('/admin/rfqs'),
  deleteRoom: (id) => api.delete(`/admin/rooms/${id}`),
};

export default api;
