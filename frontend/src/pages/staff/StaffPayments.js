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
    try {
      await paymentsAPI.create({
        store: order?.store?._id || order?.store,
        amount: Number(payForm.amount),
        paymentMode: payForm.paymentMode,
        transactionId: payForm.transactionId || undefined,
        upiId: payForm.upiId || undefined,
        chequeNumber: payForm.chequeNumber || undefined,
        bankName: payForm.bankName || undefined,
        chequeDate: payForm.chequeDate || undefined,
        cashDenominations: payForm.paymentMode === 'cash' ? payForm.cashDenominations : undefined,
        notes: payForm.notes || undefined,
      });
      setSuccess(true);
    } catch (e) {
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
    <div style={{ padding: 16, paddingBottom: 100 }}>
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
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'white', borderTop: '1px solid var(--gray-200)', padding: '14px 16px', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', zIndex: 50 }}>
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
export default function StaffPayments() {
  const location = useLocation();
  const navigate = useNavigate();

  // If navigated from order invoice with a pre-selected mode
  const incomingOrder = location.state?.order;
  const incomingMode = location.state?.paymentMode;

  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState('');

  // If we have an incoming order, show payment form directly
  const [collectMode, setCollectMode] = useState(!!incomingOrder);
  const [collectOrder, setCollectOrder] = useState(incomingOrder || null);
  const [collectInitialMode, setCollectInitialMode] = useState(incomingMode || 'cash');

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

  useEffect(() => {
    if (!collectMode) fetchData();
  }, [modeFilter, collectMode]);

  // Show collection form
  if (collectMode && collectOrder) {
    return (
      <CollectPaymentForm
        order={collectOrder}
        paymentMode={collectInitialMode}
        onDone={() => {
          setCollectMode(false);
          setCollectOrder(null);
          // Clear navigation state
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

  // Normal payment history list
  const modeColors = {
    cash:   { bg: '#f0fdf4', color: '#16a34a' },
    online: { bg: '#eff6ff', color: '#2563eb' },
    cheque: { bg: '#fffbeb', color: '#d97706' },
  };

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>My Collections</h1>

      {/* Summary */}
      {summary && (
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', borderRadius: 16, padding: 20, marginBottom: 16, color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <TrendingUp size={18} />
            <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Total Collected</span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'Space Grotesk' }}>
            ₹{summary.totalCollected?.toLocaleString() || 0}
          </p>
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

      {/* Mode Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['', 'cash', 'online', 'cheque'].map(m => (
          <button key={m} onClick={() => setModeFilter(m)}
            style={{
              flex: 1, padding: '8px 4px',
              border: `1px solid ${modeFilter === m ? 'var(--primary)' : 'var(--gray-200)'}`,
              borderRadius: 8, background: modeFilter === m ? 'var(--primary-light)' : 'white',
              color: modeFilter === m ? 'var(--primary)' : 'var(--gray-600)',
              fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize',
            }}>
            {m || 'All'}
          </button>
        ))}
      </div>

      {/* Payment list */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : payments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><CreditCard size={28} /></div>
          <p className="empty-state-title">No payments recorded</p>
          <p className="empty-state-text">Payments collected from stores will appear here</p>
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
              {p.chequeNumber && <p style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>Cheque: {p.chequeNumber} · {p.bankName}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}