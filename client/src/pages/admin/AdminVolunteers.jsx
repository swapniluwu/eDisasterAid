import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useApi } from '../../hooks/useApi';
import { getVolunteers, assignZone, updateSkills } from '../../api/volunteers';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const SKILLS = ['medical','logistics','driving','food','rescue','communication'];

const AdminVolunteers = () => {
  const [search, setSearch]   = useState('');
  const [editing, setEditing] = useState(null);
  const [zone, setZone]       = useState('');
  const [skills, setSkills]   = useState([]);

  const { data, loading, refetch } = useApi(getVolunteers, { search }, [search]);
  const volunteers = data?.volunteers || [];

  const startEdit = (vol) => {
    setEditing(vol._id);
    setZone(vol.region || '');
    setSkills(vol.skillTags || []);
  };

  const handleSave = async (id) => {
    try {
      await Promise.all([
        assignZone(id, { region: zone }),
        updateSkills(id, { skillTags: skills }),
      ]);
      toast.success('Volunteer updated');
      setEditing(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const toggleSkill = (s) => {
    setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Volunteer Management</h1>
        <p className="text-neutral-500 text-sm mt-1">Assign zones and manage skill tags</p>
      </div>

      <div className="card p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input className="input pl-9" placeholder="Search volunteers..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? <LoadingSpinner className="py-12" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {volunteers.map((vol) => (
            <motion.div key={vol._id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="card card-hover p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-display font-bold text-lg">
                    {vol.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900">{vol.name}</p>
                    <p className="text-xs text-neutral-400">{vol.email}</p>
                  </div>
                </div>
                <span className={`chip text-xs ${vol.isActive ? 'bg-success-50 text-success-700' : 'bg-neutral-100 text-neutral-400'}`}>
                  {vol.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: 'Total', val: vol.stats?.totalTasks || 0 },
                  { label: 'Done',  val: vol.stats?.completedTasks || 0, color: 'text-success-600' },
                  { label: 'Pending', val: vol.stats?.pendingTasks || 0, color: 'text-warning-600' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-neutral-50 rounded-xl p-2 text-center">
                    <p className={`font-bold text-lg ${color || 'text-neutral-900'}`}>{val}</p>
                    <p className="text-[10px] text-neutral-400">{label}</p>
                  </div>
                ))}
              </div>

              {editing === vol._id ? (
                <div className="space-y-3">
                  <div>
                    <label className="label">Zone / Region</label>
                    <input className="input" placeholder="e.g. Ludhiana North"
                      value={zone} onChange={e => setZone(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Skills</label>
                    <div className="flex flex-wrap gap-1.5">
                      {SKILLS.map(s => (
                        <button key={s} type="button" onClick={() => toggleSkill(s)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all
                            ${skills.includes(s) ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(null)} className="btn-secondary flex-1 text-sm py-2">Cancel</button>
                    <button onClick={() => handleSave(vol._id)} className="btn-primary flex-1 text-sm py-2">Save</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-neutral-400">Zone:</span>
                    <span className="font-medium text-neutral-700">{vol.region || '—'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(vol.skillTags || []).map(s => (
                      <span key={s} className="chip bg-primary-50 text-primary-700 text-[10px]">{s}</span>
                    ))}
                    {(!vol.skillTags || vol.skillTags.length === 0) && (
                      <span className="text-xs text-neutral-400">No skills set</span>
                    )}
                  </div>
                  <button onClick={() => startEdit(vol)}
                    className="w-full text-xs py-2 rounded-xl border border-neutral-200 text-neutral-600 hover:border-primary-300 hover:text-primary-600 transition-colors font-medium mt-1">
                    Edit zone & skills
                  </button>
                </div>
              )}
            </motion.div>
          ))}
          {volunteers.length === 0 && (
            <div className="col-span-2 card p-12 text-center text-neutral-400">No volunteers registered yet</div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminVolunteers;