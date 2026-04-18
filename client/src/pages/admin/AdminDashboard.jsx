import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApi } from '../../hooks/useApi';
import { getPlatformOverview } from '../../api/analytics';
import { getDisasters } from '../../api/disasters';
import { getDashboard } from '../../api/analytics';
import StatCard from '../../components/ui/StatCard';
import MapView from '../../components/ui/MapView';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDate } from '../../utils/helpers';
import {
  UserGroupIcon, TruckIcon, ArchiveBoxIcon,
  HandRaisedIcon, MegaphoneIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['#639922','#185FA5','#BA7517','#E24B4A','#1D9E75'];

const AdminDashboard = () => {
  const [selectedDisaster, setSelectedDisaster] = useState(null);

  const { data: overview, loading: ovLoading } = useApi(getPlatformOverview);
  const { data: disastersData }                = useApi(getDisasters, { status: 'active' }, []);
  const { data: chartData, loading: chartLoad } = useApi(
    getDashboard,
    selectedDisaster,
    [selectedDisaster]
  );

  const disasters = disastersData?.disasters || [];

  // Stat cards from platform overview
  const userStats  = overview?.userStats  || [];
  const distStats  = overview?.distributionStats || {};
  const getUserCount = (role) => userStats.find(u => u._id === role)?.count || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Operations Dashboard</h1>
          <p className="text-neutral-500 text-sm mt-1">Real-time disaster relief overview</p>
        </div>
        <select
          className="select max-w-xs"
          value={selectedDisaster || ''}
          onChange={e => setSelectedDisaster(e.target.value || null)}
        >
          <option value="">Select disaster for charts</option>
          {disasters.map(d => (
            <option key={d._id} value={d._id}>{d.title}</option>
          ))}
        </select>
      </div>

      {/* Stat cards */}
      {ovLoading ? <LoadingSpinner className="py-12" /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Victims registered" value={getUserCount('citizen')}   icon={UserGroupIcon}  color="primary" delay={0}    sub="across all disasters" subColor="neutral" />
          <StatCard label="Distributions"       value={distStats.total || 0}     icon={TruckIcon}      color="warning" delay={0.05} sub={`${distStats.delivered || 0} delivered`} subColor="up" />
          <StatCard label="Volunteers"          value={getUserCount('volunteer')} icon={HandRaisedIcon} color="teal"    delay={0.1}  sub="registered" subColor="neutral" />
          <StatCard label="Active disasters"    value={disasters.length}          icon={MegaphoneIcon}  color="danger"  delay={0.15} sub="requiring attention" subColor="warn" />
        </div>
      )}

      {/* Map */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card p-5">
        <h2 className="section-title mb-4">Disaster locations</h2>
        <MapView disasters={disasters} height="280px" />
      </motion.div>

      {/* Charts */}
      {selectedDisaster && (
        chartLoad ? <LoadingSpinner className="py-12" /> : chartData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Chart 1: Victims over time */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
              <h2 className="section-title mb-4">Victims registered — daily</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData.charts?.victimRegistrationsOverTime || []}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" stroke="#185FA5" strokeWidth={2.5}
                        dot={{ r: 3, fill: '#185FA5' }} name="Victims" />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Chart 2: Distribution status */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-5">
              <h2 className="section-title mb-4">Distribution status</h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={chartData.charts?.distributionStatusBreakdown || []}
                       dataKey="count" nameKey="status"
                       cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                    {(chartData.charts?.distributionStatusBreakdown || []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Chart 3: Inventory stock */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
              <h2 className="section-title mb-4">Inventory stock levels</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData.charts?.inventoryStockLevels || []} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="itemName" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="available"    name="Available"    fill="#185FA5" radius={[0,4,4,0]} />
                  <Bar dataKey="distributed"  name="Distributed"  fill="#EAF3DE" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Chart 4: Volunteer activity */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-5">
              <h2 className="section-title mb-4">Volunteer activity</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData.charts?.volunteerActivity || []} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="volunteerName" type="category" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="delivered" name="Delivered" fill="#1D9E75" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        )
      )}

      {/* Active disasters table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card">
        <div className="p-5 border-b border-neutral-100">
          <h2 className="section-title">Active disasters</h2>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th><th>Type</th><th>Location</th>
                <th>Severity</th><th>Victims</th><th>Started</th>
              </tr>
            </thead>
            <tbody>
              {disasters.map(d => (
                <tr key={d._id}>
                  <td className="font-semibold text-neutral-900">{d.title}</td>
                  <td className="capitalize">{d.type}</td>
                  <td>{d.location}</td>
                  <td>
                    <span className={`chip capitalize
                      ${d.severity === 'critical' ? 'bg-danger-50 text-danger-600'
                      : d.severity === 'high'     ? 'bg-warning-50 text-warning-600'
                      : 'bg-primary-50 text-primary-600'}`}>
                      {d.severity}
                    </span>
                  </td>
                  <td className="font-semibold">{d.totalVictimsRegistered}</td>
                  <td className="text-neutral-400">{formatDate(d.startDate)}</td>
                </tr>
              ))}
              {disasters.length === 0 && (
                <tr><td colSpan={6} className="text-center text-neutral-400 py-8">No active disasters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;