import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

// Auth
export const auth = {
  signup: (email, username, password) =>
    client.post('/auth/signup', { email, username, password }),
  login: (emailOrUsername, password) =>
    client.post('/auth/login', { emailOrUsername, password }),
  forgotPassword: (email) =>
    client.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) =>
    client.post('/auth/reset-password', { token, newPassword }),
};

// Products
export const products = {
  list: (filters = {}) => client.get('/products', { params: filters }),
  get: (id) => client.get(`/products/${id}`),
  create: (data) => client.post('/products', data),
  update: (id, data) => client.put(`/products/${id}`, data),
  delete: (id) => client.delete(`/products/${id}`),
  trackDownload: (id) => client.post(`/products/${id}/download`),
};

// Categories
export const categories = {
  list: () => client.get('/categories'),
  create: (data) => client.post('/categories', data),
  update: (id, data) => client.put(`/categories/${id}`, data),
  delete: (id) => client.delete(`/categories/${id}`),
};

// IPs
export const ips = {
  list: () => client.get('/ips'),
  create: (data) => client.post('/ips', data),
  update: (id, data) => client.put(`/ips/${id}`, data),
  delete: (id) => client.delete(`/ips/${id}`),
};

// Modellers
export const modellers = {
  list: () => client.get('/modellers'),
  create: (data) => client.post('/modellers', data),
  update: (id, data) => client.put(`/modellers/${id}`, data),
  delete: (id) => client.delete(`/modellers/${id}`),
};

// Reviews
export const reviews = {
  list: (productId, limit = 10, offset = 0) =>
    client.get(`/reviews/product/${productId}`, { params: { limit, offset } }),
  create: (productId, data) =>
    client.post(`/reviews/product/${productId}`, data),
  update: (id, data) => client.put(`/reviews/${id}`, data),
  delete: (id) => client.delete(`/reviews/${id}`),
};

// Orders
export const orders = {
  list: (status = null) => 
    client.get('/orders', { params: status ? { status } : {} }),
  adminAll: (status = null) =>
    client.get('/orders/admin/all', { params: status ? { status } : {} }),
  get: (ticketId) => client.get(`/orders/${ticketId}`),
  create: (data) => client.post('/orders', data),
  update: (ticketId, data) => client.put(`/orders/${ticketId}`, data),
  submit: (ticketId) => client.post(`/orders/${ticketId}/submit`),
  markPaid: (ticketId) => client.post(`/orders/${ticketId}/pay`),
  markDelivered: (ticketId) => client.post(`/orders/${ticketId}/deliver`),
  downloadPdf: (ticketId) => `${API_BASE}/orders/${ticketId}/pdf`,
  delete: (ticketId) => client.delete(`/orders/${ticketId}`),
};

// Media
export const media = {
  addImage: (productId, data) =>
    client.post(`/media/images/${productId}`, data),
  deleteImage: (id) => client.delete(`/media/images/${id}`),
  addVideo: (productId, data) =>
    client.post(`/media/videos/${productId}`, data),
  deleteVideo: (id) => client.delete(`/media/videos/${id}`),
  addFile: (productId, data) =>
    client.post(`/media/files/${productId}`, data),
  deleteFile: (id) => client.delete(`/media/files/${id}`),
};

export default client;
