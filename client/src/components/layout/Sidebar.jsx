import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  HomeIcon, UserGroupIcon, ArchiveBoxIcon,
  TruckIcon, HandRaisedIcon,
  ClipboardDocumentListIcon, MegaphoneIcon,
  DocumentChartBarIcon, HeartIcon, MapPinIcon,
} from '@heroicons/react/24/outline';

const adminLinks = [
  { to: '/admin',               label: 'Dashboard',     icon: HomeIcon },
  { to: '/admin/disasters',     label: 'Disasters',     icon: MegaphoneIcon },
  { to: '/admin/victims',       label: 'Victims',       icon: UserGroupIcon },
  { to: '/admin/inventory',     label: 'Inventory',     icon: ArchiveBoxIcon },
  { to: '/admin/distributions', label: 'Distributions', icon: TruckIcon },
  { to: '/admin/volunteers',    label: 'Volunteers',    icon: HandRaisedIcon },
  { to: '/admin/audit',         label: 'Audit Log',     icon: ClipboardDocumentListIcon },
  { to: '/admin/report',        label: 'Reports',       icon: DocumentChartBarIcon },
];
const citizenLinks = [
  { to: '/citizen',          label: 'Dashboard',  icon: HomeIcon },
  { to: '/citizen/register', label: 'Register',   icon: UserGroupIcon },
  { to: '/citizen/track',    label: 'Track Aid',  icon: TruckIcon },
  { to: '/citizen/map',      label: 'Relief Map', icon: MapPinIcon },
];
const volunteerLinks = [
  { to: '/volunteer',       label: 'Dashboard', icon: HomeIcon },
  { to: '/volunteer/tasks', label: 'My Tasks',  icon: TruckIcon },
];
const ngoLinks = [
  { to: '/ngo',           label: 'Dashboard', icon: HomeIcon },
  { to: '/ngo/donate',    label: 'Donate',    icon: HeartIcon },
  { to: '/ngo/inventory', label: 'My Stock',  icon: ArchiveBoxIcon },
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
      {/* Mobile backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar — hidden off-screen on mobile, always visible on md+ */}
      <aside className={clsx(
        'fixed left-0 bottom-0 w-56 bg-white border-r border-neutral-100 z-40',
        'flex flex-col overflow-y-auto transition-transform duration-300 ease-out',
        'top-14 sm:top-16',
        // Mobile: slide in/out. Desktop: always shown
        open ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
        'md:translate-x-0 md:shadow-none'
      )}>
        <nav className="flex-1 p-3 space-y-0.5">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={['/admin','/citizen','/volunteer','/ngo'].includes(to)}
              onClick={onClose}
              className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate text-sm">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-neutral-100">
          <p className="text-[10px] text-neutral-400 text-center">v1.0 · BCA Capstone</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;