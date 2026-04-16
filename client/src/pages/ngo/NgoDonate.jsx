import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { getDisasters } from '../../api/disasters';
import { logDonation } from '../../api/donations';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { HeartIcon } from '@heroicons/react/24/outline';

const EMPTY = {
  disasterId: '', itemName: '', category: 'food',
  quantity: '', unit: 'kg', estimatedArrival: '', notes: '',
};

const NgoDonate = () => {
  const navigate = useNavigate();
  const [form, setForm]     = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const { data: disData, loading } = useApi(getDisasters, { status: 'active' });
  const disasters = disData?.disasters || [];

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await logDonation({ ...form, quantity: parseFloat(form.quantity) });
      toast.success('Donation logged successfully!');
      setReceipt(data.data.receipt);
      setForm(EMPTY);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Donation failed');
    } finally { setSaving(false); }
  };

  if (loading) return <LoadingSpinner className="py-20" />;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">Log a donation</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Your contribution will be linked to the disaster inventory immediately
        </p>
      </div>

      {/* Receipt */}
      {receipt && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 mb-5 border-l-4 border-success-400 bg-success-50"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-success-400 flex items-center justify-center">
              <HeartIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-display font-semibold text-success-800">Donation confirmed!</p>
              <p className="text-xs text-success-600">Linked to disaster inventory</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Donor',    receipt.donorName],
              ['Disaster', receipt.disasterTitle],
              ['Item',     receipt.itemName],
              ['Quantity', `${receipt.quantity} ${receipt.unit}`],
              ['Arrival',  receipt.estimatedArrival || 'Not specified'],
              ['Logged at', new Date(receipt.loggedAt).toLocaleString('en-IN')],
            ].map(([k, v]) => (
              <div key={k} className="bg-white/70 rounded-xl p-3">
                <p className="text-[10px] text-success-600 uppercase tracking-wide mb-0.5">{k}</p>
                <p className="font-semibold text-success-900">{v}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setReceipt(null)}
            className="mt-4 w-full py-2 rounded-xl border border-success-300 text-success-700 text-sm font-medium hover:bg-white/50 transition-colors">
            Log another donation
          </button>
        </motion.div>
      )}

      {!receipt && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Disaster */}
          <div className="card p-5">
            <h2 className="section-title mb-4">Select disaster</h2>
            {disasters.length === 0 ? (
              <p className="text-neutral-400 text-sm">No active disasters accepting donations right now.</p>
            ) : (
              <div className="space-y-2">
                {disasters.map(d => (
                  <button key={d._id} type="button"
                    onClick={() => set('disasterId', d._id)}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all
                      ${form.disasterId === d._id
                        ? 'border-warning-400 bg-warning-50'
                        : 'border-neutral-100 hover:border-neutral-200 bg-white'}`}
                  >
                    <p className="font-semibold text-neutral-900">{d.title}</p>
                    <p className="text-sm text-neutral-500 mt-0.5">{d.location} · {d.type}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Item details */}
          <div className="card p-5">
            <h2 className="section-title mb-4">Donation details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Item name</label>
                  <input className="input" required placeholder="e.g. Rice, Blankets"
                    value={form.itemName} onChange={e => set('itemName', e.target.value)} />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select className="select" value={form.category} onChange={e => set('category', e.target.value)}>
                    {['food','water','medicine','clothing','shelter','hygiene','other'].map(c => (
                      <option key={c} value={c} className="capitalize">{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Quantity</label>
                  <input type="number" className="input" required min="1" step="any"
                    placeholder="e.g. 500"
                    value={form.quantity} onChange={e => set('quantity', e.target.value)} />
                </div>
                <div>
                  <label className="label">Unit</label>
                  <select className="select" value={form.unit} onChange={e => set('unit', e.target.value)}>
                    {['kg','litre','piece','box','packet','bottle'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Estimated arrival date</label>
                <input type="date" className="input" value={form.estimatedArrival}
                  onChange={e => set('estimatedArrival', e.target.value)} />
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <textarea className="input" rows={3}
                  placeholder="Any special handling, conditions, or notes..."
                  value={form.notes} onChange={e => set('notes', e.target.value)} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving || !form.disasterId}
            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2">
            <HeartIcon className="h-5 w-5" />
            {saving ? 'Logging donation...' : 'Submit donation'}
          </button>
        </form>
      )}
    </div>
  );
};

export default NgoDonate;