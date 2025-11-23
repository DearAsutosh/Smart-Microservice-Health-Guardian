import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - Add JWT token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email, password) => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
    return response.data;
  },
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  }
};

// Services API
export const servicesAPI = {
  getAll: async () => {
    const response = await api.get('/services');
    return response.data;
  },
  
  getHistory: async (id, timeRange = '1h') => {
    const response = await api.get(`/services/${id}/history`, {
      params: { timeRange }
    });
    return response.data;
  },
  
  restart: async (serviceId, serviceName) => {
    const response = await api.post('/services/actions/restart', {
      serviceId,
      serviceName
    });
    return response.data;
  }
};

export default api;
