import React, { useState, useEffect, useCallback, useRef } from 'react';
import { invoicesAPI, ordersAPI } from '../../services/api';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import Modal from '../../components/shared/Modal';
import toast from 'react-hot-toast';
import { Search, CheckCircle, Download, Eye, Printer, FileText, Building2, Store, MapPin } from 'lucide-react';
import { format } from 'date-fns';

// ─── Invoice Print/Download Template ───────────────────────────────────────────
function InvoicePrintView({ invoice, onClose }) {
  const printRef = useRef(null);

  const handleDownload = () => {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: white; padding: 32px; }
        .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #2563eb; }
        .inv-logo { font-size: 1.6rem; font-weight: 800; color: #2563eb; }
        .inv-logo span { color: #111; font-size: 0.8rem; font-weight: 400; display: block; margin-top: 2px; }
        .inv-num { text-align: right; }
        .inv-num h2 { font-size: 1.4rem; color: #2563eb; font-weight: 800; }
        .inv-num p { font-size: 0.8rem; color: #666; margin-top: 4px; }
        .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
        .party { padding: 16px; border: 1px solid #e5e7eb; border-radius: 10px; background: #f9fafb; }
        .party-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 8px; }
        .party-name { font-size: 1rem; font-weight: 700; color: #111; margin-bottom: 4px; }
        .party-detail { font-size: 0.78rem; color: #6b7280; line-height: 1.6; }
        .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; padding: 14px; background: #f1f5f9; border-radius: 10px; }
        .meta-item label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; display: block; margin-bottom: 4px; }
        .meta-item span { font-size: 0.85rem; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        thead th { background: #2563eb; color: white; padding: 10px 14px; text-align: left; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; }
        thead th:last-child { text-align: right; }
        thead th:nth-child(2), thead th:nth-child(3) { text-align: center; }
        tbody td { padding: 11px 14px; border-bottom: 1px solid #f3f4f6; font-size: 0.85rem; }
        tbody td:last-child { text-align: right; font-weight: 700; }
        tbody td:nth-child(2), tbody td:nth-child(3) { text-align: center; color: #6b7280; }
        tbody tr:hover { background: #f9fafb; }
        .totals { margin-left: auto; width: 280px; }
        .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.85rem; color: #6b7280; }
        .totals-total { display: flex; justify-content: space-between; padding: 12px 16px; background: #2563eb; color: white; border-radius: 8px; margin-top: 8px; font-weight: 800; font-size: 1.1rem; }
        .status-badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 600; background: #dcfce7; color: #166534; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 0.75rem; color: #9ca3af; }
        @media print { body { padding: 20px; } }
      </style>
      </head><body>${content}</body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  const subtotal = invoice.subtotal || invoice.items?.reduce((s, i) => s + i.total, 0) || 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 800, maxHeight: '95vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{invoice.invoiceNumber}</span>
            <StatusBadge status={invoice.status} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleDownload} className="btn btn-primary btn-sm" style={{ borderRadius: 8 }}>
              <Printer size={14} /> Print / Download PDF
            </button>
            <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ borderRadius: 8 }}>Close</button>
          </div>
        </div>

        {/* Invoice content */}
        <div style={{ overflowY: 'auto', flex: 1, padding: 32 }}>
          <div ref={printRef}>
            {/* Header */}
            <div className="inv-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, paddingBottom: 20, borderBottom: '3px solid #2563eb' }}>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563eb' }}>DistributeIQ</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>B2B Distribution Management</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', marginBottom: 4 }}>TAX INVOICE</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb' }}>{invoice.invoiceNumber}</div>
                <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 4 }}>Date: {format(new Date(invoice.createdAt), 'dd MMM yyyy')}</div>
                {invoice.dueDate && <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: 2 }}>Due: {format(new Date(invoice.dueDate), 'dd MMM yyyy')}</div>}
              </div>
            </div>

            {/* From / To */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              {/* Industry */}
              <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 10, background: '#f9fafb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Building2 size={14} color="#2563eb" />
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af' }}>From (Supplier)</span>
                </div>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{invoice.industry?.name || '—'}</p>
                {invoice.industry?.contactPerson && <p style={{ fontSize: '0.78rem', color: '#6b7280' }}>{invoice.industry.contactPerson}</p>}
                {invoice.industry?.phone && <p style={{ fontSize: '0.78rem', color: '#6b7280' }}>📞 {invoice.industry.phone}</p>}
                {invoice.industry?.address && <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 4, display: 'flex', gap: 3 }}><MapPin size={10} style={{ flexShrink: 0, marginTop: 2 }} />{[invoice.industry.address.street, invoice.industry.address.city, invoice.industry.address.state].filter(Boolean).join(', ')}</p>}
                {invoice.industry?.gstin && <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 4 }}>GSTIN: {invoice.industry.gstin}</p>}
              </div>
              {/* Store */}
              <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 10, background: '#f9fafb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Store size={14} color="#16a34a" />
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af' }}>To (Buyer)</span>
                </div>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{invoice.store?.name || '—'}</p>
                {invoice.store?.ownerName && <p style={{ fontSize: '0.78rem', color: '#6b7280' }}>{invoice.store.ownerName}</p>}
                {invoice.store?.phone && <p style={{ fontSize: '0.78rem', color: '#6b7280' }}>📞 {invoice.store.phone}</p>}
                {invoice.store?.address && <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 4, display: 'flex', gap: 3 }}><MapPin size={10} style={{ flexShrink: 0, marginTop: 2 }} />{[invoice.store.address.street, invoice.store.address.city, invoice.store.address.state, invoice.store.address.pincode].filter(Boolean).join(', ')}</p>}
                {invoice.store?.gstin && <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 4 }}>GSTIN: {invoice.store.gstin}</p>}
              </div>
            </div>

            {/* Meta */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24, padding: 14, background: '#f1f5f9', borderRadius: 10 }}>
              {[
                { label: 'Order Ref', val: invoice.order?.orderNumber || '—' },
                { label: 'Payment Status', val: <StatusBadge status={invoice.status} /> },
                { label: 'Tax Rate', val: `${invoice.taxRate || 18}% GST` },
                { label: 'Discount', val: `₹${(invoice.discount || 0).toLocaleString()}` },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: '0.83rem', fontWeight: 600 }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Items table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
              <thead>
                <tr style={{ background: '#2563eb' }}>
                  {['#', 'Product', 'SKU', 'Qty', 'Unit Price', 'Total'].map((h, i) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: i > 2 ? 'right' : i === 0 ? 'center' : 'left', fontSize: '0.72rem', fontWeight: 700, color: 'white', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                    <td style={{ padding: '11px 14px', textAlign: 'center', fontSize: '0.8rem', color: '#9ca3af' }}>{i + 1}</td>
                    <td style={{ padding: '11px 14px', fontSize: '0.85rem', fontWeight: 600 }}>{item.productName || item.product?.name || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: '0.75rem', color: '#9ca3af' }}>{item.product?.sku || '—'}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: '0.85rem', color: '#6b7280' }}>{item.quantity}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: '0.85rem', color: '#6b7280' }}>₹{item.price?.toLocaleString()}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 700 }}>₹{(item.total || item.quantity * item.price)?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ marginLeft: 'auto', width: 300 }}>
              {[['Subtotal', `₹${subtotal.toLocaleString()}`], [`Tax (${invoice.taxRate || 18}% GST)`, `₹${(invoice.taxAmount || 0).toLocaleString()}`], ['Discount', `-₹${(invoice.discount || 0).toLocaleString()}`]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '0.85rem', color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}>
                  <span>{l}</span><span>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#2563eb', color: 'white', borderRadius: 10, marginTop: 10, fontWeight: 800, fontSize: '1.1rem' }}>
                <span>Total Amount</span><span>₹{invoice.totalAmount?.toLocaleString()}</span>
              </div>
            </div>

            {invoice.notes && <div style={{ marginTop: 28, padding: '12px 16px', background: '#fffbeb', borderRadius: 10, fontSize: '0.82rem', color: '#78350f' }}><strong>Notes:</strong> {invoice.notes}</div>}

            <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid #e5e7eb', textAlign: 'center', fontSize: '0.72rem', color: '#9ca3af' }}>
              <p>Thank you for your business! · DistributeIQ · Generated on {format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Invoices Page ─────────────────────────────────────────────────────────
export default function Invoices() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewInvoice, setViewInvoice] = useState(null);
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const r = await invoicesAPI.getAll({ search, status: statusFilter });
      setItems(r.data.data);
    } catch { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const openInvoice = async (invoice) => {
    setLoadingDetail(true);
    try {
      const r = await invoicesAPI.getOne(invoice._id);
      setInvoiceDetail(r.data.data);
    } catch { toast.error('Failed to load invoice details'); setLoadingDetail(false); return; }
    finally { setLoadingDetail(false); }
    setViewInvoice(true);
  };

  const markPaid = async (id) => {
    try { await invoicesAPI.markPaid(id); toast.success('Marked as paid'); fetchInvoices(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  // Summary stats
  const totalAmount = items.reduce((s, i) => s + (i.totalAmount || 0), 0);
  const paidAmount = items.filter(i => i.status === 'paid').reduce((s, i) => s + (i.totalAmount || 0), 0);
  const overdueCount = items.filter(i => i.status === 'overdue').length;

  const columns = [
    { key: 'invoiceNumber', label: 'Invoice #', render: r => <strong style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => openInvoice(r)}>{r.invoiceNumber}</strong> },
    { key: 'store', label: 'Store', render: r => r.store?.name || '—' },
    { key: 'order', label: 'Order Ref', render: r => r.order?.orderNumber ? <span style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>{r.order.orderNumber}</span> : '—' },
    { key: 'totalAmount', label: 'Amount', render: r => <strong>₹{r.totalAmount?.toLocaleString()}</strong> },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
    { key: 'dueDate', label: 'Due Date', render: r => r.dueDate ? <span style={{ color: r.status === 'overdue' ? 'var(--danger)' : 'inherit' }}>{format(new Date(r.dueDate), 'dd MMM yyyy')}</span> : '—' },
    { key: 'createdAt', label: 'Created', render: r => format(new Date(r.createdAt), 'dd MMM yyyy') },
  ];

  return (
    <div className="page-container">
      {/* Full invoice view */}
      {viewInvoice && invoiceDetail && <InvoicePrintView invoice={invoiceDetail} onClose={() => { setViewInvoice(false); setInvoiceDetail(null); }} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">{items.length} invoices · ₹{totalAmount.toLocaleString()} total</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <p className="stat-label">Total Invoiced</p>
          <p className="stat-value" style={{ fontSize: '1.4rem' }}>₹{totalAmount.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Paid</p>
          <p className="stat-value" style={{ fontSize: '1.4rem', color: 'var(--success)' }}>₹{paidAmount.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Pending / Overdue</p>
          <p className="stat-value" style={{ fontSize: '1.4rem', color: overdueCount > 0 ? 'var(--danger)' : 'var(--gray-800)' }}>
            ₹{(totalAmount - paidAmount).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="filters-row">
            <div className="search-bar">
              <Search size={15} color="var(--gray-400)" />
              <input placeholder="Search invoice #..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-control form-select" style={{ width: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              {['draft','sent','paid','overdue','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={items}
          loading={loading || loadingDetail}
          emptyText="No invoices found"
          actions={row => (
            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
              <button className="btn btn-sm btn-secondary" onClick={() => openInvoice(row)} style={{ borderRadius: 6 }}>
                <Eye size={13} /> View
              </button>
              {row.status !== 'paid' && row.status !== 'cancelled' && (
                <button className="btn btn-sm btn-success" onClick={() => markPaid(row._id)} style={{ borderRadius: 6 }}>
                  <CheckCircle size={13} /> Mark Paid
                </button>
              )}
            </div>
          )}
        />
      </div>
    </div>
  );
}