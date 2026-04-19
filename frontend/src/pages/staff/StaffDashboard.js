import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../../services/api';
import { Truck, CheckCircle, Clock, CreditCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

export default function StaffDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getStaff()
      .then(r => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Assigned Orders', value: data?.assignedOrders || 0, icon: Truck, color: '#2563eb', bg: '#eff6ff' },
    { label: 'Delivered Today', value: data?.deliveredToday || 0, icon: CheckCircle, color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Pending', value: data?.pendingDeliveries || 0, icon: Clock, color: '#d97706', bg: '#fffbeb' },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Greeting */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', borderRadius: 16, padding: '20px', marginBottom: 20, color: 'white' }}>
        <p style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: 4 }}>{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        <h2 style={{ fontSize: '1.3rem', fontFamily: 'Space Grotesk', marginBottom: 4 }}>Good morning, {user?.name?.split(' ')[0]}! 👋</h2>
        <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>You have {data?.assignedOrders || 0} orders to deliver today</p>
      </div>

      {/* Stats */}
      {loading ? <div className="loading-spinner"><div className="spinner" /></div> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
            {stats.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} style={{ background: 'white', borderRadius: 12, padding: '14px 10px', textAlign: 'center', border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                  <Icon size={18} color={color} />
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.4rem', color: 'var(--gray-900)' }}>{value}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--gray-500)', fontWeight: 500, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Payment Summary */}
          {data?.todayPayments?.length > 0 && (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--gray-200)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CreditCard size={16} color="var(--primary)" />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Today's Collections</span>
              </div>
              {data.todayPayments.map(p => (
                <div key={p._id} style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--gray-100)' }}>
                  <span style={{ fontSize: '0.875rem', textTransform: 'capitalize', color: 'var(--gray-700)' }}>{p._id} ({p.count})</span>
                  <strong style={{ color: 'var(--primary)' }}>₹{p.total.toLocaleString()}</strong>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
