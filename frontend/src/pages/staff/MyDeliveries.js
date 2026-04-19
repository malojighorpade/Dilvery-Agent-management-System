import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { deliveryAPI, ordersAPI } from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import toast from 'react-hot-toast';
import { MapPin, Package, ChevronRight, ShoppingCart } from 'lucide-react';

export default function MyDeliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('deliveries');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([deliveryAPI.getMyDeliveries(), ordersAPI.getMyOrders()])
      .then(([d, o]) => { setDeliveries(d.data.data); setOrders(o.data.data); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>My Deliveries</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: 10, padding: 4, marginBottom: 16 }}>
        {[['deliveries', 'Delivery Logs'], ['orders', 'Assigned Orders']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 8, fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer', background: tab === key ? 'white' : 'transparent', color: tab === key ? 'var(--primary)' : 'var(--gray-500)', boxShadow: tab === key ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'deliveries' ? (
        <div>
          {deliveries.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><Package size={28} /></div><p className="empty-state-title">No deliveries yet</p></div>
          ) : deliveries.map(d => (
            <div key={d._id} onClick={() => navigate(`/staff/deliveries/${d._id}`)}
              style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 10, border: '1px solid var(--gray-200)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Package size={20} color="var(--primary)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{d.store?.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <MapPin size={11} />{d.store?.address?.city || 'Location N/A'}
                </div>
                <div style={{ marginTop: 6 }}><StatusBadge status={d.status} /></div>
              </div>
              <ChevronRight size={16} color="var(--gray-400)" />
            </div>
          ))}
        </div>
      ) : (
        <div>
          {orders.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><ShoppingCart size={28} /></div><p className="empty-state-title">No assigned orders</p></div>
          ) : orders.map(o => (
            <div key={o._id} style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 10, border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{o.orderNumber}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: 2 }}>{o.industry?.name}</div>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--gray-600)' }}>
                <span>{o.items?.length} items</span>
                <strong style={{ color: 'var(--gray-900)' }}>₹{o.totalAmount?.toLocaleString()}</strong>
              </div>
              {o.deliveryDate && <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 6 }}>Due: {new Date(o.deliveryDate).toLocaleDateString()}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
