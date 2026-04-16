import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { getAuditLogs } from '../../api/audit';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDateTime } from '../../utils/helpers';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const COLLECTIONS = ['','User','DisasterEvent','Victim','Inventory','Distribution','AuditLog'];

const AdminAudit = () => {
  const [search, setSearch]     = useState('');
  const [collection, setCol]    = useState('');
  const [startDate, setStart]   = useState('');
  const [endDate, setEnd]       = useState('');
  const [page, setPage]         = useState(1);

  const { data, loading } = useApi(
    getAuditLogs,
    { search, targetCollection: collection, startDate, endDate, page, limit: 25 },
    [search, collection, startDate, endDate, page]
  );

  const logs  = data?.logs || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Audit Log</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Append-only record of all admin actions — {total} total entries
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input className="input pl-9" placeholder="Search actions..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="select w-44" value={collection} onChange={e => { setCol(e.target.value); setPage(1); }}>
          {COLLECTIONS.map(c => <option key={c} value={c}>{c || 'All collections'}</option>)}
        </select>
        <input type="date" className="input w-36" value={startDate} onChange={e => setStart(e.target.value)} />
        <input type="date" className="input w-36" value={endDate} onChange={e => setEnd(e.target.value)} />
      </div>

      {loading ? <LoadingSpinner className="py-12" /> : (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Action</th><th>Performed by</th><th>Collection</th><th>IP</th><th>Time</th></tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td className="text-neutral-900 max-w-xs">
                      <span className="font-medium">{log.action}</span>
                    </td>
                    <td>
                      <div>
                        <p className="font-medium text-neutral-900 text-xs">{log.performedBy?.name || '—'}</p>
                        <p className="text-neutral-400 text-[10px]">{log.performedBy?.role}</p>
                      </div>
                    </td>
                    <td>
                      <span className="chip bg-neutral-100 text-neutral-600 text-[10px]">
                        {log.targetCollection}
                      </span>
                    </td>
                    <td className="text-neutral-400 font-mono text-xs">{log.ipAddress || '—'}</td>
                    <td className="text-neutral-400 text-xs whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-neutral-400 py-8">No logs found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100">
              <p className="text-sm text-neutral-500">Page {page} of {pages}</p>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1.5 px-3">Prev</button>
                <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1.5 px-3">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminAudit;