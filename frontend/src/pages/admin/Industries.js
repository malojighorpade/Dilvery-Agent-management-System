import React, { useState, useEffect, useCallback } from 'react';
import { industriesAPI, brandsAPI } from '../../services/api';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

const EMPTY = { name: '', type: '', gstin: '', contactPerson: '', email: '', phone: '', address: { street: '', city: '', state: '', pincode: '' }, brands: [] };

export default function Industries() {
  const [items, setItems] = useState([]); const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true); const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false); const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY); const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await industriesAPI.getAll(search ? { search } : {}); setItems(r.data.data); }
    catch { toast.error('Failed'); } finally { setLoading(false); }
  }, [search]);
  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { brandsAPI.getAll({ isActive: true }).then(r => setBrands(r.data.data)); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ name: item.name, type: item.type, gstin: item.gstin || '', contactPerson: item.contactPerson, email: item.email || '', phone: item.phone, address: item.address || { street: '', city: '', state: '', pincode: '' }, brands: item.brands?.map(b => b._id) || [] }); setModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.contactPerson || !form.phone) return toast.error('Fill required fields');
    setSaving(true);
    try {
      if (editing) { await industriesAPI.update(editing._id, form); toast.success('Updated'); }
      else { await industriesAPI.create(form); toast.success('Created'); }
      setModal(false); fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  };

  const columns = [
    { key: 'name', label: 'Industry', render: r => <strong>{r.name}</strong> },
    { key: 'type', label: 'Type' },
    { key: 'contactPerson', label: 'Contact Person' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'City', render: r => r.address?.city || '—' },
    { key: 'isActive', label: 'Status', render: r => <span className={`badge ${r.isActive ? 'badge-green' : 'badge-red'}`}>{r.isActive ? 'Active' : 'Inactive'}</span> },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h1 className="page-title">Industries</h1><p className="page-subtitle">{items.length} industry partners</p></div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} />Add Industry</button>
      </div>
      <div className="card">
        <div className="card-header"><div className="search-bar"><Search size={15} color="var(--gray-400)" /><input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div></div>
        <DataTable columns={columns} data={items} loading={loading} emptyText="No industries"
          actions={row => (<div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}><button className="btn-icon" onClick={() => openEdit(row)}><Pencil size={15} /></button><button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={async () => { if (window.confirm('Deactivate?')) { await industriesAPI.delete(row._id); toast.success('Done'); fetch(); } }}><Trash2 size={15} /></button></div>)} />
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Industry' : 'Add Industry'} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></>}>
        <div className="grid-2">
          <div className="form-group"><label className="form-label">Industry Name *</label><input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Type *</label><input className="form-control" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} placeholder="e.g. FMCG Distributor" /></div>
          <div className="form-group"><label className="form-label">Contact Person *</label><input className="form-control" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Phone *</label><input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-control" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">GSTIN</label><input className="form-control" value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value })} /></div>
                   <div className="form-group"><label className="form-label">Street</label><input className="form-control" value={form.address.street} onChange={e => setForm({ ...form, address: { ...form.address, street: e.target.value } })} /></div>

          <div className="form-group"><label className="form-label">City</label><input className="form-control" value={form.address.city} onChange={e => setForm({ ...form, address: { ...form.address, city: e.target.value } })} /></div>
          <div className="form-group"><label className="form-label">State</label><input className="form-control" value={form.address.state} onChange={e => setForm({ ...form, address: { ...form.address, state: e.target.value } })} /></div>
          <div className="form-group"><label className="form-label">Pincode</label><input className="form-control" value={form.address.pincode} onChange={e => setForm({ ...form, address: { ...form.address, pincode: e.target.value } })} /></div>

          
        </div>
        <div className="form-group">
          <label className="form-label">Associated Brands</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {brands.map(b => (
              <label key={b._id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', cursor: 'pointer', padding: '4px 10px', border: '1px solid var(--gray-200)', borderRadius: 6, background: form.brands.includes(b._id) ? 'var(--primary-light)' : 'white' }}>
                <input type="checkbox" checked={form.brands.includes(b._id)} onChange={e => setForm(f => ({ ...f, brands: e.target.checked ? [...f.brands, b._id] : f.brands.filter(id => id !== b._id) }))} />
                {b.name}
              </label>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
