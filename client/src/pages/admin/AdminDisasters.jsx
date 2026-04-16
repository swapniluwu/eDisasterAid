import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { PlusIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { useApi } from '../../hooks/useApi';
import { getDisasters, createDisaster, updateDisasterStatus } from '../../api/disasters';
import Badge from '../../components/ui/Badge';
import MapView from '../../components/ui/MapView';
import ConfirmModal from '../../components/ui/ConfirmModal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDate } from '../../utils/helpers';

const EMPTY = { title:'', type:'flood', description:'', location:'', severity:'medium',
                coordinates: { lat:'', lng:'' } };

const AdminDisasters = () => {
  const { data, loading, refetch } = useApi(getDisasters);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [confirm, setConfirm]   = useState(null);
  const [filter, setFilter]     = useState('');

  const disasters = (data?.disasters || []).filter(d =>
    !filter || d.status === filter
  );

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setCoord = (k, v) => setForm(f => ({ ...f, coordinates: { ...f.coordinates, [k]: v } }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form,
        coordinates: form.coordinates.lat
          ? { lat: parseFloat(form.coordinates.lat), lng: parseFloat(form.coordinates.lng) }
          : undefined,
      };
      await createDisaster(payload);
      toast.success('Disaster event created');
      setShowForm(false);
      setForm(EMPTY);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create disaster');
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateDisasterStatus(id, { status });
      toast.success(`Disaster marked as ${status}`);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
    setConfirm(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Disaster Events</h1>
          <p className="text-neutral-500 text-sm mt-1">Create and manage disaster operations</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          New disaster
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <h2 className="section-title mb-5">Create disaster event</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="label">Title</label>
                <input className="input" required placeholder="e.g. Punjab Floods 2024"
                  value={form.title} onChange={e => set('title', e.target.value)} /></div>
              <div><label className="label">Type</label>
                <select className="select" value={form.type} onChange={e => set('type', e.target.value)}>
                  {['flood','earthquake','cyclone','fire','landslide','drought','other'].map(t => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select></div>
            </div>

            <div><label className="label">Location</label>
              <input className="input" required placeholder="District, State"
                value={form.location} onChange={e => set('location', e.target.value)} /></div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Severity</label>
                <select className="select" value={form.severity} onChange={e => set('severity', e.target.value)}>
                  {['low','medium','high','critical'].map(s => (
                    <option key={s} value={s} className="capitalize">{s}</option>
                  ))}
                </select></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Latitude (optional)</label>
                <input type="number" className="input" step="any" placeholder="30.9010"
                  value={form.coordinates.lat} onChange={e => setCoord('lat', e.target.value)} /></div>
              <div><label className="label">Longitude (optional)</label>
                <input type="number" className="input" step="any" placeholder="75.8573"
                  value={form.coordinates.lng} onChange={e => setCoord('lng', e.target.value)} /></div>
            </div>

            <div><label className="label">Description</label>
              <textarea className="input" rows={3} placeholder="Brief description of the disaster..."
                value={form.description} onChange={e => set('description', e.target.value)} /></div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Creating...' : 'Create event'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Map */}
      <div className="card p-5">
        <h2 className="section-title mb-4 flex items-center gap-2">
          <MapPinIcon className="h-5 w-5 text-primary-500" />
          Disaster map
        </h2>
        <MapView disasters={data?.disasters || []} height="240px" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['','active','inactive','closed'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${filter === s ? 'bg-primary-600 text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:border-primary-300'}`}>
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? <LoadingSpinner className="py-12" /> : (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Title</th><th>Type</th><th>Location</th><th>Severity</th>
                    <th>Status</th><th>Victims</th><th>Started</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {disasters.map(d => (
                  <tr key={d._id}>
                    <td className="font-semibold text-neutral-900 max-w-[180px] truncate">{d.title}</td>
                    <td className="capitalize">{d.type}</td>
                    <td className="text-neutral-500">{d.location}</td>
                    <td><span className={`chip capitalize
                      ${d.severity === 'critical' ? 'bg-danger-50 text-danger-600'
                      : d.severity === 'high'     ? 'bg-warning-50 text-warning-600'
                      : 'bg-primary-50 text-primary-600'}`}>{d.severity}</span></td>
                    <td><Badge status={d.status} /></td>
                    <td className="font-semibold">{d.totalVictimsRegistered}</td>
                    <td className="text-neutral-400 text-xs">{formatDate(d.startDate)}</td>
                    <td>
                      <div className="flex gap-1.5">
                        {d.status === 'active' && (
                          <button onClick={() => setConfirm({ id: d._id, status: 'inactive', title: d.title })}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-warning-50 text-warning-700 hover:bg-warning-100 font-medium transition-colors">
                            Deactivate
                          </button>
                        )}
                        {d.status === 'inactive' && (
                          <button onClick={() => handleStatusChange(d._id, 'active')}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-success-50 text-success-700 hover:bg-success-100 font-medium transition-colors">
                            Reactivate
                          </button>
                        )}
                        {d.status !== 'closed' && (
                          <button onClick={() => setConfirm({ id: d._id, status: 'closed', title: d.title })}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-danger-50 text-danger-700 hover:bg-danger-100 font-medium transition-colors">
                            Close
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {disasters.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-neutral-400 py-8">No disasters found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirm}
        title={`${confirm?.status === 'closed' ? 'Close' : 'Deactivate'} disaster?`}
        message={`Are you sure you want to ${confirm?.status === 'closed' ? 'close' : 'deactivate'} "${confirm?.title}"?`}
        danger={confirm?.status === 'closed'}
        onConfirm={() => handleStatusChange(confirm.id, confirm.status)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
};

export default AdminDisasters;