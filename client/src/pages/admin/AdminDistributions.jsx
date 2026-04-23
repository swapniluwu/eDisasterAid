import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/outline';
import API from '../../api/axios';
import { usePolling } from '../../hooks/usePolling';
import { useApi } from '../../hooks/useApi';
import {
  getDistributions, createDistribution,
  updateDistStatus, assignVolunteer, cancelDistribution,
} from '../../api/distributions';
import { getDisasters } from '../../api/disasters';
import { getVolunteers } from '../../api/volunteers';
import Badge from '../../components/ui/Badge';
import LifecycleBar from '../../components/ui/LifecycleBar';
import LiveIndicator from '../../components/ui/LiveIndicator';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDateTime } from '../../utils/helpers';

const STATUSES = ['Submitted','Verified','Approved','Assigned','Dispatched','Delivered','Closed'];

// ── Standalone volunteer picker — never fires without explicit button click ──
const VolunteerPicker = ({ distributionId, volunteers, onAssign }) => {
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (!selected) {
      toast.error('Please select a volunteer first');
      return;
    }
    setBusy(true);
    await onAssign(distributionId, selected);
    setSelected('');
    setBusy(false);
  };

  return (
    <div className="flex gap-2 items-center">
      <select
        className="select text-xs flex-1"
        value={selected}
        onChange={e => setSelected(e.target.value)}
      >
        <option value="">— Select volunteer —</option>
        {volunteers.map(v => (
          <option key={v._id} value={v._id}>
            {v.name} {v.region ? `(${v.region})` : ''} · {v.stats?.pendingTasks || 0} active tasks
          </option>
        ))}
      </select>
      <button
        onClick={handleClick}
        disabled={!selected || busy}
        className="btn-primary text-xs py-2 px-4 whitespace-nowrap disabled:opacity-40"
      >
        {busy ? 'Assigning...' : 'Assign'}
      </button>
    </div>
  );
};

const AdminDistributions = () => {
  const [disasterId, setDid]    = useState('');
  const [statusF, setStatusF]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving]     = useState(false);

  const [victims, setVictims]     = useState([]);
  const [inventory, setInventory] = useState([]);

  const [form, setForm] = useState({
    victimId: '', itemId: '', quantity: '', disasterId: '', notes: '',
  });

  const { data, loading, refetch } = usePolling(
    getDistributions,
    { disasterId: disasterId || undefined, status: statusF || undefined },
    [disasterId, statusF],
    15000
  );
  const { data: disData } = useApi(getDisasters);
  const { data: volData } = useApi(getVolunteers);

  const distributions = data?.distributions || [];
  const disasters     = disData?.disasters  || [];
  const volunteers    = volData?.volunteers || [];

  // Load victims + inventory only when disaster selected
  useEffect(() => {
    if (!disasterId) { setVictims([]); setInventory([]); return; }
    const load = async () => {
      try {
        const [vRes, iRes] = await Promise.all([
          API.get('/victims', { params: { disasterId, status: 'verified' } }),
          API.get(`/inventory/${disasterId}`),
        ]);
        setVictims(vRes.data.data?.victims || []);
        setInventory(iRes.data.data?.items || []);
      } catch {
        setVictims([]);
        setInventory([]);
      }
    };
    load();
  }, [disasterId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.disasterId) return toast.error('Select a disaster');
    if (!form.victimId)   return toast.error('Select a victim');
    if (!form.itemId)     return toast.error('Select an inventory item');
    if (!form.quantity)   return toast.error('Enter quantity');
    setSaving(true);
    try {
      await createDistribution({ ...form, quantity: +form.quantity });
      toast.success('Distribution created — starts at Submitted');
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
      toast.success(`Moved to ${status}`);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const handleAssign = async (id, volunteerId) => {
    if (!volunteerId) {
      toast.error('No volunteer selected');
      return;
    }
    try {
      await assignVolunteer(id, { volunteerId });
      toast.success('Volunteer assigned and notified');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this distribution and restore stock?')) return;
    try {
      await cancelDistribution(id, { reason: 'Cancelled by admin' });
      toast.success('Cancelled — stock restored');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancel failed');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Distributions</h1>
          <p className="text-neutral-500 text-sm mt-1">Manage aid distribution lifecycle</p>
        </div>
        <div className="flex items-center gap-3">
          <LiveIndicator interval="15s" />
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <PlusIcon className="h-4 w-4" /> New distribution
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <select className="select w-full sm:w-64" value={disasterId} onChange={e => setDid(e.target.value)}>
          <option value="">All disasters</option>
          {disasters.map(d => <option key={d._id} value={d._id}>{d.title}</option>)}
        </select>
        <div className="flex gap-1.5 flex-wrap">
          {['', ...STATUSES].map(s => (
            <button key={s} onClick={() => setStatusF(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${statusF === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <h2 className="section-title mb-1">Create distribution</h2>
          <p className="text-xs text-neutral-400 mb-5">
            New distributions start at <strong>Submitted</strong>. You assign a volunteer separately after creation.
          </p>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Disaster *</label>
              <select className="select" required value={form.disasterId}
                onChange={e => { set('disasterId', e.target.value); setDid(e.target.value); }}>
                <option value="">Select disaster</option>
                {disasters.map(d => <option key={d._id} value={d._id}>{d.title}</option>)}
              </select>
            </div>

            {form.disasterId && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Victim — verified only *</label>
                    <select className="select" required value={form.victimId}
                      onChange={e => set('victimId', e.target.value)}>
                      <option value="">
                        {victims.length === 0
                          ? 'No verified victims — approve some first'
                          : 'Select victim'}
                      </option>
                      {victims.map(v => (
                        <option key={v._id} value={v._id}>
                          {v.name} — Priority: {v.priorityScore}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Inventory item *</label>
                    <select className="select" required value={form.itemId}
                      onChange={e => set('itemId', e.target.value)}>
                      <option value="">
                        {inventory.length === 0 ? 'No inventory — add items first' : 'Select item'}
                      </option>
                      {inventory.map(i => (
                        <option key={i._id} value={i._id}>
                          {i.itemName} ({i.quantity} {i.unit} available)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Quantity *</label>
                  <input type="number" className="input" required min="1"
                    placeholder="How much to allocate"
                    value={form.quantity} onChange={e => set('quantity', e.target.value)} />
                </div>
                <div>
                  <label className="label">Notes (optional)</label>
                  <input className="input" placeholder="Special instructions..."
                    value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" disabled={saving || !form.disasterId || !form.victimId || !form.itemId}
                className="btn-primary flex-1">
                {saving ? 'Creating...' : 'Create distribution'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Distribution cards */}
      {loading ? <LoadingSpinner className="py-12" /> : (
        <div className="space-y-3">
          {distributions.map((dist) => (
            <motion.div key={dist._id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="card overflow-hidden"
            >
              {/* Card header — always visible */}
              <div
                className="p-4 cursor-pointer hover:bg-neutral-50 transition-colors"
                onClick={() => setExpanded(expanded === dist._id ? null : dist._id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-900 text-sm mb-2">
                      {dist.victimId?.name || 'Victim'}
                      <span className="text-neutral-400 font-normal mx-2">→</span>
                      {dist.quantity} {dist.itemId?.unit} of {dist.itemId?.itemName}
                    </p>
                    <LifecycleBar currentStatus={dist.status} />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge status={dist.status} />
                    <span className="text-xs text-neutral-400 hidden sm:block">
                      {formatDateTime(dist.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expanded panel */}
              {expanded === dist._id && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-t border-neutral-100 p-5 space-y-5 bg-neutral-50/50"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                    {/* Victim info */}
                    <div>
                      <p className="label">Victim details</p>
                      <p className="font-semibold text-neutral-900">{dist.victimId?.name}</p>
                      <p className="text-sm text-neutral-500 mt-0.5">
                        {dist.victimId?.phone}
                        {dist.victimId?.address && ` · ${dist.victimId.address}`}
                      </p>
                    </div>

                    {/* Volunteer section */}
                    <div>
                      <p className="label mb-2">
                        {dist.assignedVolunteerId ? 'Assigned volunteer' : 'Assign volunteer'}
                      </p>

                      {dist.assignedVolunteerId ? (
                        <div className="space-y-2">
                          {/* Current volunteer chip */}
                          <div className="flex items-center gap-2 p-2 bg-teal-50 rounded-xl border border-teal-100">
                            <div className="h-8 w-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm flex-shrink-0">
                              {dist.assignedVolunteerId.name?.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-teal-900 text-sm">{dist.assignedVolunteerId.name}</p>
                              <p className="text-xs text-teal-600">{dist.assignedVolunteerId.region || 'No zone'}</p>
                            </div>
                          </div>
                          {/* Reassign option — only if not delivered */}
                          {!['Delivered','Closed'].includes(dist.status) && (
                            <div>
                              <p className="text-xs text-neutral-400 mb-1">Reassign to different volunteer:</p>
                              <VolunteerPicker
                                distributionId={dist._id}
                                volunteers={volunteers.filter(v => v._id !== dist.assignedVolunteerId?._id)}
                                onAssign={handleAssign}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="p-3 bg-warning-50 border border-warning-100 rounded-xl text-xs text-warning-700 mb-2">
                            No volunteer assigned yet. Select one below and click Assign.
                          </div>
                          <VolunteerPicker
                            distributionId={dist._id}
                            volunteers={volunteers}
                            onAssign={handleAssign}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status history */}
                  {dist.statusHistory?.length > 0 && (
                    <div>
                      <p className="label">Status history</p>
                      <div className="space-y-1.5">
                        {dist.statusHistory.map((h, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs flex-wrap">
                            <span className="chip bg-primary-50 text-primary-600">{h.stage}</span>
                            <span className="text-neutral-400">{formatDateTime(h.changedAt)}</span>
                            {h.note && <span className="text-neutral-500">— {h.note}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-100">
                    {/* Advance stage button — skip Assigned (that's done via volunteer picker) */}
                    {(() => {
                      const currentIdx = STATUSES.indexOf(dist.status);
                      const nextStatus = STATUSES[currentIdx + 1];
                      // Don't show Advance if next step is Assigned (force using volunteer picker)
                      if (nextStatus && nextStatus !== 'Assigned' && dist.status !== 'Closed') {
                        return (
                          <button
                            onClick={() => handleStatusUpdate(dist._id, nextStatus)}
                            className="btn-primary text-xs py-2 px-4"
                          >
                            Advance to {nextStatus}
                          </button>
                        );
                      }
                      return null;
                    })()}

                    {['Submitted','Verified'].includes(dist.status) && (
                      <button
                        onClick={() => handleCancel(dist._id)}
                        className="btn-danger text-xs py-2 px-4"
                      >
                        Cancel & restore stock
                      </button>
                    )}

                    {dist.notes && (
                      <p className="text-xs text-neutral-400 self-center">
                        Note: {dist.notes}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}

          {distributions.length === 0 && (
            <div className="card p-16 text-center text-neutral-400">
              <p className="font-medium mb-1">No distributions found</p>
              <p className="text-sm">Create one using the button above</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDistributions;