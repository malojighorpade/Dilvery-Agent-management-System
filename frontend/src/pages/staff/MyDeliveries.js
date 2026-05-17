import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { deliveryAPI, ordersAPI, paymentsAPI } from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import toast from 'react-hot-toast';
import {
  MapPin, Package, ChevronRight, ShoppingCart,
  ArrowLeft, Building2, Store, FileText,
  CreditCard, Banknote, QrCode, FileCheck, X, Download, File, CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import PaymentStatusModal from './PaymentStatusModal';
const DENOMS = ['2000', '500', '200', '100', '50', '20', '10'];

// ─────────────────────────────────────────────────────────────────────────────
// ✅ PAYMENT FORM - DIRECT COLLECTION (Inline, no navigation)
// ─────────────────────────────────────────────────────────────────────────────
function PaymentReceipt({ order, deliveryLog }) {
  const collected = deliveryLog?.totalPaymentCollected ?? order.amountCollected ?? 0;
  const total = order.totalAmount || 0;
  const outstanding = Math.max(0, total - collected);
  const payStatus = deliveryLog?.paymentStatus || order.paymentStatus || 'pending';
  const isPdf = order.orderType === 'pdf';

  if (collected <= 0 && payStatus === 'pending') return null;

  return (
    <div style={{
      marginTop: 16,
      background: payStatus === 'full_collected' ? '#f0fdf4' : '#fffbeb',
      border: `1px solid ${payStatus === 'full_collected' ? '#86efac' : '#fcd34d'}`,
      borderRadius: 12,
      padding: 16,
    }}>
      <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 10, color: '#374151' }}>
        {isPdf ? '📄 Payment Receipt' : '🧾 Payment Summary'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.85rem' }}>
        <div><span style={{ color: '#6b7280' }}>Status</span><br /><strong style={{ textTransform: 'capitalize' }}>{order.status?.replace('_', ' ')}</strong></div>
        <div><span style={{ color: '#6b7280' }}>Payment</span><br /><strong style={{ textTransform: 'capitalize' }}>{payStatus.replace(/_/g, ' ')}</strong></div>
        <div><span style={{ color: '#6b7280' }}>Order Total</span><br /><strong>₹{total.toLocaleString()}</strong></div>
        <div><span style={{ color: '#6b7280' }}>Collected</span><br /><strong style={{ color: '#16a34a' }}>₹{collected.toLocaleString()}</strong></div>
        {outstanding > 0 && (
          <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#6b7280' }}>Outstanding</span><br /><strong style={{ color: '#d97706' }}>₹{outstanding.toLocaleString()}</strong></div>
        )}
      </div>
      {deliveryLog?.paymentHistory?.length > 0 && (
        <div style={{ marginTop: 12, borderTop: '1px solid #e5e7eb', paddingTop: 10 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Collections</p>
          {deliveryLog.paymentHistory.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
              <span style={{ textTransform: 'capitalize' }}>{p.mode} · {format(new Date(p.collectedAt), 'dd MMM HH:mm')}</span>
              <span style={{ fontWeight: 600 }}>₹{p.amount?.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentForm({ order, paymentMode, onBack, onSuccess, onPaymentComplete }) {
  const [deliveryLog, setDeliveryLog] = useState(null);
  const [amount, setAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [upiId, setUpiId] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [notes, setNotes] = useState('');
  const [cashDenominations, setCashDenominations] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const collectedSoFar = deliveryLog?.totalPaymentCollected || order.amountCollected || 0;
  const outstanding = Math.max(0, (order.totalAmount || 0) - collectedSoFar);
  const cashTotal = DENOMS.reduce((s, d) => s + (Number(cashDenominations[d] || 0) * Number(d)), 0);

  useEffect(() => {
    if (!order?._id) return;
    deliveryAPI.getByOrder(order._id)
      .then((res) => {
        if (res.data?.data) setDeliveryLog(res.data.data);
      })
      .catch(() => {});
  }, [order._id]);

  useEffect(() => {
    const due = Math.max(0, (order.totalAmount || 0) - (deliveryLog?.totalPaymentCollected || order.amountCollected || 0));
    if (due > 0) setAmount(String(due));
    else if (order.totalAmount) setAmount(String(order.totalAmount));
  }, [order.totalAmount, deliveryLog?.totalPaymentCollected, order.amountCollected]);

  const modeConfig = {
    cash: { label: 'Cash', color: '#16a34a', bg: '#f0fdf4' },
    online: { label: 'Online / UPI', color: '#2563eb', bg: '#eff6ff' },
    cheque: { label: 'Cheque', color: '#d97706', bg: '#fffbeb' },
  };

  const handleSubmit = async () => {
    let payAmount = Number(amount);
    if (paymentMode === 'cash' && cashTotal > 0) {
      payAmount = cashTotal;
    }

    if (!payAmount || payAmount <= 0) {
      return toast.error('Enter a valid amount');
    }

    if (payAmount > outstanding && outstanding > 0) {
      return toast.error(`Cannot collect more than outstanding ₹${outstanding.toLocaleString()}`);
    }

    if (paymentMode === 'online' && !transactionId) {
      return toast.error('Transaction ID required');
    }

    if (paymentMode === 'cheque' && !chequeNumber) {
      return toast.error('Cheque number required');
    }

    setSaving(true);
    try {
      const r = await paymentsAPI.create({
        store: order.store?._id,
        storeName: order.store?.name,
        amount: payAmount,
        paymentMode,
        orderId: order._id,
        deliveryLogId: deliveryLog?._id,
        transactionId: transactionId || undefined,
        upiId: upiId || undefined,
        chequeNumber: chequeNumber || undefined,
        bankName: bankName || undefined,
        chequeDate: chequeDate || undefined,
        cashDenominations: paymentMode === 'cash' ? cashDenominations : undefined,
        notes: notes || undefined,
      });

      const collectedAmt = r.data?.collectedAmount ?? r.data?.data?.amount ?? payAmount;
      const isPartial = r.data?.paymentType === 'partial';
      const newOutstanding = Math.max(0, outstanding - collectedAmt);

      setSuccess(true);
      toast.success(
        isPartial
          ? `₹${collectedAmt.toLocaleString()} partial payment recorded! Outstanding: ₹${newOutstanding.toLocaleString()}`
          : `₹${collectedAmt.toLocaleString()} collected!`
      );

      try {
        const logRes = await deliveryAPI.getByOrder(order._id);
        if (logRes.data?.data) setDeliveryLog(logRes.data.data);
      } catch { /* ignore */ }

      setTimeout(() => {
  onSuccess?.();
}, 1500);
    } catch (err) {
      console.error('❌ Payment error:', err);
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setSaving(false);
    }
  };

  // After payment is collected successfully, show this:
 if (showStatusModal) {
  return (
    <PaymentStatusModal
      open={showStatusModal}
      onClose={() => setShowStatusModal(false)}
      onBack={() => setShowStatusModal(false)}
      deliveryLog={deliveryLog || order}
      orderAmount={order.totalAmount}
      orderType={order.orderType}
      onPaymentUpdate={async () => {
        try {
          const res = await deliveryAPI.getByOrder(order._id);
          if (res.data?.data) setDeliveryLog(res.data.data);
        } catch { /* ignore */ }
      }}
      onPaymentComplete={() => {
        setShowStatusModal(false);
        onPaymentComplete?.();
      }}
    />
  );
}
if (success) {
  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: '#f0fdf4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}
      >
        <CheckCircle size={38} color="#16a34a" />
      </div>

      <h2
        style={{
          fontSize: '1.3rem',
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        Payment Recorded!
      </h2>

      <p
        style={{
          fontSize: '0.9rem',
          color: 'var(--gray-500)',
          marginBottom: 6,
        }}
      >
        ₹{Number(amount).toLocaleString()} collected
      </p>

      <p
        style={{
          fontSize: '0.8rem',
          color: 'var(--gray-400)',
          marginBottom: 28,
        }}
      >
        Order {order?.orderNumber}
      </p>

       <button
        onClick={() => setShowStatusModal(true)}  // ← Opens modal, keeps it open
        style={{
          padding: 12,
          borderRadius: 10,
          border: 'none',
          background: 'var(--primary)',
          color: 'white',
          fontWeight: 600,
          cursor: 'pointer',
          width: '100%',
          marginBottom: 10,
        }}
      >
        💰 Manage Payment & Status
      </button>
       {/* Optional: Add "Back to Orders" button */}
      <button
        onClick={() => {
  setSuccess(false);
  onBack?.();
  onSuccess?.();
}}
        style={{
          padding: 12,
          borderRadius: 10,
          border: '1px solid var(--gray-200)',
          background: '#f9fafb',
          color: '#374151',
          fontWeight: 600,
          cursor: 'pointer',
          width: '100%',
        }}
      >
        Back to Orders
      </button>
    </div>
  );
}

  const mc = modeConfig[paymentMode];

  return (
    <div style={{ padding: 16, paddingBottom: 180 }}>
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--primary)',
          fontSize: '0.875rem',
          fontWeight: 500,
          cursor: 'pointer',
          marginBottom: 20,
          padding: 0,
        }}
      >
        <ArrowLeft size={16} /> Back to Invoice
      </button>

      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>Collect Payment</h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: 20 }}>
        Order <strong style={{ color: 'var(--primary)' }}>{order.orderNumber}</strong> via <strong style={{ textTransform: 'capitalize' }}>{paymentMode}</strong>
      </p>

      {/* Amount Input */}
      <div style={{ background: mc.bg, borderRadius: 14, padding: '16px 18px', marginBottom: 18 }}>
        <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {collectedSoFar > 0 ? `Outstanding (₹${outstanding.toLocaleString()})` : 'Amount to Collect (₹)'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: mc.color }}>₹</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '2rem',
              fontWeight: 800,
              color: 'var(--gray-900)',
              outline: 'none',
              width: '100%',
              fontFamily: 'Space Grotesk',
            }}
            placeholder="0"
          />
        </div>
        {paymentMode === 'cash' && cashTotal > 0 && (
          <p style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: 4, fontWeight: 600 }}>
            Cash counted: ₹{cashTotal.toLocaleString()}
          </p>
        )}
        {order?.totalAmount && (
          <p style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 4 }}>
            Order total: ₹{order.totalAmount.toLocaleString()}
            {collectedSoFar > 0 && ` · Already collected: ₹${collectedSoFar.toLocaleString()}`}
          </p>
        )}
      </div>

      {/* Cash Denominations */}
      {paymentMode === 'cash' && (
        <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: 12 }}>Cash Denominations (optional)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {DENOMS.map((d) => (
              <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gray-50)', borderRadius: 8, padding: '6px 10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600)', width: 38 }}>₹{d}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>×</span>
                <input
                  type="number"
                  min="0"
                  value={cashDenominations[d] || ''}
                  onChange={(e) =>
                    setCashDenominations({
                      ...cashDenominations,
                      [d]: Number(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    outline: 'none',
                    width: '100%',
                    color: 'var(--gray-800)',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Online Payment Fields */}
      {paymentMode === 'online' && (
        <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">Transaction / UTR ID *</label>
            <input
              className="form-control"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g. 123456789012"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">UPI ID (optional)</label>
            <input
              className="form-control"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. store@upi"
            />
          </div>
        </div>
      )}

      {/* Cheque Payment Fields */}
      {paymentMode === 'cheque' && (
        <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">Cheque Number *</label>
            <input
              className="form-control"
              value={chequeNumber}
              onChange={(e) => setChequeNumber(e.target.value)}
              placeholder="e.g. 001234"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Bank Name</label>
            <input
              className="form-control"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. State Bank of India"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Cheque Date</label>
            <input
              className="form-control"
              type="date"
              value={chequeDate}
              onChange={(e) => setChequeDate(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Notes */}
      <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <label className="form-label">Notes (optional)</label>
        <textarea
          className="form-control"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any remarks about this payment..."
        />
      </div>

      {/* Submit Button */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        background: 'white',
        borderTop: '1px solid var(--gray-200)',
        padding: '14px 16px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
        zIndex: 999,
      }}>
        <button
          className="btn btn-success btn-lg"
          style={{ width: '100%', justifyContent: 'center', borderRadius: 14, fontSize: '1rem' }}
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? 'Recording...' : <><CheckCircle size={18} /> Confirm ₹{Number(amount || 0).toLocaleString()} {modeConfig[paymentMode]?.label} Payment</>}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT MODE SELECTOR
// ─────────────────────────────────────────────────────────────────────────────
function PaymentModeSelector({ order, onBack, onSelectMode }) {
  const [selected, setSelected] = useState(null);
  const modes = [
    { key: 'cash', label: 'Cash', icon: Banknote, color: '#16a34a', bg: '#f0fdf4', border: '#86efac', desc: 'Collect physical cash' },
    { key: 'online', label: 'Online / UPI', icon: QrCode, color: '#2563eb', bg: '#eff6ff', border: '#93c5fd', desc: 'UPI, NEFT, QR scan' },
    { key: 'cheque', label: 'Cheque', icon: FileCheck, color: '#d97706', bg: '#fffbeb', border: '#fcd34d', desc: 'Post-dated cheque' },
  ];

  return (
    <div style={{
      padding: 16,
      paddingBottom: 100,
      maxWidth: 480,
      margin: '0 auto'
    }}>
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--primary)',
          fontSize: '0.875rem',
          fontWeight: 500,
          cursor: 'pointer',
          marginBottom: 20,
          padding: 0
        }}
      >
        <ArrowLeft size={16} /> Back to Invoice
      </button>

      <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
        Select Payment Mode
      </h2>

      <p style={{
        fontSize: '0.8rem',
        color: 'var(--gray-500)',
        marginBottom: 20
      }}>
        Order <strong style={{ color: 'var(--primary)' }}>
          {order.orderNumber}
        </strong> — ₹{order.totalAmount?.toLocaleString()}
      </p>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginBottom: 24
      }}>
        {modes.map(({ key, label, icon: Icon, color, bg, desc }) => (
          <button
            key={key}
            onClick={() => setSelected(key)}
            style={{
              background: selected === key ? bg : 'white',
              border: `2px solid ${selected === key ? color : '#e5e7eb'}`,
              borderRadius: 14,
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: selected === key ? color : '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon size={22} color={selected === key ? 'white' : '#9ca3af'} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{
                fontWeight: 700,
                fontSize: '0.95rem',
                color: selected === key ? color : '#111827'
              }}>
                {label}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#6b7280'
              }}>
                {desc}
              </div>
            </div>

            {selected === key && (
              <div style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                ✓
              </div>
            )}
          </button>
        ))}
      </div>

      <div style={{
        position: 'sticky',
        bottom: 60,
        width: '100%',
        background: 'white',
        borderTop: '1px solid var(--gray-200)',
        padding: '14px 16px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        zIndex: 10,
        display: 'flex',
        gap: 10
      }}>
        <button
          disabled={!selected}
          onClick={() => onSelectMode(selected)}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 14,
            fontSize: '1rem',
            fontWeight: 600,
            background: selected ? 'var(--primary)' : '#9ca3af',
            color: 'white',
            border: 'none',
            cursor: selected ? 'pointer' : 'not-allowed'
          }}
        >
          💳 Proceed to Collect Payment
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE VIEW
// ─────────────────────────────────────────────────────────────────────────────
function InvoiceView({ order, onBack, onPaymentComplete }) {
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMode, setPaymentMode] = useState(null);
  const [deliveryLog, setDeliveryLog] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    if (!order?._id) return;
    deliveryAPI.getByOrder(order._id)
      .then((res) => { if (res.data?.data) setDeliveryLog(res.data.data); })
      .catch(() => {});
  }, [order._id]);

  const handleSelectMode = (mode) => {
    setPaymentMode(mode);
    setShowPayment(true);
  };

  // Show payment form directly
  if (showPayment && paymentMode) {
    return (
      <PaymentForm
        order={order}
        paymentMode={paymentMode}
        onBack={() => {
          setShowPayment(false);
          setPaymentMode(null);
        }}
        onSuccess={() => {}}
        onPaymentComplete={() => {
          setShowPayment(false);
          setPaymentMode(null);
          onPaymentComplete?.();
        }}
      />
    );
  }

  // Show mode selector
  if (showPayment && !paymentMode) {
    return <PaymentModeSelector order={order} onBack={() => setShowPayment(false)} onSelectMode={handleSelectMode} />;
  }

  const handleDownloadPDF = async () => {
    if (!order.pdfInvoice?.pdfUrl) {
      toast.error('PDF not available');
      return;
    }

    try {
      const response = await fetch(order.pdfInvoice.pdfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${order.orderNumber || 'invoice'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error('Failed to download PDF');
    }
  };

  // ─── PDF ORDER ───────────────────────────────────────────────────────────
  if (order.orderType === 'pdf') {
    const total = order.totalAmount || 0;

    return (
      <div style={{ paddingBottom: 100 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', marginBottom: 16, padding: 0 }}>
          <ArrowLeft size={16} /> Back to Orders
        </button>

        <div style={{ background: 'white', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <File size={14} color="rgba(255,255,255,0.8)" />
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>PDF Invoice</span>
              </div>
              <p style={{ color: 'white', fontWeight: 800, fontSize: '1rem', fontFamily: 'Space Grotesk' }}>{order.orderNumber}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ padding: '16px 18px', borderRight: '1px solid var(--gray-100)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Building2 size={14} color="#2563eb" /></div>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>From</span>
              </div>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-900)', marginBottom: 4 }}>{order.industry?.name || '—'}</p>
              {order.industry?.contactPerson && <p style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginBottom: 2 }}>{order.industry.contactPerson}</p>}
              {order.industry?.phone && <p style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginBottom: 2 }}>📞 {order.industry.phone}</p>}
            </div>

            <div style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Store size={14} color="#16a34a" /></div>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>To</span>
              </div>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', color: order.store ? 'var(--gray-900)' : 'var(--gray-400)', marginBottom: 4, fontStyle: order.store ? 'normal' : 'italic' }}>
                {order.store?.name || 'No store assigned'}
              </p>
              {order.store?.ownerName && <p style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginBottom: 2 }}>{order.store.ownerName}</p>}
              {order.store?.phone && <p style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginBottom: 2 }}>📞 {order.store.phone}</p>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '12px 18px', background: '#f9fafb', borderBottom: '1px solid var(--gray-100)', gap: 8 }}>
            <div><p style={{ fontSize: '0.6rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Order Date</p><p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-700)' }}>{order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy') : '—'}</p></div>
            <div><p style={{ fontSize: '0.6rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Delivery Date</p><p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-700)' }}>{order.deliveryDate ? format(new Date(order.deliveryDate), 'dd MMM yyyy') : 'TBD'}</p></div>
            <div><p style={{ fontSize: '0.6rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Priority</p><StatusBadge status={order.priority || 'normal'} /></div>
          </div>

          <div style={{ padding: '20px', background: '#f0fdf4' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 50, height: 50, borderRadius: 12, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <File size={24} color="#16a34a" />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#166534' }}>📄 PDF Invoice Uploaded</p>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>{order.pdfInvoice?.fileName || 'Invoice PDF'}</p>
              </div>
            </div>
          </div>

          <div style={{ padding: '14px 18px', background: '#f9fafb', borderTop: '2px dashed var(--gray-200)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gray-900)' }}>Invoice Amount</span>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'Space Grotesk' }}>₹{total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <PaymentReceipt order={order} deliveryLog={deliveryLog} />

        <div style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 480,
          background: 'white',
          borderTop: '1px solid var(--gray-200)',
          padding: '14px 16px',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
          zIndex: 999,
          display: 'flex',
          gap: 10
        }}>
          <button
            onClick={handleDownloadPDF}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 14,
              fontSize: '0.9rem',
              fontWeight: 600,
              background: '#f3f4f6',
              color: '#374151',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <Download size={16} /> View PDF
          </button>
          <button
            onClick={() => { setShowPayment(true); setPaymentMode(null); }}
            className="btn btn-success"
            style={{ flex: 1, borderRadius: 14 }}
          >
            Collect Payment
          </button>
        </div>
      </div>
    );
  }

  // ─── MANUAL ORDER ───────────────────────────────────────────────────────
  const subtotal = order.items?.reduce((s, i) => s + i.quantity * i.price, 0) || 0;
  const tax = Math.round(subtotal * 0.18);
  const total = order.totalAmount || subtotal;

  return (
    <div style={{ padding: 16, paddingBottom: 100 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', marginBottom: 16, padding: 0 }}>
        <ArrowLeft size={16} /> Back to Orders
      </button>

      <div style={{ background: 'white', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <FileText size={14} color="rgba(255,255,255,0.8)" />
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Billing Invoice</span>
            </div>
            <p style={{ color: 'white', fontWeight: 800, fontSize: '1rem', fontFamily: 'Space Grotesk' }}>{order.orderNumber}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--gray-100)' }}>
          <div style={{ padding: '16px 18px', borderRight: '1px solid var(--gray-100)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Building2 size={14} color="#2563eb" /></div>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>From</span>
            </div>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-900)', marginBottom: 4 }}>{order.industry?.name || '—'}</p>
            {order.industry?.contactPerson && <p style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginBottom: 2 }}>{order.industry.contactPerson}</p>}
            {order.industry?.phone && <p style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginBottom: 2 }}>📞 {order.industry.phone}</p>}
          </div>

          <div style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Store size={14} color="#16a34a" /></div>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>To</span>
            </div>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: order.store ? 'var(--gray-900)' : 'var(--gray-400)', marginBottom: 4, fontStyle: order.store ? 'normal' : 'italic' }}>
              {order.store?.name || 'No store assigned'}
            </p>
            {order.store?.ownerName && <p style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginBottom: 2 }}>{order.store.ownerName}</p>}
            {order.store?.phone && <p style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginBottom: 2 }}>📞 {order.store.phone}</p>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '12px 18px', background: '#f9fafb', borderBottom: '1px solid var(--gray-100)', gap: 8 }}>
          <div><p style={{ fontSize: '0.6rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Order Date</p><p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-700)' }}>{order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy') : '—'}</p></div>
          <div><p style={{ fontSize: '0.6rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Delivery Date</p><p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-700)' }}>{order.deliveryDate ? format(new Date(order.deliveryDate), 'dd MMM yyyy') : 'TBD'}</p></div>
          <div><p style={{ fontSize: '0.6rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Priority</p><StatusBadge status={order.priority || 'normal'} /></div>
        </div>

        {order.items && order.items.length > 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 0.6fr 0.8fr 0.9fr', padding: '10px 18px', background: '#f1f5f9', borderBottom: '1px solid var(--gray-200)' }}>
              {['PRODUCT', 'QTY', 'PRICE', 'TOTAL'].map((h, i) => (
                <span key={h} style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--gray-400)', letterSpacing: '0.07em', textAlign: i > 0 ? 'right' : 'left' }}>{h}</span>
              ))}
            </div>
            {order.items.map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2.5fr 0.6fr 0.8fr 0.9fr', padding: '12px 18px', borderBottom: i < order.items.length - 1 ? '1px solid var(--gray-100)' : 'none', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-800)' }}>{item.product?.name || '—'}</p>
                  {item.product?.sku && <p style={{ fontSize: '0.65rem', color: 'var(--gray-400)', marginTop: 1 }}>{item.product.sku}</p>}
                </div>
                <p style={{ fontSize: '0.82rem', textAlign: 'right', color: 'var(--gray-600)' }}>{item.quantity}</p>
                <p style={{ fontSize: '0.82rem', textAlign: 'right', color: 'var(--gray-600)' }}>₹{item.price?.toLocaleString()}</p>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, textAlign: 'right', color: 'var(--gray-800)' }}>₹{(item.quantity * item.price).toLocaleString()}</p>
              </div>
            ))}
          </>
        )}

        <div style={{ padding: '14px 18px', background: '#f9fafb', borderTop: '2px dashed var(--gray-200)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Subtotal</span><span style={{ fontSize: '0.8rem', color: 'var(--gray-700)' }}>₹{subtotal.toLocaleString()}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Tax (18% GST)</span><span style={{ fontSize: '0.8rem', color: 'var(--gray-700)' }}>₹{tax.toLocaleString()}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--gray-200)' }}>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gray-900)' }}>Total Amount</span>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'Space Grotesk' }}>₹{total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <PaymentReceipt order={order} deliveryLog={deliveryLog} />

      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        background: 'white',
        borderTop: '1px solid var(--gray-200)',
        padding: '14px 16px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
        zIndex: 999,
        display: 'flex',
        gap: 10
      }}>
        <button
          onClick={() => { setShowPayment(true); setPaymentMode(null); }}
          className="btn btn-success"
          style={{ flex: 1, borderRadius: 14 }}
        >
          Collect Payment
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function MyDeliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const [tab, setTab] = useState(location.state?.tab || 'orders');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([deliveryAPI.getMyDeliveries(), ordersAPI.getMyOrders()])
      .then(([d, o]) => { setDeliveries(d.data.data); setOrders(o.data.data); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const refreshOrders = () => {
    ordersAPI.getMyOrders()
      .then((o) => setOrders(o.data.data))
      .catch(() => {});
  };

  if (selectedOrder) {
    return (
      <InvoiceView
        order={selectedOrder}
        onBack={() => { setSelectedOrder(null); refreshOrders(); }}
        onPaymentComplete={() => { setSelectedOrder(null); refreshOrders(); }}
      />
    );
  }

  return (
    <div style={{ padding: 16, paddingBottom: 280 }}>
      <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>My Deliveries</h1>

      <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: 10, padding: 4, marginBottom: 16 }}>
        {[['orders', 'Assigned Orders'], ['deliveries', 'Delivery Logs']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 8, fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer', background: tab === key ? 'white' : 'transparent', color: tab === key ? 'var(--primary)' : 'var(--gray-500)', boxShadow: tab === key ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s' }}>
            {label}
            {key === 'orders' && orders.length > 0 && <span style={{ marginLeft: 6, background: 'var(--primary)', color: 'white', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px' }}>{orders.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'orders' && (
        <div>
          {orders.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><ShoppingCart size={28} /></div><p className="empty-state-title">No assigned orders</p></div>
          ) : orders.map(o => (
            <div key={o._id} onClick={() => setSelectedOrder(o)}
              style={{ background: 'white', borderRadius: 14, padding: 16, marginBottom: 12, border: '1px solid var(--gray-200)', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <p style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.95rem', fontFamily: 'Space Grotesk' }}>{o.orderNumber}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Building2 size={12} color="var(--gray-400)" /><span style={{ fontSize: '0.75rem', color: 'var(--gray-600)', fontWeight: 500 }}>{o.industry?.name || '—'}</span></div>
                    <ChevronRight size={12} color="var(--gray-300)" />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Store size={12} color={o.store ? '#16a34a' : 'var(--gray-300)'} /><span style={{ fontSize: '0.75rem', color: o.store ? 'var(--gray-600)' : 'var(--gray-400)', fontWeight: 500 }}>{o.store?.name || 'No store'}</span></div>
                  </div>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <div style={{ height: 1, background: 'var(--gray-100)', marginBottom: 10 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                    {o.orderType === 'pdf' ? '📄 PDF' : `📦 ${o.items?.length || 0} items`}
                  </span>
                  {o.deliveryDate && <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>📅 {format(new Date(o.deliveryDate), 'dd MMM')}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ color: 'var(--gray-900)', fontSize: '0.95rem' }}>₹{o.totalAmount?.toLocaleString()}</strong>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={13} color="var(--primary)" /></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'deliveries' && (
        <div>
          {deliveries.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><Package size={28} /></div><p className="empty-state-title">No delivery logs yet</p></div>
          ) : deliveries.map(d => (
            <div key={d._id} onClick={() => navigate(`/staff/deliveries/${d._id}`)}
              style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 10, border: '1px solid var(--gray-200)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Package size={20} color="var(--primary)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{d.store?.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><MapPin size={11} />{d.store?.address?.city || 'Location N/A'}</div>
                <div style={{ marginTop: 6 }}><StatusBadge status={d.status} /></div>
              </div>
              <ChevronRight size={16} color="var(--gray-400)" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
