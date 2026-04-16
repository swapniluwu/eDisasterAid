import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { useApi } from '../../hooks/useApi';
import { getVictims, verifyVictim, getPriorityQueue } from '../../api/victims';
import { getDisasters } from '../../api/disasters';
import PriorityBadge from '../../components/ui/PriorityBadge';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { formatDate } from '../../utils/helpers';

const AdminVictims = () => {
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [disasterId, setDid]  = useState('');
  const [sortBy, setSortBy]   = useState('priority');
  const [confirm, setConfirm] = useState(null);
  const [notes, setNotes]     = useState('');
  const [tab, setTab]         = useState('all');

  const { data, loading, refetch } = useApi(getVictims, { search, status, disasterId, sortBy }, [search, status, disasterId, sortBy]);
  const { data: disData }          = useApi(getDisasters);
  const { data: queueData }        = useApi(getPriorityQueue, disasterId || null, [disasterId]);

  const victims = data?.victims || [];
  const disasters = disData?.disasters || [];
  const queue = queueData?.queue || [];

  const handleVerify = async (id, action) => {
    try {
      await verifyVictim(id, { action, adminNotes: notes });
      toast.success(`Registration ${action === 'approve' ? 'approved' : 'rejected'}`);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
    setConfirm(null);
    setNotes('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Victim Management</h1>
        <p className="text-neutral-500 text-sm mt-1">Review registrations and manage priority queue</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl w-fit">
        {['all','queue'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all capitalize
              ${tab === t ? 'bg-white text-neutral-900 shadow-card' : 'text-neutral-500 hover:text-neutral-700'}`}>
            {t === 'queue' ? 'Priority Queue' : 'All Registrations'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input className="input pl-9" placeholder="Search name, phone..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select w-40" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <select className="select w-52" value={disasterId} onChange={e => setDid(e.target.value)}>
          <option value="">All disasters</option>
          {disasters.map(d => <option key={d._id} value={d._id}>{d.title}</option>)}
        </select>
        <select className="select w-36" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="priority">By priority</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {loading ? <LoadingSpinner className="py-12" /> : (
        tab === 'all' ? (
          <div className="card">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr><th>#</th><th>Name</th><th>Phone</th><th>Family</th>
                      <th>Severity</th><th>Priority</th><th>Status</th>
                      <th>Registered</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {victims.map((v, i) => (
                    <motion.tr key={v._id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}>
                      <td className="text-neutral-400 font-mono text-xs">{i+1}</td>
                      <td className="font-semibold text-neutral-900">{v.name}</td>
                      <td className="text-neutral-500 font-mono text-xs">{v.phone}</td>
                      <td className="text-center">{v.familySize}</td>
                      <td className="text-center">
                        <span className={`font-bold ${v.severity >= 4 ? 'text-danger-600' : v.severity >= 3 ? 'text-warning-600' : 'text-neutral-600'}`}>
                          {v.severity}/5
                        </span>
                      </td>
                      <td><PriorityBadge score={v.priorityScore} /></td>
                      <td><Badge status={v.status} /></td>
                      <td className="text-neutral-400 text-xs">{formatDate(v.createdAt)}</td>
                      <td>
                        {v.status === 'pending' && (
                          <div className="flex gap-1.5">
                            <button onClick={() => setConfirm({ id: v._id, action: 'approve', name: v.name })}
                              className="text-xs px-2.5 py-1.5 rounded-lg bg-success-50 text-success-700 hover:bg-success-100 font-medium transition-colors">
                              Approve
                            </button>
                            <button onClick={() => setConfirm({ id: v._id, action: 'reject', name: v.name })}
                              className="text-xs px-2.5 py-1.5 rounded-lg bg-danger-50 text-danger-700 hover:bg-danger-100 font-medium transition-colors">
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                  {victims.length === 0 && (
                    <tr><td colSpan={9} className="text-center text-neutral-400 py-8">No victims found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // Priority queue tab
          <div className="space-y-3">
            {!disasterId ? (
              <div className="card p-12 text-center text-neutral-400">
                Select a disaster above to see the priority queue
              </div>
            ) : queue.length === 0 ? (
              <div className="card p-12 text-center text-neutral-400">No verified victims in queue</div>
            ) : queue.map((v) => (
              <motion.div key={v.victimId}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className="card card-hover p-4 flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-display font-bold text-lg
                  ${v.rank <= 3 ? 'bg-danger-50 text-danger-600' : 'bg-neutral-100 text-neutral-600'}`}>
                  {v.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-neutral-900">{v.name}</span>
                    {v.hasElderly && <span className="chip bg-warning-50 text-warning-700 text-[10px]">Elderly</span>}
                    {v.hasChildren && <span className="chip bg-primary-50 text-primary-700 text-[10px]">Children</span>}
                  </div>
                  <p className="text-xs text-neutral-500">{v.phone} · Family: {v.familySize} · Severity: {v.severity}/5</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{v.address}</p>
                </div>
                <PriorityBadge score={v.priorityScore} />
              </motion.div>
            ))}
          </div>
        )
      )}

      {/* Confirm modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(44,44,42,0.5)' }}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
            className="card p-6 max-w-sm w-full">
            <h3 className="font-display font-semibold text-neutral-900 mb-4">
              {confirm.action === 'approve' ? 'Approve' : 'Reject'} registration for {confirm.name}?
            </h3>
            <textarea className="input mb-4" rows={3}
              placeholder={confirm.action === 'reject' ? 'Reason for rejection (optional)' : 'Notes (optional)'}
              value={notes} onChange={e => setNotes(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => { setConfirm(null); setNotes(''); }} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleVerify(confirm.id, confirm.action)}
                className={`flex-1 ${confirm.action === 'approve' ? 'btn-success' : 'btn-danger'}`}>
                {confirm.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminVictims;