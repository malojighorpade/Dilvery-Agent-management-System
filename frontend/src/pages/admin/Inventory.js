import React, { useState, useEffect } from 'react';
import { inventoryAPI } from '../../services/api';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import toast from 'react-hot-toast';
import { AlertTriangle, TrendingUp, Search } from 'lucide-react';

export default function Inventory() {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(''); const [lowOnly, setLowOnly] = useState(false);
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ type: 'in', quantity: '', note: '' });
  const [saving, setSaving] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    try { const r = await inventoryAPI.getAll(); let data = r.data.data; if (lowOnly) data = data.filter(i => i.currentStock <= i.reorderLevel); if (search) data = data.filter(i => i.product?.name?.toLowerCase().includes(search.toLowerCase())); setItems(data); }
    catch { toast.error('Failed to load inventory'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchInventory(); }, [lowOnly, search]);

  const handleAdjust = async () => {
    if (!adjustForm.quantity || adjustForm.quantity <= 0) return toast.error('Enter a valid quantity');
    setSaving(true);
    try {
      await inventoryAPI.adjust({ productId: adjustModal.product?._id, type: adjustForm.type, quantity: Number(adjustForm.quantity), note: adjustForm.note });
      toast.success('Stock adjusted!'); setAdjustModal(null); fetchInventory();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  };

  const columns = [
    { key: 'product', label: 'Product', render: r => <div><div style={{ fontWeight: 600 }}>{r.product?.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{r.product?.sku} · {r.product?.brand?.name}</div></div> },
    { key: 'currentStock', label: 'Current Stock', render: r => <span style={{ fontWeight: 700, color: r.currentStock <= r.reorderLevel ? 'var(--danger)' : 'var(--success)' }}>{r.currentStock}</span> },
    { key: 'reservedStock', label: 'Reserved', render: r => r.reservedStock || 0 },
    { key: 'available', label: 'Available', render: r => <strong>{r.currentStock - r.reservedStock}</strong> },
    { key: 'reorderLevel', label: 'Reorder At' },
    { key: 'lastRestocked', label: 'Last Restocked', render: r => r.lastRestocked ? new Date(r.lastRestocked).toLocaleDateString() : '—' },
    { key: 'alert', label: '', render: r => r.currentStock <= r.reorderLevel ? <span className="badge badge-red"><AlertTriangle size={11} style={{marginRight:4}} />Low</span> : '' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h1 className="page-title">Inventory</h1><p className="page-subtitle">Track stock levels across all products</p></div>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="filters-row">
            <div className="search-bar"><Search size={15} color="var(--gray-400)" /><input placeholder="Search product..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} />
              Low Stock Only
            </label>
          </div>
        </div>
        <DataTable columns={columns} data={items} loading={loading} emptyText="No inventory records"
          actions={row => <button className="btn btn-sm btn-outline" onClick={() => { setAdjustModal(row); setAdjustForm({ type: 'in', quantity: '', note: '' }); }}><TrendingUp size={13} />Adjust</button>} />
      </div>
      <Modal open={!!adjustModal} onClose={() => setAdjustModal(null)} title={`Adjust Stock — ${adjustModal?.product?.name}`}
        footer={<><button className="btn btn-secondary" onClick={() => setAdjustModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleAdjust} disabled={saving}>{saving ? 'Adjusting...' : 'Adjust Stock'}</button></>}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['in','out','adjustment'].map(t => (
            <button key={t} onClick={() => setAdjustForm(f => ({ ...f, type: t }))} className={`btn ${adjustForm.type === t ? 'btn-primary' : 'btn-secondary'}`}>{t === 'in' ? '+ Stock In' : t === 'out' ? '- Stock Out' : 'Set Value'}</button>
          ))}
        </div>
        <div className="form-group"><label className="form-label">Current Stock</label><div style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--gray-800)' }}>{adjustModal?.currentStock}</div></div>
        <div className="form-group"><label className="form-label">Quantity *</label><input className="form-control" type="number" min="1" value={adjustForm.quantity} onChange={e => setAdjustForm(f => ({ ...f, quantity: e.target.value }))} placeholder={adjustForm.type === 'adjustment' ? 'Set stock to...' : 'Enter quantity'} /></div>
        <div className="form-group"><label className="form-label">Note</label><input className="form-control" value={adjustForm.note} onChange={e => setAdjustForm(f => ({ ...f, note: e.target.value }))} placeholder="Reason for adjustment" /></div>
      </Modal>
    </div>
  );
}
