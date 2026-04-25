import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { usePolling } from '../../hooks/usePolling';
import { getMyTasks } from '../../api/distributions';
import { updateDistStatus } from '../../api/distributions';
import Badge from '../../components/ui/Badge';
import PriorityBadge from '../../components/ui/PriorityBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import MapView from '../../components/ui/MapView';
import { formatDate } from '../../utils/helpers';
import { PhoneIcon, MapPinIcon, UserGroupIcon } from '@heroicons/react/24/outline';

const VolunteerTask = () => {
  const [filter, setFilter]   = useState('');
  const [expanded, setExpanded] = useState(null);
  const [updating, setUpdating] = useState(null);

  const { data, loading, refetch } = usePolling(
  getMyTasks, filter ? { status: filter } : {}, [filter], 10000);
  
  const tasks = data?.tasks || [];

  const handleUpdate = async (id, status) => {
    setUpdating(id);
    try {
      await updateDistStatus(id, { status });
      toast.success(`Marked as ${status}`);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setUpdating(null); }
  };

  const statusButtons = {
    Assigned:   { next: 'Dispatched', label: 'Mark dispatched', cls: 'btn-primary' },
    Dispatched: { next: 'Delivered',  label: 'Mark delivered',  cls: 'btn-success' },
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="page-title">My delivery tasks</h1>
        <p className="text-neutral-500 text-sm mt-1">Manage and complete your assigned deliveries</p>
      </div>

      {/* Filter bar */}
      <div className="flex gap-1.5 flex-wrap">
        {['','Assigned','Dispatched','Delivered'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all
              ${filter === s
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-neutral-200 text-neutral-600 hover:border-primary-300'}`}>
            {s || 'All tasks'}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner className="py-12" /> : tasks.length === 0 ? (
        <div className="card p-12 text-center text-neutral-400">No tasks found</div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, i) => (
            <motion.div key={task._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card overflow-hidden"
            >
              {/* Task header */}
              <div className="p-4 cursor-pointer hover:bg-neutral-50 transition-colors"
                   onClick={() => setExpanded(expanded === task._id ? null : task._id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-neutral-900">{task.victimId?.name}</p>
                      <PriorityBadge score={task.victimId?.priorityScore || 0} />
                    </div>
                    <p className="text-sm text-neutral-600">
                      {task.quantity} {task.itemId?.unit} of <strong>{task.itemId?.itemName}</strong>
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-neutral-400">
                      <MapPinIcon className="h-3.5 w-3.5" />
                      <span className="truncate">{task.victimId?.address}</span>
                    </div>
                  </div>
                  <Badge status={task.status} />
                </div>

                {/* Action buttons */}
                {statusButtons[task.status] && (
                  <div className="mt-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUpdate(task._id, statusButtons[task.status].next); }}
                      disabled={updating === task._id}
                      className={`${statusButtons[task.status].cls} text-sm py-2 px-4`}
                    >
                      {updating === task._id ? 'Updating...' : statusButtons[task.status].label}
                    </button>
                  </div>
                )}
              </div>

              {/* Expanded detail */}
              {expanded === task._id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="border-t border-neutral-100 p-4 space-y-4"
                >
                  {/* Victim info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-neutral-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <PhoneIcon className="h-4 w-4 text-neutral-400" />
                        <span className="text-xs text-neutral-400 uppercase tracking-wide">Contact</span>
                      </div>
                      <p className="font-semibold text-neutral-900">{task.victimId?.phone}</p>
                    </div>
                    <div className="bg-neutral-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <UserGroupIcon className="h-4 w-4 text-neutral-400" />
                        <span className="text-xs text-neutral-400 uppercase tracking-wide">Family</span>
                      </div>
                      <p className="font-semibold text-neutral-900">{task.victimId?.familySize} members</p>
                    </div>
                  </div>

                  {/* Required items */}
                  {task.victimId?.requiredItems?.length > 0 && (
                    <div>
                      <p className="text-xs text-neutral-400 uppercase tracking-wide mb-2">Victim also needs</p>
                      <div className="flex flex-wrap gap-1.5">
                        {task.victimId.requiredItems.map(item => (
                          <span key={item} className="chip bg-neutral-100 text-neutral-600 text-xs">{item}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {task.notes && (
                    <div className="bg-warning-50 rounded-xl p-3 text-sm text-warning-700">
                      <strong>Notes:</strong> {task.notes}
                    </div>
                  )}

                  <div className="text-xs text-neutral-400">
                    Disaster: {task.disasterId?.title} · Created {formatDate(task.createdAt)}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VolunteerTask;