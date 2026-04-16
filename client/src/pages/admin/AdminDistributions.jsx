import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useApi } from '../../hooks/useApi';
import { getDistributions, createDistribution, updateDistStatus, assignVolunteer, cancelDistribution } from '../../api/distributions';
import { getDisasters } from '../../api/disasters';
import { getVictims } from '../../api/victims';
import { getInventory } from '../../api/inventory';
import { getVolunteers } from '../../api/volunteers';
import Badge from '../../components/ui/Badge';
import LifecycleBar from '../../components/ui/LifecycleBar';
import PriorityBadge from '../../components/ui/PriorityBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDateTime } from '../../utils/helpers';

const STATUSES = ['Submitted','Verified','Approved','Assigned','Dispatched','Delivered','Closed'];

const AdminDistributions = () => {
  const [disasterId, setDid]    = useState('');
  const [statusF, setStatusF]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [form, setForm] = useState({ victimId:'', itemId:'', quantity:'', disasterId:'', notes:'' });

  const { data, loading, refetch } = useApi(getDistributions, { disasterId, status: statusF }, [disasterId, statusF]);
  const { data: disData }          = useApi(getDisasters);
  const { data: victimData }       = useApi(getVictims, { disasterId, status: 'verified' }, [disasterId]);
  const { data: invData }          = useApi(getInventory, disasterId || null, [disasterId]);
  const { data: volData }          = useApi(getVolunteers);

  const distributions = data?.distributions || [];
  const disasters     = disData?.disasters || [];
  const victims       = victimData?.victims || [];
  const inventory     = invData?.items || [];
  const volunteers    = volData?.volunteers || [];

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createDistribution({ ...form, quantity: +form.quantity });
      toast.success('Distribution created');
      setShowForm(false);
      setForm({ victimId:'', itemId:'', quantity:'', disasterId:'', notes:'' });
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create');
    } finally { setSaving(false); }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await updateDistStatus(id, { status });
      toast.success(`Status updated to ${status}`);
      refetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
  };

  const handleAssign = async (id, volunteerId) => {
    try {
      await assignVolunteer(id, { volunteerId });
      toast.success('Volunteer assigned');
      refetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Assignment failed'); }
  };

  const handleCancel = async (id) => {
    try {
      await cancelDistribution(id, { reason: 'Cancelled by admin' });
      toast.success('Distribution cancelled, stock restored');
      refetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Cancel failed'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Distributions</h1>
          <p className="text-neutral-500 text-sm mt-1">Manage aid distribution lifecycle</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-4 w-4" /> New distribution
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <select className="select w-56" value={disasterId} onChange={e => setDid(e.target.value)}>
          <option value="">All disasters</option>
          {disasters.map(d => <option key={d._id} value={d._id}>{d.title}</option>)}
        </select>
        <div className="flex gap-1 flex-wrap">
          {['', ...STATUSES].map(s => (
            <button key={s} onClick={() => setStatusF(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${statusF === s ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <h2 className="section-title mb-5">Create distribution</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Disaster</label>
              <select className="select" required value={form.disasterId}
                onChange={e => { set('disasterId', e.target.value); setDid(e.target.value); }}>
                <option value="">Select disaster</option>
                {disasters.map(d => <option key={d._id} value={d._id}>{d.title}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Victim (verified only)</label>
                <select className="select" required value={form.victimId} onChange={e => set('victimId', e.target.value)}>
                  <option value="">Select victim</option>
                  {victims.map(v => <option key={v._id} value={v._id}>{v.name} — Score: {v.priorityScore}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Inventory item</label>
                <select className="select" required value={form.itemId} onChange={e => set('itemId', e.target.value)}>
                  <option value="">Select item</option>
                  {inventory.map(i => <option key={i._id} value={i._id}>{i.itemName} ({i.quantity} {i.unit} left)</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Quantity</label>
              <input type="number" className="input" required min="1" placeholder="e.g. 25"
                value={form.quantity} onChange={e => set('quantity', e.target.value)} />
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <input className="input" placeholder="Special instructions..."
                value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Creating...' : 'Create distribution'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Distribution list */}
      {loading ? <LoadingSpinner className="py-12" /> : (
        <div className="space-y-3">
          {distributions.map((dist) => (
            <motion.div key={dist._id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="card card-hover p-4">
              {/* Row header */}
              <div className="flex items-center gap-4 cursor-pointer"
                   onClick={() => setExpanded(expanded === dist._id ? null : dist._id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-semibold text-neutral-900">
                      {dist.victimId?.name || 'Victim'}
                    </span>
                    <span className="text-neutral-400 text-sm">→</span>
                    <span className="font-medium text-neutral-700">
                      {dist.quantity} {dist.itemId?.unit} of {dist.itemId?.itemName}
                    </span>
                  </div>
                  <LifecycleBar currentStatus={dist.status} />
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge status={dist.status} />
                  <span className="text-xs text-neutral-400">{formatDateTime(dist.createdAt)}</span>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === dist._id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-neutral-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-neutral-400 mb-1">Victim details</p>
                      <p className="text-sm font-medium">{dist.victimId?.name}</p>
                      <p className="text-xs text-neutral-500">{dist.victimId?.phone} · {dist.victimId?.address}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400 mb-1">Assigned volunteer</p>
                      {dist.assignedVolunteerId ? (
                        <p className="text-sm font-medium">{dist.assignedVolunteerId.name}</p>
                      ) : (
                        <select className="select text-xs"
                          onChange={e => e.target.value && handleAssign(dist._id, e.target.value)}>
                          <option value="">Assign volunteer...</option>
                          {volunteers.map(v => <option key={v._id} value={v._id}>{v.name} ({v.region || 'No zone'})</option>)}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Status history */}
                  {dist.statusHistory?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-neutral-400 mb-2">Status history</p>
                      <div className="space-y-1.5">
                        {dist.statusHistory.map((h, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="chip bg-primary-50 text-primary-600">{h.stage}</span>
                            <span className="text-neutral-400">{formatDateTime(h.changedAt)}</span>
                            {h.note && <span className="text-neutral-500">— {h.note}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.indexOf(dist.status) < STATUSES.length - 1 &&
                     dist.status !== 'Assigned' &&
                     dist.status !== 'Closed' && (
                      <button onClick={() => handleStatusUpdate(dist._id, STATUSES[STATUSES.indexOf(dist.status) + 1])}
                        className="btn-primary text-xs px-3 py-1.5">
                        Advance to {STATUSES[STATUSES.indexOf(dist.status) + 1]}
                      </button>
                    )}
                    {['Submitted','Verified'].includes(dist.status) && (
                      <button onClick={() => handleCancel(dist._id)}
                        className="btn-danger text-xs px-3 py-1.5">
                        Cancel & restore stock
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
          {distributions.length === 0 && (
            <div className="card p-12 text-center text-neutral-400">
              No distributions found. Create one above.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDistributions;