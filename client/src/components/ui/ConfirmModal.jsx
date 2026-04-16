import { motion, AnimatePresence } from 'framer-motion';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const ConfirmModal = ({ open, title, message, onConfirm, onCancel, danger = false }) => (
  <AnimatePresence>
    {open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
           style={{ background: 'rgba(44,44,42,0.5)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.2 }}
          className="card p-6 max-w-sm w-full"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-xl ${danger ? 'bg-danger-50' : 'bg-warning-50'}`}>
              <ExclamationTriangleIcon className={`h-5 w-5 ${danger ? 'text-danger-500' : 'text-warning-500'}`} />
            </div>
            <h3 className="font-display font-semibold text-neutral-900">{title}</h3>
          </div>
          <p className="text-sm text-neutral-600 mb-6 leading-relaxed">{message}</p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
            <button onClick={onConfirm} className={`flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`}>
              Confirm
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
export default ConfirmModal;