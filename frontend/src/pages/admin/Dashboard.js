import React, { useState, useEffect } from 'react';
import { dashboardAPI, inventoryAPI } from '../../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ShoppingCart, TrendingUp, Truck, Users, Package, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = { pending: '#f59e0b', processing: '#3b82f6', dispatched: '#8b5cf6', partially_delivered: '#f97316', delivered: '#10b981', cancelled: '#ef4444' };

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([dashboardAPI.getAdmin(), inventoryAPI.getLowStock()])
      .then(([d, ls]) => { setData(d.data.data); setLowStock(ls.data.data.slice(0, 5)); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!data) return null;

  const { stats, ordersByStatus, revenueByDay, topProducts } = data;

  const statCards = [
    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingCart, color: '#2563eb', bg: '#eff6ff', change: null },
    { label: 'Monthly Revenue', value: `₹${(stats.monthRevenue || 0).toLocaleString()}`, icon: TrendingUp, color: '#16a34a', bg: '#f0fdf4', change: stats.revenueGrowth },
    { label: 'Delivered Today', value: stats.deliveredToday, icon: Truck, color: '#7c3aed', bg: '#f5f3ff', change: null },
    { label: 'Active Staff', value: stats.totalStaff, icon: Users, color: '#d97706', bg: '#fffbeb', change: null },
  ];

  const pieData = ordersByStatus.map(s => ({ name: s._id, value: s.count, color: STATUS_COLORS[s._id] || '#9ca3af' }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back! Here's what's happening today.</p>
        </div>
        <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>{format(new Date(), 'EEEE, dd MMM yyyy')}</span>
      </div>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {statCards.map(({ label, value, icon: Icon, color, bg, change }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p className="stat-label">{label}</p>
                <p className="stat-value">{value}</p>
                {change !== null && (
                  <div className={`stat-change ${Number(change) >= 0 ? 'up' : 'down'}`}>
                    {Number(change) >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {Math.abs(change)}% vs last month
                  </div>
                )}
              </div>
              <div className="stat-icon" style={{ background: bg }}>
                <Icon size={22} color={color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Revenue Chart */}
        <div className="card">
          <div className="card-header"><span className="card-title">Revenue (Last 7 Days)</span></div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueByDay}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} tickFormatter={v => v?.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                <Tooltip formatter={(v) => [`₹${v.toLocaleString()}`, 'Revenue']} labelStyle={{ fontSize: 12 }} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Pie */}
        <div className="card">
          <div className="card-header"><span className="card-title">Order Status</span></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Top Products */}
        <div className="card">
          <div className="card-header"><span className="card-title">Top Delivered Products</span></div>
          <div style={{ padding: '0 0 8px' }}>
            {topProducts.length === 0 ? (
              <div className="empty-state"><p className="empty-state-text">No delivery data yet</p></div>
            ) : topProducts.map((p, i) => (
              <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px', borderBottom: i < topProducts.length - 1 ? '1px solid var(--gray-100)' : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>#{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{p.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{p.sku}</div>
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)' }}>{p.totalDelivered} units</div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Low Stock Alerts</span>
            {stats.lowStockCount > 0 && <span className="badge badge-red"><AlertTriangle size={11} style={{ marginRight: 4 }} />{stats.lowStockCount} items</span>}
          </div>
          <div style={{ padding: '0 0 8px' }}>
            {lowStock.length === 0 ? (
              <div className="empty-state"><p className="empty-state-text">All stock levels are healthy</p></div>
            ) : lowStock.map((item, i) => (
              <div key={item._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px', borderBottom: i < lowStock.length - 1 ? '1px solid var(--gray-100)' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Package size={16} color="#dc2626" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{item.product?.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{item.product?.brand?.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#dc2626' }}>{item.currentStock}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>min {item.reorderLevel}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
