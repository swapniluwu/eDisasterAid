import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { MagnifyingGlassIcon, EyeIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { usePolling } from '../../hooks/usePolling';
import { useApi } from '../../hooks/useApi';
import { getVictims, verifyVictim, getPriorityQueue } from '../../api/victims';
import { getDisasters } from '../../api/disasters';
import PriorityBadge from '../../components/ui/PriorityBadge';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDate } from '../../utils/helpers';
import LiveIndicator from '../../components/ui/LiveIndicator';

const AdminVictims = () => {
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('');
  const [disasterId, setDid]    = useState('');
  const [sortBy, setSortBy]     = useState('priority');
  const [tab, setTab]           = useState('all');
  const [detail, setDetail]     = useState(null);   // victim to show in side panel
  const [actionModal, setModal] = useState(null);   // { id, action, name }
  const [notes, setNotes]       = useState('');
  const [acting, setActing]     = useState(false);

  // Auto-refreshes every 20 seconds
  const { data, loading, refetch } = usePolling(
    getVictims,
    { search, status, disasterId, sortBy },
    [search, status, disasterId, sortBy],
    20000
  );
  const { data: disData }  = useApi(getDisasters);
  const { data: queueData } = usePolling(
    getPriorityQueue,
    disasterId || null,
    [disasterId],
    20000
  );

  const victims   = data?.victims   || [];
  const disasters = disData?.disasters || [];
  const queue     = queueData?.queue   || [];

  const handleVerify = async (id, action) => {
    setActing(true);
    try {
      await verifyVictim(id, { action, adminNotes: notes });
      toast.success(`Registration ${action === 'approve' ? 'approved ✓' : 'rejected'}`);
      refetch();
      setModal(null);
      setNotes('');
      setDetail(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally { setActing(false); }
  };

  const statusBadgeCount = {
    pending:  victims.filter(v => v.status === 'pending').length,
    verified: victims.filter(v => v.status === 'verified').length,
    rejected: victims.filter(v => v.status === 'rejected').length,
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Victim Management</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Review registrations and manage the priority queue
          </p>
        </div>
        {/* Live indicator */}
        <LiveIndicator interval="15s" />
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <span className="h-2 w-2 rounded-full bg-success-400 animate-pulse-slow inline-block" />
          Auto-refreshing every 20s
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: `All (${victims.length})`,            val: '' },
          { label: `Pending (${statusBadgeCount.pending})`,   val: 'pending',  color: 'bg-warning-50 text-warning-700 border-warning-200' },
          { label: `Verified (${statusBadgeCount.verified})`, val: 'verified', color: 'bg-success-50 text-success-700 border-success-200' },
          { label: `Rejected (${statusBadgeCount.rejected})`, val: 'rejected', color: 'bg-danger-50 text-danger-700 border-danger-200' },
        ].map(({ label, val, color }) => (
          <button key={val} onClick={() => setStatus(val)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
              ${status === val
                ? 'bg-primary-600 text-white border-primary-600'
                : (color || 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300')}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl w-fit">
        {['all','queue'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize
              ${tab === t ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
            {t === 'queue' ? 'Priority Queue' : 'All Registrations'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input className="input pl-9" placeholder="Search name, phone..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select w-full sm:w-48" value={disasterId} onChange={e => setDid(e.target.value)}>
          <option value="">All disasters</option>
          {disasters.map(d => <option key={d._id} value={d._id}>{d.title}</option>)}
        </select>
        <select className="select w-full sm:w-36" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="priority">By priority</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {loading ? <LoadingSpinner className="py-12" /> : (

        tab === 'all' ? (
          /* ── All Registrations Table ── */
          <div className="card overflow-hidden">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Family</th>
                    <th>Severity</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {victims.map((v, i) => (
                    <motion.tr key={v._id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                    >
                      <td className="text-neutral-400 font-mono text-xs w-8">{i + 1}</td>

                      <td>
                        <button
                          onClick={() => setDetail(detail?._id === v._id ? null : v)}
                          className="font-semibold text-neutral-900 hover:text-primary-600 transition-colors text-left flex items-center gap-1.5"
                        >
                          {v.name}
                          <EyeIcon className="h-3.5 w-3.5 text-neutral-300 hover:text-primary-400" />
                        </button>
                      </td>

                      <td className="font-mono text-xs text-neutral-500">{v.phone}</td>

                      <td className="text-center font-medium">{v.familySize}</td>

                      <td className="text-center">
                        <span className={`font-bold text-sm
                          ${v.severity >= 4 ? 'text-danger-600'
                          : v.severity >= 3 ? 'text-warning-600'
                          : 'text-neutral-600'}`}>
                          {v.severity}/5
                        </span>
                      </td>

                      <td><PriorityBadge score={v.priorityScore} /></td>

                      <td><Badge status={v.status} /></td>

                      <td className="text-neutral-400 text-xs">{formatDate(v.createdAt)}</td>

                      {/* ── ACTIONS COLUMN ── */}
                      <td>
                        <div className="flex items-center gap-1.5">
                          {v.status === 'pending' && (
                            <>
                              <button
                                onClick={() => setModal({ id: v._id, action: 'approve', name: v.name })}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg
                                           bg-success-50 text-success-700 hover:bg-success-100
                                           text-xs font-semibold transition-colors"
                                title="Approve registration"
                              >
                                <CheckIcon className="h-3.5 w-3.5" />
                                Approve
                              </button>
                              <button
                                onClick={() => setModal({ id: v._id, action: 'reject', name: v.name })}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg
                                           bg-danger-50 text-danger-700 hover:bg-danger-100
                                           text-xs font-semibold transition-colors"
                                title="Reject registration"
                              >
                                <XMarkIcon className="h-3.5 w-3.5" />
                                Reject
                              </button>
                            </>
                          )}
                          {v.status === 'verified' && (
                            <span className="text-xs text-neutral-400 italic">
                              Verified ✓
                            </span>
                          )}
                          {v.status === 'rejected' && (
                            <button
                              onClick={() => setModal({ id: v._id, action: 'approve', name: v.name })}
                              className="px-2.5 py-1.5 rounded-lg bg-primary-50 text-primary-700
                                         hover:bg-primary-100 text-xs font-semibold transition-colors"
                              title="Re-approve this registration"
                            >
                              Re-approve
                            </button>
                          )}
                          <button
                            onClick={() => setDetail(detail?._id === v._id ? null : v)}
                            className="p-1.5 rounded-lg bg-neutral-100 text-neutral-500
                                       hover:bg-neutral-200 transition-colors"
                            title="View details"
                          >
                            <EyeIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  {victims.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center text-neutral-400 py-12">
                        No victims found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Detail side panel (expands below row on click) ── */}
            <AnimatePresence>
              {detail && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-neutral-100 overflow-hidden"
                >
                  <div className="p-5 bg-neutral-50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="label">Full name</p>
                      <p className="font-semibold text-neutral-900">{detail.name}</p>
                    </div>
                    <div>
                      <p className="label">Phone</p>
                      <p className="font-mono text-neutral-700">{detail.phone}</p>
                    </div>
                    <div>
                      <p className="label">Address</p>
                      <p className="text-neutral-700 whitespace-normal">{detail.address}</p>
                    </div>
                    <div>
                      <p className="label">Family size</p>
                      <p className="font-semibold">{detail.familySize} members</p>
                    </div>
                    <div>
                      <p className="label">Vulnerabilities</p>
                      <div className="flex gap-1.5 flex-wrap mt-1">
                        {detail.hasElderly  && <span className="chip bg-warning-50 text-warning-700">Elderly</span>}
                        {detail.hasChildren && <span className="chip bg-primary-50 text-primary-700">Children &lt;10</span>}
                        {detail.hasDisabled && <span className="chip bg-neutral-100 text-neutral-600">Disabled</span>}
                        {!detail.hasElderly && !detail.hasChildren && !detail.hasDisabled && (
                          <span className="text-xs text-neutral-400">None reported</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="label">Required items</p>
                      <div className="flex gap-1 flex-wrap mt-1">
                        {(detail.requiredItems || []).map(item => (
                          <span key={item} className="chip bg-neutral-100 text-neutral-600 text-xs">{item}</span>
                        ))}
                        {(!detail.requiredItems || detail.requiredItems.length === 0) && (
                          <span className="text-xs text-neutral-400">None specified</span>
                        )}
                      </div>
                    </div>
                    {detail.adminNotes && (
                      <div className="col-span-full">
                        <p className="label">Admin notes</p>
                        <p className="text-sm text-warning-700 bg-warning-50 rounded-xl p-3">
                          {detail.adminNotes}
                        </p>
                      </div>
                    )}
                    {detail.verifiedBy && (
                      <div>
                        <p className="label">Verified by</p>
                        <p className="text-sm text-neutral-700">{detail.verifiedBy.name}</p>
                      </div>
                    )}
                    <div className="col-span-full flex justify-end gap-2 pt-2 border-t border-neutral-200">
                      {detail.status === 'pending' && (
                        <>
                          <button
                            onClick={() => setModal({ id: detail._id, action: 'reject', name: detail.name })}
                            className="btn-danger text-xs py-2">
                            Reject
                          </button>
                          <button
                            onClick={() => setModal({ id: detail._id, action: 'approve', name: detail.name })}
                            className="btn-success text-xs py-2">
                            Approve
                          </button>
                        </>
                      )}
                      <button onClick={() => setDetail(null)} className="btn-secondary text-xs py-2">
                        Close
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        ) : (
          /* ── Priority Queue Tab ── */
          <div className="space-y-3">
            {!disasterId ? (
              <div className="card p-12 text-center text-neutral-400">
                Select a disaster above to see the priority queue
              </div>
            ) : queue.length === 0 ? (
              <div className="card p-12 text-center text-neutral-400">
                No verified victims in queue for this disaster
              </div>
            ) : queue.map((v) => (
              <motion.div key={v.victimId}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className="card card-hover p-4 flex items-center gap-4"
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center
                                 font-display font-bold text-lg flex-shrink-0
                  ${v.rank <= 3 ? 'bg-danger-50 text-danger-600' : 'bg-neutral-100 text-neutral-600'}`}>
                  {v.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-neutral-900">{v.name}</span>
                    {v.hasElderly  && <span className="chip bg-warning-50 text-warning-700 text-[10px]">Elderly</span>}
                    {v.hasChildren && <span className="chip bg-primary-50 text-primary-700 text-[10px]">Children</span>}
                  </div>
                  <p className="text-xs text-neutral-500">
                    {v.phone} · Family: {v.familySize} · Severity: {v.severity}/5
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5 truncate">{v.address}</p>
                </div>
                <PriorityBadge score={v.priorityScore} />
              </motion.div>
            ))}
          </div>
        )
      )}

      {/* ── Approve / Reject Modal ── */}
      <AnimatePresence>
        {actionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
               style={{ background: 'rgba(44,44,42,0.55)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card p-6 max-w-sm w-full"
            >
              <h3 className="font-display font-bold text-lg text-neutral-900 mb-1">
                {actionModal.action === 'approve' ? 'Approve registration' : 'Reject registration'}
              </h3>
              <p className="text-sm text-neutral-500 mb-4">
                {actionModal.action === 'approve'
                  ? `Approving ${actionModal.name} will add them to the priority distribution queue.`
                  : `Rejecting ${actionModal.name} will notify them and exclude them from the queue.`
                }
              </p>

              <label className="label">
                {actionModal.action === 'reject' ? 'Reason for rejection' : 'Notes (optional)'}
              </label>
              <textarea className="input mb-5" rows={3}
                placeholder={actionModal.action === 'reject'
                  ? 'e.g. Duplicate registration, unable to verify details...'
                  : 'Any notes for this approval...'}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />

              <div className="flex gap-3">
                <button
                  onClick={() => { setModal(null); setNotes(''); }}
                  className="btn-secondary flex-1"
                  disabled={acting}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleVerify(actionModal.id, actionModal.action)}
                  disabled={acting}
                  className={`flex-1 ${actionModal.action === 'approve' ? 'btn-success' : 'btn-danger'}`}
                >
                  {acting
                    ? 'Processing...'
                    : actionModal.action === 'approve' ? 'Approve' : 'Reject'
                  }
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminVictims;