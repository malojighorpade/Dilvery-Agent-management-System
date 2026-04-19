import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, ShoppingCart, Package, Warehouse, Factory,
  Store, Tag, Users, FileText, CreditCard, BarChart2,
  Calendar, Menu, X, LogOut, Bell, ChevronDown, Truck
} from 'lucide-react';

const NAV = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
  { to: '/admin/products', icon: Package, label: 'Products' },
  { to: '/admin/inventory', icon: Warehouse, label: 'Inventory' },
  { to: '/admin/industries', icon: Factory, label: 'Industries' },
  { to: '/admin/stores', icon: Store, label: 'Stores' },
  { to: '/admin/brands', icon: Tag, label: 'Brands' },
  { to: '/admin/employees', icon: Users, label: 'Employees' },
  { to: '/admin/invoices', icon: FileText, label: 'Invoices' },
  { to: '/admin/payments', icon: CreditCard, label: 'Payments' },
  { to: '/admin/reports', icon: BarChart2, label: 'Reports' },
  { to: '/admin/attendance', icon: Calendar, label: 'Attendance' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 8 }}>
            <Truck size={20} color="white" />
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '1rem', fontFamily: 'Space Grotesk' }}>DistributeIQ</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>Admin Panel</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
        {NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setSidebarOpen(false)}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
              borderRadius: 8, marginBottom: 2, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, transition: 'all 0.15s',
              background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
              color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
            })}>
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '0.875rem', flexShrink: 0 }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'white', fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>Administrator</div>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: 4 }} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Desktop Sidebar */}
      <aside style={{ width: 'var(--sidebar-width)', background: 'linear-gradient(180deg, #1e3a8a 0%, #1d4ed8 100%)', flexShrink: 0, position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100, display: window.innerWidth < 768 ? 'none' : 'block' }}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          <div onClick={() => setSidebarOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <aside style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 260, background: 'linear-gradient(180deg, #1e3a8a 0%, #1d4ed8 100%)' }}>
            <div style={{ position: 'absolute', top: 16, right: 16 }}>
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: 8, padding: 6, cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, marginLeft: 'var(--sidebar-width)', minWidth: 0 }}>
        {/* Header */}
        <header style={{ height: 'var(--header-height)', background: 'white', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 50, boxShadow: 'var(--shadow-sm)' }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-600)', display: 'none', padding: 4 }} className="mobile-menu-btn">
            <Menu size={22} />
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn-icon" title="Notifications"><Bell size={18} /></button>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setProfileOpen(!profileOpen)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 8, color: 'var(--gray-700)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 600 }}>
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{user?.name}</span>
                <ChevronDown size={14} />
              </button>
              {profileOpen && (
                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'white', border: '1px solid var(--gray-200)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', minWidth: 160, zIndex: 100 }}>
                  <div style={{ padding: '8px 0' }}>
                    <div style={{ padding: '8px 16px', fontSize: '0.8rem', color: 'var(--gray-500)' }}>{user?.email}</div>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--gray-100)' }} />
                    <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
