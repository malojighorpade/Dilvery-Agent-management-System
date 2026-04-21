import React, { useState, useEffect } from 'react';
import { paymentsAPI } from '../../services/api';
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
        paymentsAPI.getSummary({})
      ]);
      console.log("PAYMENTS:", p.data);
console.log("SUMMARY:", s.data);

      setPayments(p.data?.data || []);
      setSummary(s.data?.data || null);

    } catch (err) {
      console.error(err);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [modeFilter]);

  const modeColors = {
    cash: { bg: '#f0fdf4', color: '#16a34a' },
    online: { bg: '#eff6ff', color: '#2563eb' },
    cheque: { bg: '#fffbeb', color: '#d97706' }
  };

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>
        My Collections
      </h1>

      {/* 🔹 SUMMARY */}
      {summary && (
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} />
            <span>Total Collected</span>
          </div>

          <h2 style={{ marginTop: 8 }}>
            ₹{summary.totalCollected?.toLocaleString() || 0}
          </h2>

          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            {summary.summary?.map(s => (
              <div key={s._id}>
                <strong>₹{s.total.toLocaleString()}</strong>
                <p style={{ fontSize: 12 }}>
                  {s._id} ({s.count})
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🔹 FILTER */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['', 'cash', 'online', 'cheque'].map(m => (
          <button
            key={m}
            onClick={() => setModeFilter(m)}
            style={{
              flex: 1,
              padding: 8,
              borderRadius: 8,
              cursor: 'pointer',
              border: '1px solid #ddd',
              background: modeFilter === m ? '#dbeafe' : 'white'
            }}
          >
            {m || 'All'}
          </button>
        ))}
      </div>

      {/* 🔹 LIST */}
      {loading ? (
        <p>Loading...</p>
      ) : payments.length === 0 ? (
        <p>No payments found</p>
      ) : (
        payments.map(p => {
          const mc = modeColors[p.paymentMode] || {};

          return (
            <div key={p._id} style={{
              background: 'white',
              padding: 12,
              marginBottom: 10,
              borderRadius: 10,
              border: '1px solid #eee',
              display: 'flex',
              gap: 10
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: mc.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CreditCard size={18} color={mc.color} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>₹{p.amount?.toLocaleString()}</strong>
                    <p style={{ fontSize: 12 }}>{p.store?.name}</p>
                  </div>

                  <span style={{
                    fontSize: 12,
                    textTransform: 'capitalize'
                  }}>
                    {p.paymentMode}
                  </span>
                </div>

                <p style={{ fontSize: 11, marginTop: 5 }}>
                  {format(new Date(p.collectedAt || p.createdAt), 'dd MMM yyyy, hh:mm a')}
                </p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}