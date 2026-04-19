import React, { useState, useEffect, useCallback } from 'react';
import { storesAPI, usersAPI } from '../../services/api';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

const EMPTY = { name: '', ownerName: '', phone: '', email: '', route: '', assignedStaff: '', address: { street: '', city: '', state: '', pincode: '' }, gstin: '' };

export default function Stores() {
  const [items, setItems] = useState([]); const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true); const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false); const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY); const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await storesAPI.getAll(search ? { search } : {}); setItems(r.data.data); }
    catch { toast.error('Failed'); } finally { setLoading(false); }
  }, [search]);
  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { usersAPI.getStaff().then(r => setStaff(r.data.data)); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ name: item.name, ownerName: item.ownerName, phone: item.phone, email: item.email || '', route: item.route || '', assignedStaff: item.assignedStaff?._id || '', address: item.address || { street: '', city: '', state: '', pincode: '' }, gstin: item.gstin || '' }); setModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.ownerName || !form.phone) return toast.error('Fill required fields');
    setSaving(true);
    try {
      if (editing) { await storesAPI.update(editing._id, form); toast.success('Store updated'); }
      else { await storesAPI.create(form); toast.success('Store created'); }
      setModal(false); fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  };

  const columns = [
    { key: 'name', label: 'Store', render: r => <div><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{r.ownerName}</div></div> },
    { key: 'phone', label: 'Phone' },
    { key: 'route', label: 'Route', render: r => r.route ? <span className="badge badge-blue">{r.route}</span> : '—' },
    { key: 'assignedStaff', label: 'Staff', render: r => r.assignedStaff?.name || <span style={{ color: 'var(--gray-400)' }}>Unassigned</span> },
    { key: 'address', label: 'City', render: r => r.address?.city || '—' },
    { key: 'isActive', label: 'Status', render: r => <span className={`badge ${r.isActive ? 'badge-green' : 'badge-red'}`}>{r.isActive ? 'Active' : 'Inactive'}</span> },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h1 className="page-title">Stores</h1><p className="page-subtitle">{items.length} retail stores</p></div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} />Add Store</button>
      </div>
      <div className="card">
        <div className="card-header"><div className="search-bar"><Search size={15} color="var(--gray-400)" /><input placeholder="Search stores..." value={search} onChange={e => setSearch(e.target.value)} /></div></div>
        <DataTable columns={columns} data={items} loading={loading} emptyText="No stores found"
          actions={row => (<div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}><button className="btn-icon" onClick={() => openEdit(row)}><Pencil size={15} /></button><button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={async () => { if (window.confirm('Deactivate?')) { await storesAPI.delete(row._id); toast.success('Done'); fetch(); } }}><Trash2 size={15} /></button></div>)} />
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Store' : 'Add Store'} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></>}>
        <div className="grid-2">
          <div className="form-group"><label className="form-label">Store Name *</label><input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Owner Name *</label><input className="form-control" value={form.ownerName} onChange={e => setForm({ ...form, ownerName: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Phone *</label><input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-control" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Route</label><input className="form-control" value={form.route} onChange={e => setForm({ ...form, route: e.target.value })} placeholder="e.g. Route A" /></div>
          <div className="form-group"><label className="form-label">Assigned Staff</label><select className="form-control form-select" value={form.assignedStaff} onChange={e => setForm({ ...form, assignedStaff: e.target.value })}><option value="">Select Staff</option>{staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}</select></div>
          <div className="form-group"><label className="form-label">City</label><input className="form-control" value={form.address.city} onChange={e => setForm({ ...form, address: { ...form.address, city: e.target.value } })} /></div>
          <div className="form-group"><label className="form-label">Pincode</label><input className="form-control" value={form.address.pincode} onChange={e => setForm({ ...form, address: { ...form.address, pincode: e.target.value } })} /></div>
        </div>
        <div className="form-group"><label className="form-label">Street Address</label><input className="form-control" value={form.address.street} onChange={e => setForm({ ...form, address: { ...form.address, street: e.target.value } })} /></div>
      </Modal>
    </div>
  );
}
