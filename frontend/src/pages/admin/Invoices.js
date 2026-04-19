import React, { useState, useEffect, useCallback } from 'react';
import { invoicesAPI, storesAPI } from '../../services/api';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import toast from 'react-hot-toast';
import { Search, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function Invoices() {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(''); const [statusFilter, setStatusFilter] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await invoicesAPI.getAll({ search, status: statusFilter }); setItems(r.data.data); }
    catch { toast.error('Failed'); } finally { setLoading(false); }
  }, [search, statusFilter]);
  useEffect(() => { fetch(); }, [fetch]);

  const markPaid = async (id) => {
    try { await invoicesAPI.markPaid(id); toast.success('Marked as paid'); fetch(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const columns = [
    { key: 'invoiceNumber', label: 'Invoice #', render: r => <strong style={{ color: 'var(--primary)' }}>{r.invoiceNumber}</strong> },
    { key: 'store', label: 'Store', render: r => r.store?.name || '—' },
    { key: 'totalAmount', label: 'Amount', render: r => <strong>₹{r.totalAmount?.toLocaleString()}</strong> },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
    { key: 'dueDate', label: 'Due Date', render: r => r.dueDate ? format(new Date(r.dueDate), 'dd MMM yyyy') : '—' },
    { key: 'createdAt', label: 'Created', render: r => format(new Date(r.createdAt), 'dd MMM yyyy') },
  ];

  return (
    <div className="page-container">
      <div className="page-header"><div><h1 className="page-title">Invoices</h1><p className="page-subtitle">{items.length} invoices</p></div></div>
      <div className="card">
        <div className="card-header">
          <div className="filters-row">
            <div className="search-bar"><Search size={15} color="var(--gray-400)" /><input placeholder="Search invoice #..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <select className="form-control form-select" style={{ width: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              {['draft','sent','paid','overdue','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <DataTable columns={columns} data={items} loading={loading} emptyText="No invoices found"
          actions={row => row.status !== 'paid' && row.status !== 'cancelled' ? (
            <button className="btn btn-sm btn-success" onClick={() => markPaid(row._id)}><CheckCircle size={13} />Mark Paid</button>
          ) : null} />
      </div>
    </div>
  );
}
