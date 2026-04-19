import React from 'react';

const STATUS_MAP = {
  // Orders
  pending: { cls: 'badge-yellow', label: 'Pending' },
  processing: { cls: 'badge-blue', label: 'Processing' },
  dispatched: { cls: 'badge-purple', label: 'Dispatched' },
  partially_delivered: { cls: 'badge-orange', label: 'Partial' },
  delivered: { cls: 'badge-green', label: 'Delivered' },
  cancelled: { cls: 'badge-red', label: 'Cancelled' },
  // Payments
  completed: { cls: 'badge-green', label: 'Completed' },
  failed: { cls: 'badge-red', label: 'Failed' },
  refunded: { cls: 'badge-gray', label: 'Refunded' },
  // Invoices
  draft: { cls: 'badge-gray', label: 'Draft' },
  sent: { cls: 'badge-blue', label: 'Sent' },
  paid: { cls: 'badge-green', label: 'Paid' },
  overdue: { cls: 'badge-red', label: 'Overdue' },
  // Attendance
  present: { cls: 'badge-green', label: 'Present' },
  absent: { cls: 'badge-red', label: 'Absent' },
  'half-day': { cls: 'badge-yellow', label: 'Half Day' },
  leave: { cls: 'badge-gray', label: 'Leave' },
  // Delivery
  in_transit: { cls: 'badge-blue', label: 'In Transit' },
  arrived: { cls: 'badge-purple', label: 'Arrived' },
  partial: { cls: 'badge-orange', label: 'Partial' },
  // Priority
  low: { cls: 'badge-gray', label: 'Low' },
  normal: { cls: 'badge-blue', label: 'Normal' },
  high: { cls: 'badge-yellow', label: 'High' },
  urgent: { cls: 'badge-red', label: 'Urgent' },
};

export default function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { cls: 'badge-gray', label: status };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}
