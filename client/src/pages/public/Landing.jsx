import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheckIcon, UserGroupIcon, ArchiveBoxIcon,
  TruckIcon, ChartBarIcon, BellAlertIcon,
} from '@heroicons/react/24/outline';

const features = [
  { icon: UserGroupIcon,  title: 'Victim Registration',  desc: 'Smart priority scoring ensures the most vulnerable receive aid first.', color: 'bg-primary-50 text-primary-600' },
  { icon: ArchiveBoxIcon, title: 'Inventory Tracking',   desc: 'Real-time stock management with low-stock alerts and expiry tracking.', color: 'bg-teal-50 text-teal-600' },
  { icon: TruckIcon,      title: '7-Stage Distribution', desc: 'Full lifecycle from submission to delivery with volunteer coordination.', color: 'bg-warning-50 text-warning-600' },
  { icon: ChartBarIcon,   title: 'Live Analytics',       desc: '5 dashboard charts showing real-time relief operation progress.', color: 'bg-success-50 text-success-600' },
  { icon: BellAlertIcon,  title: 'Instant Alerts',       desc: 'Role-specific notifications keep every stakeholder informed.', color: 'bg-danger-50 text-danger-600' },
  { icon: ShieldCheckIcon,title: 'Audit Logging',        desc: 'Every admin action recorded in an append-only transparent log.', color: 'bg-neutral-100 text-neutral-600' },
];

const roles = [
  { role: 'Citizen',   desc: 'Register and track your relief aid',   color: 'border-primary-200 bg-primary-50', badge: 'bg-primary-600 text-white' },
  { role: 'Volunteer', desc: 'Coordinate deliveries in your zone',   color: 'border-teal-200 bg-teal-50',     badge: 'bg-teal-600 text-white' },
  { role: 'NGO',       desc: 'Donate and track your contributions',  color: 'border-warning-200 bg-warning-50', badge: 'bg-warning-600 text-white' },
  { role: 'Admin',     desc: 'Manage the full relief operation',     color: 'border-danger-200 bg-danger-50',  badge: 'bg-danger-600 text-white' },
];

const Landing = () => (
  <div className="min-h-screen bg-neutral-50">
    {/* Navbar */}
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-100 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 bg-primary-600 rounded-xl flex items-center justify-center">
          <ShieldCheckIcon className="h-4 w-4 text-white" />
        </div>
        <span className="font-display font-bold text-neutral-900 text-lg tracking-tight">
          e-Disaster<span className="text-primary-600">Aid</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Link to="/login" className="btn-ghost font-medium">Sign in</Link>
        <Link to="/register" className="btn-primary">Get started</Link>
      </div>
    </nav>

    {/* Hero */}
    <section className="relative overflow-hidden px-6 pt-20 pb-28 text-center">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary-50 rounded-full opacity-60 blur-3xl" />
        <div className="absolute top-20 left-1/4 w-[200px] h-[200px] bg-danger-50 rounded-full opacity-40 blur-2xl" />
        <div className="absolute top-10 right-1/4 w-[250px] h-[250px] bg-success-50 rounded-full opacity-40 blur-2xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <span className="chip bg-primary-50 text-primary-700 mb-6 inline-flex">
          MERN Stack · Real-time · Role-based
        </span>
        <h1 className="font-display font-extrabold text-5xl md:text-7xl text-neutral-900 tracking-tight leading-none mb-6">
          Disaster Relief,<br />
          <span className="text-primary-600">Digitized.</span>
        </h1>
        <p className="text-lg md:text-xl text-neutral-500 max-w-2xl mx-auto leading-relaxed mb-10">
          e-DisasterAid coordinates victims, volunteers, NGOs, and government authorities
          on a single transparent platform — from registration to delivery.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register" className="btn-primary text-base px-8 py-3 rounded-2xl">
            Join the platform
          </Link>
          <Link to="/login" className="btn-secondary text-base px-8 py-3 rounded-2xl">
            Sign in to dashboard
          </Link>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
      >
        {[
          { val: '11',    label: 'Modules' },
          { val: '4',     label: 'User roles' },
          { val: '7',     label: 'Aid stages' },
          { val: '100%',  label: 'Transparent' },
        ].map(({ val, label }) => (
          <div key={label} className="card p-5 text-center">
            <div className="font-display font-bold text-3xl text-primary-600">{val}</div>
            <div className="text-sm text-neutral-500 mt-1">{label}</div>
          </div>
        ))}
      </motion.div>
    </section>

    {/* Features */}
    <section className="px-6 py-20 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="font-display font-bold text-3xl text-neutral-900 mb-3">Everything you need</h2>
        <p className="text-neutral-500">Built for real disaster operations, not academic demos.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map(({ icon: Icon, title, desc, color }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07, duration: 0.4 }}
            className="card card-hover p-6"
          >
            <div className={`p-3 rounded-xl w-fit mb-4 ${color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="font-display font-semibold text-neutral-900 mb-2">{title}</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
          </motion.div>
        ))}
      </div>
    </section>

    {/* Roles */}
    <section className="px-6 py-20 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-3xl text-neutral-900 mb-3">One platform, four roles</h2>
          <p className="text-neutral-500">Every stakeholder gets a tailored experience.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {roles.map(({ role, desc, color, badge }, i) => (
            <motion.div
              key={role}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`card card-hover p-6 border ${color}`}
            >
              <span className={`chip text-xs mb-3 ${badge}`}>{role}</span>
              <p className="text-sm text-neutral-600 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link to="/register" className="btn-primary text-base px-8 py-3 rounded-2xl">
            Create your account
          </Link>
        </div>
      </div>
    </section>

    {/* Footer */}
    <footer className="border-t border-neutral-100 px-6 py-8 text-center text-sm text-neutral-400">
      e-DisasterAid · BCA Capstone Project · Built with MERN Stack
    </footer>
  </div>
);

export default Landing;