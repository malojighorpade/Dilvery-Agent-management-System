import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Package, Eye, EyeOff, Truck } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill all fields');
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)' }}>
      {/* Left panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px', color: 'white', display: window.innerWidth < 768 ? 'none' : 'flex' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 12 }}>
            <Truck size={32} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'Space Grotesk' }}>DistributeIQ</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>B2B Distribution Management</div>
          </div>
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2, marginBottom: 24, fontFamily: 'Space Grotesk' }}>
          Manage your entire<br />supply chain<br />in one place
        </h1>
        <p style={{ opacity: 0.8, fontSize: '1rem', lineHeight: 1.7, maxWidth: 400 }}>
          From bulk orders and inventory management to last-mile delivery tracking — all the tools your distribution business needs.
        </p>
        <div style={{ marginTop: 48, display: 'flex', gap: 32 }}>
          {[['500+', 'Deliveries/day'], ['99%', 'Uptime'], ['50+', 'Staff managed']].map(([v, l]) => (
            <div key={l}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{v}</div>
              <div style={{ opacity: 0.7, fontSize: '0.875rem' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width: '100%', maxWidth: 480, background: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 40px' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ background: '#eff6ff', borderRadius: 10, padding: 10 }}>
              <Package size={24} color="#2563eb" />
            </div>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', fontFamily: 'Space Grotesk' }}>DistributeIQ</span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', marginBottom: 8, fontFamily: 'Space Grotesk' }}>Sign in to your account</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Enter your credentials to continue</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              className="form-control"
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-control"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                style={{ paddingRight: 40 }}
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div style={{ marginTop: 32, padding: 16, background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, marginBottom: 8 }}>DEMO CREDENTIALS</p>
          <div style={{ fontSize: '0.8125rem', color: '#374151', lineHeight: 1.8 }}>
            <div><strong>Admin:</strong> admin@dms.com / admin123</div>
            <div><strong>Staff:</strong> rahul@dms.com / staff123</div>
          </div>
        </div>
      </div>
    </div>
  );
}
