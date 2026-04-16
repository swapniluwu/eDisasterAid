import { motion } from 'framer-motion';
import { useApi } from '../../hooks/useApi';
import { getMyTracking } from '../../api/distributions';
import Badge from '../../components/ui/Badge';
import LifecycleBar from '../../components/ui/LifecycleBar';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDate, formatDateTime } from '../../utils/helpers';
import { TruckIcon } from '@heroicons/react/24/outline';

const CitizenTrack = () => {
  const { data, loading, refetch } = useApi(getMyTracking);
  const distributions = data?.distributions || [];

  const active    = distributions.filter(d => !['Delivered','Closed'].includes(d.status));
  const completed = distributions.filter(d =>  ['Delivered','Closed'].includes(d.status));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Track your aid</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Real-time status of all your relief distributions
        </p>
      </div>

      {loading ? <LoadingSpinner className="py-12" /> : distributions.length === 0 ? (
        <div className="card p-16 text-center">
          <TruckIcon className="h-14 w-14 text-neutral-200 mx-auto mb-4" />
          <p className="text-neutral-500 font-medium">No distributions yet</p>
          <p className="text-sm text-neutral-400 mt-1">
            Once your registration is verified and aid is assigned, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Active distributions */}
          {active.length > 0 && (
            <div>
              <h2 className="section-title mb-3">In progress ({active.length})</h2>
              <div className="space-y-4">
                {active.map((dist, i) => (
                  <motion.div key={dist._id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="card p-5 border-l-4 border-primary-400"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-display font-semibold text-lg text-neutral-900">
                          {dist.quantity} {dist.itemId?.unit} of {dist.itemId?.itemName}
                        </p>
                        <p className="text-sm text-neutral-500 mt-0.5">
                          {dist.disasterId?.title} · {dist.disasterId?.location}
                        </p>
                      </div>
                      <Badge status={dist.status} />
                    </div>

                    {/* Lifecycle bar */}
                    <LifecycleBar currentStatus={dist.status} />

                    {/* Details grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                      {dist.assignedVolunteerId && (
                        <div className="bg-neutral-50 rounded-xl p-3">
                          <p className="text-[10px] text-neutral-400 uppercase tracking-wide mb-1">Volunteer</p>
                          <p className="text-sm font-semibold text-neutral-900">
                            {dist.assignedVolunteerId.name}
                          </p>
                          {dist.assignedVolunteerId.phone && (
                            <p className="text-xs text-neutral-500">{dist.assignedVolunteerId.phone}</p>
                          )}
                        </div>
                      )}
                      <div className="bg-neutral-50 rounded-xl p-3">
                        <p className="text-[10px] text-neutral-400 uppercase tracking-wide mb-1">Created</p>
                        <p className="text-sm font-semibold text-neutral-900">{formatDate(dist.createdAt)}</p>
                      </div>
                      {dist.notes && (
                        <div className="bg-neutral-50 rounded-xl p-3">
                          <p className="text-[10px] text-neutral-400 uppercase tracking-wide mb-1">Notes</p>
                          <p className="text-sm text-neutral-700">{dist.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Status history */}
                    {dist.statusHistory?.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-neutral-400 uppercase tracking-wide mb-2">Status timeline</p>
                        <div className="space-y-2">
                          {[...dist.statusHistory].reverse().map((h, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <div className={`h-2 w-2 rounded-full flex-shrink-0
                                ${idx === 0 ? 'bg-primary-600' : 'bg-neutral-300'}`} />
                              <div className="flex items-center gap-2 text-xs flex-1">
                                <span className={`font-semibold
                                  ${idx === 0 ? 'text-primary-600' : 'text-neutral-500'}`}>
                                  {h.stage}
                                </span>
                                <span className="text-neutral-400">{formatDateTime(h.changedAt)}</span>
                                {h.note && (
                                  <span className="text-neutral-400 hidden md:inline">— {h.note}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Completed distributions */}
          {completed.length > 0 && (
            <div>
              <h2 className="section-title mb-3 text-neutral-500">Completed ({completed.length})</h2>
              <div className="space-y-3">
                {completed.map(dist => (
                  <div key={dist._id} className="card p-4 opacity-75">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-neutral-800">
                          {dist.quantity} {dist.itemId?.unit} of {dist.itemId?.itemName}
                        </p>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {dist.disasterId?.title}
                          {dist.deliveredAt && ` · Delivered ${formatDate(dist.deliveredAt)}`}
                        </p>
                      </div>
                      <Badge status={dist.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CitizenTrack;