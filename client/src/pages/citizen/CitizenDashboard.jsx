import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { getMyRegistrations } from '../../api/victims';
import { getMyTracking } from '../../api/distributions';
import { getDisasters } from '../../api/disasters';
import MapView from '../../components/ui/MapView';
import Badge from '../../components/ui/Badge';
import LifecycleBar from '../../components/ui/LifecycleBar';
import PriorityBadge from '../../components/ui/PriorityBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDate } from '../../utils/helpers';
import {
  UserGroupIcon, TruckIcon, MapPinIcon, PlusCircleIcon,
} from '@heroicons/react/24/outline';

const CitizenDashboard = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');

  const { data: regData,  loading: regLoad  } = useApi(getMyRegistrations);
  const { data: trackData, loading: trackLoad } = useApi(getMyTracking);
  const { data: disData }                       = useApi(getDisasters, { status: 'active' });

  const registrations  = regData?.victims       || [];
  const distributions  = trackData?.distributions || [];
  const disasters      = disData?.disasters      || [];

  const activeReg     = registrations.find(r => r.disasterId?.status === 'active');
  const pendingDists  = distributions.filter(d => !['Delivered','Closed'].includes(d.status));
  const deliveredCount = distributions.filter(d => d.status === 'Delivered').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="card p-6 bg-gradient-to-r from-primary-600 to-primary-800 text-white border-0"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-primary-200 text-sm font-medium mb-1">Welcome back</p>
            <h1 className="font-display font-bold text-2xl mb-2">{user?.name}</h1>
            <p className="text-primary-100 text-sm">{user?.region || 'No region set'}</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center font-display font-bold text-xl">
            {user?.name?.charAt(0)}
          </div>
        </div>
        {activeReg && (
          <div className="mt-4 bg-white/10 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-primary-200">Active registration</p>
              <p className="font-semibold text-white text-sm mt-0.5">{activeReg.disasterId?.title}</p>
            </div>
            <Badge status={activeReg.status} />
          </div>
        )}
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Registrations', val: registrations.length, icon: UserGroupIcon,  color: 'text-primary-600 bg-primary-50' },
          { label: 'Aid in transit', val: pendingDists.length,  icon: TruckIcon,      color: 'text-warning-600 bg-warning-50' },
          { label: 'Delivered',      val: deliveredCount,        icon: MapPinIcon,     color: 'text-success-600 bg-success-50' },
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

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl w-fit">
        {['overview','track','map'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize
              ${tab === t ? 'bg-white text-neutral-900 shadow-card' : 'text-neutral-500 hover:text-neutral-700'}`}>
            {t === 'map' ? 'Relief Map' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {regLoad ? <LoadingSpinner className="py-8" /> : registrations.length === 0 ? (
            <div className="card p-10 text-center">
              <PlusCircleIcon className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500 font-medium mb-4">You haven't registered for any disaster yet</p>
              <Link to="/citizen/register" className="btn-primary">Register for relief aid</Link>
            </div>
          ) : registrations.map(reg => (
            <motion.div key={reg._id}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              className="card card-hover p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-neutral-900">{reg.disasterId?.title || 'Disaster event'}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {reg.disasterId?.location} · {formatDate(reg.createdAt)}
                  </p>
                </div>
                <Badge status={reg.status} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-neutral-400 mb-0.5">Family size</p>
                  <p className="font-medium">{reg.familySize} members</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400 mb-0.5">Severity</p>
                  <p className="font-medium">{reg.severity}/5</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs text-neutral-400 mb-1.5">Priority score</p>
                <PriorityBadge score={reg.priorityScore} />
              </div>
              {reg.adminNotes && (
                <div className="mt-3 p-3 bg-warning-50 rounded-xl text-xs text-warning-700">
                  <strong>Admin note:</strong> {reg.adminNotes}
                </div>
              )}
            </motion.div>
          ))}
          {registrations.length > 0 && (
            <Link to="/citizen/register" className="btn-secondary w-full text-center block py-3">
              Register for another disaster
            </Link>
          )}
        </div>
      )}

      {/* Track tab */}
      {tab === 'track' && (
        <div className="space-y-4">
          {trackLoad ? <LoadingSpinner className="py-8" /> : distributions.length === 0 ? (
            <div className="card p-10 text-center text-neutral-400">
              No distributions assigned yet. Register and wait for admin approval.
            </div>
          ) : distributions.map(dist => (
            <motion.div key={dist._id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="card p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-neutral-900">
                    {dist.quantity} {dist.itemId?.unit} of {dist.itemId?.itemName}
                  </p>
                  <p className="text-xs text-neutral-400">{dist.disasterId?.title}</p>
                </div>
                <Badge status={dist.status} />
              </div>
              <LifecycleBar currentStatus={dist.status} />
              {dist.assignedVolunteerId && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <div className="h-7 w-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center text-xs font-bold">
                    {dist.assignedVolunteerId.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400">Assigned volunteer</p>
                    <p className="font-medium text-neutral-800 text-sm">{dist.assignedVolunteerId.name}</p>
                  </div>
                </div>
              )}
              {dist.deliveredAt && (
                <p className="text-xs text-success-600 mt-2 font-medium">
                  Delivered on {formatDate(dist.deliveredAt)}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Map tab */}
      {tab === 'map' && (
        <div className="card p-5">
          <h2 className="section-title mb-4">Active disaster locations & relief centers</h2>
          <MapView disasters={disasters} height="320px" />
          <div className="mt-4 flex gap-4 text-xs text-neutral-500">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-danger-400"></div>
              Disaster zone
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-primary-600"></div>
              Relief center
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitizenDashboard;