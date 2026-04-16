import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationPanel from '../ui/NotificationPanel';
import {
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const roleColors = {
  admin:     'bg-pink-100 text-pink-700',
  citizen:   'bg-primary-100 text-primary-700',
  volunteer: 'bg-teal-50 text-teal-700',
  ngo:       'bg-warning-50 text-warning-700',
};

const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-100 px-4 md:px-6"
    >
      <div className="flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick}
            className="md:hidden p-2 rounded-xl hover:bg-neutral-100 transition-colors">
            <Bars3Icon className="h-5 w-5 text-neutral-600" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary-600 rounded-xl flex items-center justify-center">
              <ShieldCheckIcon className="h-4 w-4 text-white" />
            </div>
            <span className="font-display font-bold text-neutral-900 text-lg tracking-tight">
              e-Disaster<span className="text-primary-600">Aid</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <NotificationPanel />

          <div className="hidden md:flex items-center gap-3 pl-3 border-l border-neutral-100">
            <div className="text-right">
              <p className="text-sm font-semibold text-neutral-900 leading-none">{user?.name}</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">{user?.email}</p>
            </div>
            <div className={clsx(
              'h-9 w-9 rounded-xl flex items-center justify-center font-display font-bold text-sm',
              roleColors[user?.role] || 'bg-neutral-100 text-neutral-600'
            )}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <span className={clsx('chip text-[10px]', roleColors[user?.role])}>
              {user?.role}
            </span>
          </div>

          <button onClick={handleLogout}
            className="p-2 rounded-xl hover:bg-danger-50 hover:text-danger-600 transition-colors text-neutral-500"
            title="Logout">
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </motion.header>
  );
};
export default Navbar;