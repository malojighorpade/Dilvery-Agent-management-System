import React, { useState, useEffect } from 'react';
import { attendanceAPI, usersAPI } from '../../services/api';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import toast from 'react-hot-toast';
import { format, getDaysInMonth, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Users, TrendingUp, Clock, AlertCircle, CheckCircle, XCircle, Activity } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────
// CHARTS & ANALYSIS
// ─────────────────────────────────────────────────────────────────

function AttendanceChart({ records }) {
  // Count days by status
  const summary = {
    present: records.filter(r => r.status === 'present' && r.approvalStatus === 'approved').length,
    absent: records.filter(r => r.status === 'absent').length,
    halfDay: records.filter(r => r.status === 'half-day').length,
    leave: records.filter(r => r.status === 'leave').length,
    pending: records.filter(r => r.approvalStatus === 'pending').length,
  };

  const chartData = [
    { name: 'Present', value: summary.present, color: '#10b981' },
    { name: 'Absent', value: summary.absent, color: '#ef4444' },
    { name: 'Half-Day', value: summary.halfDay, color: '#f59e0b' },
    { name: 'Leave', value: summary.leave, color: '#8b5cf6' },
    { name: 'Pending', value: summary.pending, color: '#6366f1' },
  ];

  return (
    <div style={{ background: 'white', borderRadius: 14, padding: 20, marginBottom: 20, border: '1px solid var(--gray-200)' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>📊 Attendance Summary</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {chartData.map(d => (
          <div key={d.name} style={{ background: d.color + '10', borderRadius: 10, padding: 12, textAlign: 'center', border: `1px solid ${d.color}40` }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>{d.name}</p>
            <p style={{ fontSize: '1.8rem', fontWeight: 800, color: d.color }}>{d.value}</p>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value} days`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// Daily attendance trend
function AttendanceTrend({ records }) {
  const dailyData = {};

  records.forEach(r => {
    const day = format(new Date(r.date), 'dd MMM');
    if (!dailyData[day]) {
      dailyData[day] = { date: day, present: 0, absent: 0, pending: 0 };
    }

    if (r.approvalStatus === 'approved' && r.status === 'present') dailyData[day].present++;
    if (r.status === 'absent') dailyData[day].absent++;
    if (r.approvalStatus === 'pending') dailyData[day].pending++;
  });

  const data = Object.values(dailyData).slice(-15); // Last 15 days

  return (
    <div style={{ background: 'white', borderRadius: 14, padding: 20, marginBottom: 20, border: '1px solid var(--gray-200)' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>📈 Daily Attendance Trend (Last 15 Days)</h3>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
          <XAxis dataKey="date" style={{ fontSize: '0.75rem' }} />
          <YAxis style={{ fontSize: '0.75rem' }} />
          <Tooltip contentStyle={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 8 }} />
          <Legend />
          <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} name="Present" />
          <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} name="Absent" />
          <Line type="monotone" dataKey="pending" stroke="#6366f1" strokeWidth={2} name="Pending" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Staff performance summary
function StaffPerformance({ staffData, allStaff }) {
  const performance = allStaff.map(staff => {
    const staffRecords = staffData.filter(r => r.user?._id === staff._id);
    const approved = staffRecords.filter(r => r.approvalStatus === 'approved');
    const present = approved.filter(r => r.status === 'present').length;
    const absent = approved.filter(r => r.status === 'absent').length;
    const pending = staffRecords.filter(r => r.approvalStatus === 'pending').length;
    const totalDays = approved.length + absent;
    const percentage = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0;
    const avgHours = approved.length > 0 ? (approved.reduce((s, r) => s + (r.hoursWorked || 0), 0) / approved.length).toFixed(1) : 0;

    return {
      name: staff.name,
      present,
      absent,
      pending,
      percentage,
      avgHours,
      totalDays,
    };
  }).filter(s => s.totalDays > 0 || s.pending > 0).sort((a, b) => b.percentage - a.percentage);

  return (
    <div style={{ background: 'white', borderRadius: 14, padding: 20, marginBottom: 20, border: '1px solid var(--gray-200)' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>👥 Staff Performance Analysis</h3>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)' }}>
              <th style={{ padding: 12, textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600)' }}>Staff Name</th>
              <th style={{ padding: 12, textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600)' }}>Present</th>
              <th style={{ padding: 12, textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600)' }}>Absent</th>
              <th style={{ padding: 12, textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600)' }}>Pending</th>
              <th style={{ padding: 12, textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600)' }}>Attendance %</th>
              <th style={{ padding: 12, textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600)' }}>Avg Hours</th>
            </tr>
          </thead>
          <tbody>
            {performance.map((staff, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                <td style={{ padding: 12, fontSize: '0.875rem', fontWeight: 500 }}>{staff.name}</td>
                <td style={{ padding: 12, textAlign: 'center', color: '#10b981', fontWeight: 600 }}>{staff.present}</td>
                <td style={{ padding: 12, textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>{staff.absent}</td>
                <td style={{ padding: 12, textAlign: 'center', color: '#f59e0b', fontWeight: 600 }}>{staff.pending}</td>
                <td style={{ padding: 12, textAlign: 'center' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    justifyContent: 'center',
                  }}>
                    <div style={{
                      width: 60,
                      height: 6,
                      background: 'var(--gray-200)',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${staff.percentage}%`,
                        background: staff.percentage >= 80 ? '#10b981' : staff.percentage >= 60 ? '#f59e0b' : '#ef4444',
                      }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, minWidth: 35 }}>{staff.percentage}%</span>
                  </div>
                </td>
                <td style={{ padding: 12, textAlign: 'center', fontSize: '0.875rem', fontWeight: 600 }}>{staff.avgHours}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

export default function AttendanceAdmin() {
  const [records, setRecords] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('overview'); // 'overview' | 'pending' | 'detailed'

  const [filters, setFilters] = useState({
    userId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await attendanceAPI.getAll(filters);
      setRecords(r.data.data);
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [filters]);
  useEffect(() => {
    usersAPI.getAll({ role: 'delivery agent', limit: 100 }).then(r => setStaff(r.data.data)).catch(() => {});
  }, []);

  // Filter data
  const pending = records.filter(r => r.approvalStatus === 'pending');
  const approved = records.filter(r => r.approvalStatus === 'approved');
  const selectedStaffRecords = filters.userId ? records.filter(r => r.user?._id === filters.userId) : records;

  // Actions
  const approve = async (id) => {
    try {
      await attendanceAPI.approve(id);
      toast.success('✅ Approved');
      fetch();
    } catch {
      toast.error('Failed to approve');
    }
  };

  const reject = async (id) => {
    try {
      await attendanceAPI.reject(id);
      toast.success('❌ Rejected');
      fetch();
    } catch {
      toast.error('Failed to reject');
    }
  };

  // Columns
  const commonColumns = [
    { key: 'user', label: 'Staff', render: r => r.user?.name || '—' },
    { key: 'date', label: 'Date', render: r => format(new Date(r.date), 'EEE, dd MMM yyyy') },
    { key: 'checkIn', label: 'Check In', render: r => r.checkIn?.time ? format(new Date(r.checkIn.time), 'HH:mm') : <span style={{ color: 'var(--gray-400)' }}>—</span> },
    { key: 'checkOut', label: 'Check Out', render: r => r.checkOut?.time ? format(new Date(r.checkOut.time), 'HH:mm') : <span style={{ color: 'var(--gray-400)' }}>—</span> },
    { key: 'hoursWorked', label: 'Hours', render: r => r.hoursWorked ? <strong>{r.hoursWorked}h</strong> : <span style={{ color: 'var(--gray-400)' }}>—</span> },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
  ];

  const pendingColumns = [
    ...commonColumns.slice(0, -1),
    { key: 'approval', label: 'Status', render: r => <span style={{ color: '#f59e0b', fontWeight: 700 }}>⏳ Pending</span> },
    {
      key: 'actions',
      label: 'Actions',
      render: r => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-success btn-sm" onClick={() => approve(r._id)} style={{ borderRadius: 6, fontSize: '0.75rem', padding: '4px 10px' }}>
            ✓ Approve
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => reject(r._id)} style={{ borderRadius: 6, fontSize: '0.75rem', padding: '4px 10px' }}>
            ✗ Reject
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="page-container">

      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">📅 Attendance Management</h1>
          <p className="page-subtitle">Monitor staff attendance, approvals & performance</p>
        </div>
      </div>

      {/* STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 16, border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={24} color="#10b981" />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase' }}>Approved</p>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>{approved.length}</p>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: 16, border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={24} color="#f59e0b" />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase' }}>Pending</p>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b' }}>{pending.length}</p>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: 16, border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <XCircle size={24} color="#ef4444" />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase' }}>Total</p>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444' }}>{records.length}</p>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: 16, border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={24} color="#2563eb" />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase' }}>Staff</p>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563eb' }}>{staff.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div style={{ background: 'white', borderRadius: 14, padding: 16, marginBottom: 20, border: '1px solid var(--gray-200)' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="form-control form-select"
            style={{ width: 200 }}
            value={filters.userId}
            onChange={e => setFilters(f => ({ ...f, userId: e.target.value }))}
          >
            <option value="">📌 All Staff</option>
            {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>

          <select
            className="form-control form-select"
            style={{ width: 140 }}
            value={filters.month}
            onChange={e => setFilters(f => ({ ...f, month: parseInt(e.target.value) }))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i+1} value={i+1}>
                {new Date(0, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>

          <input
            type="number"
            className="form-control"
            style={{ width: 100 }}
            value={filters.year}
            onChange={e => setFilters(f => ({ ...f, year: parseInt(e.target.value) }))}
            min={2020}
            max={new Date().getFullYear()}
          />

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              onClick={() => setView('overview')}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: view === 'overview' ? 'var(--primary)' : 'var(--gray-100)',
                color: view === 'overview' ? 'white' : 'var(--gray-700)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setView('pending')}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: view === 'pending' ? 'var(--primary)' : 'var(--gray-100)',
                color: view === 'pending' ? 'white' : 'var(--gray-700)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              ⏳ Pending ({pending.length})
            </button>
            <button
              onClick={() => setView('detailed')}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: view === 'detailed' ? 'var(--primary)' : 'var(--gray-100)',
                color: view === 'detailed' ? 'white' : 'var(--gray-700)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              📋 Detailed
            </button>
          </div>
        </div>
      </div>

      {/* OVERVIEW VIEW */}
      {view === 'overview' && (
        <>
          <AttendanceChart records={selectedStaffRecords} />
          <AttendanceTrend records={selectedStaffRecords} />
          <StaffPerformance staffData={records} allStaff={staff} />
        </>
      )}

      {/* PENDING VIEW */}
      {view === 'pending' && (
        <div style={{ background: 'white', borderRadius: 14, padding: 20, border: '1px solid var(--gray-200)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: '#f59e0b' }}>⏳ Pending Approval Requests ({pending.length})</h3>
          <DataTable
            columns={pendingColumns}
            data={pending}
            loading={loading}
            emptyText="No pending requests"
          />
        </div>
      )}

      {/* DETAILED VIEW */}
      {view === 'detailed' && (
        <div style={{ background: 'white', borderRadius: 14, padding: 20, border: '1px solid var(--gray-200)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>📋 Detailed Attendance Records ({approved.length})</h3>
          <DataTable
            columns={commonColumns}
            data={approved}
            loading={loading}
            emptyText="No approved records"
          />
        </div>
      )}

    </div>
  );
}