import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { deliveryAPI, ordersAPI } from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import toast from 'react-hot-toast';
import {
  MapPin, Package, ChevronRight, ShoppingCart,
  ArrowLeft, Building2, Store, FileText,
  CreditCard, Banknote, QrCode, FileCheck, X
} from 'lucide-react';
import { format } from 'date-fns';

// ── Payment Mode Selector ─────────────────────────────────────────────────────
function PaymentModeSelector({ order, onBack, onSelectMode }) {
  const [selected, setSelected] = useState(null);
  const modes = [
    { key: 'cash',   label: 'Cash',        icon: Banknote,  color: '#16a34a', bg: '#f0fdf4', border: '#86efac', desc: 'Collect physical cash' },
    { key: 'online', label: 'Online / UPI', icon: QrCode,    color: '#2563eb', bg: '#eff6ff', border: '#93c5fd', desc: 'UPI, NEFT, QR scan' },
    { key: 'cheque', label: 'Cheque',       icon: FileCheck, color: '#d97706', bg: '#fffbeb', border: '#fcd34d', desc: 'Post-dated cheque' },
  ];
  return (
  <div style={{
    padding: 16,
    paddingBottom: 100,
    maxWidth: 480,
    margin: '0 auto'
  }}>

    {/* Back */}
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
        marginBottom: 20
      }}
    >
      <ArrowLeft size={16} /> Back to Invoice
    </button>

    {/* Title */}
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

    {/* Modes */}
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
            cursor: 'pointer'
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

    {/* Sticky Bottom Button */}
    <div style={{
  position: 'sticky',
  bottom: 60,   // 🔥 FIX
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

// ── Order Invoice View (INLINE — never navigates to /deliveries/:id) ──────────
function OrderInvoiceView({ order, onBack }) {
  const navigate = useNavigate();
  const [showPayment, setShowPayment] = useState(false);

  const handleSelectMode = (mode) => {
    navigate('/staff/payments', { state: { order, paymentMode: mode } });
  };

  if (showPayment) {
    return <PaymentModeSelector order={order} onBack={() => setShowPayment(false)} onSelectMode={handleSelectMode} />;
  }

  const subtotal = order.items?.reduce((s, i) => s + i.quantity * i.price, 0) || 0;
  const tax = Math.round(subtotal * 0.18);
  const total = order.totalAmount || subtotal;

  return (
    <div style={{ padding: 16, paddingBottom: 100 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', marginBottom: 16, padding: 0 }}>
        <ArrowLeft size={16} /> Back to Orders
      </button>

      <div style={{ background: 'white', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-md)' }}>
        {/* Header */}
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

        {/* FROM / TO */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--gray-100)' }}>
          <div style={{ padding: '16px 18px', borderRight: '1px solid var(--gray-100)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Building2 size={14} color="#2563eb" /></div>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>From</span>
            </div>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-900)', marginBottom: 4 }}>{order.industry?.name || '—'}</p>
            {order.industry?.contactPerson && <p style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginBottom: 2 }}>{order.industry.contactPerson}</p>}
            {order.industry?.phone && <p style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginBottom: 2 }}>📞 {order.industry.phone}</p>}
            {order.industry?.address && (
              <p style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: 4, display: 'flex', alignItems: 'flex-start', gap: 3, lineHeight: 1.4 }}>
                <MapPin size={10} style={{ flexShrink: 0, marginTop: 2 }} />
                {[order.industry.address.street, order.industry.address.city, order.industry.address.state].filter(Boolean).join(', ')}
              </p>
            )}
            {order.industry?.gstin && <p style={{ fontSize: '0.65rem', color: 'var(--gray-400)', marginTop: 4 }}>GSTIN: {order.industry.gstin}</p>}
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
            {order.store?.address && (
              <p style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: 4, display: 'flex', alignItems: 'flex-start', gap: 3, lineHeight: 1.4 }}>
                <MapPin size={10} style={{ flexShrink: 0, marginTop: 2 }} />
                {[order.store.address.street, order.store.address.city, order.store.address.state, order.store.address.pincode].filter(Boolean).join(', ')}
              </p>
            )}
            {order.store?.route && <span style={{ display: 'inline-block', marginTop: 6, fontSize: '0.65rem', fontWeight: 600, background: '#eff6ff', color: '#2563eb', borderRadius: 4, padding: '2px 6px' }}>{order.store.route}</span>}
          </div>
        </div>

        {/* Meta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '12px 18px', background: '#f9fafb', borderBottom: '1px solid var(--gray-100)', gap: 8 }}>
          <div><p style={{ fontSize: '0.6rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Order Date</p><p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-700)' }}>{order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy') : '—'}</p></div>
          <div><p style={{ fontSize: '0.6rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Delivery Date</p><p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-700)' }}>{order.deliveryDate ? format(new Date(order.deliveryDate), 'dd MMM yyyy') : 'TBD'}</p></div>
          <div><p style={{ fontSize: '0.6rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Priority</p><StatusBadge status={order.priority || 'normal'} /></div>
        </div>

        {/* Items table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 0.6fr 0.8fr 0.9fr', padding: '10px 18px', background: '#f1f5f9', borderBottom: '1px solid var(--gray-200)' }}>
          {['PRODUCT', 'QTY', 'PRICE', 'TOTAL'].map((h, i) => (
            <span key={h} style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--gray-400)', letterSpacing: '0.07em', textAlign: i > 0 ? 'right' : 'left' }}>{h}</span>
          ))}
        </div>
        {order.items?.map((item, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2.5fr 0.6fr 0.8fr 0.9fr', padding: '12px 18px', borderBottom: i < order.items.length - 1 ? '1px solid var(--gray-100)' : 'none', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-800)' }}>{item.product?.name || '—'}</p>
              {item.product?.sku && <p style={{ fontSize: '0.65rem', color: 'var(--gray-400)', marginTop: 1 }}>{item.product.sku}</p>}
            </div>
            <p style={{ fontSize: '0.82rem', textAlign: 'right', color: 'var(--gray-600)' }}>{item.quantity}</p>
            <p style={{ fontSize: '0.82rem', textAlign: 'right', color: 'var(--gray-600)' }}>₹{item.price}</p>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, textAlign: 'right', color: 'var(--gray-800)' }}>₹{(item.quantity * item.price).toLocaleString()}</p>
          </div>
        ))}

        {/* Totals */}
        <div style={{ padding: '14px 18px', background: '#f9fafb', borderTop: '2px dashed var(--gray-200)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Subtotal</span><span style={{ fontSize: '0.8rem', color: 'var(--gray-700)' }}>₹{subtotal.toLocaleString()}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Tax (18% GST)</span><span style={{ fontSize: '0.8rem', color: 'var(--gray-700)' }}>₹{tax.toLocaleString()}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--gray-200)' }}>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gray-900)' }}>Total Amount</span>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'Space Grotesk' }}>₹{total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Payment CTA */}
      {/* Bottom Actions */}
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

  {/* Start Delivery */}
  <button
    onClick={async () => {
      try {
        const existing = await deliveryAPI.getByOrder(order._id);

        if (existing?.data?.data) {
          navigate(`/staff/deliveries/${existing.data.data._id}`);
          return;
        }

        const res = await deliveryAPI.create({
          order: order._id,
          store: typeof order.store === 'object'
    ? order.store._id
    : order.store,
         
          status: 'pending', // can be assigned later by manager
          items: order.items.map(i => ({
            product: i.product?._id,
            orderedQty: i.quantity,
            deliveredQty: 0,
          })),
        });
        console.log("ITEMS 👉", order.items);

        navigate(`/staff/deliveries/${res.data.data._id}`);
      } catch (e) {
        console.error(e);
        console.log("DELIVERY ERROR 👉", e.response?.data);
        toast.error('Failed to start delivery');
        
      }
    }}
    className="btn btn-success"
    style={{ flex: 1, borderRadius: 14 }}
  >
    Start Delivery
  </button>

  {/* Payment */}
  <button
    className="btn btn-primary btn-lg"
    style={{ flex: 1, justifyContent: 'center', borderRadius: 14 }}
    onClick={() => setShowPayment(true)}
  >
    <CreditCard size={18} /> Payment
  </button>
</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MyDeliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('orders');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([deliveryAPI.getMyDeliveries(), ordersAPI.getMyOrders()])
      .then(([d, o]) => { setDeliveries(d.data.data); setOrders(o.data.data); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  // Inline invoice view — never touches DeliveryDetail route
  if (selectedOrder) {
    return <OrderInvoiceView order={selectedOrder} onBack={() => setSelectedOrder(null)} />;
  }

  return (
    <div style={{ padding: 16 ,paddingBottom: 280 }}>
      <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>My Deliveries</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: 10, padding: 4, marginBottom: 16 }}>
        {[['orders', 'Assigned Orders'], ['deliveries', 'Delivery Logs']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 8, fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer', background: tab === key ? 'white' : 'transparent', color: tab === key ? 'var(--primary)' : 'var(--gray-500)', boxShadow: tab === key ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s' }}>
            {label}
            {key === 'orders' && orders.length > 0 && <span style={{ marginLeft: 6, background: 'var(--primary)', color: 'white', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px' }}>{orders.length}</span>}
          </button>
        ))}
      </div>

      {/* Assigned Orders */}
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
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>📦 {o.items?.length} items</span>
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

      {/* Delivery Logs — navigate to /staff/deliveries/:id (real delivery log _id) */}
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