import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { deliveryAPI, paymentsAPI, ordersAPI } from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Camera, CreditCard, CheckCircle, MapPin, Phone,
  Banknote, Smartphone, FileCheck, QrCode, Package,
  AlertTriangle, Check, X, ScanLine, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

const DENOMS = ['2000', '500', '200', '100', '50', '20', '10'];

// ─────────────────────────────────────────────────────────────────
// QR SCANNER MODAL (Online Payment)
// ─────────────────────────────────────────────────────────────────
function QRScannerModal({ amount, store, onConfirm, onClose }) {
  const [txnId, setTxnId] = useState('');
  const [upiId, setUpiId] = useState('');
  const [step, setStep] = useState('scan'); // scan | confirm

  // Generate UPI deep link (works on mobile)
  const upiString = `upi://pay?pa=distributeiq@upi&pn=DistributeIQ&am=${amount}&cu=INR&tn=Order+Payment+${store?.name}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiString)}`;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', fontFamily: 'Space Grotesk' }}>Online Payment</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: 2 }}>{store?.name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--gray-100)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>

        {step === 'scan' ? (
          <>
            {/* Amount */}
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', borderRadius: 16, padding: '16px 20px', marginBottom: 20, textAlign: 'center', color: 'white' }}>
              <p style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: 4 }}>Amount to Collect</p>
              <p style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'Space Grotesk' }}>₹{Number(amount).toLocaleString()}</p>
            </div>

            {/* QR Code */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
                <QrCode size={16} color="var(--primary)" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)' }}>Show this QR to the store owner</span>
              </div>
              <div style={{ background: 'white', border: '3px solid var(--primary)', borderRadius: 16, padding: 12, display: 'inline-block', boxShadow: '0 4px 20px rgba(37,99,235,0.2)' }}>
                <img src={qrUrl} alt="UPI QR" width={200} height={200} style={{ display: 'block' }} onError={e => e.target.style.display='none'} />
                <div style={{ marginTop: 8, fontSize: '0.7rem', color: 'var(--gray-500)' }}>Scan with any UPI app</div>
              </div>

              {/* Mobile UPI button */}
              <div style={{ marginTop: 12 }}>
                <a href={upiString} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f0fdf4', color: '#16a34a', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', border: '1px solid #86efac' }}>
                  <Smartphone size={16} /> Open UPI App
                </a>
              </div>
            </div>

            <button
              onClick={() => setStep('confirm')}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center', borderRadius: 12 }}
            >
              <Check size={18} /> Payment Done — Enter Transaction ID
            </button>
          </>
        ) : (
          <>
            <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', gap: 12 }}>
              <CheckCircle size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#166534' }}>Payment Received?</p>
                <p style={{ fontSize: '0.78rem', color: '#4ade80', marginTop: 2 }}>Enter the transaction details below to confirm</p>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Transaction / UTR ID *</label>
              <input
                className="form-control"
                value={txnId}
                onChange={e => setTxnId(e.target.value)}
                placeholder="e.g. 402938475610"
                style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '0.05em' }}
                autoFocus
              />
              <p style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 4 }}>Find this in the payment notification or UPI app</p>
            </div>

            <div className="form-group">
              <label className="form-label">Store's UPI ID (optional)</label>
              <input
                className="form-control"
                value={upiId}
                onChange={e => setUpiId(e.target.value)}
                placeholder="e.g. storename@okicici"
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep('scan')} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', borderRadius: 10 }}>
                Back to QR
              </button>
              <button
                onClick={() => { if (!txnId.trim()) return toast.error('Enter transaction ID'); onConfirm({ transactionId: txnId, upiId }); }}
                className="btn btn-success"
                style={{ flex: 2, justifyContent: 'center', borderRadius: 10 }}
              >
                <CheckCircle size={16} /> Confirm ₹{Number(amount).toLocaleString()}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// CASH MODAL — denomination entry
