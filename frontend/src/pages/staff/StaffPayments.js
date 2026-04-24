import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { paymentsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { CreditCard, TrendingUp, ArrowLeft, Banknote, Smartphone, CheckSquare, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const DENOMS = ['2000', '500', '200', '100', '50', '20', '10'];

// ─── Collect Payment Form ──────────────────────────────────────────────────────
function CollectPaymentForm({ order, paymentMode: initialMode, onDone, onBack }) {
  const [payForm, setPayForm] = useState({
    paymentMode: initialMode || 'cash',
    amount: order?.totalAmount?.toString() || '',
    transactionId: '',
    upiId: '',
    chequeNumber: '',
    bankName: '',
    chequeDate: '',
    cashDenominations: {},
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const modeConfig = {
    cash:   { label: 'Cash',        icon: Banknote,     color: '#16a34a', bg: '#f0fdf4' },
    online: { label: 'Online / UPI', icon: Smartphone,  color: '#2563eb', bg: '#eff6ff' },
    cheque: { label: 'Cheque',      icon: CheckSquare,  color: '#d97706', bg: '#fffbeb' },
  };

  const cashTotal = DENOMS.reduce((s, d) => s + (Number(payForm.cashDenominations[d] || 0) * Number(d)), 0);

  const handleSubmit = async () => {
    if (!payForm.amount || Number(payForm.amount) <= 0) return toast.error('Enter a valid amount');
    if (payForm.paymentMode === 'online' && !payForm.transactionId) return toast.error('Transaction ID required for online payment');
    if (payForm.paymentMode === 'cheque' && !payForm.chequeNumber) return toast.error('Cheque number required');

    setSaving(true);
    console.log("ORDER 👉", order);
console.log("STORE 👉", order?.store);
    try {
      await paymentsAPI.create({
        store: order?.store?._id || order?.store,
        storeName: order?.store?.name || order?.storeName || 'Unknown Store',
        amount: Number(payForm.amount),
        paymentMode: payForm.paymentMode,
        transactionId: payForm.transactionId || undefined,
        deliveryLogId: order.deliveryLogId || undefined, // Link payment to delivery log for backend processing
        upiId: payForm.upiId || undefined,
        chequeNumber: payForm.chequeNumber || undefined,
        bankName: payForm.bankName || undefined,
        chequeDate: payForm.chequeDate || undefined,
        cashDenominations: payForm.paymentMode === 'cash' ? payForm.cashDenominations : undefined,
        notes: payForm.notes || undefined,
      });
      setSuccess(true);
    } catch (e) {
      console.log("FULL ERROR 👉", e.response?.data);
      toast.error(e.response?.data?.message || 'Payment failed');
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <CheckCircle size={38} color="#16a34a" />
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: 8 }}>Payment Recorded!</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--gray-500)', marginBottom: 6 }}>
          ₹{Number(payForm.amount).toLocaleString()} collected via <strong style={{ textTransform: 'capitalize' }}>{payForm.paymentMode}</strong>
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginBottom: 28 }}>Order {order?.orderNumber}</p>
        <button className="btn btn-primary btn-lg" style={{ justifyContent: 'center', borderRadius: 12 }} onClick={onDone}>
          Back to Orders
        </button>
      </div>
    );
  }

  const mc = modeConfig[payForm.paymentMode];

  return (
    <div style={{ padding: 16, paddingBottom: 180 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', marginBottom: 20, padding: 0 }}>
        <ArrowLeft size={16} /> Back
      </button>

      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>Collect Payment</h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: 20 }}>
        Order <strong style={{ color: 'var(--primary)' }}>{order?.orderNumber}</strong>
        {order?.store?.name && <> · {order.store.name}</>}
      </p>

      {/* Mode switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {Object.entries(modeConfig).map(([key, { label, icon: Icon, color, bg }]) => (
          <button key={key} onClick={() => setPayForm(f => ({ ...f, paymentMode: key }))}
            style={{
              flex: 1, padding: '10px 4px', border: `2px solid ${payForm.paymentMode === key ? color : 'var(--gray-200)'}`,
              borderRadius: 10, background: payForm.paymentMode === key ? bg : 'white',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              transition: 'all 0.15s',
            }}>
            <Icon size={18} color={payForm.paymentMode === key ? color : 'var(--gray-400)'} />
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: payForm.paymentMode === key ? color : 'var(--gray-500)' }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Amount */}
      <div style={{ background: mc.bg, border: `1px solid`, borderColor: 'var(--gray-200)', borderRadius: 14, padding: '16px 18px', marginBottom: 18 }}>
        <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount to Collect (₹)</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: mc.color }}>₹</span>
          <input
            type="number"
            value={payForm.amount}
            onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
            style={{ border: 'none', background: 'transparent', fontSize: '2rem', fontWeight: 800, color: 'var(--gray-900)', outline: 'none', width: '100%', fontFamily: 'Space Grotesk' }}
            placeholder="0"
          />
        </div>
        {order?.totalAmount && Number(payForm.amount) !== order.totalAmount && (
          <p style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 4 }}>
            Invoice total: ₹{order.totalAmount.toLocaleString()}
          </p>
        )}
      </div>

      {/* Cash Denominations */}
      {payForm.paymentMode === 'cash' && (
        <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: 12 }}>Cash Denominations (optional)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {DENOMS.map(d => (
              <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gray-50)', borderRadius: 8, padding: '6px 10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600)', width: 38 }}>₹{d}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>×</span>
                <input
                  type="number" min="0"
                  value={payForm.cashDenominations[d] || ''}
                  onChange={e => setPayForm(f => ({ ...f, cashDenominations: { ...f.cashDenominations, [d]: Number(e.target.value) } }))}
                  placeholder="0"
                  style={{ border: 'none', background: 'transparent', fontSize: '0.9rem', fontWeight: 600, outline: 'none', width: '100%', color: 'var(--gray-800)' }}
                />
              </div>
            ))}
          </div>
          {cashTotal > 0 && (
            <div style={{ marginTop: 12, padding: '8px 10px', background: '#f0fdf4', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>Denomination total</span>
              <strong style={{ color: '#16a34a' }}>₹{cashTotal.toLocaleString()}</strong>
            </div>
          )}
        </div>
      )}

      {/* Online fields */}
      {payForm.paymentMode === 'online' && (
        <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">Transaction / UTR ID *</label>
            <input className="form-control" value={payForm.transactionId} onChange={e => setPayForm(f => ({ ...f, transactionId: e.target.value }))} placeholder="e.g. 123456789012" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">UPI ID (optional)</label>
            <input className="form-control" value={payForm.upiId} onChange={e => setPayForm(f => ({ ...f, upiId: e.target.value }))} placeholder="e.g. store@upi" />
          </div>
        </div>
      )}

      {/* Cheque fields */}
      {payForm.paymentMode === 'cheque' && (
        <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">Cheque Number *</label>
            <input className="form-control" value={payForm.chequeNumber} onChange={e => setPayForm(f => ({ ...f, chequeNumber: e.target.value }))} placeholder="e.g. 001234" />
          </div>
          <div className="form-group">
            <label className="form-label">Bank Name</label>
            <input className="form-control" value={payForm.bankName} onChange={e => setPayForm(f => ({ ...f, bankName: e.target.value }))} placeholder="e.g. State Bank of India" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Cheque Date</label>
            <input className="form-control" type="date" value={payForm.chequeDate} onChange={e => setPayForm(f => ({ ...f, chequeDate: e.target.value }))} />
          </div>
        </div>
      )}

      {/* Notes */}
      <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <label className="form-label">Notes (optional)</label>
        <textarea className="form-control" rows={2} value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any remarks about this payment..." />
      </div>

      {/* Submit */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'white', borderTop: '1px solid var(--gray-200)', padding: '14px 16px', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', zIndex: 999 }}>
        <button
          className="btn btn-success btn-lg"
          style={{ width: '100%', justifyContent: 'center', borderRadius: 14, fontSize: '1rem' }}
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? 'Recording...' : <><CheckCircle size={18} /> Confirm ₹{Number(payForm.amount || 0).toLocaleString()} {modeConfig[payForm.paymentMode]?.label} Payment</>}
        </button>
      </div>
    </div>
  );
}

