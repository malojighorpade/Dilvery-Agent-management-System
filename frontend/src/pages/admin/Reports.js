import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';

export default function Reports() {
  const [salesData, setSalesData] = useState([]); const [deliveryData, setDeliveryData] = useState(null);
  const [paymentData, setPaymentData] = useState(null); const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [groupBy, setGroupBy] = useState('day');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = { ...dateRange, groupBy };
      const [s, d, p] = await Promise.all([reportsAPI.getSales(params), reportsAPI.getDeliveries(params), reportsAPI.getPayments(params)]);
      setSalesData(s.data.data); setDeliveryData(d.data.data); setPaymentData(p.data.data);
    } catch { toast.error('Failed to load reports'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, []);

  const exportCSV = async (type) => {
    try {
      const res = await reportsAPI.exportCSV({ type, ...dateRange });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = `${type}-report.csv`; a.click(); URL.revokeObjectURL(url);
      toast.success('Exported!');
    } catch { toast.error('Export failed'); }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h1 className="page-title">Reports & Analytics</h1></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => exportCSV('orders')}><Download size={15} />Export Orders</button>
          <button className="btn btn-secondary" onClick={() => exportCSV('payments')}><Download size={15} />Export Payments</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Start Date</label>
            <input type="date" className="form-control" value={dateRange.startDate} onChange={e => setDateRange(d => ({ ...d, startDate: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">End Date</label>
            <input type="date" className="form-control" value={dateRange.endDate} onChange={e => setDateRange(d => ({ ...d, endDate: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Group By</label>
            <select className="form-control form-select" value={groupBy} onChange={e => setGroupBy(e.target.value)}>
              <option value="day">Day</option><option value="week">Week</option><option value="month">Month</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={fetchReports}>Apply Filters</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Revenue Over Time</span></div>
          <div className="card-body">
            {loading ? <div className="loading-spinner"><div className="spinner" /></div> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                  <Tooltip formatter={v => [`₹${v.toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="revenue" fill="#2563eb" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Transaction Count</span></div>
          <div className="card-body">
            {loading ? <div className="loading-spinner"><div className="spinner" /></div> : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="transactions" stroke="#7c3aed" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Delivery Performance by Staff</span></div>
          <div style={{ padding: '0 0 8px' }}>
            {deliveryData?.byStaff?.map((s, i) => (
              <div key={i} style={{ padding: '12px 24px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700 }}>{s.staffName?.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.staffName}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>✓ {s.delivered} delivered</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>✗ {s.failed} failed</span>
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{s.total}</div>
              </div>
            )) || <div className="empty-state"><p className="empty-state-text">No data yet</p></div>}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Payment Mode Breakdown</span></div>
          <div style={{ padding: '8px 0' }}>
            {paymentData?.byMode?.map(m => (
              <div key={m._id} style={{ padding: '12px 24px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className={`badge ${m._id === 'cash' ? 'badge-green' : m._id === 'online' ? 'badge-blue' : 'badge-yellow'}`} style={{ textTransform: 'capitalize', width: 70, justifyContent: 'center' }}>{m._id}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>₹{m.total.toLocaleString()}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{m.count} transactions</div>
                </div>
              </div>
            )) || <div className="empty-state"><p className="empty-state-text">No payment data</p></div>}
            {paymentData && <div style={{ padding: '12px 24px' }}><strong>Outstanding: ₹{paymentData.totalOutstanding?.toLocaleString() || 0}</strong></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
