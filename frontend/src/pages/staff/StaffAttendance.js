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
        attendanceAPI.getMyAttendance({
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        }),
      ]);
      setTodayRecord(today.data.data);
      setHistory(hist.data.data);
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
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

      let address = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`
        );
        const data = await res.json();
        address = data.display_name?.split(',').slice(0, 3).join(', ') || address;
      } catch {}

      await attendanceAPI.checkIn({
        latitude: coords.latitude,
        longitude: coords.longitude,
        address
      });

      toast.success('Request sent for approval');
      fetchData();

    } catch (e) {
      if (e.code === 1) toast.error('Location permission denied');
      else toast.error(e.response?.data?.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const coords = await getLocation();

      let address = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`
        );
        const data = await res.json();
        address = data.display_name?.split(',').slice(0, 3).join(', ') || address;
      } catch {}

      await attendanceAPI.checkOut({
        latitude: coords.latitude,
        longitude: coords.longitude,
        address
      });

      toast.success('Checkout request sent');
      fetchData();

    } catch (e) {
      if (e.code === 1) toast.error('Location permission denied');
      else toast.error(e.response?.data?.message || 'Check-out failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ STATUS LOGIC
  const approvalStatus = todayRecord?.approvalStatus;
  const isPending = approvalStatus === 'pending';
  const isRejected = approvalStatus === 'rejected';
  const isApproved = approvalStatus === 'approved';

  const checkedIn = !!todayRecord?.checkIn?.time;
  const checkedOut = !!todayRecord?.checkOut?.time;

  const isDisabled = actionLoading || locating || isPending;

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>
        Attendance
      </h1>

      <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: 20 }}>
        {format(new Date(), 'EEEE, dd MMMM yyyy')}
      </p>

      {/* TODAY CARD */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
        border: '1px solid var(--gray-200)',
        boxShadow: 'var(--shadow)'
      }}>
        {/* HEADER */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
          padding: '20px 20px 24px'
        }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
            TODAY'S STATUS
          </p>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background:
                isPending ? '#f59e0b' :
                isRejected ? '#ef4444' :
                checkedIn ? '#10b981' :
                'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {checkedIn ? <CheckCircle size={22} color="white" /> : <Clock size={22} color="white" />}
            </div>

            <div>
              <p style={{ color: 'white', fontWeight: 700 }}>
                {
                  isPending ? 'Waiting for Approval' :
                  isRejected ? 'Rejected' :
                  isApproved && checkedOut ? 'Day Complete' :
                  isApproved && checkedIn ? 'Currently Working' :
                  'Not Checked In'
                }
              </p>

              {isPending && <p style={{ color: '#fde68a' }}>Waiting for admin approval</p>}
              {isRejected && <p style={{ color: '#fecaca' }}>Request rejected</p>}
            </div>
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: 20 }}>
          {/* TIMES */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <p>Check In</p>
              <p>{checkedIn ? format(new Date(todayRecord.checkIn.time), 'hh:mm a') : '--'}</p>

              {/* 📍 LOCATION FIX */}
              {todayRecord?.checkIn?.address && (
                <p style={{ fontSize: 10, color: 'gray' }}>
                  <MapPin size={10} /> {todayRecord.checkIn.address}
                </p>
              )}
            </div>

            <div>
              <p>Check Out</p>
              <p>{checkedOut ? format(new Date(todayRecord.checkOut.time), 'hh:mm a') : '--'}</p>
            </div>
          </div>

          {/* BUTTON */}
          <div style={{ marginTop: 20 }}>
            {!checkedIn ? (
              <button className="btn btn-success btn-lg" onClick={handleCheckIn} disabled={isDisabled}>
                {locating ? 'Getting Location...' : 'Check In'}
              </button>
            ) : !checkedOut ? (
              <button className="btn btn-danger btn-lg" onClick={handleCheckOut} disabled={isDisabled}>
                {locating ? 'Getting Location...' : 'Check Out'}
              </button>
            ) : (
              <p>Attendance complete</p>
            )}
          </div>
        </div>
      </div>

      {/* HISTORY */}
      <div>
        <h3>This Month's History</h3>

        {history.map(rec => (
          <div key={rec._id} style={{ padding: 10, borderBottom: '1px solid #eee' }}>
            <p>{format(new Date(rec.date), 'dd MMM')}</p>

            <StatusBadge status={rec.approvalStatus} />

            <p>
              {rec.checkIn?.time ? format(new Date(rec.checkIn.time), 'hh:mm a') : '--'}
              {' → '}
              {rec.checkOut?.time ? format(new Date(rec.checkOut.time), 'hh:mm a') : '--'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}