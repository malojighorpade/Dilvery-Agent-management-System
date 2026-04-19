import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { deliveryAPI, paymentsAPI } from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import Modal from '../../components/shared/Modal';
import toast from 'react-hot-toast';
import { ArrowLeft, Camera, CreditCard, CheckCircle, MapPin, Phone } from 'lucide-react';

const DENOMS = ['2000', '500', '200', '100', '50', '20', '10'];

export default function DeliveryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusModal, setStatusModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [statusForm, setStatusForm] = useState({ status: '', receiverName: '', notes: '', items: [] });
  const [payForm, setPayForm] = useState({ paymentMode: 'cash', amount: '', transactionId: '', chequeNumber: '', bankName: '', cashDenominations: {} });
  const [proofFile, setProofFile] = useState(null);

  const fetchLog = async () => {
    try { const r = await deliveryAPI.getOne(id); setLog(r.data.data); }
    catch { toast.error('Failed to load delivery'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLog(); }, [id]);

  const openStatusModal = () => {
    setStatusForm({
      status: log.status === 'pending' ? 'in_transit' : 'delivered',
      receiverName: '', notes: '',
      items: log.items?.map(i => ({ ...i, deliveredQty: i.orderedQty })) || [],
    });
    setStatusModal(true);
  };

  const handleStatusUpdate = async () => {
    if (!statusForm.status) return toast.error('Select a status');
    setSaving(true);
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation?.getCurrentPosition(res, rej, { timeout: 5000 })).catch(() => null);
      await deliveryAPI.updateStatus(id, {
        ...statusForm,
        latitude: pos?.coords?.latitude,
        longitude: pos?.coords?.longitude,
      });
      if (proofFile) {
        const fd = new FormData(); fd.append('proof', proofFile);
        await deliveryAPI.uploadProof(id, fd);
      }
      toast.success('Status updated!'); setStatusModal(false); fetchLog();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handlePayment = async () => {
    if (!payForm.amount || Number(payForm.amount) <= 0) return toast.error('Enter valid amount');
    setSaving(true);
    try {
      await paymentsAPI.create({
        store: log.store?._id,
        invoice: log.payment?.invoice,
        amount: Number(payForm.amount),
        paymentMode: payForm.paymentMode,
        transactionId: payForm.transactionId,
        chequeNumber: payForm.chequeNumber,
        bankName: payForm.bankName,
        cashDenominations: payForm.cashDenominations,
      });
      toast.success('Payment recorded!'); setPaymentModal(false); fetchLog();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!log) return <div style={{ padding: 20, textAlign: 'center' }}>Delivery not found</div>;

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', marginBottom: 16, padding: 0 }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', marginBottom: 16, border: '1px solid var(--gray-200)' }}>
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', padding: '20px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ color: 'white', fontSize: '1.1rem', fontFamily: 'Space Grotesk', marginBottom: 4 }}>{log.store?.name}</h2>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={12} />{log.store?.address?.street}, {log.store?.address?.city}
              </div>
            </div>
            <StatusBadge status={log.status} />
          </div>
          <a href={`tel:${log.store?.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', marginTop: 10, textDecoration: 'none' }}>
            <Phone size={13} />{log.store?.phone}
          </a>
        </div>

        <div style={{ padding: 16 }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: 10 }}>Order Items</h3>
          {log.items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{item.product?.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{item.product?.sku}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.deliveredQty} / {item.orderedQty}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>delivered/ordered</div>
              </div>
            </div>
          ))}
        </div>

        {log.proofOfDelivery && (
          <div style={{ padding: '0 16px 16px' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: 8 }}>Proof of Delivery</p>
            <img src={log.proofOfDelivery} alt="Proof" style={{ width: '100%', borderRadius: 8, maxHeight: 200, objectFit: 'cover' }} />
          </div>
        )}
      </div>

      {/* Actions */}
      {log.status !== 'delivered' && log.status !== 'failed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-primary btn-lg" style={{ justifyContent: 'center', borderRadius: 12 }} onClick={openStatusModal}>
            <CheckCircle size={18} />Update Delivery Status
          </button>
          <button className="btn btn-secondary btn-lg" style={{ justifyContent: 'center', borderRadius: 12 }} onClick={() => setPaymentModal(true)}>
            <CreditCard size={18} />Record Payment
          </button>
        </div>
      )}

      {/* Status Update Modal */}
      <Modal open={statusModal} onClose={() => setStatusModal(false)} title="Update Delivery Status"
        footer={<><button className="btn btn-secondary" onClick={() => setStatusModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleStatusUpdate} disabled={saving}>{saving ? 'Updating...' : 'Update'}</button></>}>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-control form-select" value={statusForm.status} onChange={e => setStatusForm(f => ({ ...f, status: e.target.value }))}>
            <option value="in_transit">In Transit</option>
            <option value="arrived">Arrived at Store</option>
            <option value="delivered">Delivered ✓</option>
            <option value="partial">Partial Delivery</option>
            <option value="failed">Delivery Failed</option>
          </select>
        </div>

        {(statusForm.status === 'delivered' || statusForm.status === 'partial') && (
          <div>
            <div className="form-group">
              <label className="form-label">Receiver Name</label>
              <input className="form-control" value={statusForm.receiverName} onChange={e => setStatusForm(f => ({ ...f, receiverName: e.target.value }))} placeholder="Name of person who received" />
            </div>
            <div className="form-group">
              <label className="form-label">Delivered Quantities</label>
              {statusForm.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <span style={{ fontSize: '0.875rem' }}>{item.product?.name} (max: {item.orderedQty})</span>
                  <input type="number" min="0" max={item.orderedQty} value={item.deliveredQty} onChange={e => {
                    const items = [...statusForm.items]; items[i] = { ...items[i], deliveredQty: Number(e.target.value) };
                    setStatusForm(f => ({ ...f, items }));
                  }} style={{ width: 60, padding: '4px 8px', border: '1px solid var(--gray-300)', borderRadius: 6, textAlign: 'center' }} />
                </div>
              ))}
            </div>
            <div className="form-group">
              <label className="form-label">Proof of Delivery Photo</label>
              <div style={{ border: '2px dashed var(--gray-300)', borderRadius: 10, padding: 20, textAlign: 'center', cursor: 'pointer', background: proofFile ? '#f0fdf4' : 'var(--gray-50)' }}
                onClick={() => document.getElementById('proof-upload').click()}>
                <Camera size={28} color="var(--gray-400)" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{proofFile ? proofFile.name : 'Tap to take photo or upload'}</p>
                <input id="proof-upload" type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => setProofFile(e.target.files[0])} />
              </div>
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-control" rows={2} value={statusForm.notes} onChange={e => setStatusForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal open={paymentModal} onClose={() => setPaymentModal(false)} title="Record Payment"
        footer={<><button className="btn btn-secondary" onClick={() => setPaymentModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handlePayment} disabled={saving}>{saving ? 'Saving...' : 'Save Payment'}</button></>}>
        <div className="form-group">
          <label className="form-label">Payment Mode</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['cash', 'online', 'cheque'].map(m => (
              <button key={m} onClick={() => setPayForm(f => ({ ...f, paymentMode: m }))} className={`btn ${payForm.paymentMode === m ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, justifyContent: 'center', textTransform: 'capitalize' }}>{m}</button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Amount (₹) *</label>
          <input className="form-control" type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} placeholder="Enter amount collected" style={{ fontSize: '1.2rem', fontWeight: 600 }} />
        </div>

        {payForm.paymentMode === 'cash' && (
          <div className="form-group">
            <label className="form-label">Cash Denominations (optional)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {DENOMS.map(d => (
                <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 40, fontSize: '0.8rem', fontWeight: 600 }}>₹{d}</span>
                  <input type="number" min="0" className="form-control" value={payForm.cashDenominations[d] || ''} onChange={e => setPayForm(f => ({ ...f, cashDenominations: { ...f.cashDenominations, [d]: Number(e.target.value) } }))} placeholder="0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {payForm.paymentMode === 'online' && (
          <div className="form-group">
            <label className="form-label">Transaction ID</label>
            <input className="form-control" value={payForm.transactionId} onChange={e => setPayForm(f => ({ ...f, transactionId: e.target.value }))} placeholder="UTR / Reference number" />
          </div>
        )}

        {payForm.paymentMode === 'cheque' && (
          <div>
            <div className="form-group"><label className="form-label">Cheque Number</label><input className="form-control" value={payForm.chequeNumber} onChange={e => setPayForm(f => ({ ...f, chequeNumber: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Bank Name</label><input className="form-control" value={payForm.bankName} onChange={e => setPayForm(f => ({ ...f, bankName: e.target.value }))} /></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
