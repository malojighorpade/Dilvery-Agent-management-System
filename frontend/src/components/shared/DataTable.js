import React from 'react';

export default function DataTable({ columns, data, loading, emptyText = 'No records found', actions }) {
  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!data || data.length === 0) return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 17H7A5 5 0 0 1 7 7h1M15 7h1a5 5 0 0 1 0 10h-1M8 12h8" /></svg>
      </div>
      <p className="empty-state-title">{emptyText}</p>
    </div>
  );
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}
            {actions && <th style={{ textAlign: 'right' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row._id || i}>
              {columns.map(c => <td key={c.key}>{c.render ? c.render(row) : row[c.key] ?? '—'}</td>)}
              {actions && <td style={{ textAlign: 'right' }}>{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
