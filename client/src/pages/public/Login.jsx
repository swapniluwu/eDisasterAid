import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ShieldCheckIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { loginUser } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm]         = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);

  const roleDestination = {
    admin: '/admin', citizen: '/citizen', volunteer: '/volunteer', ngo: '/ngo',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await loginUser(form);
      login(data.data.token, data.data.user);
      toast.success(`Welcome back, ${data.data.user.name}!`);
      navigate(roleDestination[data.data.user.role] || '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-600 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute border border-white rounded-full"
              style={{ width: `${(i+1)*120}px`, height: `${(i+1)*120}px`,
                       top: '50%', left: '50%',
                       transform: 'translate(-50%,-50%)' }} />
          ))}
        </div>
        <Link to="/" className="flex items-center gap-2 relative z-10">
          <div className="h-9 w-9 bg-white/20 rounded-xl flex items-center justify-center">
            <ShieldCheckIcon className="h-5 w-5 text-white" />
          </div>
          <span className="font-display font-bold text-white text-xl">e-DisasterAid</span>
        </Link>
        <div className="relative z-10">
          <h2 className="font-display font-bold text-4xl text-white leading-tight mb-4">
            Coordinating relief,<br />saving lives.
          </h2>
          <p className="text-primary-100 text-lg leading-relaxed">
            A unified platform for disaster response — transparent, fast, and accountable.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 relative z-10">
          {[['1,200+','Victims served'],['48','Volunteers active'],['24','Items tracked'],['100%','Transparent']].map(([v,l]) => (
            <div key={l} className="bg-white/10 rounded-2xl p-4">
              <div className="font-display font-bold text-2xl text-white">{v}</div>
              <div className="text-primary-200 text-sm">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-8 w-8 bg-primary-600 rounded-xl flex items-center justify-center">
              <ShieldCheckIcon className="h-4 w-4 text-white" />
            </div>
            <span className="font-display font-bold text-neutral-900 text-lg">e-DisasterAid</span>
          </div>

          <h1 className="font-display font-bold text-3xl text-neutral-900 mb-2">Welcome back</h1>
          <p className="text-neutral-500 mb-8">Sign in to access your dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input
                type="email" required
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} required
                  className="input pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
                <button type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-neutral-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-semibold hover:underline">
              Register here
            </Link>
          </p>

          {/* Quick login hint for dev */}
          <div className="mt-8 p-4 bg-neutral-100 rounded-2xl">
            <p className="text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wide">Quick test roles</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-neutral-600">
              <span>Admin: admin@edisasteraid.com</span>
              <span>Citizen: rahul@gmail.com</span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">Password: password123 / admin123</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;