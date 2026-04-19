import React, { useState, useEffect } from 'react';
import { attendanceAPI } from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import toast from 'react-hot-toast';
import { MapPin, Clock, CheckCircle, LogOut, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function StaffAttendance() {
  const [todayRecord, setTodayRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const fetchData = async () => {
    try {
      const [today, hist] = await Promise.all([
        attendanceAPI.getTodayStatus(),
        attendanceAPI.getMyAttendance({ month: new Date().getMonth() + 1, year: new Date().getFullYear() }),
      ]);
      setTodayRecord(today.data.data);
      setHistory(hist.data.data);
    } catch { toast.error('Failed to load attendance'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const getLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setLocating(false); resolve(pos.coords); },
      err => { setLocating(false); reject(err); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const coords = await getLocation();
      // Reverse geocode using free nominatim API
      let address = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`);
        const data = await res.json();
        address = data.display_name?.split(',').slice(0, 3).join(', ') || address;
      } catch {}

      await attendanceAPI.checkIn({ latitude: coords.latitude, longitude: coords.longitude, address });
      toast.success('Checked in successfully!');
      fetchData();
    } catch (e) {
      if (e.code === 1) toast.error('Location permission denied. Please enable GPS.');
      else toast.error(e.response?.data?.message || 'Check-in failed');
    } finally { setActionLoading(false); }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const coords = await getLocation();
      let address = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`);
        const data = await res.json();
        address = data.display_name?.split(',').slice(0, 3).join(', ') || address;
      } catch {}

      await attendanceAPI.checkOut({ latitude: coords.latitude, longitude: coords.longitude, address });
      toast.success('Checked out successfully!');
      fetchData();
    } catch (e) {
      if (e.code === 1) toast.error('Location permission denied. Please enable GPS.');
      else toast.error(e.response?.data?.message || 'Check-out failed');
    } finally { setActionLoading(false); }
  };

  const checkedIn = !!todayRecord?.checkIn?.time;
  const checkedOut = !!todayRecord?.checkOut?.time;
  const isDisabled = actionLoading || locating;

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>Attendance</h1>
      <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: 20 }}>{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>

      {/* Today Card */}
      <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', marginBottom: 20, border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow)' }}>
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', padding: '20px 20px 24px' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', marginBottom: 4 }}>TODAY'S STATUS</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: checkedIn ? '#10b981' : 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.3s' }}>
              {checkedIn ? <CheckCircle size={22} color="white" /> : <Clock size={22} color="white" />}
            </div>
            <div>
              <p style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>
                {checkedOut ? 'Day Complete' : checkedIn ? 'Currently Working' : 'Not Checked In'}
              </p>
              {checkedIn && !checkedOut && (
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem' }}>
                  Since {format(new Date(todayRecord.checkIn.time), 'hh:mm a')}
                </p>
              )}
              {checkedOut && (
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem' }}>
                  {todayRecord.hoursWorked}h worked today
                </p>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {/* Check In/Out Times */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div style={{ background: 'var(--gray-50)', borderRadius: 10, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <CheckCircle size={14} color={checkedIn ? 'var(--success)' : 'var(--gray-400)'} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)' }}>CHECK IN</span>
              </div>
              <p style={{ fontWeight: 700, fontSize: '1.1rem', color: checkedIn ? 'var(--success)' : 'var(--gray-300)' }}>
                {checkedIn ? format(new Date(todayRecord.checkIn.time), 'hh:mm a') : '--:--'}
              </p>
              {todayRecord?.checkIn?.address && (
                <p style={{ fontSize: '0.65rem', color: 'var(--gray-400)', marginTop: 4, display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                  <MapPin size={10} style={{ flexShrink: 0, marginTop: 1 }} />
                  {todayRecord.checkIn.address.substring(0, 40)}...
                </p>
              )}
            </div>
            <div style={{ background: 'var(--gray-50)', borderRadius: 10, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <LogOut size={14} color={checkedOut ? 'var(--danger)' : 'var(--gray-400)'} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)' }}>CHECK OUT</span>
              </div>
              <p style={{ fontWeight: 700, fontSize: '1.1rem', color: checkedOut ? 'var(--danger)' : 'var(--gray-300)' }}>
                {checkedOut ? format(new Date(todayRecord.checkOut.time), 'hh:mm a') : '--:--'}
              </p>
            </div>
          </div>

          {/* Action Button */}
          {!checkedIn ? (
            <button
              className="btn btn-success btn-lg"
              style={{ width: '100%', justifyContent: 'center', borderRadius: 12, fontSize: '1rem' }}
              onClick={handleCheckIn}
              disabled={isDisabled}
            >
              {locating ? (
                <><span style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Getting Location...</>
              ) : actionLoading ? 'Checking In...' : (
                <><MapPin size={18} /> Check In Now</>
              )}
            </button>
          ) : !checkedOut ? (
            <button
              className="btn btn-danger btn-lg"
              style={{ width: '100%', justifyContent: 'center', borderRadius: 12, fontSize: '1rem' }}
              onClick={handleCheckOut}
              disabled={isDisabled}
            >
              {locating ? (
                <><span style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Getting Location...</>
              ) : actionLoading ? 'Checking Out...' : (
                <><LogOut size={18} /> Check Out</>
              )}
            </button>
          ) : (
            <div style={{ textAlign: 'center', padding: '10px 0', color: 'var(--gray-500)', fontSize: '0.875rem' }}>
              ✅ Attendance complete for today
            </div>
          )}

          <p style={{ fontSize: '0.7rem', color: 'var(--gray-400)', textAlign: 'center', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <MapPin size={10} /> Your current location will be recorded
          </p>
        </div>
      </div>

      {/* History */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid var(--gray-200)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={16} color="var(--primary)" />
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>This Month's History</span>
        </div>
        {history.length === 0 ? (
          <div className="empty-state"><p className="empty-state-text">No records this month</p></div>
        ) : history.map((rec, i) => (
          <div key={rec._id} style={{ padding: '12px 16px', borderBottom: i < history.length - 1 ? '1px solid var(--gray-100)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: rec.status === 'present' ? '#f0fdf4' : rec.status === 'absent' ? '#fef2f2' : '#fffbeb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-700)' }}>{format(new Date(rec.date), 'dd')}</span>
              <span style={{ fontSize: '0.6rem', color: 'var(--gray-400)' }}>{format(new Date(rec.date), 'EEE')}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <StatusBadge status={rec.status} />
                {rec.hoursWorked > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{rec.hoursWorked}h</span>}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>
                {rec.checkIn?.time ? format(new Date(rec.checkIn.time), 'hh:mm a') : '—'} → {rec.checkOut?.time ? format(new Date(rec.checkOut.time), 'hh:mm a') : '—'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
