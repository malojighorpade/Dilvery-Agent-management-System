import React, { useState, useEffect } from 'react';
import { attendanceAPI, usersAPI } from '../../services/api';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AttendanceAdmin() {
  const [records, setRecords] = useState([]); const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ userId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() });

  const fetch = async () => {
    setLoading(true);
    try { const r = await attendanceAPI.getAll(filters); setRecords(r.data.data); }
    catch { toast.error('Failed'); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [filters]);
  useEffect(() => { usersAPI.getAll({ role: 'staff' }).then(r => setStaff(r.data.data)); }, []);

  const columns = [
    { key: 'user', label: 'Staff', render: r => r.user?.name || '—' },
    { key: 'date', label: 'Date', render: r => format(new Date(r.date), 'EEE, dd MMM yyyy') },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
    { key: 'checkIn', label: 'Check In', render: r => r.checkIn?.time ? format(new Date(r.checkIn.time), 'HH:mm') : '—' },
    { key: 'checkOut', label: 'Check Out', render: r => r.checkOut?.time ? format(new Date(r.checkOut.time), 'HH:mm') : '—' },
    { key: 'hoursWorked', label: 'Hours', render: r => r.hoursWorked ? `${r.hoursWorked}h` : '—' },
    { key: 'location', label: 'Check-in Location', render: r => r.checkIn?.address || '—' },
  ];

  return (
    <div className="page-container">
      <div className="page-header"><div><h1 className="page-title">Attendance</h1><p className="page-subtitle">{records.length} records</p></div></div>
      <div className="card">
        <div className="card-header">
          <div className="filters-row">
            <select className="form-control form-select" style={{ width: 180 }} value={filters.userId} onChange={e => setFilters(f => ({ ...f, userId: e.target.value }))}>
              <option value="">All Staff</option>
              {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <select className="form-control form-select" style={{ width: 120 }} value={filters.month} onChange={e => setFilters(f => ({ ...f, month: e.target.value }))}>
              {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
            </select>
            <input type="number" className="form-control" style={{ width: 90 }} value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))} />
          </div>
        </div>
        <DataTable columns={columns} data={records} loading={loading} emptyText="No attendance records" />
      </div>
    </div>
  );
}
