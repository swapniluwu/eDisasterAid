import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { getDisasters } from '../../api/disasters';
import { registerVictim } from '../../api/victims';
import { calcPreviewScore, getPriorityColor, getPriorityLabel } from '../../utils/helpers';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const ITEMS = ['Rice','Water','Blankets','Medicine','Clothing','Cooking Gas','Torch/Batteries','First Aid Kit'];

const CitizenRegister = () => {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    disasterId: '', name: user?.name || '', phone: user?.phone || '',
    address: '', familySize: '', severity: '',
    hasElderly: false, hasChildren: false, hasDisabled: false,
    requiredItems: [],
  });

  const { data: disData, loading } = useApi(getDisasters, { status: 'active' });
  const disasters = disData?.disasters || [];

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const previewScore = form.severity && form.familySize
    ? calcPreviewScore({
        severity:   parseInt(form.severity),
        familySize: parseInt(form.familySize),
        hasElderly: form.hasElderly,
        hasChildren: form.hasChildren,
      })
    : null;

  const toggleItem = (item) => {
    set('requiredItems', form.requiredItems.includes(item)
      ? form.requiredItems.filter(x => x !== item)
      : [...form.requiredItems, item]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.disasterId) return toast.error('Please select a disaster');
    if (!form.severity)   return toast.error('Please select severity');
    setSaving(true);
    try {
      await registerVictim({
        ...form,
        familySize: parseInt(form.familySize),
        severity:   parseInt(form.severity),
      });
      toast.success('Registration submitted! Awaiting admin verification.');
      navigate('/citizen');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setSaving(false); }
  };

  if (loading) return <LoadingSpinner className="py-20" />;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">Register for disaster relief</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Your information will be reviewed by an admin before you enter the distribution queue
        </p>
      </div>

      {disasters.length === 0 ? (
        <div className="card p-12 text-center text-neutral-400">
          No active disaster events at this time. Check back later.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Disaster selector */}
          <div className="card p-5">
            <h2 className="section-title mb-4">Select disaster event</h2>
            <div className="space-y-2">
              {disasters.map(d => (
                <button key={d._id} type="button"
                  onClick={() => set('disasterId', d._id)}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all
                    ${form.disasterId === d._id
                      ? 'border-primary-400 bg-primary-50'
                      : 'border-neutral-100 hover:border-neutral-200 bg-white'}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-neutral-900">{d.title}</p>
                      <p className="text-sm text-neutral-500 mt-0.5">{d.location}</p>
                    </div>
                    <span className={`chip capitalize text-xs
                      ${d.severity === 'critical' ? 'bg-danger-50 text-danger-600'
                      : d.severity === 'high' ? 'bg-warning-50 text-warning-600'
                      : 'bg-primary-50 text-primary-600'}`}>
                      {d.severity}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Personal info */}
          <div className="card p-5">
            <h2 className="section-title mb-4">Personal information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Full name</label>
                  <input className="input" required placeholder="Your full name"
                    value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div>
                  <label className="label">Phone number</label>
                  <input className="input" required placeholder="10-digit number"
                    pattern="[0-9]{10}" value={form.phone}
                    onChange={e => set('phone', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Affected address</label>
                <input className="input" required placeholder="Full address of affected property"
                  value={form.address} onChange={e => set('address', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Family size</label>
                  <input type="number" className="input" required min="1" max="50"
                    placeholder="Number of people" value={form.familySize}
                    onChange={e => set('familySize', e.target.value)} />
                </div>
                <div>
                  <label className="label">Damage severity</label>
                  <div className="flex gap-1.5 mt-1">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} type="button"
                        onClick={() => set('severity', n.toString())}
                        className={`flex-1 h-10 rounded-xl font-bold text-sm transition-all
                          ${parseInt(form.severity) === n
                            ? n >= 4 ? 'bg-danger-400 text-white'
                              : n >= 3 ? 'bg-warning-400 text-white'
                              : 'bg-primary-600 text-white'
                            : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">1 = Minor damage, 5 = Complete loss</p>
                </div>
              </div>
            </div>
          </div>

          {/* Vulnerability flags */}
          <div className="card p-5">
            <h2 className="section-title mb-4">Vulnerability factors</h2>
            <p className="text-xs text-neutral-400 mb-3">These factors increase your priority score</p>
            <div className="space-y-2">
              {[
                { key: 'hasElderly',  label: 'Elderly or disabled family member present', bonus: '+3 points' },
                { key: 'hasChildren', label: 'Children under 10 years present',           bonus: '+2 points' },
                { key: 'hasDisabled', label: 'Person with disability present',            bonus: '' },
              ].map(({ key, label, bonus }) => (
                <label key={key}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                    ${form[key] ? 'border-primary-300 bg-primary-50' : 'border-neutral-100 hover:border-neutral-200'}`}>
                  <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0
                    ${form[key] ? 'bg-primary-600 border-primary-600' : 'border-neutral-300'}`}
                    onClick={() => set(key, !form[key])}>
                    {form[key] && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  <span className="text-sm text-neutral-700 flex-1">{label}</span>
                  {bonus && <span className="chip bg-success-50 text-success-700 text-[10px]">{bonus}</span>}
                </label>
              ))}
            </div>
          </div>

          {/* Required items */}
          <div className="card p-5">
            <h2 className="section-title mb-4">Required items</h2>
            <p className="text-xs text-neutral-400 mb-3">Select what your family needs</p>
            <div className="flex flex-wrap gap-2">
              {ITEMS.map(item => (
                <button key={item} type="button"
                  onClick={() => toggleItem(item)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all
                    ${form.requiredItems.includes(item)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300'}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Priority preview */}
          {previewScore !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`card p-5 border-2 ${
                previewScore >= 60 ? 'border-danger-200 bg-danger-50'
                : previewScore >= 35 ? 'border-warning-200 bg-warning-50'
                : 'border-primary-200 bg-primary-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">
                    Estimated priority score
                  </p>
                  <p className="text-sm text-neutral-500">
                    Based on your inputs — final score assigned on verification
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-display font-bold text-4xl ${getPriorityColor(previewScore).split(' ')[0]}`}>
                    {previewScore}
                  </p>
                  <p className={`text-sm font-semibold ${getPriorityColor(previewScore).split(' ')[0]}`}>
                    {getPriorityLabel(previewScore)} priority
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 bg-white/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${previewScore}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    previewScore >= 60 ? 'bg-danger-400'
                    : previewScore >= 35 ? 'bg-warning-400'
                    : 'bg-primary-600'
                  }`}
                />
              </div>
            </motion.div>
          )}

          <button type="submit" disabled={saving || !form.disasterId}
            className="btn-primary w-full py-4 text-base">
            {saving ? 'Submitting registration...' : 'Submit registration'}
          </button>
        </form>
      )}
    </div>
  );
};

export default CitizenRegister;