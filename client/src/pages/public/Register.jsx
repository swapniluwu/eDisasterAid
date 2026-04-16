import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { registerUser } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';

const ROLES = [
  { value: 'citizen',   label: 'Citizen',   desc: 'Register for disaster relief aid',     color: 'border-primary-300 bg-primary-50' },
  { value: 'volunteer', label: 'Volunteer',  desc: 'Help deliver aid to victims',          color: 'border-teal-300 bg-teal-50' },
  { value: 'ngo',       label: 'NGO / Donor', desc: 'Donate resources and track impact',  color: 'border-warning-300 bg-warning-50' },
];

const SKILLS = ['medical','logistics','driving','food','rescue','communication'];

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: '',
    phone: '', region: '', skillTags: [],
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleSkill = (s) => {
    set('skillTags', form.skillTags.includes(s)
      ? form.skillTags.filter(x => x !== s)
      : [...form.skillTags, s]
    );
  };

  const roleDestination = {
    admin: '/admin', citizen: '/citizen', volunteer: '/volunteer', ngo: '/ngo',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await registerUser(form);
      login(data.data.token, data.data.user);
      toast.success('Account created successfully!');
      navigate(roleDestination[data.data.user.role] || '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
          <div className="h-8 w-8 bg-primary-600 rounded-xl flex items-center justify-center">
            <ShieldCheckIcon className="h-4 w-4 text-white" />
          </div>
          <span className="font-display font-bold text-neutral-900 text-lg">e-DisasterAid</span>
        </Link>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {[1,2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                ${step >= s ? 'bg-primary-600 text-white' : 'bg-neutral-200 text-neutral-400'}`}>
                {s}
              </div>
              {s < 2 && <div className={`h-0.5 w-12 transition-colors ${step > s ? 'bg-primary-400' : 'bg-neutral-200'}`} />}
            </div>
          ))}
        </div>

        <div className="card p-8">
          {step === 1 ? (
            <>
              <h1 className="font-display font-bold text-2xl text-neutral-900 mb-1">Choose your role</h1>
              <p className="text-neutral-500 text-sm mb-6">Select how you will use e-DisasterAid</p>
              <div className="space-y-3 mb-6">
                {ROLES.map(({ value, label, desc, color }) => (
                  <button key={value} type="button"
                    onClick={() => set('role', value)}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-150
                      ${form.role === value ? `${color} border-opacity-100` : 'border-neutral-100 hover:border-neutral-200 bg-white'}`}
                  >
                    <div className="font-semibold text-neutral-900">{label}</div>
                    <div className="text-sm text-neutral-500 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => form.role && setStep(2)}
                disabled={!form.role}
                className="btn-primary w-full py-3"
              >
                Continue
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <h1 className="font-display font-bold text-2xl text-neutral-900 mb-1">Your details</h1>
              <p className="text-neutral-500 text-sm mb-6">
                Registering as <span className="font-semibold text-primary-600 capitalize">{form.role}</span>
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Full name</label>
                    <input className="input" required placeholder="Your name"
                      value={form.name} onChange={e => set('name', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input className="input" placeholder="10-digit number"
                      value={form.phone} onChange={e => set('phone', e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" required placeholder="you@example.com"
                    value={form.email} onChange={e => set('email', e.target.value)} />
                </div>

                <div>
                  <label className="label">Password</label>
                  <input type="password" className="input" required placeholder="Min. 6 characters"
                    value={form.password} onChange={e => set('password', e.target.value)} />
                </div>

                <div>
                  <label className="label">Region / District</label>
                  <input className="input" placeholder="e.g. Ludhiana, Punjab"
                    value={form.region} onChange={e => set('region', e.target.value)} />
                </div>

                {form.role === 'volunteer' && (
                  <div>
                    <label className="label">Skill tags</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {SKILLS.map(s => (
                        <button key={s} type="button"
                          onClick={() => toggleSkill(s)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                            ${form.skillTags.includes(s)
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                  Back
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
                  {loading ? 'Creating account...' : 'Create account'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-neutral-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 font-semibold hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;