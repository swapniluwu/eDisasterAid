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
      className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-100 px-3 sm:px-5"
    >
      <div className="flex items-center justify-between h-14 sm:h-16 gap-2">

        {/* Left: menu + brand */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-xl hover:bg-neutral-100 transition-colors flex-shrink-0"
          >
            <Bars3Icon className="h-5 w-5 text-neutral-600" />
          </button>
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShieldCheckIcon className="h-4 w-4 text-white" />
            </div>
            <span className="font-display font-bold text-neutral-900 text-base sm:text-lg tracking-tight truncate">
              e-Disaster<span className="text-primary-600">Aid</span>
            </span>
          </Link>
        </div>

        {/* Right: notifications + user */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <NotificationPanel />

          {/* Avatar only on mobile, full info on desktop */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-neutral-100">
            <div className="text-right hidden lg:block">
              <p className="text-sm font-semibold text-neutral-900 leading-none">{user?.name}</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">{user?.email}</p>
            </div>
            <div className={clsx(
              'h-8 w-8 rounded-xl flex items-center justify-center font-display font-bold text-sm flex-shrink-0',
              roleColors[user?.role] || 'bg-neutral-100 text-neutral-600'
            )}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <span className={clsx(
              'chip text-[10px] hidden sm:inline-flex',
              roleColors[user?.role]
            )}>
              {user?.role}
            </span>
          </div>

          {/* Mobile: just avatar */}
          <div className={clsx(
            'sm:hidden h-8 w-8 rounded-xl flex items-center justify-center font-display font-bold text-sm flex-shrink-0',
            roleColors[user?.role] || 'bg-neutral-100 text-neutral-600'
          )}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl hover:bg-danger-50 hover:text-danger-600 transition-colors text-neutral-400"
            title="Logout"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>
    </motion.header>
  );
};

export default Navbar;