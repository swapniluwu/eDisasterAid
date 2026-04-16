import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { getMyDonations } from '../../api/donations';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDate } from '../../utils/helpers';
import { HeartIcon, ArchiveBoxIcon, TruckIcon, PlusIcon } from '@heroicons/react/24/outline';

const NgoDashboard = () => {
  const { user } = useAuth();
  const { data, loading } = useApi(getMyDonations);

  const donations = data?.donations || [];
  const summary   = data?.summary   || {};

  const byCategory = summary.byCategory || {};
  const categories = Object.entries(byCategory);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="card p-6 bg-gradient-to-r from-warning-600 to-warning-800 text-white border-0"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-warning-200 text-sm font-medium">NGO dashboard</p>
            <h1 className="font-display font-bold text-2xl mt-1">{user?.name}</h1>
            <p className="text-warning-100 text-sm mt-1">{user?.region || 'No region set'}</p>
          </div>
          <Link to="/ngo/donate"
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            <PlusIcon className="h-4 w-4" />
            New donation
          </Link>
        </div>
      </motion.div>

      {/* Impact stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Items donated',     val: summary.totalDonations || 0,         icon: HeartIcon,     color: 'text-warning-600 bg-warning-50' },
          { label: 'Total quantity',    val: summary.totalQuantityDonated || 0,   icon: ArchiveBoxIcon, color: 'text-primary-600 bg-primary-50' },
          { label: 'Units distributed', val: summary.totalDistributed || 0,       icon: TruckIcon,      color: 'text-success-600 bg-success-50' },
        ].map(({ label, val, icon: Icon, color }, i) => (
          <motion.div key={label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="card p-4 text-center"
          >
            <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="font-display font-bold text-2xl text-neutral-900">{val}</p>
            <p className="text-xs text-neutral-400 mt-0.5">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Category breakdown */}
      {categories.length > 0 && (
        <div className="card p-5">
          <h2 className="section-title mb-4">Donations by category</h2>
          <div className="space-y-3">
            {categories.map(([cat, stats]) => {
              const pct = stats.totalQuantity > 0
                ? Math.round((stats.distributed / stats.totalQuantity) * 100)
                : 0;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className="font-medium text-neutral-700 capitalize">{cat}</span>
                    <span className="text-neutral-400">{stats.distributed}/{stats.totalQuantity} distributed</span>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      className="h-full bg-warning-400 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Donations table */}
      <div className="card">
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="section-title">Your donations</h2>
          <Link to="/ngo/donate" className="btn-primary text-sm py-2 flex items-center gap-1.5">
            <PlusIcon className="h-4 w-4" /> Donate
          </Link>
        </div>

        {loading ? <LoadingSpinner className="py-8" /> : donations.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            You haven't made any donations yet.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th><th>Disaster</th><th>Quantity</th>
                  <th>Distributed</th><th>Status</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {donations.map(d => {
                  const utilPct = (d.quantity + d.totalDistributed) > 0
                    ? Math.round((d.totalDistributed / (d.quantity + d.totalDistributed)) * 100)
                    : 0;
                  return (
                    <tr key={d._id}>
                      <td>
                        <p className="font-semibold text-neutral-900">{d.itemName}</p>
                        <span className="chip bg-neutral-100 text-neutral-500 text-[10px] capitalize">{d.category}</span>
                      </td>
                      <td className="text-sm text-neutral-600">{d.disasterId?.title || '—'}</td>
                      <td className="font-semibold">{d.quantity} {d.unit}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden min-w-[40px]">
                            <div className="h-full bg-success-400 rounded-full"
                                 style={{ width: `${utilPct}%` }} />
                          </div>
                          <span className="text-xs text-neutral-500">{utilPct}%</span>
                        </div>
                      </td>
                      <td>
                        {d.isLowStock
                          ? <span className="chip bg-danger-50 text-danger-600">Low stock</span>
                          : <span className="chip bg-success-50 text-success-600">Available</span>
                        }
                      </td>
                      <td className="text-xs text-neutral-400">{formatDate(d.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default NgoDashboard;