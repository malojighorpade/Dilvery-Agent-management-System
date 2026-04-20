import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// ✅ ADD THIS (IMPORTANT)
import Register from './pages/Register';

// Admin Pages
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Orders from './pages/admin/Orders';
import Products from './pages/admin/Products';
import Inventory from './pages/admin/Inventory';
import Industries from './pages/admin/Industries';
import Stores from './pages/admin/Stores';
import Brands from './pages/admin/Brands';
import Employees from './pages/admin/Employees';
import Invoices from './pages/admin/Invoices';
import Payments from './pages/admin/Payments';
import Reports from './pages/admin/Reports';
import AttendanceAdmin from './pages/admin/AttendanceAdmin';

// Staff Pages
import StaffLayout from './components/staff/StaffLayout';
import StaffDashboard from './pages/staff/StaffDashboard';
import MyDeliveries from './pages/staff/MyDeliveries';
import DeliveryDetail from './pages/staff/DeliveryDetail';
import StaffAttendance from './pages/staff/StaffAttendance';
import StaffPayments from './pages/staff/StaffPayments';

// Shared
import Login from './pages/Login';


// 🔐 Private Route
const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/staff'} replace />;
  }

  return children;
};


// 🌐 Public Route
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/staff'} replace />;
  }

  return children;
};


// 🚀 Routes
function AppRoutes() {
  return (
    <Routes>

      {/* ✅ Register Route (ADDED CORRECTLY) */}
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Login */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={<PrivateRoute role="admin"><AdminLayout /></PrivateRoute>}
      >
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="products" element={<Products />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="industries" element={<Industries />} />
        <Route path="stores" element={<Stores />} />
        <Route path="brands" element={<Brands />} />
        <Route path="employees" element={<Employees />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="payments" element={<Payments />} />
        <Route path="reports" element={<Reports />} />
        <Route path="attendance" element={<AttendanceAdmin />} />
      </Route>

      {/* Staff Routes */}
      <Route
        path="/staff"
        element={<PrivateRoute role="delivery agent"><StaffLayout /></PrivateRoute>}
      >
        <Route index element={<StaffDashboard />} />
        <Route path="deliveries" element={<MyDeliveries />} />
        <Route path="deliveries/:id" element={<DeliveryDetail />} />
        <Route path="attendance" element={<StaffAttendance />} />
        <Route path="payments" element={<StaffPayments />} />
      </Route>

      {/* Default */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />

    </Routes>
  );
}


// 🌍 App Wrapper
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.875rem'
            }
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}