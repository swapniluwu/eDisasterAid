import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { usePolling } from '../../hooks/usePolling';
import { getMyVolDashboard } from '../../api/volunteers';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PriorityBadge from '../../components/ui/PriorityBadge';
import { formatDate } from '../../utils/helpers';
import {
  CheckCircleIcon, TruckIcon, ClockIcon, MapPinIcon,
} from '@heroicons/react/24/outline';

const VolunteerDashboard = () => {
  const { user } = useAuth();
  const { data, loading, refetch } = usePolling(getMyVolDashboard, null, [], 10000);

  const stats   = data?.stats   || {};
  const pending = data?.pendingTasks   || [];
  const done    = data?.completedTasks || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="card p-6 bg-gradient-to-r from-teal-600 to-teal-800 text-white border-0"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-teal-200 text-sm font-medium">Volunteer dashboard</p>
            <h1 className="font-display font-bold text-2xl mt-1">{user?.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <MapPinIcon className="h-4 w-4 text-teal-300" />
              <span className="text-teal-100 text-sm">{user?.region || 'No zone assigned'}</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center font-display font-bold text-xl">
            {user?.name?.charAt(0)}
          </div>
        </div>

        {/* Skill tags */}
        {user?.skillTags?.length > 0 && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {user.skillTags.map(s => (
              <span key={s} className="px-2.5 py-1 bg-white/15 rounded-lg text-xs font-medium text-teal-100 capitalize">
                {s}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Assigned',   val: stats.pending || 0,    icon: ClockIcon,       color: 'text-warning-600 bg-warning-50' },
          { label: 'Dispatched', val: stats.inProgress || 0, icon: TruckIcon,       color: 'text-primary-600 bg-primary-50' },
          { label: 'Delivered',  val: stats.completed || 0,  icon: CheckCircleIcon, color: 'text-success-600 bg-success-50' },
          { label: 'Total',      val: stats.totalAssigned||0, icon: MapPinIcon,     color: 'text-neutral-600 bg-neutral-100' },
        ].map(({ label, val, icon: Icon, color }, i) => (
          <motion.div key={label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="card p-4 text-center"
          >
            <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="font-display font-bold text-2xl text-neutral-900">{val}</p>
            <p className="text-xs text-neutral-400">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Pending tasks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Pending tasks ({pending.length})</h2>
          <Link to="/volunteer/tasks" className="text-sm text-primary-600 font-semibold hover:underline">
            View all
          </Link>
        </div>

        {loading ? <LoadingSpinner className="py-8" /> : pending.length === 0 ? (
          <div className="card p-10 text-center text-neutral-400">
            No pending tasks. Check back after the admin assigns deliveries.
          </div>
        ) : (
          <div className="space-y-3">
            {pending.slice(0, 5).map((task, i) => (
              <motion.div key={task._id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="card card-hover p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-900">{task.victimId?.name}</p>
                    <p className="text-xs text-neutral-400 mt-0.5 truncate">{task.victimId?.address}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <PriorityBadge score={task.victimId?.priorityScore || 0} />
                    <Badge status={task.status} />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className="text-neutral-600">
                    {task.quantity} {task.itemId?.unit} of <strong>{task.itemId?.itemName}</strong>
                  </span>
                  <span className="text-xs text-neutral-400">{task.victimId?.phone}</span>
                </div>
                {task.disasterId && (
                  <p className="text-xs text-neutral-400 mt-1">{task.disasterId.title}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Recent completions */}
      {done.length > 0 && (
        <div>
          <h2 className="section-title mb-3 text-neutral-500">Recent deliveries</h2>
          <div className="space-y-2">
            {done.slice(0, 3).map(task => (
              <div key={task._id} className="card p-3 flex items-center justify-between opacity-70">
                <div>
                  <p className="text-sm font-medium text-neutral-800">{task.victimId?.name}</p>
                  <p className="text-xs text-neutral-400">
                    {task.quantity} {task.itemId?.unit} of {task.itemId?.itemName}
                    {task.deliveredAt && ` · ${formatDate(task.deliveredAt)}`}
                  </p>
                </div>
                <Badge status="Delivered" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VolunteerDashboard;