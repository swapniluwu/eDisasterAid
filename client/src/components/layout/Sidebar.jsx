import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  HomeIcon, UserGroupIcon, ArchiveBoxIcon,
  TruckIcon, HandRaisedIcon, ChartBarIcon,
  ClipboardDocumentListIcon, MegaphoneIcon,
  DocumentChartBarIcon, HeartIcon, MapPinIcon,
} from '@heroicons/react/24/outline';

const adminLinks = [
  { to: '/admin',            label: 'Dashboard',     icon: HomeIcon },
  { to: '/admin/disasters',  label: 'Disasters',     icon: MegaphoneIcon },
  { to: '/admin/victims',    label: 'Victims',       icon: UserGroupIcon },
  { to: '/admin/inventory',  label: 'Inventory',     icon: ArchiveBoxIcon },
  { to: '/admin/distributions', label: 'Distributions', icon: TruckIcon },
  { to: '/admin/volunteers', label: 'Volunteers',    icon: HandRaisedIcon },
  { to: '/admin/audit',      label: 'Audit Log',     icon: ClipboardDocumentListIcon },
  { to: '/admin/report',     label: 'Reports',       icon: DocumentChartBarIcon },
];

const citizenLinks = [
  { to: '/citizen',          label: 'Dashboard',     icon: HomeIcon },
  { to: '/citizen/register', label: 'Register',      icon: UserGroupIcon },
  { to: '/citizen/track',    label: 'Track Aid',     icon: TruckIcon },
  { to: '/citizen/map',      label: 'Relief Map',    icon: MapPinIcon },
];

const volunteerLinks = [
  { to: '/volunteer',        label: 'Dashboard',     icon: HomeIcon },
  { to: '/volunteer/tasks',  label: 'My Tasks',      icon: TruckIcon },
];

const ngoLinks = [
  { to: '/ngo',              label: 'Dashboard',     icon: HomeIcon },
  { to: '/ngo/donate',       label: 'Donate',        icon: HeartIcon },
  { to: '/ngo/inventory',    label: 'My Stock',      icon: ArchiveBoxIcon },
];

const roleLinks = {
  admin: adminLinks, citizen: citizenLinks,
  volunteer: volunteerLinks, ngo: ngoLinks,
};

const Sidebar = ({ open, onClose }) => {
  const { user } = useAuth();
  const links = roleLinks[user?.role] || [];

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-900/40 z-30 md:hidden backdrop-blur-sm"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={clsx(
        'fixed left-0 top-16 bottom-0 w-60 bg-white border-r border-neutral-100 z-30',
        'flex flex-col transition-transform duration-300 ease-out overflow-y-auto',
        'md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <nav className="flex-1 p-3 space-y-0.5">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin' || to === '/citizen' || to === '/volunteer' || to === '/ngo'}
              onClick={onClose}
              className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-100">
          <div className="text-xs text-neutral-400 text-center">
            e-DisasterAid v1.0
          </div>
        </div>
      </aside>
    </>
  );
};
export default Sidebar;