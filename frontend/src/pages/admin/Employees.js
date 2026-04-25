import React, { useState, useEffect, useCallback } from 'react';
import { usersAPI } from '../../services/api';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import toast from 'react-hot-toast';
import { Plus, Pencil, UserX, Search } from 'lucide-react';
import { format } from 'date-fns';

const EMPTY = { name: '', email: '', password: '', role: 'delivery agent', phone: '', address: '' };

export default function Employees() {
  const [users, setUsers] = useState([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(''); const [roleFilter, setRoleFilter] = useState('');
  const [modal, setModal] = useState(false); const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY); const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try { const r = await usersAPI.getAll({ search, role: roleFilter }); setUsers(r.data.data); }
    catch { toast.error('Failed to load employees'); } finally { setLoading(false); }
  }, [search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (u) => { setEditing(u); setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '', address: u.address || '' }); setModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.email) return toast.error('Name and email are required');
    if (!editing && !form.password) return toast.error('Password required for new user');
    setSaving(true);
    try {
      const data = { ...form }; if (!data.password) delete data.password;
      if (editing) { await usersAPI.update(editing._id, data); toast.success('Employee updated'); }
      else { await usersAPI.create(data); toast.success('Employee created'); }
      setModal(false); fetchUsers();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to save'); } finally { setSaving(false); }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this employee?')) return;
    try { await usersAPI.delete(id); toast.success('Employee deactivated'); fetchUsers(); }
    catch { toast.error('Failed'); }
  };

  const columns = [
    { key: 'name', label: 'Name', render: r => <div><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{r.email}</div></div> },
    { key: 'role', label: 'Role', render: r => <span className={`badge ${r.role === 'admin' ? 'badge-purple' : 'badge-blue'}`}>{r.role}</span> },
    { key: 'phone', label: 'Phone', render: r => r.phone || '—' },
    { key: 'lastLogin', label: 'Last Login', render: r => r.lastLogin ? format(new Date(r.lastLogin), 'dd MMM, HH:mm') : 'Never' },
    { key: 'isActive', label: 'Status', render: r => <span className={`badge ${r.isActive ? 'badge-green' : 'badge-red'}`}>{r.isActive ? 'Active' : 'Inactive'}</span> },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h1 className="page-title">Employees</h1><p className="page-subtitle">{users.length} team members</p></div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} />Add Employee</button>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="filters-row">
            <div className="search-bar"><Search size={15} color="var(--gray-400)" /><input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <select className="form-control form-select" style={{ width: 140 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="">All Roles</option><option value="admin">Admin</option><option value="staff">Staff</option>
            </select>
          </div>
        </div>
        <DataTable columns={columns} data={users} loading={loading} emptyText="No employees found"
          actions={row => (
            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
              <button className="btn-icon" onClick={() => openEdit(row)}><Pencil size={15} /></button>
              {row.isActive && <button className="btn-icon" onClick={() => handleDeactivate(row._id)} style={{ color: 'var(--danger)' }} title="Deactivate"><UserX size={15} /></button>}
            </div>
          )} />
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Employee' : 'Add Employee'}
        footer={<><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></>}>
        <div className="grid-2">
          <div className="form-group"><label className="form-label">Full Name *</label><input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Email *</label><input className="form-control" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label><input className="form-control" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Phone</label><input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Role</label><select className="form-control form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="staff">Staff</option><option value="admin">Admin</option></select></div>
        </div>
        <div className="form-group"><label className="form-label">Address</label><input className="form-control" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
      </Modal>
    </div>
  );
}
