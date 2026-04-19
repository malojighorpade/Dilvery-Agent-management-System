import React, { useState, useEffect, useCallback } from 'react';
import { paymentsAPI } from '../../services/api';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Payments() {
  const [items, setItems] = useState([]); const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true); const [modeFilter, setModeFilter] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([paymentsAPI.getAll({ paymentMode: modeFilter }), paymentsAPI.getSummary({})]);
      setItems(r.data.data); setSummary(s.data.data);
    } catch { toast.error('Failed'); } finally { setLoading(false); }
  }, [modeFilter]);
  useEffect(() => { fetch(); }, [fetch]);

  const columns = [
    { key: 'paymentNumber', label: 'Payment #', render: r => <strong style={{ color: 'var(--primary)' }}>{r.paymentNumber}</strong> },
    { key: 'store', label: 'Store', render: r => r.store?.name || '—' },
    { key: 'amount', label: 'Amount', render: r => <strong>₹{r.amount?.toLocaleString()}</strong> },
    { key: 'paymentMode', label: 'Mode', render: r => <span className={`badge ${r.paymentMode === 'cash' ? 'badge-green' : r.paymentMode === 'online' ? 'badge-blue' : 'badge-yellow'}`}>{r.paymentMode}</span> },
    { key: 'collectedBy', label: 'Collected By', render: r => r.collectedBy?.name || '—' },
    { key: 'collectedAt', label: 'Date', render: r => format(new Date(r.collectedAt || r.createdAt), 'dd MMM yyyy, HH:mm') },
  ];

  return (
    <div className="page-container">
      <div className="page-header"><div><h1 className="page-title">Payments</h1><p className="page-subtitle">Total Collected: <strong>₹{summary?.totalCollected?.toLocaleString() || 0}</strong></p></div></div>
      {summary && (
        <div className="grid-3" style={{ marginBottom: 20 }}>
          {summary.summary.map(s => (
            <div key={s._id} className="stat-card">
              <p className="stat-label" style={{ textTransform: 'capitalize' }}>{s._id} Payments</p>
              <p className="stat-value">₹{s.total.toLocaleString()}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 4 }}>{s.count} transactions</p>
            </div>
          ))}
        </div>
      )}
      <div className="card">
        <div className="card-header">
          <select className="form-control form-select" style={{ width: 150 }} value={modeFilter} onChange={e => setModeFilter(e.target.value)}>
            <option value="">All Modes</option>
            {['cash','online','cheque'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <DataTable columns={columns} data={items} loading={loading} emptyText="No payments found" />
      </div>
    </div>
  );
}
