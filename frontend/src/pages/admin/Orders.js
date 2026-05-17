import React, { useState, useEffect, useCallback } from 'react';
import { ordersAPI, industriesAPI, productsAPI, usersAPI, storesAPI, deliveryAPI } from '../../services/api';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import StatusBadge from '../../components/shared/StatusBadge';
import toast from 'react-hot-toast';
import { Plus, Search, Eye, UserCheck, Trash2, RefreshCw, Upload, File } from 'lucide-react';
import { format } from 'date-fns';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [stores, setStores] = useState([]);

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [viewDeliveryLog, setViewDeliveryLog] = useState(null);
  const [assignModal, setAssignModal] = useState(null);

  // Form state
  const [createMode, setCreateMode] = useState('manual'); // 'manual' or 'pdf'
  const [pdfFile, setPdfFile] = useState(null);
  const [industries, setIndustries] = useState([]);
  const [products, setProducts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    industry: '',
    items: [{ product: '', quantity: 1, price: 0 }],
    priority: 'normal',
    notes: '',
    deliveryDate: '',
    store: '',
    totalAmount: 0,
    orderType: 'manual'
  });
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
    if (!viewModal?._id) {
      setViewDeliveryLog(null);
      return;
    }
    deliveryAPI.getByOrder(viewModal._id)
      .then((res) => setViewDeliveryLog(res.data?.data || null))
      .catch(() => setViewDeliveryLog(null));
  }, [viewModal?._id]);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await storesAPI.getAll({ isActive: true });
        setStores(res.data?.data || []);
      } catch (error) {
        console.log(error);
        toast.error("Failed to fetch stores");
      }
    };
    fetchStores();
  }, []);

  useEffect(() => {
    Promise.all([industriesAPI.getAll({ isActive: true }), productsAPI.getAll({ isActive: true }), usersAPI.getStaff()])
      .then(([i, p, s]) => { setIndustries(i.data.data); setProducts(p.data.data); setStaff(s.data.data); });
  }, []);

  // Upload PDF to Cloudinary via backend
  const uploadPDFToCloudinary = async (file) => {
    if (!file) return null;
    
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      setUploading(true);
      // The backend route will handle Cloudinary upload
      const res = await ordersAPI.uploadPDF(formData);
      return {
        pdfUrl: res.data.pdfUrl,
        pdfFileName: res.data.pdfFileName
      };
    } catch (err) {
      console.error('PDF upload error:', err);
      toast.error('Failed to upload PDF to Cloudinary');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    // Validation
    if (!form.industry) {
      return toast.error('Select an industry');
    }

    if (createMode === 'manual') {
      if (form.items.some(i => !i.product || i.quantity < 1)) {
        return toast.error('Please fill all required fields for items');
      }
    } else if (createMode === 'pdf') {
      if (!pdfFile) {
        return toast.error('Upload a PDF file');
      }
      if (!form.totalAmount || form.totalAmount <= 0) {
        return toast.error('Enter total amount from PDF');
      }
    }

    setSaving(true);
    try {
      if (createMode === 'manual') {
        // Manual order - send as JSON
        const totalAmt = form.items.reduce((s, i) => s + (i.quantity * i.price || 0), 0);
        const orderData = {
          industry: form.industry,
          priority: form.priority,
          notes: form.notes,
          deliveryDate: form.deliveryDate,
         store: form.store || null,
          orderType: 'manual',
          items: form.items,
          totalAmount: totalAmt,
        };

        const res = await ordersAPI.create(orderData);
        toast.success(`Order ${res.data.data.orderNumber} created successfully!`);
      } else {
        // PDF order - send as FormData
        const formDataToSend = new FormData();
        formDataToSend.append('pdf', pdfFile);
        formDataToSend.append('industry', form.industry);
        if (form.store) {
  formDataToSend.append('store', form.store);
}
        formDataToSend.append('priority', form.priority);
        formDataToSend.append('notes', form.notes);
        formDataToSend.append('deliveryDate', form.deliveryDate);
        formDataToSend.append('orderType', 'pdf');
        formDataToSend.append('totalAmount', form.totalAmount);

        const res = await ordersAPI.create(formDataToSend);
        toast.success(`Order ${res.data.data.orderNumber} created with PDF!`);
      }

      setCreateModal(false);
      setPdfFile(null);
      setCreateMode('manual');
      setForm({
        industry: '',
        items: [{ product: '', quantity: 1, price: 0 }],
        priority: 'normal',
        notes: '',
        deliveryDate: '',
        store: '',
        totalAmount: 0,
        orderType: 'manual'
      });
      fetchOrders();
    } catch (e) {
      console.error('Create order error:', e);
      toast.error(e.response?.data?.message || 'Failed to create order');
    } finally {
      setSaving(false);
    }
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
      if (p) items[i].price = p.price;
    }
    return { ...f, items };
  });

  const totalAmt = form.items.reduce((s, i) => s + (i.quantity * i.price || 0), 0);
  const pages = Math.ceil(total / 15);

  const columns = [
    { key: 'orderNumber', label: 'Order #', render: r => <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.orderNumber}</span> },
    { key: 'industry', label: 'Industry', render: r => r.industry?.name || '—' },
    { key: 'totalAmount', label: 'Amount', render: r => <span style={{ fontWeight: 600 }}>₹{r.totalAmount?.toLocaleString()}</span> },
    {
      key: 'paymentStatus',
      label: 'Payment',
      render: r => {
        const ps = r.paymentStatus || 'pending';
        const colors = {
          pending: { bg: '#fef3c7', fg: '#92400e' },
          partial_collected: { bg: '#fffbeb', fg: '#b45309' },
          full_collected: { bg: '#f0fdf4', fg: '#166534' },
          cancelled: { bg: '#fef2f2', fg: '#991b1b' },
        };
        const c = colors[ps] || colors.pending;
        return (
          <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: 6, background: c.bg, color: c.fg, fontWeight: 600, textTransform: 'capitalize' }}>
            {ps.replace(/_/g, ' ')}
          </span>
        );
      },
    },
    {
      key: 'amountCollected',
      label: 'Collected',
      render: r => (
        <span style={{ fontSize: '0.85rem' }}>
          ₹{(r.amountCollected || 0).toLocaleString()}
          {(r.outstandingAmount || 0) > 0 && (
            <span style={{ color: '#d97706', fontSize: '0.72rem', display: 'block' }}>Due: ₹{r.outstandingAmount.toLocaleString()}</span>
          )}
        </span>
      ),
    },
    { key: 'orderType', label: 'Type', render: r => <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', background: r.orderType === 'pdf' ? '#dbeafe' : '#f0fdf4', color: r.orderType === 'pdf' ? '#1e40af' : '#166534' }}>{r.orderType}</span> },
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
      <Modal 
        open={createModal} 
        onClose={() => { 
          setCreateModal(false); 
          setPdfFile(null); 
          setCreateMode('manual');
        }} 
        title="Create New Order" 
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => { 
              setCreateModal(false); 
              setPdfFile(null); 
              setCreateMode('manual');
            }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving || uploading}>
              {saving || uploading ? 'Creating...' : 'Create Order'}
            </button>
          </>
        }
      >

        {/* MODE SELECTOR - MANUAL or PDF */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => {
              setCreateMode('manual');
              setPdfFile(null);
            }}
            style={{
              padding: 16,
              border: `2px solid ${createMode === 'manual' ? '#2563eb' : '#e5e7eb'}`,
              borderRadius: 12,
              background: createMode === 'manual' ? '#eff6ff' : 'white',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4, fontSize: '1rem' }}>📝 Manual Entry</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Add products & calculate total</div>
          </button>

          <button
            onClick={() => {
              setCreateMode('pdf');
              setForm(f => ({ ...f, items: [] }));
            }}
            style={{
              padding: 16,
              border: `2px solid ${createMode === 'pdf' ? '#2563eb' : '#e5e7eb'}`,
              borderRadius: 12,
              background: createMode === 'pdf' ? '#eff6ff' : 'white',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4, fontSize: '1rem' }}>📄 Upload PDF</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Invoice from industry</div>
          </button>
        </div>

        {/* COMMON FIELDS */}
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

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Delivery Date</label>
            <input type="date" className="form-control" value={form.deliveryDate} onChange={e => setForm({ ...form, deliveryDate: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Store Name</label>
            <select className="form-control form-select" value={form.store || ''} onChange={e => setForm({ ...form, store: e.target.value })}>
              <option value="">Select Store</option>
              {stores.length > 0 ? (
                stores.map(store => (
                  <option key={store._id} value={store._id}>
                    {store.name}
                  </option>
                ))
              ) : (
                <option disabled>No stores available</option>
              )}
            </select>
          </div>
        </div>

        {/* MANUAL MODE - ADD ITEMS */}
        {createMode === 'manual' ? (
          <>
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

            <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 600 }}>Total Amount</span>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>₹{totalAmt.toLocaleString()}</span>
            </div>
          </>
        ) : (
          // PDF MODE - UPLOAD PDF & ENTER AMOUNT
          <>
            <div className="form-group">
              <label className="form-label">Upload Order PDF *</label>
              <div
                style={{
                  border: '2px dashed #e5e7eb',
                  borderRadius: 10,
                  padding: 24,
                  textAlign: 'center',
                  cursor: pdfFile ? 'default' : 'pointer',
                  background: pdfFile ? '#f0fdf4' : '#f9fafb',
                  transition: 'all 0.2s'
                }}
              >
                <input
                  type="file"
                  accept=".pdf"
                  onChange={e => setPdfFile(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                  id="pdf-order-upload"
                />
                <label htmlFor="pdf-order-upload" style={{ cursor: 'pointer', display: 'block' }}>
                  {pdfFile ? (
                    <>
                      <File size={32} color="#16a34a" style={{ margin: '0 auto 12px', display: 'block' }} />
                      <p style={{ fontWeight: 700, marginBottom: 4, color: '#16a34a' }}>✓ {pdfFile.name}</p>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {(pdfFile.size / 1024).toFixed(2)} KB
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload size={32} color="#9ca3af" style={{ margin: '0 auto 12px', display: 'block' }} />
                      <p style={{ fontWeight: 700, marginBottom: 4 }}>Click to upload PDF</p>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        PDF up to 10MB
                      </p>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Total Order Amount *</label>
              <input
                type="number"
                className="form-control"
                min="0"
                step="0.01"
                value={form.totalAmount}
                onChange={e => setForm({ ...form, totalAmount: Number(e.target.value) })}
                placeholder="Enter total amount from PDF invoice"
              />
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 4 }}>
                This amount will be shown to delivery staff
              </p>
            </div>
          </>
        )}

        {/* NOTES - BOTH MODES */}
        <div className="form-group" style={{ marginTop: 16 }}>
          <label className="form-label">Notes (Optional)</label>
          <textarea 
            className="form-control" 
            rows={2} 
            value={form.notes} 
            onChange={e => setForm({ ...form, notes: e.target.value })} 
            placeholder="Any additional information..." 
          />
        </div>
      </Modal>

      {/* View Order Modal */}
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title={`Order ${viewModal?.orderNumber}`} size="lg">
        {viewModal && (
          <div>
            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div><span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>Industry</span><strong>{viewModal.industry?.name}</strong></div>
              <div><span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>Order Type</span><strong style={{ color: viewModal.orderType === 'pdf' ? '#1e40af' : '#166534' }}>{viewModal.orderType}</strong></div>
              <div><span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>Status</span><StatusBadge status={viewModal.status} /></div>
              <div><span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>Assigned Staff</span><strong>{viewModal.assignedStaff?.name || 'Unassigned'}</strong></div>
              <div><span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>Total Amount</span><strong style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>₹{viewModal.totalAmount?.toLocaleString()}</strong></div>
              <div><span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>Payment Status</span><strong style={{ textTransform: 'capitalize' }}>{(viewModal.paymentStatus || 'pending').replace(/_/g, ' ')}</strong></div>
              <div><span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>Collected</span><strong style={{ color: '#16a34a' }}>₹{(viewModal.amountCollected || 0).toLocaleString()}</strong></div>
              <div><span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>Outstanding</span><strong style={{ color: (viewModal.outstandingAmount || 0) > 0 ? '#d97706' : '#16a34a' }}>₹{(viewModal.outstandingAmount ?? Math.max(0, (viewModal.totalAmount || 0) - (viewModal.amountCollected || 0))).toLocaleString()}</strong></div>
            </div>

            {viewDeliveryLog?.paymentHistory?.length > 0 && (
              <div style={{ marginBottom: 16, background: '#f9fafb', borderRadius: 10, padding: 14 }}>
                <p style={{ fontWeight: 600, marginBottom: 10, fontSize: '0.9rem' }}>Payment collections</p>
                {viewDeliveryLog.paymentHistory.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                    <span style={{ textTransform: 'capitalize' }}>{p.mode} · {format(new Date(p.collectedAt), 'dd MMM yyyy HH:mm')}</span>
                    <strong>₹{p.amount?.toLocaleString()}</strong>
                  </div>
                ))}
              </div>
            )}

            {/* PDF ORDER */}
            {viewModal.orderType === 'pdf' && viewModal.pdfInvoice?.pdfUrl ? (
              <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                <File size={40} color="#16a34a" style={{ margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontWeight: 600, marginBottom: 8 }}>📄 PDF Invoice</p>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 12 }}>{viewModal.pdfInvoice.fileName}</p>
                <a 
                  href={viewModal.pdfInvoice.pdfUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    padding: '8px 16px',
                    background: '#16a34a',
                    color: 'white',
                    borderRadius: 6,
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}
                >
                  Download PDF
                </a>
              </div>
            ) : viewModal.items && viewModal.items.length > 0 ? (
              /* MANUAL ORDER - SHOW ITEMS TABLE */
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead><tr style={{ background: 'var(--gray-50)' }}><th style={{ padding: '8px 12px', textAlign: 'left' }}>Product</th><th style={{ padding: '8px 12px', textAlign: 'right' }}>Qty</th><th style={{ padding: '8px 12px', textAlign: 'right' }}>Price</th><th style={{ padding: '8px 12px', textAlign: 'right' }}>Total</th></tr></thead>
                <tbody>{viewModal.items?.map((item, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '8px 12px' }}>{item.product?.name || '—'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{item.quantity}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{item.price?.toLocaleString()}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>₹{(item.quantity * item.price)?.toLocaleString()}</td>
                  </tr>
                ))}</tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                <p>No items to display</p>
              </div>
            )}
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