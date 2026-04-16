import { useState } from 'react';
import toast from 'react-hot-toast';
import { PlusIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useApi } from '../../hooks/useApi';
import { getInventory, addInventory, restockItem, deleteInventory, getStockAlerts } from '../../api/inventory';
import { getDisasters } from '../../api/disasters';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { formatDate } from '../../utils/helpers';

const EMPTY = { disasterId:'', itemName:'', category:'food', quantity:'', unit:'piece', lowStockThreshold:'10', expiryDate:'' };

const AdminInventory = () => {
  const [disasterId, setDid]    = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [restock, setRestock]   = useState(null);
  const [restockQty, setRQty]   = useState('');
  const [delConfirm, setDel]    = useState(null);
  const [saving, setSaving]     = useState(false);
  const [showAlerts, setAlerts] = useState(false);

  const { data: disData }        = useApi(getDisasters);
  const { data, loading, refetch } = useApi(getInventory, disasterId || null, [disasterId]);
  const { data: alerts }           = useApi(getStockAlerts, disasterId || null, [disasterId]);

  const disasters = disData?.disasters || [];
  const items     = data?.items || [];
  const summary   = data?.summary || {};

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addInventory({ ...form, quantity: +form.quantity, lowStockThreshold: +form.lowStockThreshold });
      toast.success('Item added to inventory');
      setShowForm(false);
      setForm(EMPTY);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add item');
    } finally { setSaving(false); }
  };

  const handleRestock = async () => {
    if (!restockQty || restockQty <= 0) return;
    try {
      await restockItem(restock._id, { quantity: +restockQty });
      toast.success(`Restocked ${restock.itemName}`);
      setRestock(null); setRQty('');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Restock failed');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteInventory(delConfirm._id);
      toast.success('Item removed');
      setDel(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove');
    }
  };

  const alertCount = (alerts?.counts?.lowStock || 0) + (alerts?.counts?.expired || 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Inventory Management</h1>
          <p className="text-neutral-500 text-sm mt-1">Track relief stock across all disasters</p>
        </div>
        <div className="flex gap-2">
          {alertCount > 0 && (
            <button onClick={() => setAlerts(!showAlerts)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-danger-50 text-danger-700 text-sm font-semibold hover:bg-danger-100 transition-colors">
              <ExclamationTriangleIcon className="h-4 w-4" />
              {alertCount} alerts
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            Add item
          </button>
        </div>
      </div>

      {/* Disaster selector */}
      <select className="select max-w-xs" value={disasterId} onChange={e => setDid(e.target.value)}>
        <option value="">Select a disaster</option>
        {disasters.map(d => <option key={d._id} value={d._id}>{d.title}</option>)}
      </select>

      {/* Alerts */}
      {showAlerts && disasterId && alerts && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="card p-5 border-l-4 border-danger-400">
          <h3 className="font-display font-semibold text-danger-700 mb-3">Stock alerts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...( alerts.lowStockItems||[]), ...(alerts.expiredItems||[])].map(item => (
              <div key={item._id} className="flex justify-between items-center p-3 bg-danger-50 rounded-xl text-sm">
                <span className="font-medium text-neutral-900">{item.itemName}</span>
                <span className="text-danger-600 font-semibold">{item.quantity} {item.unit} left</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Summary cards */}
      {disasterId && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total items',    val: summary.totalItems || 0,    color: 'text-primary-600' },
            { label: 'Total quantity', val: summary.totalQuantity || 0, color: 'text-teal-600' },
            { label: 'Low stock',      val: summary.lowStockCount || 0, color: 'text-danger-600' },
            { label: 'Expired',        val: summary.expiredCount || 0,  color: 'text-warning-600' },
          ].map(({ label, val, color }) => (
            <div key={label} className="card p-4">
              <p className="text-xs text-neutral-400 mb-1">{label}</p>
              <p className={`text-2xl font-display font-bold ${color}`}>{val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add item form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <h2 className="section-title mb-5">Add inventory item</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="label">Disaster</label>
              <select className="select" required value={form.disasterId} onChange={e => set('disasterId', e.target.value)}>
                <option value="">Select disaster</option>
                {disasters.map(d => <option key={d._id} value={d._id}>{d.title}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Item name</label>
                <input className="input" required placeholder="e.g. Rice"
                  value={form.itemName} onChange={e => set('itemName', e.target.value)} /></div>
              <div><label className="label">Category</label>
                <select className="select" value={form.category} onChange={e => set('category', e.target.value)}>
                  {['food','water','medicine','clothing','shelter','hygiene','other'].map(c => (
                    <option key={c} value={c} className="capitalize">{c}</option>
                  ))}
                </select></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="label">Quantity</label>
                <input type="number" className="input" required min="0" placeholder="500"
                  value={form.quantity} onChange={e => set('quantity', e.target.value)} /></div>
              <div><label className="label">Unit</label>
                <select className="select" value={form.unit} onChange={e => set('unit', e.target.value)}>
                  {['kg','litre','piece','box','packet','bottle'].map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select></div>
              <div><label className="label">Low stock at</label>
                <input type="number" className="input" min="0" value={form.lowStockThreshold}
                  onChange={e => set('lowStockThreshold', e.target.value)} /></div>
            </div>
            <div><label className="label">Expiry date (optional)</label>
              <input type="date" className="input" value={form.expiryDate}
                onChange={e => set('expiryDate', e.target.value)} /></div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Adding...' : 'Add item'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Inventory table */}
      {!disasterId ? (
        <div className="card p-12 text-center text-neutral-400">Select a disaster to view its inventory</div>
      ) : loading ? <LoadingSpinner className="py-12" /> : (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Item</th><th>Category</th><th>Available</th>
                    <th>Distributed</th><th>Unit</th><th>Expiry</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item._id}>
                    <td className="font-semibold text-neutral-900">{item.itemName}</td>
                    <td><span className="chip bg-neutral-100 text-neutral-600 capitalize">{item.category}</span></td>
                    <td>
                      <span className={`font-semibold ${item.isLowStock ? 'text-danger-600' : 'text-success-600'}`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="text-neutral-500">{item.totalDistributed}</td>
                    <td className="text-neutral-400">{item.unit}</td>
                    <td className="text-xs text-neutral-400">
                      {item.expiryDate ? (
                        <span className={item.isExpired ? 'text-danger-600 font-semibold' : ''}>
                          {formatDate(item.expiryDate)}
                          {item.isExpired && ' (expired)'}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      {item.isLowStock && <span className="chip bg-danger-50 text-danger-600">Low stock</span>}
                      {item.isExpired && <span className="chip bg-warning-50 text-warning-600">Expired</span>}
                      {!item.isLowStock && !item.isExpired && <span className="chip bg-success-50 text-success-600">OK</span>}
                    </td>
                    <td>
                      <div className="flex gap-1.5">
                        <button onClick={() => setRestock(item)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 font-medium transition-colors">
                          Restock
                        </button>
                        <button onClick={() => setDel(item)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-danger-50 text-danger-700 hover:bg-danger-100 font-medium transition-colors">
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-neutral-400 py-8">No inventory items yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Restock modal */}
      {restock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(44,44,42,0.5)' }}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="card p-6 max-w-sm w-full">
            <h3 className="font-display font-semibold mb-4">Restock — {restock.itemName}</h3>
            <p className="text-sm text-neutral-500 mb-4">Current stock: <strong>{restock.quantity} {restock.unit}</strong></p>
            <label className="label">Add quantity</label>
            <input type="number" className="input mb-4" min="1" placeholder="e.g. 100"
              value={restockQty} onChange={e => setRQty(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => { setRestock(null); setRQty(''); }} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleRestock} className="btn-primary flex-1">Restock</button>
            </div>
          </motion.div>
        </div>
      )}

      <ConfirmModal open={!!delConfirm} title="Remove item?"
        message={`Remove ${delConfirm?.itemName} from inventory? This cannot be undone.`}
        danger onConfirm={handleDelete} onCancel={() => setDel(null)} />
    </div>
  );
};

export default AdminInventory;