// ✅ frontend/src/components/staff/PaymentStatusModal.js
// UPDATED: Shows old payments history + current status

import React, { useState, useEffect } from 'react';
import { paymentsAPI, deliveryAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  X, AlertCircle, CheckCircle, DollarSign, Ban, Package,
  ChevronRight, ArrowLeft, History
} from 'lucide-react';
import { format } from 'date-fns';

const RETURN_REASONS = [
  { value: 'damaged', label: '📦 Damaged/Defective' },
  { value: 'refused', label: '❌ Store Owner Refused' },
  { value: 'expired', label: '⏰ Expired/Out of Stock' },
  { value: 'mismatch', label: '⚠️ Item Mismatch' },
  { value: 'other', label: '❓ Other' },
];

const CANCEL_REASONS = [
  { value: 'store_refused', label: '❌ Store Owner Refused Delivery' },
  { value: 'address_issue', label: '📍 Address Not Found/Incorrect' },
  { value: 'store_closed', label: '🔒 Store Closed/Not Available' },
  { value: 'safety_issue', label: '⚠️ Safety Issue' },
  { value: 'no_contact', label: '📞 Unable to Contact Store' },
  { value: 'other', label: '❓ Other Reason' },
];

const isDeliveryLogRecord = (record) =>
  Boolean(record?.deliveryStaff || record?.paymentHistory || record?.totalPaymentCollected != null);

const getOrderId = (record) =>
  record?.order?._id || record?.order || (record?.orderNumber && !isDeliveryLogRecord(record) ? record._id : null);