// ─── Main StaffPayments ────────────────────────────────────────────────────────
// 🔽 ONLY StaffPayments main return updated (rest unchanged above)

export default function StaffPayments() {
  const location = useLocation();
  const navigate = useNavigate();

  const incomingOrder = location.state?.order;
  const incomingMode = location.state?.paymentMode;

  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState('');

  const [collectMode, setCollectMode] = useState(!!incomingOrder);
  const [collectOrder, setCollectOrder] = useState(incomingOrder || null);
  const [collectInitialMode, setCollectInitialMode] = useState(incomingMode || 'cash');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        paymentsAPI.getAll({ paymentMode: modeFilter }),
        paymentsAPI.getSummary({})
      ]);
      setPayments(p.data.data);
      setSummary(s.data.data);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!collectMode) fetchData();
  }, [modeFilter, collectMode]);

  if (collectMode && collectOrder) {
    return (
      <CollectPaymentForm
        order={collectOrder}
        paymentMode={collectInitialMode}
        onDone={() => {
          setCollectMode(false);
          setCollectOrder(null);
          navigate('/staff/payments', { replace: true, state: {} });
        }}
        onBack={() => {
          setCollectMode(false);
          setCollectOrder(null);
          navigate(-1);
        }}
      />
    );
  }

  // 🔥 Summary values
  const total = summary?.totalCollected || 0;
  const cash = summary?.summary?.find(s => s._id === 'cash')?.total || 0;
  const online = summary?.summary?.find(s => s._id === 'online')?.total || 0;
  const cheque = summary?.summary?.find(s => s._id === 'cheque')?.total || 0;

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>
        My Collections
      </h1>

      {/* 🔥 Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        
        <div style={{ background: '#1e3a8a', color: 'white', padding: 16, borderRadius: 12 }}>
          <p style={{ fontSize: 12, opacity: 0.7 }}>Total</p>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>₹{total.toLocaleString()}</h2>
        </div>

        <div style={{ background: '#16a34a', color: 'white', padding: 16, borderRadius: 12 }}>
          <p style={{ fontSize: 12 }}>Cash</p>
          <h2>₹{cash.toLocaleString()}</h2>
        </div>

        <div style={{ background: '#2563eb', color: 'white', padding: 16, borderRadius: 12 }}>
          <p style={{ fontSize: 12 }}>Online</p>
          <h2>₹{online.toLocaleString()}</h2>
        </div>

        <div style={{ background: '#d97706', color: 'white', padding: 16, borderRadius: 12 }}>
          <p style={{ fontSize: 12 }}>Cheque</p>
          <h2>₹{cheque.toLocaleString()}</h2>
        </div>

      </div>

      {/* 🔥 Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['', 'cash', 'online', 'cheque'].map(m => (
          <button
            key={m}
            onClick={() => setModeFilter(m)}
            style={{
              flex: 1,
              padding: 8,
              borderRadius: 8,
              border: modeFilter === m ? '1px solid var(--primary)' : '1px solid #ddd',
              background: modeFilter === m ? '#eef2ff' : 'white'
            }}
          >
            {m || 'All'}
          </button>
        ))}
      </div>

      {/* 🔥 Payments List */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : payments.length === 0 ? (
        <p>No payments found</p>
      ) : payments.map(p => (
        <div key={p._id} style={{
          background: 'white',
          padding: 14,
          borderRadius: 10,
          marginBottom: 10,
          border: '1px solid #eee'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>₹{p.amount}</strong>
            <span style={{ textTransform: 'capitalize' }}>{p.paymentMode}</span>
          </div>

          <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
            {p.store?.name}
          </div>

          <div style={{ fontSize: 12, color: '#888' }}>
            {format(new Date(p.createdAt), 'dd MMM yyyy')}
          </div>

          {p.transactionId && (
            <div style={{ fontSize: 12, color: '#888' }}>
              TXN: {p.transactionId}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}