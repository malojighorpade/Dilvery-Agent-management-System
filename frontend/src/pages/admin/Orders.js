import React, { useState, useEffect, useCallback } from 'react';
import { ordersAPI, industriesAPI, productsAPI, usersAPI } from '../../services/api';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import StatusBadge from '../../components/shared/StatusBadge';
import toast from 'react-hot-toast';
import { Plus, Search, Eye, UserCheck, Trash2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [assignModal, setAssignModal] = useState(null);

  // Form
  const [industries, setIndustries] = useState([]);
  const [products, setProducts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ industry: '', items: [{ product: '', quantity: 1, price: 0 }], priority: 'normal', notes: '', deliveryDate: '' });
  const [assignForm, setAssignForm] = useState({ staffId: '', deliveryDate: '' });
  const [saving, setSaving] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await ordersAPI.getAll(params);
      setOrders(res.data.data);
      setTotal(res.data.total);
    } catch { toast.error('Failed to fetch orders'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    Promise.all([industriesAPI.getAll({ isActive: true }), productsAPI.getAll({ isActive: true }), usersAPI.getStaff()])
      .then(([i, p, s]) => { setIndustries(i.data.data); setProducts(p.data.data); setStaff(s.data.data); });
  }, []);

  const handleCreate = async () => {
    if (!form.industry || form.items.some(i => !i.product || i.quantity < 1))
      return toast.error('Please fill all required fields');
    setSaving(true);
    try {
      await ordersAPI.create(form);
      toast.success('Order created!');
      setCreateModal(false);
      setForm({ industry: '', items: [{ product: '', quantity: 1, price: 0 }], priority: 'normal', notes: '', deliveryDate: '' });
      fetchOrders();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to create order'); }
    finally { setSaving(false); }
  };

  const handleAssign = async () => {
    if (!assignForm.staffId) return toast.error('Select a staff member');
    setSaving(true);
    try {
      await ordersAPI.assignStaff(assignModal._id, assignForm);
      toast.success('Staff assigned!');
      setAssignModal(null);
      fetchOrders();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to assign'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this order?')) return;
    try { await ordersAPI.delete(id); toast.success('Order deleted'); fetchOrders(); }
    catch (e) { toast.error(e.response?.data?.message || 'Cannot delete'); }
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product: '', quantity: 1, price: 0 }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, val) => setForm(f => {
    const items = [...f.items];
    items[i] = { ...items[i], [field]: val };
    if (field === 'product') {
      const p = products.find(p => p._id === val);
      if (p) items[i].price = p.sellingPrice;
    }
    return { ...f, items };
  });

  const totalAmt = form.items.reduce((s, i) => s + (i.quantity * i.price || 0), 0);
  const pages = Math.ceil(total / 15);

  const columns = [
    { key: 'orderNumber', label: 'Order #', render: r => <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.orderNumber}</span> },
    { key: 'industry', label: 'Industry', render: r => r.industry?.name || '—' },
    { key: 'totalAmount', label: 'Amount', render: r => <span style={{ fontWeight: 600 }}>₹{r.totalAmount?.toLocaleString()}</span> },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
    { key: 'priority', label: 'Priority', render: r => <StatusBadge status={r.priority} /> },
    { key: 'assignedStaff', label: 'Assigned To', render: r => r.assignedStaff?.name || <span style={{ color: 'var(--gray-400)' }}>Unassigned</span> },
    { key: 'createdAt', label: 'Date', render: r => format(new Date(r.createdAt), 'dd MMM yyyy') },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">{total} total orders</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateModal(true)}><Plus size={16} />New Order</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="filters-row">
            <div className="search-bar">
              <Search size={15} color="var(--gray-400)" />
              <input placeholder="Search order number..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="form-control form-select" style={{ width: 160 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {['pending','processing','dispatched','partially_delivered','delivered','cancelled'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>
          <button className="btn-icon" onClick={fetchOrders} title="Refresh"><RefreshCw size={16} /></button>
        </div>
        <DataTable
          columns={columns}
          data={orders}
          loading={loading}
          emptyText="No orders found"
          actions={row => (
            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
              <button className="btn-icon" onClick={() => setViewModal(row)} title="View"><Eye size={15} /></button>
              {!row.assignedStaff && row.status === 'pending' && (
                <button className="btn btn-sm btn-primary" onClick={() => { setAssignModal(row); setAssignForm({ staffId: '', deliveryDate: '' }); }}><UserCheck size={14} />Assign</button>
              )}
              {row.status === 'pending' && <button className="btn-icon" onClick={() => handleDelete(row._id)} title="Delete" style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>}
            </div>
          )}
        />
        {pages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page === pages}>›</button>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create New Order" size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create Order'}</button></>}>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Industry *</label>
            <select className="form-control form-select" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}>
              <option value="">Select Industry</option>
              {industries.map(i => <option key={i._id} value={i._id}>{i.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="form-control form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
              {['low','normal','high','urgent'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Delivery Date</label>
          <input type="date" className="form-control" value={form.deliveryDate} onChange={e => setForm({ ...form, deliveryDate: e.target.value })} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Order Items *</label>
            <button className="btn btn-sm btn-secondary" onClick={addItem}><Plus size={13} />Add Item</button>
          </div>
          {form.items.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <select className="form-control form-select" value={item.product} onChange={e => updateItem(i, 'product', e.target.value)}>
                <option value="">Select Product</option>
                {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
              <input className="form-control" type="number" min="1" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} />
              <input className="form-control" type="number" min="0" placeholder="Price" value={item.price} onChange={e => updateItem(i, 'price', Number(e.target.value))} />
              <button className="btn-icon" onClick={() => removeItem(i)} disabled={form.items.length === 1} style={{ color: 'var(--danger)' }}>✕</button>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600 }}>Total Amount</span>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>₹{totalAmt.toLocaleString()}</span>
        </div>

        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label">Notes</label>
          <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
        </div>
      </Modal>

      {/* View Order Modal */}
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title={`Order ${viewModal?.orderNumber}`} size="lg">
        {viewModal && (
          <div>
            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div><span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>Industry</span><strong>{viewModal.industry?.name}</strong></div>
              <div><span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>Status</span><StatusBadge status={viewModal.status} /></div>
              <div><span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>Assigned Staff</span><strong>{viewModal.assignedStaff?.name || 'Unassigned'}</strong></div>
              <div><span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>Total Amount</span><strong style={{ color: 'var(--primary)' }}>₹{viewModal.totalAmount?.toLocaleString()}</strong></div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead><tr style={{ background: 'var(--gray-50)' }}><th style={{ padding: '8px 12px', textAlign: 'left' }}>Product</th><th style={{ padding: '8px 12px', textAlign: 'right' }}>Qty</th><th style={{ padding: '8px 12px', textAlign: 'right' }}>Price</th><th style={{ padding: '8px 12px', textAlign: 'right' }}>Total</th></tr></thead>
              <tbody>{viewModal.items?.map((item, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--gray-100)' }}>
                  <td style={{ padding: '8px 12px' }}>{item.product?.name || '—'}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{item.price}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>₹{(item.quantity * item.price).toLocaleString()}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Assign Staff Modal */}
      <Modal open={!!assignModal} onClose={() => setAssignModal(null)} title="Assign Delivery Staff"
        footer={<><button className="btn btn-secondary" onClick={() => setAssignModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleAssign} disabled={saving}>{saving ? 'Assigning...' : 'Assign'}</button></>}>
        <div className="form-group">
          <label className="form-label">Select Staff *</label>
          <select className="form-control form-select" value={assignForm.staffId} onChange={e => setAssignForm({ ...assignForm, staffId: e.target.value })}>
            <option value="">Choose staff member...</option>
            {staff.map(s => <option key={s._id} value={s._id}>{s.name} — {s.phone}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Delivery Date</label>
          <input type="date" className="form-control" value={assignForm.deliveryDate} onChange={e => setAssignForm({ ...assignForm, deliveryDate: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
