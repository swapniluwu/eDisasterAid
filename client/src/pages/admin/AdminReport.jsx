import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApi } from '../../hooks/useApi';
import { getClosureReport } from '../../api/analytics';
import { getDisasters } from '../../api/disasters';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDate, formatDateTime } from '../../utils/helpers';
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const AdminReport = () => {
  const [disasterId, setDid] = useState('');
  const { data: disData }    = useApi(getDisasters);
  const { data, loading }    = useApi(getClosureReport, disasterId || null, [disasterId]);

  const disasters = disData?.disasters || [];
  const report    = data?.report;

  const handleExportCSV = () => {
    if (!report) return;
    const rows = [
      ['Disaster Report Export'],
      ['Title', report.disaster.title],
      ['Location', report.disaster.location],
      ['Type', report.disaster.type],
      ['Status', report.disaster.status],
      ['Start Date', formatDate(report.disaster.startDate)],
      ['End Date', report.disaster.endDate ? formatDate(report.disaster.endDate) : 'Ongoing'],
      ['Days Active', report.disaster.daysActive],
      [],
      ['Distribution Summary'],
      ['Item', 'Category', 'Unit', 'Quantity Distributed', 'Deliveries', 'Delivered'],
      ...(report.distributionSummary || []).map(d => [
        d._id, d.category, d.unit, d.totalQuantityDistributed, d.deliveryCount, d.deliveredCount,
      ]),
      [],
      ['Volunteer Summary'],
      ['Name', 'Region', 'Deliveries Completed', 'Total Qty Delivered'],
      ...(report.volunteerSummary || []).map(v => [
        v.name, v.region || '—', v.deliveriesCompleted, v.totalQuantityDelivered,
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${report.disaster.title.replace(/\s+/g, '_')}_report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Closure Reports</h1>
          <p className="text-neutral-500 text-sm mt-1">Full disaster operation summaries</p>
        </div>
        {report && (
          <button onClick={handleExportCSV} className="btn-secondary flex items-center gap-2">
            <DocumentArrowDownIcon className="h-4 w-4" />
            Export CSV
          </button>
        )}
      </div>

      <select className="select max-w-xs" value={disasterId} onChange={e => setDid(e.target.value)}>
        <option value="">Select a disaster</option>
        {disasters.map(d => <option key={d._id} value={d._id}>{d.title}</option>)}
      </select>

      {!disasterId ? (
        <div className="card p-12 text-center text-neutral-400">Select a disaster to generate its report</div>
      ) : loading ? <LoadingSpinner className="py-12" /> : report && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

          {/* Header */}
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-display font-bold text-2xl text-neutral-900">{report.disaster.title}</h2>
                <p className="text-neutral-500 mt-1">{report.disaster.location} · {report.disaster.type}</p>
              </div>
              <span className={`chip capitalize text-sm
                ${report.disaster.status === 'closed' ? 'bg-neutral-100 text-neutral-500'
                : report.disaster.status === 'active' ? 'bg-success-50 text-success-700'
                : 'bg-warning-50 text-warning-700'}`}>
                {report.disaster.status}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Start date', val: formatDate(report.disaster.startDate) },
                { label: 'End date',   val: report.disaster.endDate ? formatDate(report.disaster.endDate) : 'Ongoing' },
                { label: 'Days active', val: report.disaster.daysActive },
                { label: 'Severity',   val: report.disaster.severity },
              ].map(({ label, val }) => (
                <div key={label} className="bg-neutral-50 rounded-xl p-3">
                  <p className="text-xs text-neutral-400 mb-1">{label}</p>
                  <p className="font-semibold text-neutral-900 capitalize">{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Distribution breakdown */}
          <div className="card">
            <div className="p-5 border-b border-neutral-100">
              <h3 className="section-title">Distribution summary</h3>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr><th>Item</th><th>Category</th><th>Qty Distributed</th><th>Deliveries</th><th>Delivered</th></tr>
                </thead>
                <tbody>
                  {(report.distributionSummary || []).map(d => (
                    <tr key={d._id}>
                      <td className="font-semibold text-neutral-900">{d._id}</td>
                      <td><span className="chip bg-neutral-100 text-neutral-600 capitalize">{d.category}</span></td>
                      <td className="font-semibold text-primary-600">{d.totalQuantityDistributed} {d.unit}</td>
                      <td>{d.deliveryCount}</td>
                      <td><span className="chip bg-success-50 text-success-700">{d.deliveredCount}</span></td>
                    </tr>
                  ))}
                  {(report.distributionSummary || []).length === 0 && (
                    <tr><td colSpan={5} className="text-center text-neutral-400 py-6">No distributions yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Volunteer performance */}
          <div className="card">
            <div className="p-5 border-b border-neutral-100">
              <h3 className="section-title">Volunteer performance</h3>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr><th>Volunteer</th><th>Region</th><th>Deliveries completed</th><th>Total qty delivered</th></tr>
                </thead>
                <tbody>
                  {(report.volunteerSummary || []).map((v, i) => (
                    <tr key={i}>
                      <td className="font-semibold text-neutral-900">{v.name}</td>
                      <td>{v.region || '—'}</td>
                      <td><span className="font-bold text-success-600">{v.deliveriesCompleted}</span></td>
                      <td>{v.totalQuantityDelivered}</td>
                    </tr>
                  ))}
                  {(report.volunteerSummary || []).length === 0 && (
                    <tr><td colSpan={4} className="text-center text-neutral-400 py-6">No volunteer activity yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Donor contributions */}
          {(report.donorSummary || []).length > 0 && (
            <div className="card">
              <div className="p-5 border-b border-neutral-100">
                <h3 className="section-title">NGO contributions</h3>
              </div>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr><th>NGO / Donor</th><th>Items</th><th>Total quantity</th></tr>
                  </thead>
                  <tbody>
                    {report.donorSummary.map((d, i) => (
                      <tr key={i}>
                        <td className="font-semibold text-neutral-900">{d.donorName}</td>
                        <td>{d.itemsContributed}</td>
                        <td className="font-semibold text-teal-600">{d.totalQuantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-xs text-neutral-400 text-center">
            Report generated at {formatDateTime(report.generatedAt)}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default AdminReport;