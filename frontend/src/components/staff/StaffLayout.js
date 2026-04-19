import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Truck, Calendar, CreditCard, LogOut, Menu, X, Truck as TruckIcon } from 'lucide-react';

const NAV = [
  { to: '/staff', icon: LayoutDashboard, label: 'Home', end: true },
  { to: '/staff/deliveries', icon: Truck, label: 'Deliveries' },
  { to: '/staff/attendance', icon: Calendar, label: 'Attendance' },
  { to: '/staff/payments', icon: CreditCard, label: 'Payments' },
];

export default function StaffLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto' }}>
      {/* Top Header */}
      <header style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 6 }}><TruckIcon size={18} color="white" /></div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'Space Grotesk' }}>DistributeIQ</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem' }}>Staff Portal</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'right', marginRight: 4 }}>
            <div style={{ color: 'white', fontSize: '0.8rem', fontWeight: 600 }}>{user?.name}</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem' }}>Delivery Staff</div>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 8, padding: 6, cursor: 'pointer' }}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Dropdown menu */}
      {menuOpen && (
        <div style={{ background: 'white', boxShadow: 'var(--shadow-lg)', borderBottom: '1px solid var(--gray-100)', zIndex: 40 }}>
          <button onClick={handleLogout} style={{ width: '100%', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem', fontWeight: 500 }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      )}

      {/* Content */}
      <main style={{ flex: 1, paddingBottom: 80 }}>
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'white', borderTop: '1px solid var(--gray-200)', display: 'flex', zIndex: 50, boxShadow: '0 -4px 12px rgba(0,0,0,0.08)' }}>
        {NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0 8px',
            textDecoration: 'none', color: isActive ? 'var(--primary)' : 'var(--gray-400)',
            fontSize: '0.65rem', fontWeight: 500, gap: 3, transition: 'color 0.15s',
            borderTop: isActive ? '2px solid var(--primary)' : '2px solid transparent',
          })}>
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
