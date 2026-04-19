import React, { useState, useEffect } from 'react';
import { paymentsAPI } from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import toast from 'react-hot-toast';
import { CreditCard, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export default function StaffPayments() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        paymentsAPI.getAll({ paymentMode: modeFilter }),
        paymentsAPI.getSummary({}),
      ]);
      setPayments(p.data.data);
      setSummary(s.data.data);
    } catch { toast.error('Failed to load payments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [modeFilter]);

  const modeColors = { cash: { bg: '#f0fdf4', color: '#16a34a' }, online: { bg: '#eff6ff', color: '#2563eb' }, cheque: { bg: '#fffbeb', color: '#d97706' } };

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>My Collections</h1>

      {/* Summary Cards */}
      {summary && (
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', borderRadius: 16, padding: 20, marginBottom: 16, color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <TrendingUp size={18} />
            <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Total Collected</span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'Space Grotesk' }}>₹{summary.totalCollected?.toLocaleString() || 0}</p>
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            {summary.summary?.map(s => (
              <div key={s._id}>
                <p style={{ fontSize: '0.95rem', fontWeight: 700 }}>₹{s.total.toLocaleString()}</p>
                <p style={{ fontSize: '0.65rem', opacity: 0.7, textTransform: 'capitalize' }}>{s._id} ({s.count})</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['', 'cash', 'online', 'cheque'].map(m => (
          <button key={m} onClick={() => setModeFilter(m)}
            style={{ flex: 1, padding: '8px 4px', border: `1px solid ${modeFilter === m ? 'var(--primary)' : 'var(--gray-200)'}`, borderRadius: 8, background: modeFilter === m ? 'var(--primary-light)' : 'white', color: modeFilter === m ? 'var(--primary)' : 'var(--gray-600)', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize' }}>
            {m || 'All'}
          </button>
        ))}
      </div>

      {/* Payment List */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : payments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><CreditCard size={28} /></div>
          <p className="empty-state-title">No payments recorded</p>
        </div>
      ) : payments.map(p => {
        const mc = modeColors[p.paymentMode] || { bg: 'var(--gray-100)', color: 'var(--gray-600)' };
        return (
          <div key={p._id} style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 10, border: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: mc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CreditCard size={20} color={mc.color} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>₹{p.amount?.toLocaleString()}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 2 }}>{p.store?.name}</p>
                </div>
                <span className={`badge ${p.paymentMode === 'cash' ? 'badge-green' : p.paymentMode === 'online' ? 'badge-blue' : 'badge-yellow'}`} style={{ textTransform: 'capitalize' }}>
                  {p.paymentMode}
                </span>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: 6 }}>
                {format(new Date(p.collectedAt || p.createdAt), 'dd MMM yyyy, hh:mm a')}
              </p>
              {p.transactionId && <p style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>Ref: {p.transactionId}</p>}
              {p.chequeNumber && <p style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>Cheque: {p.chequeNumber} ({p.bankName})</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