// ─────────────────────────────────────────────────────────────────
function CashModal({ amount, store, onConfirm, onClose }) {
  const [denoms, setDenoms] = useState({});

  const total = DENOMS.reduce((s, d) => s + (Number(denoms[d] || 0) * Number(d)), 0);
  const diff = total - Number(amount);

  const updateDenom = (d, val) => setDenoms(prev => ({ ...prev, [d]: val === '' ? '' : Number(val) }));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, padding: 24, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', fontFamily: 'Space Grotesk' }}>Cash Collection</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: 2 }}>{store?.name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--gray-100)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>

        {/* Expected amount */}
        <div style={{ background: 'linear-gradient(135deg, #065f46, #16a34a)', borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
          <div>
            <p style={{ fontSize: '0.7rem', opacity: 0.8 }}>EXPECTED AMOUNT</p>
            <p style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'Space Grotesk' }}>₹{Number(amount).toLocaleString()}</p>
          </div>
          <Banknote size={36} style={{ opacity: 0.5 }} />
        </div>

        {/* Denomination grid */}
        <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: 10 }}>Enter note count for each denomination:</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {DENOMS.map(d => {
            const count = Number(denoms[d] || 0);
            const subtotal = count * Number(d);
            return (
              <div key={d} style={{ background: count > 0 ? '#f0fdf4' : 'var(--gray-50)', border: `1.5px solid ${count > 0 ? '#86efac' : 'var(--gray-200)'}`, borderRadius: 10, padding: '10px 12px', transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gray-700)' }}>₹{d}</span>
                  {subtotal > 0 && <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>= ₹{subtotal.toLocaleString()}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => updateDenom(d, Math.max(0, count - 1))} style={{ width: 28, height: 28, border: '1px solid var(--gray-200)', borderRadius: 6, background: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <input
                    type="number" min="0"
                    value={denoms[d] || ''}
                    onChange={e => updateDenom(d, e.target.value)}
                    placeholder="0"
                    style={{ flex: 1, border: '1px solid var(--gray-200)', borderRadius: 6, padding: '4px 6px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 700, background: 'white', outline: 'none' }}
                  />
                  <button onClick={() => updateDenom(d, count + 1)} style={{ width: 28, height: 28, border: '1px solid var(--gray-200)', borderRadius: 6, background: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Running total */}
        <div style={{ background: diff === 0 ? '#f0fdf4' : diff > 0 ? '#fffbeb' : '#fef2f2', border: `1px solid ${diff === 0 ? '#86efac' : diff > 0 ? '#fcd34d' : '#fca5a5'}`, borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>Cash counted</span>
            <strong style={{ fontSize: '0.9rem' }}>₹{total.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>{diff === 0 ? '✅ Exact amount' : diff > 0 ? `⚠️ Excess (change: ₹${diff})` : `⚠️ Short by ₹${Math.abs(diff)}`}</span>
            <strong style={{ fontSize: '0.9rem', color: diff === 0 ? '#16a34a' : diff > 0 ? '#d97706' : '#dc2626' }}>
              {diff === 0 ? 'Perfect' : diff > 0 ? `+₹${diff}` : `-₹${Math.abs(diff)}`}
            </strong>
          </div>
        </div>

        <button
          onClick={() => { if (total <= 0) return toast.error('Enter cash denominations'); onConfirm({ cashDenominations: denoms, collectedAmount: total }); }}
          className="btn btn-success btn-lg"
          style={{ width: '100%', justifyContent: 'center', borderRadius: 12 }}
        >
          <CheckCircle size={18} /> Confirm ₹{total.toLocaleString()} Cash Collected
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// CHEQUE MODAL — camera capture + details
// ─────────────────────────────────────────────────────────────────
function ChequeModal({ amount, store, onConfirm, onClose }) {
  const [chequeData, setChequeData] = useState({ chequeNumber: '', bankName: '', chequeDate: '', photo: null, photoPreview: null });
  const [cameraMode, setCameraMode] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraMode(true);
    } catch { toast.error('Camera access denied'); }
  };

  const capturePhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    canvas.toBlob(blob => {
      const file = new File([blob], 'cheque.jpg', { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      setChequeData(d => ({ ...d, photo: file, photoPreview: url }));
      stopCamera();
      toast.success('Cheque photo captured!');
    }, 'image/jpeg', 0.9);
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setCameraMode(false);
  };

  useEffect(() => () => streamRef.current?.getTracks().forEach(t => t.stop()), []);

  const handleConfirm = () => {
    if (!chequeData.chequeNumber.trim()) return toast.error('Enter cheque number');
    onConfirm(chequeData);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, padding: 24, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', fontFamily: 'Space Grotesk' }}>Cheque Collection</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>₹{Number(amount).toLocaleString()} · {store?.name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--gray-100)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>

        {/* Camera view */}
        {cameraMode ? (
          <div style={{ marginBottom: 16 }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: 12, background: '#000', maxHeight: 250, objectFit: 'cover' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button onClick={stopCamera} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', borderRadius: 10 }}><X size={16} /> Cancel</button>
              <button onClick={capturePhoto} className="btn btn-primary" style={{ flex: 2, justifyContent: 'center', borderRadius: 10, background: '#dc2626' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#dc2626' }} />
                </div>
                Capture
              </button>
            </div>
          </div>
        ) : (
          /* Cheque photo area */
          <div
            onClick={() => !chequeData.photoPreview && startCamera()}
            style={{ border: `2px dashed ${chequeData.photoPreview ? 'transparent' : 'var(--gray-300)'}`, borderRadius: 12, marginBottom: 16, overflow: 'hidden', cursor: chequeData.photoPreview ? 'default' : 'pointer', minHeight: 140 }}
          >
            {chequeData.photoPreview ? (
              <div style={{ position: 'relative' }}>
                <img src={chequeData.photoPreview} alt="Cheque" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }} />
                <button
                  onClick={e => { e.stopPropagation(); setChequeData(d => ({ ...d, photo: null, photoPreview: null })); startCamera(); }}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <RefreshCw size={14} />
                </button>
                <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.6)', color: 'white', borderRadius: 6, padding: '3px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={10} /> Cheque captured
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={24} color="#d97706" />
                </div>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-700)' }}>Take Cheque Photo</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textAlign: 'center' }}>Tap to open camera and capture the cheque</p>
                <button onClick={e => { e.stopPropagation(); startCamera(); }} className="btn btn-secondary btn-sm" style={{ borderRadius: 8 }}>
                  <Camera size={14} /> Open Camera
                </button>
              </div>
            )}
          </div>
        )}

        {/* Cheque details */}
        <div className="form-group">
          <label className="form-label">Cheque Number *</label>
          <input className="form-control" value={chequeData.chequeNumber} onChange={e => setChequeData(d => ({ ...d, chequeNumber: e.target.value }))} placeholder="e.g. 000123" style={{ fontWeight: 600, letterSpacing: '0.1em' }} />
        </div>
        <div className="form-group">
          <label className="form-label">Bank Name</label>
          <input className="form-control" value={chequeData.bankName} onChange={e => setChequeData(d => ({ ...d, bankName: e.target.value }))} placeholder="e.g. State Bank of India" />
        </div>
        <div className="form-group">
          <label className="form-label">Cheque Date</label>
          <input className="form-control" type="date" value={chequeData.chequeDate} onChange={e => setChequeData(d => ({ ...d, chequeDate: e.target.value }))} />
        </div>

        <button onClick={handleConfirm} className="btn btn-warning btn-lg" style={{ width: '100%', justifyContent: 'center', borderRadius: 12, background: '#d97706', color: 'white', border: 'none' }}>
          <FileCheck size={18} /> Confirm Cheque Collected
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// DELIVERY COMPLETION MODAL
// ─────────────────────────────────────────────────────────────────
function DeliveryCompleteModal({ log, onConfirm, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [proofPhoto, setProofPhoto] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [receiverName, setReceiverName] = useState('');
  const [items, setItems] = useState(log?.items?.map(i => ({ ...i, deliveredQty: i.deliveredQty || i.orderedQty })) || []);
  const [saving, setSaving] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch { toast.error('Camera denied — you can skip the photo'); }
  };

  const captureProof = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    canvas.toBlob(blob => {
      setProofPhoto(new File([blob], 'proof.jpg', { type: 'image/jpeg' }));
      setProofPreview(URL.createObjectURL(blob));
      streamRef.current?.getTracks().forEach(t => t.stop());
      setCameraActive(false);
      toast.success('Proof photo captured!');
    }, 'image/jpeg', 0.85);
  };

  useEffect(() => () => streamRef.current?.getTracks().forEach(t => t.stop()), []);

  const handleConfirm = () => onConfirm({ items, receiverName, proofPhoto });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, padding: 24, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: '1.1rem', fontFamily: 'Space Grotesk' }}>Mark Delivery Complete</h3>
          <button onClick={onClose} style={{ background: 'var(--gray-100)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
        </div>

        {/* Items */}
        <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: 8 }}>Delivered Quantities</p>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.product?.name}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>Ordered: {item.orderedQty}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setItems(it => it.map((x, idx) => idx === i ? { ...x, deliveredQty: Math.max(0, x.deliveredQty - 1) } : x))} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--gray-200)', background: 'var(--gray-50)', cursor: 'pointer', fontWeight: 700 }}>−</button>
              <input type="number" min="0" max={item.orderedQty} value={item.deliveredQty} onChange={e => setItems(it => it.map((x, idx) => idx === i ? { ...x, deliveredQty: Number(e.target.value) } : x))}
                style={{ width: 48, textAlign: 'center', border: '1px solid var(--gray-300)', borderRadius: 8, padding: '4px', fontWeight: 700, fontSize: '0.9rem' }} />
              <button onClick={() => setItems(it => it.map((x, idx) => idx === i ? { ...x, deliveredQty: Math.min(x.orderedQty, x.deliveredQty + 1) } : x))} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--gray-200)', background: 'var(--gray-50)', cursor: 'pointer', fontWeight: 700 }}>+</button>
            </div>
          </div>
        ))}

        {/* Receiver */}
        <div className="form-group" style={{ marginTop: 16 }}>
          <label className="form-label">Receiver's Name</label>
          <input className="form-control" value={receiverName} onChange={e => setReceiverName(e.target.value)} placeholder="Name of person who received the goods" />
        </div>

        {/* Proof photo */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: 8 }}>Proof of Delivery Photo</p>
          {cameraActive ? (
            <div>
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: 10, background: '#000', maxHeight: 220, objectFit: 'cover' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); setCameraActive(false); }} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', borderRadius: 8 }}><X size={14} /> Cancel</button>
                <button onClick={captureProof} className="btn" style={{ flex: 2, justifyContent: 'center', borderRadius: 8, background: '#dc2626', color: 'white', border: 'none' }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626' }} /></div>
                  Capture
                </button>
              </div>
            </div>
          ) : proofPreview ? (
            <div style={{ position: 'relative' }}>
              <img src={proofPreview} alt="Proof" style={{ width: '100%', borderRadius: 10, maxHeight: 180, objectFit: 'cover' }} />
              <button onClick={() => { setProofPhoto(null); setProofPreview(null); startCamera(); }} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={13} /></button>
            </div>
          ) : (
            <button onClick={startCamera} style={{ width: '100%', border: '2px dashed var(--gray-300)', borderRadius: 10, padding: '18px', background: 'var(--gray-50)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <Camera size={24} color="var(--gray-400)" />
              <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Take proof of delivery photo (optional)</span>
            </button>
          )}
        </div>

        <button onClick={handleConfirm} disabled={saving} className="btn btn-success btn-lg" style={{ width: '100%', justifyContent: 'center', borderRadius: 12 }}>
          <CheckCircle size={18} /> Mark as Delivered
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN DELIVERY DETAIL PAGE
// ─────────────────────────────────────────────────────────────────
export default function DeliveryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'cash' | 'online' | 'cheque' | 'complete'
  const [saving, setSaving] = useState(false);

 const fetchLog = async () => {
  if (!id || id === "undefined") return;

  try {
    const r = await deliveryAPI.getOne(id);
    setLog(r.data.data);
  } catch {
    toast.error('Failed to load delivery');
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
  if (!id || id === "undefined") {
    toast.error("Invalid delivery ID");
    setLoading(false);
    return;
  }

  fetchLog();
}, [id]);

  // ── Payment handlers ─────────────────────────────────────────
  const handleOnlinePayment = async ({ transactionId, upiId }) => {
    setSaving(true);
    try {
      await paymentsAPI.create({
        store: log.store?._id,
        amount: log.order?.totalAmount || 0,
        paymentMode: 'online',
        transactionId,
        upiId: upiId || undefined,
      });
      // Update delivery log payment status
      await deliveryAPI.updateStatus(id, { status: log.status, paymentCollected: true, paymentMode: 'online' });
      toast.success('Online payment recorded!');
      setModal(null);
      fetchLog();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleCashPayment = async ({ cashDenominations, collectedAmount }) => {
    setSaving(true);
    try {
      await paymentsAPI.create({
        store: log.store?._id,
        amount: collectedAmount,
        paymentMode: 'cash',
        cashDenominations,
      });
      await deliveryAPI.updateStatus(id, { status: log.status, paymentCollected: true, paymentMode: 'cash' });
      toast.success('Cash payment recorded!');
      setModal(null);
      fetchLog();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleChequePayment = async (chequeData) => {
    setSaving(true);
    try {
      // Upload cheque photo if taken
      let chequePhotoUrl = null;
      if (chequeData.photo) {
        const fd = new FormData();
        fd.append('proof', chequeData.photo);
        const res = await deliveryAPI.uploadProof(id, fd);
        chequePhotoUrl = res.data.imageUrl;
      }
      await paymentsAPI.create({
        store: log.store?._id,
        amount: log.order?.totalAmount || 0,
        paymentMode: 'cheque',
        chequeNumber: chequeData.chequeNumber,
        bankName: chequeData.bankName,
        chequeDate: chequeData.chequeDate,
        chequePhotoUrl,
      });
      await deliveryAPI.updateStatus(id, { status: log.status, paymentCollected: true, paymentMode: 'cheque' });
      toast.success('Cheque recorded & photo saved!');
      setModal(null);
      fetchLog();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  // ── Delivery complete handler ────────────────────────────────
  const handleDeliveryComplete = async ({ items, receiverName, proofPhoto }) => {
    setSaving(true);
    try {
      // Get geo location
      const pos = await new Promise((res, rej) => navigator.geolocation?.getCurrentPosition(res, rej, { timeout: 5000 })).catch(() => null);

      // Upload proof photo if taken
      if (proofPhoto) {
        const fd = new FormData();
        fd.append('proof', proofPhoto);
        await deliveryAPI.uploadProof(id, fd);
      }

      // Update delivery status to delivered
      await deliveryAPI.updateStatus(id, {
        status: 'delivered',
        items,
        receiverName,
        latitude: pos?.coords?.latitude,
        longitude: pos?.coords?.longitude,
      });

      // Update the linked order to 'delivered'
      if (log.order?._id) {
        await ordersAPI.update(log.order._id, { status: 'delivered', deliveredAt: new Date() });
      }

      toast.success('🎉 Delivery marked as complete!');
      setModal(null);
      fetchLog();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!log) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--gray-500)' }}>Delivery not found</div>;

  const isCompleted = log.status === 'delivered';
  const hasPayment = !!log.payment;
  const orderTotal = log.order?.totalAmount || 0;

  return (
    <div style={{ padding: 16, paddingBottom: 120 }}>
      {/* Back */}
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', marginBottom: 16, padding: 0 }}>
        <ArrowLeft size={16} /> Back
      </button>

      {/* Store header card */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', borderRadius: 16, padding: 20, marginBottom: 16, color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <p style={{ opacity: 0.7, fontSize: '0.7rem', marginBottom: 4 }}>DELIVERY TO</p>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'Space Grotesk' }}>{log.store?.name}</h2>
            <p style={{ opacity: 0.8, fontSize: '0.78rem', marginTop: 3 }}>{log.store?.ownerName}</p>
          </div>
          <StatusBadge status={log.status} />
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', opacity: 0.8 }}>
          {log.store?.address?.city && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{log.store.address.street}, {log.store.address.city}</span>}
        </div>
        <a href={`tel:${log.store?.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: 8, padding: '6px 12px', fontSize: '0.8rem', textDecoration: 'none' }}>
          <Phone size={13} /> {log.store?.phone}
        </a>
      </div>

      {/* Order Items */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid var(--gray-200)', overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Package size={15} color="var(--primary)" />
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Order Items</span>
          {log.order?.orderNumber && <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>{log.order.orderNumber}</span>}
        </div>
        {log.items?.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', borderBottom: i < log.items.length - 1 ? '1px solid var(--gray-100)' : 'none' }}>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.product?.name}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: 1 }}>{item.product?.sku} · {item.product?.unit}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 700 }}>{item.deliveredQty} / {item.orderedQty}</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--gray-400)' }}>delivered</p>
            </div>
          </div>
        ))}
        <div style={{ padding: '12px 16px', background: '#f9fafb', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Order Total</span>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>₹{orderTotal.toLocaleString()}</span>
        </div>
      </div>

      {/* Proof of Delivery */}
      {log.proofOfDelivery && (
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid var(--gray-200)', overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Camera size={15} color="var(--gray-500)" />
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Proof of Delivery</span>
            <span className="badge badge-green" style={{ marginLeft: 'auto' }}>Captured</span>
          </div>
          <img src={log.proofOfDelivery} alt="Proof" style={{ width: '100%', maxHeight: 200, objectFit: 'cover' }} />
        </div>
      )}

      {/* Payment Status */}
      {hasPayment && (
        <div style={{ background: '#f0fdf4', borderRadius: 14, border: '1px solid #86efac', padding: '14px 16px', marginBottom: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
          <CheckCircle size={22} color="#16a34a" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 700, color: '#166534', fontSize: '0.9rem' }}>Payment Collected</p>
            <p style={{ fontSize: '0.78rem', color: '#4ade80', marginTop: 2, textTransform: 'capitalize' }}>
              ₹{log.payment?.amount?.toLocaleString()} via {log.payment?.paymentMode}
            </p>
          </div>
        </div>
      )}

      {/* Delivery complete status */}
      {isCompleted && (
        <div style={{ background: '#f0fdf4', borderRadius: 14, border: '1px solid #86efac', padding: '14px 16px', marginBottom: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
          <CheckCircle size={22} color="#16a34a" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 700, color: '#166534', fontSize: '0.9rem' }}>Delivery Completed ✅</p>
            {log.receiverName && <p style={{ fontSize: '0.78rem', color: '#166534', marginTop: 2 }}>Received by: {log.receiverName}</p>}
            {log.deliveredAt && <p style={{ fontSize: '0.72rem', color: '#4ade80', marginTop: 2 }}>{format(new Date(log.deliveredAt), 'dd MMM yyyy, hh:mm a')}</p>}
          </div>
        </div>
      )}

      {/* ACTION BUTTONS */}
      {!isCompleted && (
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'white', borderTop: '1px solid var(--gray-200)', padding: '14px 16px', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', zIndex: 50 }}>
          {!hasPayment ? (
            <>
              <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--gray-500)', textAlign: 'center', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Collect Payment — ₹{orderTotal.toLocaleString()}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <button onClick={() => setModal('cash')} style={{ padding: '12px 6px', border: '2px solid #86efac', borderRadius: 12, background: '#f0fdf4', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <Banknote size={22} color="#16a34a" />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a' }}>Cash</span>
                </button>
                <button onClick={() => setModal('online')} style={{ padding: '12px 6px', border: '2px solid #93c5fd', borderRadius: 12, background: '#eff6ff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <QrCode size={22} color="#2563eb" />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb' }}>Online / QR</span>
                </button>
                <button onClick={() => setModal('cheque')} style={{ padding: '12px 6px', border: '2px solid #fcd34d', borderRadius: 12, background: '#fffbeb', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <FileCheck size={22} color="#d97706" />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706' }}>Cheque</span>
                </button>
              </div>
            </>
          ) : (
            <button onClick={() => setModal('complete')} className="btn btn-success btn-lg" style={{ width: '100%', justifyContent: 'center', borderRadius: 12, fontSize: '1rem' }}>
              <CheckCircle size={18} /> Mark Delivery as Complete
            </button>
          )}
        </div>
      )}

      {/* MODALS */}
      {modal === 'online' && <QRScannerModal amount={orderTotal} store={log.store} onConfirm={handleOnlinePayment} onClose={() => setModal(null)} />}
      {modal === 'cash' && <CashModal amount={orderTotal} store={log.store} onConfirm={handleCashPayment} onClose={() => setModal(null)} />}
      {modal === 'cheque' && <ChequeModal amount={orderTotal} store={log.store} onConfirm={handleChequePayment} onClose={() => setModal(null)} />}
      {modal === 'complete' && <DeliveryCompleteModal log={log} onConfirm={handleDeliveryComplete} onClose={() => setModal(null)} />}
    </div>
  );
}