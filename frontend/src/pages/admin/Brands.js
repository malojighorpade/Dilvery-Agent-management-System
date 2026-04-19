import React, { useState, useEffect, useCallback } from 'react';
import { brandsAPI } from '../../services/api';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

const EMPTY = { name: '', description: '', contactPerson: '', contactEmail: '', contactPhone: '' };

export default function Brands() {
  const [brands, setBrands] = useState([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(''); const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null); const [form, setForm] = useState(EMPTY); const [saving, setSaving] = useState(false);

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try { const r = await brandsAPI.getAll(search ? { search } : {}); setBrands(r.data.data); }
    catch { toast.error('Failed to load brands'); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (b) => { setEditing(b); setForm({ name: b.name, description: b.description || '', contactPerson: b.contactPerson || '', contactEmail: b.contactEmail || '', contactPhone: b.contactPhone || '' }); setModal(true); };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Brand name is required');
    setSaving(true);
    try {
      if (editing) { await brandsAPI.update(editing._id, form); toast.success('Brand updated'); }
      else { await brandsAPI.create(form); toast.success('Brand created'); }
      setModal(false); fetchBrands();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to save'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this brand?')) return;
    try { await brandsAPI.delete(id); toast.success('Brand deactivated'); fetchBrands(); }
    catch { toast.error('Failed to delete'); }
  };

  const columns = [
    { key: 'name', label: 'Brand Name', render: r => <strong>{r.name}</strong> },
    { key: 'description', label: 'Description', render: r => r.description || '—' },
    { key: 'contactPerson', label: 'Contact Person', render: r => r.contactPerson || '—' },
    { key: 'contactPhone', label: 'Phone', render: r => r.contactPhone || '—' },
    { key: 'isActive', label: 'Status', render: r => <span className={`badge ${r.isActive ? 'badge-green' : 'badge-red'}`}>{r.isActive ? 'Active' : 'Inactive'}</span> },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h1 className="page-title">Brands</h1><p className="page-subtitle">{brands.length} brands</p></div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} />Add Brand</button>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="search-bar"><Search size={15} color="var(--gray-400)" /><input placeholder="Search brands..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>
        <DataTable columns={columns} data={brands} loading={loading} emptyText="No brands found"
          actions={row => (
            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
              <button className="btn-icon" onClick={() => openEdit(row)}><Pencil size={15} /></button>
              <button className="btn-icon" onClick={() => handleDelete(row._id)} style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
            </div>
          )} />
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Brand' : 'Add Brand'}
        footer={<><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></>}>
        <div className="form-group"><label className="form-label">Brand Name *</label><input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sunrise FMCG" /></div>
        <div className="form-group"><label className="form-label">Description</label><textarea className="form-control" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid-2">
          <div className="form-group"><label className="form-label">Contact Person</label><input className="form-control" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Phone</label><input className="form-control" value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} /></div>
        </div>
        <div className="form-group"><label className="form-label">Email</label><input className="form-control" type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} /></div>
      </Modal>
    </div>
  );
}