export default function PaymentStatusModal({
  open,
  onClose,
  onBack,
  deliveryLog: deliveryLogProp,
  orderAmount,
  orderType: orderTypeProp,
  onPaymentUpdate,
  onPaymentComplete,
}) {
  const [activeTab, setActiveTab] = useState('status');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('cash');
  const [transactionId, setTransactionId] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [itemReturns, setItemReturns] = useState({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [resolvedLog, setResolvedLog] = useState(null);
  const [loadingLog, setLoadingLog] = useState(false);
  
  // ✅ NEW: Old payments
  const [oldPayments, setOldPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    if (!open || !deliveryLogProp) {
      setResolvedLog(null);
      setOldPayments([]);
      return;
    }

    const load = async () => {
      if (isDeliveryLogRecord(deliveryLogProp)) {
        setResolvedLog(deliveryLogProp);
      } else {
        const orderId = getOrderId(deliveryLogProp);
        if (!orderId) {
          setResolvedLog(deliveryLogProp);
        } else {
          setLoadingLog(true);
          try {
            const res = await deliveryAPI.getByOrder(orderId);
            if (res.data?.data) {
              setResolvedLog(res.data.data);
            } else {
              setResolvedLog(deliveryLogProp);
            }
          } catch {
            setResolvedLog(deliveryLogProp);
          } finally {
            setLoadingLog(false);
          }
        }
      }

      // ✅ NEW: Fetch all old payments for this order/delivery
      const orderId = getOrderId(deliveryLogProp);
      if (orderId) {
        setLoadingPayments(true);
        try {
          const res = await paymentsAPI.getByOrder?.(orderId) || await paymentsAPI.getAll({ orderId });
          if (res.data?.data) {
            setOldPayments(Array.isArray(res.data.data) ? res.data.data : []);
          }
        } catch (err) {
          console.log('Could not fetch old payments:', err);
          setOldPayments([]);
        } finally {
          setLoadingPayments(false);
        }
      }
    };

    load();
  }, [open, deliveryLogProp]);

  if (!open) return null;

  const deliveryLog = resolvedLog || deliveryLogProp;
  const orderId = getOrderId(deliveryLog) || getOrderId(deliveryLogProp);
  const deliveryLogId = isDeliveryLogRecord(deliveryLog) ? deliveryLog._id : null;

  const effectiveOrderAmount =
    orderAmount ?? deliveryLog?.order?.totalAmount ?? deliveryLogProp?.totalAmount ?? 0;
  const alreadyCollected = deliveryLog?.totalPaymentCollected || 0;
  const outstanding = Math.max(0, effectiveOrderAmount - alreadyCollected);
  const paymentStatus = deliveryLog?.paymentStatus || 'not_collected';
  const items = deliveryLog?.items || [];
  const orderType = orderTypeProp || deliveryLogProp?.orderType || deliveryLog?.order?.orderType;
  const isPdfOrder = orderType === 'pdf';
  const canReturnItems =
    !isPdfOrder && items.length > 0 && items.some((i) => (i.deliveredQty || i.orderedQty || 0) > 0);

  const handleBack = () => {
    if (onBack) onBack();
    else onClose();
  };

  const paymentPayload = () => ({
    deliveryLogId: deliveryLogId || undefined,
    orderId: orderId || undefined,
  });

  // ─── HANDLE PARTIAL PAYMENT ───────────────────────────────────────────────
  const handleCollectPartial = async () => {
    if (!amount || Number(amount) <= 0) {
      return toast.error('Enter valid amount');
    }

    if (Number(amount) > outstanding) {
      return toast.error(`Cannot collect more than ₹${outstanding}`);
    }

    if (mode === 'online' && !transactionId) {
      return toast.error('Transaction ID required');
    }

    setLoading(true);
    try {
      const r = await paymentsAPI.collectPartial(deliveryLogId || orderId, {
        ...paymentPayload(),
        amount: Number(amount),
        mode,
        transactionId: transactionId || undefined,
        notes,
      });

      const collected = r.data?.data?.collectedAmount ?? Number(amount);
      const newOutstanding = r.data?.data?.outstanding ?? outstanding - collected;
      toast.success(
        r.data?.data?.paymentStatus === 'full_collected'
          ? `₹${collected.toLocaleString()} collected — fully paid!`
          : `₹${collected.toLocaleString()} collected! Outstanding: ₹${newOutstanding.toLocaleString()}`
      );
      setAmount('');
      setTransactionId('');
      setNotes('');
      setActiveTab('status');

      if (orderId) {
        const res = await deliveryAPI.getByOrder(orderId);
        if (res.data?.data) setResolvedLog(res.data.data);
        // ✅ Refresh old payments
        try {
          const payRes = await paymentsAPI.getAll({ orderId });
          if (payRes.data?.data) setOldPayments(Array.isArray(payRes.data.data) ? payRes.data.data : []);
        } catch { }
      }
      onPaymentUpdate?.();
      if (collected > 0) onPaymentComplete?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to collect payment');
    } finally {
      setLoading(false);
    }
  };

  // ─── HANDLE CANCEL DELIVERY ───────────────────────────────────────────────
  const handleCancelDelivery = async () => {
    if (!cancelReason) {
      return toast.error('Please select a reason');
    }

    setLoading(true);
    try {
      await paymentsAPI.cancelDelivery(deliveryLogId || orderId, cancelReason, orderId);
      toast.success('Delivery cancelled');
      onClose();
      onPaymentUpdate?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    } finally {
      setLoading(false);
    }
  };

  // ─── HANDLE ITEMS RETURNED ───────────────────────────────────────────────
  const handleMarkReturned = async () => {
    const itemsToReturn = Object.entries(itemReturns).filter(([_, v]) => v.qty > 0);

    if (itemsToReturn.length === 0) {
      return toast.error('Select at least one item to return');
    }

    setLoading(true);
    try {
      await paymentsAPI.markItemsReturned(
        deliveryLogId || orderId,
        itemsToReturn.map(([idx, data]) => ({
          itemIndex: parseInt(idx),
          returnedQty: data.qty,
          reason: data.reason || 'damaged',
        })),
        orderId
      );

      toast.success('Items marked as returned');
      setItemReturns({});
      setActiveTab('status');
      onPaymentUpdate?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark items');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // TAB 1: STATUS (with old payments)
  // ─────────────────────────────────────────────────────────────────────────
  if (activeTab === 'status') {
    const combinedPaymentHistory = [
      ...(deliveryLog?.paymentHistory || []),
      ...oldPayments.filter(p => !deliveryLog?.paymentHistory?.some(ph => ph._id === p._id))
    ].sort((a, b) => new Date(b.collectedAt || b.createdAt) - new Date(a.collectedAt || a.createdAt));

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}>
        <div style={{
          background: 'white',
          borderRadius: 20,
          width: '90%',
          maxWidth: 500,
          maxHeight: '90vh',
          overflow: 'auto',
          padding: 24,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>💰 Payment Status</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={24} color="#666" />
            </button>
          </div>

          {(loadingLog || loadingPayments) && (
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 12 }}>Loading payment details...</p>
          )}

          {/* Status Banner */}
          <div style={{
            background: paymentStatus === 'full_collected' ? '#f0fdf4' : paymentStatus === 'partial_collected' ? '#fffbeb' : '#fef3c7',
            border: `1px solid ${paymentStatus === 'full_collected' ? '#86efac' : paymentStatus === 'partial_collected' ? '#fcd34d' : '#fcd34d'}`,
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            display: 'flex',
            gap: 12,
          }}>
            <div>
              {paymentStatus === 'full_collected' ? (
                <>
                  <CheckCircle size={20} color="#16a34a" />
                </>
              ) : (
                <AlertCircle size={20} color="#f59e0b" />
              )}
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                {paymentStatus === 'full_collected'
                  ? '✅ Full Payment Collected'
                  : paymentStatus === 'partial_collected'
                    ? '💵 Partial Payment Collected'
                    : '⏳ Payment Pending'}
              </p>
              <p style={{ fontSize: '0.85rem', color: '#666', marginTop: 4 }}>
                Collected: <strong>₹{alreadyCollected.toLocaleString()}</strong> / {effectiveOrderAmount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* ✅ NEW: Old Payments History */}
          {combinedPaymentHistory.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <History size={18} color="#6b7280" />
                <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                  Payment History ({combinedPaymentHistory.length})
                </p>
              </div>

              <div style={{ background: '#f9fafb', borderRadius: 12, overflow: 'hidden' }}>
                {combinedPaymentHistory.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 12,
                      borderBottom: i < combinedPaymentHistory.length - 1 ? '1px solid #e5e7eb' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>
                        {p.mode === 'online' ? '📱' : p.mode === 'cash' ? '💵' : '📋'}{' '}
                        <span style={{ textTransform: 'capitalize' }}>{p.mode}</span>
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#999' }}>
                        {format(new Date(p.collectedAt || p.createdAt || new Date()), 'dd MMM HH:mm')}
                      </p>
                      {p.transactionId && (
                        <p style={{ fontSize: '0.7rem', color: '#b3b3b3', marginTop: 2 }}>
                          TXN: {p.transactionId}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#16a34a' }}>
                        ₹{(p.amount || p.collectedAmount || 0).toLocaleString()}
                      </p>
                      {p.status && (
                        <p style={{ fontSize: '0.65rem', color: '#999', marginTop: 2, textTransform: 'capitalize' }}>
                          {p.status}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outstanding info */}
          {outstanding > 0 && (
            <div style={{
              background: '#fef3c7',
              border: '1px solid #fcd34d',
              borderRadius: 10,
              padding: 12,
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#b45309' }}>Outstanding Balance</span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#d97706' }}>₹{outstanding.toLocaleString()}</span>
            </div>
          )}

          {/* Action Buttons */}
          {paymentStatus !== 'full_collected' && paymentStatus !== 'cancelled' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => setActiveTab('payment')}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid #2563eb',
                  background: '#eff6ff',
                  color: '#2563eb',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <DollarSign size={18} /> Collect ₹{outstanding} Remaining
              </button>

              {canReturnItems && (
                <button
                  onClick={() => setActiveTab('return')}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    border: '1px solid #d97706',
                    background: '#fffbeb',
                    color: '#d97706',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Package size={18} /> Mark Items as Returned
                </button>
              )}
              {isPdfOrder && (
                <p style={{ fontSize: '0.8rem', color: '#6b7280', textAlign: 'center', margin: 0 }}>
                  PDF orders: use payment collection only (no item returns).
                </p>
              )}

              <button
                onClick={() => setActiveTab('cancel')}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid #ef4444',
                  background: '#fef2f2',
                  color: '#ef4444',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Ban size={18} /> Cancel Delivery
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              onClick={handleBack}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 10,
                border: '1px solid #ddd',
                background: 'white',
                color: '#374151',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <ArrowLeft size={16} /> Back to Order
            </button>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 10,
                border: 'none',
                background: '#f3f4f6',
                color: '#374151',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TAB 2: COLLECT PARTIAL PAYMENT
  // ─────────────────────────────────────────────────────────────────────────
  if (activeTab === 'payment') {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}>
        <div style={{
          background: 'white',
          borderRadius: 20,
          width: '90%',
          maxWidth: 500,
          maxHeight: '90vh',
          overflow: 'auto',
          padding: 24,
        }}>
          {/* Header */}
          <button
            onClick={() => setActiveTab('status')}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#2563eb',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 16,
            }}
          >
            <ArrowLeft size={18} /> Back
          </button>

          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>💵 Collect Payment</h2>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 20 }}>
            Outstanding: <strong>₹{outstanding.toLocaleString()}</strong>
          </p>

          {/* Amount Input */}
          <div style={{
            background: '#eff6ff',
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
          }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666' }}>Amount (₹)</label>
            <input
              type="number"
              max={outstanding}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                width: '100%',
                fontSize: '1.8rem',
                fontWeight: 800,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                marginTop: 8,
              }}
              placeholder="0"
            />
          </div>

          {/* Payment Mode */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 8 }}>Payment Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1px solid #ddd',
                fontSize: '0.9rem',
              }}
            >
              <option value="cash">💵 Cash</option>
              <option value="online">📱 UPI/Online</option>
              <option value="cheque">📋 Cheque</option>
            </select>
          </div>

          {/* Transaction ID (if online) */}
          {mode === 'online' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Transaction ID *</label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. UTR123456789"
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any remarks..."
              rows={2}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1px solid #ddd',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setActiveTab('status')}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 10,
                border: '1px solid #ddd',
                background: '#f9fafb',
                color: '#374151',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCollectPartial}
              disabled={loading || !amount}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 10,
                border: 'none',
                background: amount ? '#16a34a' : '#ccc',
                color: 'white',
                fontWeight: 600,
                cursor: amount && !loading ? 'pointer' : 'not-allowed',
              }}
            >
              {loading ? 'Saving...' : `Collect ₹${amount || '0'}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TAB 3: RETURN ITEMS
  // ─────────────────────────────────────────────────────────────────────────
  if (activeTab === 'return') {
    if (!canReturnItems) {
      return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, maxWidth: 400, width: '90%' }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Returns not available</p>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 16 }}>
              {isPdfOrder
                ? 'PDF orders have no product lines to return. Use payment collection to adjust amounts.'
                : 'No deliverable items on this order.'}
            </p>
            <button onClick={() => setActiveTab('status')} className="btn btn-primary" style={{ width: '100%' }}>Back</button>
          </div>
        </div>
      );
    }

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}>
        <div style={{
          background: 'white',
          borderRadius: 20,
          width: '90%',
          maxWidth: 500,
          maxHeight: '90vh',
          overflow: 'auto',
          padding: 24,
        }}>
          {/* Header */}
          <button
            onClick={() => setActiveTab('status')}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#2563eb',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 16,
            }}
          >
            <ArrowLeft size={18} /> Back
          </button>

          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>📦 Mark Items as Returned</h2>

          {/* Items List */}
          <div style={{ marginBottom: 20 }}>
            {items.map((item, idx) => (
              <div key={idx} style={{
                background: '#f9fafb',
                borderRadius: 10,
                padding: 12,
                marginBottom: 10,
              }}>
                <p style={{ fontWeight: 600, marginBottom: 8 }}>
                  {item.product?.name || 'Product'} (Delivered: {item.deliveredQty})
                </p>

                {/* Return Quantity */}
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: '0.8rem', color: '#666' }}>Qty to Return:</label>
                  <input
                    type="number"
                    min="0"
                    max={item.deliveredQty}
                    value={itemReturns[idx]?.qty || ''}
                    onChange={(e) => setItemReturns({
                      ...itemReturns,
                      [idx]: { ...itemReturns[idx], qty: parseInt(e.target.value) || 0 }
                    })}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: 8,
                      borderRadius: 6,
                      border: '1px solid #ddd',
                      fontSize: '0.9rem',
                      marginTop: 4,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Return Reason */}
                {itemReturns[idx]?.qty > 0 && (
                  <select
                    value={itemReturns[idx]?.reason || ''}
                    onChange={(e) => setItemReturns({
                      ...itemReturns,
                      [idx]: { ...itemReturns[idx], reason: e.target.value }
                    })}
                    style={{
                      width: '100%',
                      padding: 8,
                      borderRadius: 6,
                      border: '1px solid #ddd',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">Select reason...</option>
                    {RETURN_REASONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setActiveTab('status')}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 10,
                border: '1px solid #ddd',
                background: '#f9fafb',
                color: '#374151',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleMarkReturned}
              disabled={loading}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 10,
                border: 'none',
                background: '#d97706',
                color: 'white',
                fontWeight: 600,
                cursor: !loading ? 'pointer' : 'not-allowed',
              }}
            >
              {loading ? 'Saving...' : 'Mark as Returned'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TAB 4: CANCEL DELIVERY
  // ─────────────────────────────────────────────────────────────────────────
  if (activeTab === 'cancel') {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}>
        <div style={{
          background: 'white',
          borderRadius: 20,
          width: '90%',
          maxWidth: 500,
          maxHeight: '90vh',
          overflow: 'auto',
          padding: 24,
        }}>
          {/* Header */}
          <button
            onClick={() => setActiveTab('status')}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#2563eb',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 16,
            }}
          >
            <ArrowLeft size={18} /> Back
          </button>

          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 10,
            padding: 12,
            marginBottom: 20,
            display: 'flex',
            gap: 10,
          }}>
            <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '0.85rem', color: '#991b1b' }}>
              ⚠️ This will cancel the delivery and no payment will be collected
            </p>
          </div>

          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>❌ Cancel Delivery</h2>

          {/* Reason Selection */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 10 }}>Select Reason *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CANCEL_REASONS.map(r => (
                <label key={r.value} style={{
                  padding: 12,
                  borderRadius: 8,
                  border: `2px solid ${cancelReason === r.value ? '#ef4444' : '#e5e7eb'}`,
                  background: cancelReason === r.value ? '#fef2f2' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}>
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={cancelReason === r.value}
                    onChange={(e) => setCancelReason(e.target.value)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.9rem' }}>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setActiveTab('status')}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 10,
                border: '1px solid #ddd',
                background: '#f9fafb',
                color: '#374151',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Don't Cancel
            </button>
            <button
              onClick={handleCancelDelivery}
              disabled={loading || !cancelReason}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 10,
                border: 'none',
                background: cancelReason && !loading ? '#ef4444' : '#ccc',
                color: 'white',
                fontWeight: 600,
                cursor: cancelReason && !loading ? 'pointer' : 'not-allowed',
              }}
            >
              {loading ? 'Cancelling...' : 'Confirm Cancel'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}