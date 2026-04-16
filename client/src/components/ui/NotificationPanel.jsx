import { useState, useEffect, useRef } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { getNotifications, markNotificationsRead } from '../../api/analytics';
import { timeAgo } from '../../utils/helpers';

const NotificationPanel = () => {
  const [open, setOpen]           = useState(false);
  const [notifications, setNotifs] = useState([]);
  const [unread, setUnread]       = useState(0);
  const ref = useRef(null);

  const load = async () => {
    try {
      const { data } = await getNotifications({ limit: 10 });
      setNotifs(data.data.notifications || []);
      setUnread(data.data.unreadCount || 0);
    } catch {}
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = async () => {
    setOpen(!open);
    if (!open && unread > 0) {
      await markNotificationsRead();
      setUnread(0);
      setNotifs(n => n.map(x => ({ ...x, isRead: true })));
    }
  };

  const typeColor = {
    registration_approved: 'bg-success-400',
    registration_rejected: 'bg-danger-400',
    status_update:         'bg-primary-400',
    delivery_assigned:     'bg-teal-400',
    low_stock:             'bg-danger-400',
    new_volunteer:         'bg-warning-400',
    general:               'bg-neutral-400',
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={handleOpen}
        className="relative p-2 rounded-xl hover:bg-neutral-100 transition-colors">
        <BellIcon className="h-5 w-5 text-neutral-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-danger-400 text-white
                           text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 card shadow-dropdown z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
              <span className="font-display font-semibold text-sm text-neutral-900">Notifications</span>
              <span className="text-xs text-neutral-400">{notifications.length} recent</span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-center text-sm text-neutral-400 py-8">All caught up!</p>
              ) : notifications.map((n) => (
                <div key={n._id}
                  className={`flex gap-3 px-4 py-3 border-b border-neutral-50 hover:bg-neutral-50 transition-colors
                              ${!n.isRead ? 'bg-primary-50/40' : ''}`}>
                  <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${typeColor[n.type] || 'bg-neutral-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-800 leading-snug">{n.title}</p>
                    <p className="text-xs text-neutral-500 mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-neutral-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default NotificationPanel;