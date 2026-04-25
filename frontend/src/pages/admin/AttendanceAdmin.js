import React, { useState, useEffect } from 'react';
import { attendanceAPI, usersAPI } from '../../services/api';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AttendanceAdmin() {
  const [records, setRecords] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

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
      toast.error('Failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [filters]);
  useEffect(() => {
    usersAPI.getAll({ role: 'staff' }).then(r => setStaff(r.data.data));
  }, []);

  // 🔥 SPLIT DATA
  const pending = records.filter(r => r.approvalStatus === 'pending');
  const approved = records.filter(r => r.approvalStatus === 'approved');

  // 🔥 ACTIONS
  const approve = async (id) => {
    try {
      await attendanceAPI.approve(id);
      toast.success('Approved');
      fetch();
    } catch {
      toast.error('Failed to approve');
    }
  };

  const reject = async (id) => {
    try {
      await attendanceAPI.reject(id);
      toast.success('Rejected');
      fetch();
    } catch {
      toast.error('Failed to reject');
    }
  };

  // 🔥 COMMON COLUMNS
  const commonColumns = [
    { key: 'user', label: 'Staff', render: r => r.user?.name || '—' },
    { key: 'date', label: 'Date', render: r => format(new Date(r.date), 'EEE, dd MMM yyyy') },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.approvalStatus} /> },
    { key: 'checkIn', label: 'Check In', render: r => r.checkIn?.time ? format(new Date(r.checkIn.time), 'HH:mm') : '—' },
    { key: 'checkOut', label: 'Check Out', render: r => r.checkOut?.time ? format(new Date(r.checkOut.time), 'HH:mm') : '—' },
    { key: 'hoursWorked', label: 'Hours', render: r => r.hoursWorked ? `${r.hoursWorked}h` : '—' },
  ];

  // 🔥 PENDING COLUMNS (WITH ACTIONS)
  const pendingColumns = [
    ...commonColumns,
    {
      key: 'actions',
      label: 'Actions',
      render: r => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-success btn-sm"
            onClick={() => approve(r._id)}
          >
            Approve
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => reject(r._id)}
          >
            Reject
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
          <h1 className="page-title">Attendance Management</h1>
          <p className="page-subtitle">{records.length} total records</p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="filters-row">
            <select
              className="form-control form-select"
              style={{ width: 180 }}
              value={filters.userId}
              onChange={e => setFilters(f => ({ ...f, userId: e.target.value }))}
            >
              <option value="">All Staff</option>
              {staff.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>

            <select
              className="form-control form-select"
              style={{ width: 120 }}
              value={filters.month}
              onChange={e => setFilters(f => ({ ...f, month: e.target.value }))}
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
              style={{ width: 90 }}
              value={filters.year}
              onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* 🔥 PENDING SECTION */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3 style={{ color: '#f59e0b' }}>⏳ Pending Requests ({pending.length})</h3>
        </div>

        <DataTable
          columns={pendingColumns}
          data={pending}
          loading={loading}
          emptyText="No pending requests"
        />
      </div>

      {/* ✅ APPROVED SECTION */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ color: '#10b981' }}>✅ Approved Records ({approved.length})</h3>
        </div>

        <DataTable
          columns={commonColumns}
          data={approved}
          loading={loading}
          emptyText="No approved records"
        />
      </div>

    </div>
  );
}