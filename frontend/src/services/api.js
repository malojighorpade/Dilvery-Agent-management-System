import axios from 'axios';

// ================= BASE INSTANCE =================
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 15000,
});

// ================= REQUEST INTERCEPTOR =================
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('dms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ================= RESPONSE INTERCEPTOR =================
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dms_token');
      localStorage.removeItem('dms_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ================= AUTH =================
export const authAPI = {
  login: (data) => API.post('/auth/login', data),
  getMe: () => API.get('/auth/me'),
  changePassword: (data) => API.put('/auth/change-password', data),
};

// ================= USERS =================
export const usersAPI = {
  getAll: (params) => API.get('/users', { params }),
  getOne: (id) => API.get(`/users/${id}`),
  create: (data) => API.post('/users', data),
  update: (id, data) => API.put(`/users/${id}`, data),
  delete: (id) => API.delete(`/users/${id}`),
  getStaff: () => API.get('/users/staff/list'),
};

// ================= BRANDS =================
export const brandsAPI = {
  getAll: (params) => API.get('/brands', { params }),
  getOne: (id) => API.get(`/brands/${id}`),
  create: (data) => API.post('/brands', data),
  update: (id, data) => API.put(`/brands/${id}`, data),
  delete: (id) => API.delete(`/brands/${id}`),
};

// ================= PRODUCTS =================
export const productsAPI = {
  getAll: (params) => API.get('/products', { params }),
  getOne: (id) => API.get(`/products/${id}`),
  create: (data) => API.post('/products', data),
  update: (id, data) => API.put(`/products/${id}`, data),
  delete: (id) => API.delete(`/products/${id}`),
  getCategories: () => API.get('/products/categories'),
};

// ================= INVENTORY =================
export const inventoryAPI = {
  getAll: (params) => API.get('/inventory', { params }),
  getItem: (productId) => API.get(`/inventory/product/${productId}`),
  adjust: (data) => API.post('/inventory/adjust', data),
  getLowStock: () => API.get('/inventory/alerts/low-stock'),
};

// ================= INDUSTRIES =================
export const industriesAPI = {
  getAll: (params) => API.get('/industries', { params }),
  getOne: (id) => API.get(`/industries/${id}`),
  create: (data) => API.post('/industries', data),
  update: (id, data) => API.put(`/industries/${id}`, data),
  delete: (id) => API.delete(`/industries/${id}`),
};

// ================= STORES =================
export const storesAPI = {
  getAll: (params) => API.get('/stores', { params }),
  getOne: (id) => API.get(`/stores/${id}`),
  create: (data) => API.post('/stores', data),
  update: (id, data) => API.put(`/stores/${id}`, data),
  delete: (id) => API.delete(`/stores/${id}`),
  getRoutes: () => API.get('/stores/routes'),
};

// ================= ORDERS =================
export const ordersAPI = {
  getAll: (params) => API.get('/orders', { params }),
  getOne: (id) => API.get(`/orders/${id}`),
  create: (data) => API.post('/orders', data),
  update: (id, data) => API.put(`/orders/${id}`, data),
  assignStaff: (id, data) => API.put(`/orders/${id}/assign`, data),
  delete: (id) => API.delete(`/orders/${id}`),

  // ✅ Your route
  getMyOrders: (params) => API.get('/orders/my-orders', { params }),
};

// ================= INVOICES =================
export const invoicesAPI = {
  getAll: (params) => API.get('/invoices', { params }),
  getOne: (id) => API.get(`/invoices/${id}`),
  markPaid: (id) => API.put(`/invoices/${id}/mark-paid`, {}),
};

// ================= PAYMENTS =================
export const paymentsAPI = {
  getAll: (params) => API.get('/payments', { params }),
  getOne: (id) => API.get(`/payments/${id}`),
  create: (data) => API.post('/payments', data),
  getSummary: (params) => API.get('/payments/summary', { params }),
};

// ================= ATTENDANCE =================
export const attendanceAPI = {
  checkIn: (data) => API.post('/attendance/check-in', data),
  checkOut: (data) => API.post('/attendance/check-out', data),
  getTodayStatus: () => API.get('/attendance/today'),
  getMyAttendance: (params) => API.get('/attendance/my', { params }),
  getAll: (params) => API.get('/attendance', { params }),
  approve: (id) => API.put(`/attendance/approve/${id}`),
  reject: (id) => API.put(`/attendance/reject/${id}`),
};

// ================= DELIVERY LOGS (🔥 FIXED) =================
export const deliveryAPI = {
  getAll: (params) => API.get('/delivery-logs', { params }),

  getOne: (id) => API.get(`/delivery-logs/${id}`),

  create: (data) => API.post('/delivery-logs', data),

  // ✅ FIXED (IMPORTANT)
  getByOrder: (orderId) =>
    API.get(`/delivery-logs/order/${orderId}`),

  update: (id, data) => API.put(`/delivery-logs/${id}`, data),

  updateStatus: (id, data) =>
    API.put(`/delivery-logs/${id}/status`, data),

  uploadProof: (id, formData) =>
    API.post(`/delivery-logs/${id}/proof`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getMyDeliveries: (params) =>
    API.get('/delivery-logs/my', { params }),
};

// ================= DASHBOARD =================
export const dashboardAPI = {
  getAdmin: () => API.get('/dashboard/admin'),
  getStaff: () => API.get('/dashboard/staff'),
};

// ================= REPORTS =================
export const reportsAPI = {
  getSales: (params) => API.get('/reports/sales', { params }),
  getDeliveries: (params) => API.get('/reports/deliveries', { params }),
  getPayments: (params) => API.get('/reports/payments', { params }),
  exportCSV: (params) =>
    API.get('/reports/export', { params, responseType: 'blob' }),
};

export default API;